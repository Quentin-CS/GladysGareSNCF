import { fetchDepartures, findStations } from './sncf.js';

export const FEATURE_MINUTES = 'minutes-avant-prochain-train';
export const FEATURE_REFRESH_AGE = 'minutes-depuis-actualisation';
export const DELAY_TRIGGER = 'train_en_retard';
export const CANCELLATION_TRIGGER = 'train_supprime';
export const PLATFORM_TRIGGER = 'changement_voie';
const reportedDelays = new Set();
const cachedTimetables = new Map();
const previousTrains = new Map();
const timetableStatus = new Map();

export function stationIdFromExternalId(gladys, externalId) {
  const prefix = gladys.externalId('gare-sncf:');
  if (typeof externalId !== 'string' || !externalId.startsWith(prefix)) {
    throw new Error('L’appareil sélectionné ne provient pas de GareSNCF.');
  }
  const stationId = externalId.slice(prefix.length);
  if (!stationId) throw new Error('Identifiant de gare absent de l’appareil sélectionné.');
  return stationId;
}

export function buildDevice(gladys, station) {
  const ids = gladys.externalIds('gare-sncf', station.id);
  return {
    name: station.label || station.name || `Gare SNCF (${station.id})`,
    external_id: ids.device,
    should_poll: true,
    poll_frequency: 60_000,
    features: [
      {
        name: 'Minutes avant le prochain train',
        external_id: ids.feature(FEATURE_MINUTES),
        category: 'counter-sensor',
        type: 'integer',
        min: 0,
        max: 1440,
        read_only: true,
        has_feedback: false,
        keep_history: true,
      },
      {
        name: 'Minutes depuis la dernière actualisation',
        external_id: ids.feature(FEATURE_REFRESH_AGE),
        category: 'counter-sensor',
        type: 'integer',
        min: 0,
        max: 10080,
        read_only: true,
        has_feedback: false,
        keep_history: false,
      },
    ],
  };
}

export async function discoverStations(gladys, config) {
  if (!config.api_token) throw new Error('Configurez d’abord votre jeton API SNCF.');
  let stations;
  if (config.station_search.length >= 2) {
    const found = await findStations(config.station_search, config.api_token);
    stations = [...new Map(found.map((station) => [station.id, station])).values()].slice(0, 20);
  } else if (config.station_id) {
    // Keep devices already configured with the earlier single-station release discoverable.
    stations = [
      {
        id: config.station_id,
        name: `Gare SNCF (${config.station_id})`,
        label: `Gare SNCF (${config.station_id})`,
      },
    ];
  } else {
    throw new Error(
      'Saisissez une ville ou un nom de gare dans « Rechercher des gares », puis relancez la découverte.',
    );
  }
  const devices = stations.map((station) => buildDevice(gladys, station));
  await gladys.publishDiscoveredDevices(devices);
  return devices;
}

export async function refreshTimetable(
  gladys,
  config,
  { stationId, stationName, force = false } = {},
) {
  if (!stationId) throw new Error('Sélectionnez une gare à suivre.');
  const now = Date.now();
  const cached = cachedTimetables.get(stationId);
  if (!force && cached && now - cached.fetchedAt < config.poll_frequency * 1000) {
    const ids = gladys.externalIds('gare-sncf', stationId);
    await gladys.publishState(
      ids.feature(FEATURE_REFRESH_AGE),
      Math.max(0, Math.floor((now - cached.fetchedAt) / 60000)),
    );
    return cached.result;
  }

  let trains;
  let cancellationWarning = null;
  try {
    trains = await fetchDepartures({ ...config, station_id: stationId }, { count: 20 });
  } catch (error) {
    recordTimetableError(stationId, error);
    throw error;
  }
  if (config.alert_cancellations) {
    try {
      const scheduled = await fetchDepartures(
        { ...config, station_id: stationId },
        { count: 20, dataFreshness: 'base_schedule' },
      );
      const realtimeById = new Map(trains.map((train) => [train.id, train]));
      for (const train of scheduled) {
        if (!train.cancelled || !train.datetime || new Date(train.datetime).getTime() < now) {
          continue;
        }
        const realtimeTrain = realtimeById.get(train.id);
        if (realtimeTrain) realtimeTrain.cancelled = true;
        else trains.push(train);
      }
    } catch (error) {
      cancellationWarning = `Vérification des suppressions indisponible : ${error.message}`;
    }
  }
  trains = filterTrains(trains, config);
  const next = trains.find(
    (train) => !train.cancelled && train.datetime && new Date(train.datetime).getTime() >= now,
  );
  const minutes = next
    ? Math.max(0, Math.round((new Date(next.datetime).getTime() - now) / 60000))
    : 0;
  const ids = gladys.externalIds('gare-sncf', stationId);
  await gladys.publishState(ids.feature(FEATURE_MINUTES), minutes);
  await gladys.publishState(ids.feature(FEATURE_REFRESH_AGE), 0);

  for (const train of trains) {
    const previous = previousTrains.get(`${stationId}:${train.id}`);
    const eventId = `${stationId}:${train.id}:${train.datetime}`;
    const event = {
      device: ids.device,
      station: stationName || stationId,
      train: train.code,
      destination: train.direction,
      delay_minutes: train.delayMinutes,
      departure_time: train.datetime,
      platform: train.platform || '',
    };
    if (train.cancelled && config.alert_cancellations && !previous?.cancelled) {
      await publishOnce(gladys, CANCELLATION_TRIGGER, eventId, event);
    } else if (train.delayMinutes >= config.delay_threshold && train.datetime) {
      await publishOnce(gladys, DELAY_TRIGGER, eventId, event);
    }
    if (
      config.alert_platform_changes &&
      previous?.platform &&
      train.platform &&
      previous.platform !== train.platform
    ) {
      await publishOnce(gladys, PLATFORM_TRIGGER, `${eventId}:${train.platform}`, {
        ...event,
        previous_platform: previous.platform,
      });
    }
    previousTrains.set(`${stationId}:${train.id}`, {
      cancelled: train.cancelled,
      platform: train.platform,
    });
  }

  const result = { trains, next, minutes };
  cachedTimetables.set(stationId, { fetchedAt: Date.now(), result });
  timetableStatus.set(stationId, {
    fetchedAt: Date.now(),
    error: cancellationWarning,
  });
  return result;
}

export function filterTrains(trains, config) {
  const line = String(config.line_filter ?? '')
    .trim()
    .toLocaleLowerCase();
  const destination = String(config.destination_filter ?? '')
    .trim()
    .toLocaleLowerCase();
  const transport = String(config.transport_filter ?? '')
    .trim()
    .toLocaleLowerCase();
  return trains.filter(
    (train) =>
      (!line || train.code.toLocaleLowerCase().includes(line)) &&
      (!destination || train.direction.toLocaleLowerCase().includes(destination)) &&
      (!transport || train.status.toLocaleLowerCase().includes(transport)),
  );
}

async function publishOnce(gladys, key, eventId, data) {
  if (reportedDelays.has(`${key}:${eventId}`)) return;
  await gladys.publishSceneEvent(key, data);
  reportedDelays.add(`${key}:${eventId}`);
  if (reportedDelays.size > 1000) reportedDelays.clear();
}

export function recordTimetableError(stationId, error) {
  timetableStatus.set(stationId, {
    ...(timetableStatus.get(stationId) ?? {}),
    error: error?.message ?? 'Erreur inconnue',
  });
}

export function getTimetableStatus(stationId) {
  return timetableStatus.get(stationId) ?? { fetchedAt: null, error: null };
}

export function getCachedTimetable(stationId) {
  return cachedTimetables.get(stationId)?.result ?? null;
}

export async function testConnection(config) {
  if (!config.api_token) throw new Error('Configurez d’abord votre jeton API SNCF.');
  const query = config.station_search || config.station_id;
  if (!query) throw new Error('Saisissez le nom d’une gare avant de tester la connexion.');
  if (query.startsWith('stop_area:')) {
    const trains = await fetchDepartures({ ...config, station_id: query }, { count: 1 });
    return `API SNCF accessible : ${trains.length} prochain train reçu${trains.length > 1 ? 's' : ''}.`;
  }
  const stations = await findStations(query, config.api_token);
  return `API SNCF accessible : ${stations.length} gare${stations.length > 1 ? 's' : ''} trouvée${stations.length > 1 ? 's' : ''}.`;
}

export async function searchStations(query, token) {
  if (String(query ?? '').trim().length < 2) throw new Error('Saisissez au moins deux caractères.');
  const stations = await findStations(query, token);
  if (stations.length === 0) return 'Aucune gare trouvée pour cette recherche.';
  return stations
    .slice(0, 20)
    .map((station) => `${station.label} — ${station.id}`)
    .join('\n');
}

export function resetTimetableCache() {
  reportedDelays.clear();
  cachedTimetables.clear();
  previousTrains.clear();
  timetableStatus.clear();
}

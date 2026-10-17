import { fetchDepartures, findStations } from './sncf.js';

export const FEATURE_MINUTES = 'minutes-avant-prochain-train';
export const DELAY_TRIGGER = 'train_en_retard';
const reportedDelays = new Set();
const cachedTimetables = new Map();

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
    ],
  };
}

export async function discoverStations(gladys, config) {
  if (!config.api_token) throw new Error('Configurez d’abord votre jeton API SNCF.');
  let stations;
  if (config.station_search.length >= 2) {
    stations = (await findStations(config.station_search, config.api_token)).slice(0, 20);
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
    return cached.result;
  }

  const trains = await fetchDepartures({ ...config, station_id: stationId }, { count: 20 });
  const next = trains.find((train) => train.datetime && new Date(train.datetime).getTime() >= now);
  const minutes = next
    ? Math.max(0, Math.round((new Date(next.datetime).getTime() - now) / 60000))
    : 0;
  const ids = gladys.externalIds('gare-sncf', stationId);
  await gladys.publishState(ids.feature(FEATURE_MINUTES), minutes);

  for (const train of trains) {
    if (train.delayMinutes < config.delay_threshold || !train.datetime) continue;
    const eventId = `${stationId}:${train.id}:${train.datetime}`;
    if (reportedDelays.has(eventId)) continue;
    reportedDelays.add(eventId);
    if (reportedDelays.size > 1000) reportedDelays.clear();
    await gladys.publishSceneEvent(DELAY_TRIGGER, {
      device: ids.device,
      station: stationName || stationId,
      train: train.code,
      destination: train.direction,
      delay_minutes: train.delayMinutes,
      departure_time: train.datetime,
    });
  }

  const result = { trains, next, minutes };
  cachedTimetables.set(stationId, { fetchedAt: Date.now(), result });
  return result;
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
}

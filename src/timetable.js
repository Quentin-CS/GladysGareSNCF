import { fetchDepartures, findStations } from './sncf.js';

export const DEVICE_ID = 'gare-sncf';
export const FEATURE_MINUTES = 'minutes-avant-prochain-train';
export const DELAY_TRIGGER = 'train_en_retard';
const reportedDelays = new Set();
let lastFetchedAt = 0;
let lastResult = null;

export function buildDevice(gladys, config) {
  const ids = gladys.externalIds('gare-sncf', config.station_id || 'gare-non-configuree');
  return {
    name: config.station_id ? `Gare SNCF (${config.station_id})` : 'Gare SNCF',
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

export async function refreshTimetable(gladys, config, { force = false } = {}) {
  if (!force && lastResult && Date.now() - lastFetchedAt < config.poll_frequency * 1000)
    return lastResult;
  const trains = await fetchDepartures(config, { count: 20 });
  const now = Date.now();
  const next = trains.find((train) => train.datetime && new Date(train.datetime).getTime() >= now);
  const minutes = next
    ? Math.max(0, Math.round((new Date(next.datetime).getTime() - now) / 60000))
    : 0;
  const ids = gladys.externalIds('gare-sncf', config.station_id || 'gare-non-configuree');
  await gladys.publishState(ids.feature(FEATURE_MINUTES), minutes);

  for (const train of trains) {
    if (train.delayMinutes < config.delay_threshold || !train.datetime) continue;
    const eventId = `${config.station_id}:${train.id}:${train.datetime}`;
    if (reportedDelays.has(eventId)) continue;
    reportedDelays.add(eventId);
    if (reportedDelays.size > 500) reportedDelays.clear();
    await gladys.publishSceneEvent(DELAY_TRIGGER, {
      station: config.station_id,
      train: train.code,
      destination: train.direction,
      delay_minutes: train.delayMinutes,
      departure_time: train.datetime,
    });
  }
  lastFetchedAt = Date.now();
  lastResult = { trains, next, minutes };
  return lastResult;
}

export async function testConnection(config) {
  const trains = await fetchDepartures(config, { count: 1 });
  return `API SNCF accessible : ${trains.length} prochain train reçu${trains.length > 1 ? 's' : ''}.`;
}

export async function searchStations(query, token) {
  if (String(query ?? '').trim().length < 2) throw new Error('Saisissez au moins deux caractères.');
  const stations = await findStations(query, token);
  if (stations.length === 0) return 'Aucune gare trouvée pour cette recherche.';
  return stations
    .slice(0, 5)
    .map((station) => `${station.label} — ${station.id}`)
    .join('\n');
}

export function resetTimetableCache() {
  reportedDelays.clear();
  lastFetchedAt = 0;
  lastResult = null;
}

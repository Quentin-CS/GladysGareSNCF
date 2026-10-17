import { createLogger } from '@gladysassistant/integration-sdk';

const logger = createLogger({ name: 'sncf-api' });
const API_BASE = 'https://api.sncf.com/v1';

function authorization(token) {
  if (!token) throw new Error('Un jeton API SNCF doit être configuré.');
  return `Basic ${Buffer.from(`${token}:`).toString('base64')}`;
}

async function getJson(url, token) {
  const response = await fetch(url, {
    headers: { Authorization: authorization(token), Accept: 'application/json' },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) {
    const message =
      response.status === 401 || response.status === 403
        ? 'Jeton API SNCF invalide ou accès refusé.'
        : `L’API SNCF a répondu HTTP ${response.status}.`;
    throw new Error(message);
  }
  return response.json();
}

export async function fetchDepartures(config, { count = 10 } = {}) {
  if (!config.station_id) throw new Error('Renseignez l’identifiant Navitia de la gare.');
  const resource = encodeURIComponent(config.station_id);
  const url = `${API_BASE}/coverage/sncf/stop_areas/${resource}/${config.direction}?count=${count}`;
  logger.debug('Requesting SNCF timetable');
  const body = await getJson(url, config.api_token);
  return (body[config.direction] ?? []).map((item) => normalizeDeparture(item, config.direction));
}

export function normalizeDeparture(item, direction = 'departures') {
  const info = item.display_informations ?? {};
  const times = item.stop_date_time ?? {};
  const date =
    direction === 'arrivals'
      ? (times.arrival_date_time ?? times.departure_date_time)
      : (times.departure_date_time ?? times.arrival_date_time);
  const baseDate =
    direction === 'arrivals'
      ? (times.base_arrival_date_time ?? times.base_departure_date_time)
      : (times.base_departure_date_time ?? times.base_arrival_date_time);
  const delayMinutes =
    date && baseDate
      ? Math.max(0, Math.round((parseNavitiaDate(date) - parseNavitiaDate(baseDate)) / 60000))
      : 0;
  return {
    id: String(
      item.links?.find((link) => link.type === 'vehicle_journey')?.id ??
        `${info.code ?? 'train'}-${date ?? ''}`,
    ),
    code: String(info.code ?? info.name ?? 'Train'),
    direction: String(info.direction ?? info.label ?? 'Destination inconnue'),
    platform: String(times.platform ?? ''),
    datetime: date ? parseNavitiaDate(date).toISOString() : null,
    baseDatetime: baseDate ? parseNavitiaDate(baseDate).toISOString() : null,
    delayMinutes,
    status: String(info.commercial_mode ?? info.network ?? ''),
  };
}

function parseNavitiaDate(value) {
  // Navitia dates are local wall-clock timestamps without a zone. Treat them as
  // local time in the integration container, as the API intends.
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/.exec(value);
  if (!match) return new Date(value);
  const [, y, mo, d, h, mi, s] = match.map(Number);
  return new Date(y, mo - 1, d, h, mi, s);
}

export async function findStations(query, token) {
  const url = new URL(`${API_BASE}/coverage/sncf/places`);
  url.searchParams.set('q', query);
  url.searchParams.set('type[]', 'stop_area');
  const body = await getJson(url, token);
  return (body.places ?? [])
    .filter((place) => place.embedded_type === 'stop_area')
    .map((place) => ({
      id: place.id,
      name: place.name,
      label: place.stop_area?.label ?? place.name,
    }));
}

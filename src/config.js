export const DEFAULT_CONFIG = {
  api_token: '',
  station_id: '',
  direction: 'departures',
  poll_frequency: 120,
  delay_threshold: 5,
};

export function normalizeConfig(raw = {}) {
  const direction = raw.direction === 'arrivals' ? 'arrivals' : 'departures';
  return {
    ...DEFAULT_CONFIG,
    ...raw,
    api_token: String(raw.api_token ?? '').trim(),
    station_id: String(raw.station_id ?? '').trim(),
    direction,
    poll_frequency: Math.max(
      60,
      Math.min(3600, Number(raw.poll_frequency) || DEFAULT_CONFIG.poll_frequency),
    ),
    delay_threshold: Math.max(
      1,
      Math.min(120, Number(raw.delay_threshold) || DEFAULT_CONFIG.delay_threshold),
    ),
  };
}

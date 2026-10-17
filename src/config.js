export const DEFAULT_CONFIG = {
  api_token: '',
  station_search: '',
  // Kept for upgrades from the first single-station configuration.
  station_id: '',
  direction: 'departures',
  poll_frequency: 600,
  delay_threshold: 5,
};

export function normalizeConfig(raw = {}) {
  const direction = raw.direction === 'arrivals' ? 'arrivals' : 'departures';
  return {
    ...DEFAULT_CONFIG,
    ...raw,
    api_token: String(raw.api_token ?? '').trim(),
    station_search: String(raw.station_search ?? '').trim(),
    station_id: String(raw.station_id ?? '').trim(),
    direction,
    poll_frequency: Math.max(
      300,
      Math.min(3600, Number(raw.poll_frequency) || DEFAULT_CONFIG.poll_frequency),
    ),
    delay_threshold: Math.max(
      1,
      Math.min(120, Number(raw.delay_threshold) || DEFAULT_CONFIG.delay_threshold),
    ),
  };
}

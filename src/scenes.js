import { refreshTimetable, stationIdFromExternalId } from './timetable.js';

export const SCENE_ACTIONS = {
  async prochains_trains(gladys, { fields, config }) {
    const stationId = stationIdFromExternalId(gladys, fields.device);
    const { trains, next, minutes } = await refreshTimetable(gladys, config, {
      stationId,
      force: true,
    });
    return {
      count: trains.length,
      next_train: next?.code ?? '',
      destination: next?.direction ?? '',
      minutes: next ? minutes : -1,
      platform: next?.platform ?? '',
      delay_minutes: next?.delayMinutes ?? 0,
      cancelled: next?.cancelled ?? false,
    };
  },
};

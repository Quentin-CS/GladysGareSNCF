import { refreshTimetable } from './timetable.js';

export const SCENE_ACTIONS = {
  async prochains_trains(gladys, { config }) {
    const { trains, next } = await refreshTimetable(gladys, config, { force: true });
    return {
      count: trains.length,
      next_train: next?.code ?? '',
      destination: next?.direction ?? '',
      minutes: next
        ? Math.max(0, Math.round((new Date(next.datetime).getTime() - Date.now()) / 60000))
        : -1,
    };
  },
};

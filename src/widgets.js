import { createLogger } from '@gladysassistant/integration-sdk';
import { refreshTimetable } from './timetable.js';

const logger = createLogger({ name: 'widgets' });
export const WIDGET_KEY = 'tableau_gare_sncf';

export const WIDGETS = {
  [WIDGET_KEY]: {
    async get(gladys, { config }) {
      const { trains } = await refreshTimetable(gladys, config);
      return {
        ttl_seconds: Math.min(300, config.poll_frequency),
        components: [
          {
            type: 'button',
            label: { fr: 'Actualiser', en: 'Refresh' },
            icon: 'refresh-cw',
            style: 'secondary',
            action: { key: 'actualiser' },
          },
          {
            type: 'card-list',
            display: 'list',
            items: trains.slice(0, 8).map((train) => ({
              title: `${train.code} — ${train.direction}`.slice(0, 60),
              subtitle: train.platform ? `Voie ${train.platform}` : 'Voie non communiquée',
              date: train.datetime ?? undefined,
              badge:
                train.delayMinutes > 0
                  ? { text: `+${train.delayMinutes} min`, color: 'warning' }
                  : { text: 'À l’heure', color: 'success' },
            })),
          },
        ],
      };
    },
    async action(gladys, { actionKey, config }) {
      if (actionKey !== 'actualiser') throw new Error(`Action inconnue : ${actionKey}`);
      await refreshTimetable(gladys, config, { force: true });
      logger.info('Widget timetable manually refreshed');
      return { fr: 'Tableau des trains actualisé.', en: 'Train board refreshed.' };
    },
  },
};

export function refreshWidgets(gladys) {
  for (const key of Object.keys(WIDGETS)) gladys.requestWidgetRefresh(key);
}

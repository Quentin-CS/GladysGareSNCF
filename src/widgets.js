import { createLogger } from '@gladysassistant/integration-sdk';
import { refreshTimetable, stationIdFromExternalId } from './timetable.js';

const logger = createLogger({ name: 'widgets' });
export const WIDGET_KEY = 'tableau_gare_sncf';

async function selectedStation(gladys, settings, config) {
  if (settings?.device) {
    return { id: stationIdFromExternalId(gladys, settings.device), externalId: settings.device };
  }
  if (config.station_id) {
    const ids = gladys.externalIds('gare-sncf', config.station_id);
    return { id: config.station_id, externalId: ids.device };
  }
  const devices = await gladys.getDevices();
  const device = devices.find((entry) => entry.external_id?.includes(':gare-sncf:'));
  if (!device) throw new Error('Ajoutez d’abord une gare depuis l’onglet Découverte.');
  return {
    id: stationIdFromExternalId(gladys, device.external_id),
    externalId: device.external_id,
  };
}

export const WIDGETS = {
  [WIDGET_KEY]: {
    async get(gladys, { config, settings = {} }) {
      const station = await selectedStation(gladys, settings, config);
      const { trains } = await refreshTimetable(gladys, config, {
        stationId: station.id,
      });
      return {
        ttl_seconds: Math.min(300, config.poll_frequency),
        components: [
          {
            type: 'button',
            label: { fr: 'Actualiser', en: 'Refresh' },
            icon: 'refresh-cw',
            style: 'secondary',
            action: { key: 'actualiser', params: { device: station.externalId } },
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
    async action(gladys, { actionKey, params, config }) {
      if (actionKey !== 'actualiser') throw new Error(`Action inconnue : ${actionKey}`);
      await refreshTimetable(gladys, config, {
        stationId: stationIdFromExternalId(gladys, params.device),
        force: true,
      });
      logger.info('Widget timetable manually refreshed');
      return { fr: 'Tableau des trains actualisé.', en: 'Train board refreshed.' };
    },
  },
};

export function refreshWidgets(gladys) {
  for (const key of Object.keys(WIDGETS)) gladys.requestWidgetRefresh(key);
}

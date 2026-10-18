import { createLogger } from '@gladysassistant/integration-sdk';
import {
  filterTrains,
  getCachedTimetable,
  getTimetableStatus,
  refreshTimetable,
  stationIdFromExternalId,
} from './timetable.js';

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
  gares_suivies: {
    async get(gladys) {
      const devices = (await gladys.getDevices()).filter((device) =>
        device.external_id?.includes(':gare-sncf:'),
      );
      return {
        ttl_seconds: 300,
        components: devices.length
          ? [
              {
                type: 'card-list',
                display: 'list',
                items: devices.slice(0, 8).map((device) => ({
                  title: device.name.slice(0, 60),
                  subtitle: 'Gare suivie',
                  description:
                    'Pour arrêter le suivi, ouvrez cet appareil dans Gladys et supprimez-le.',
                })),
              },
              ...(devices.length > 8
                ? [
                    {
                      type: 'text',
                      variant: 'caption',
                      text: `${devices.length - 8} autre(s) gare(s) suivie(s)`,
                    },
                  ]
                : []),
            ]
          : [
              {
                type: 'text',
                variant: 'body',
                text: {
                  fr: 'Aucune gare suivie. Lancez une découverte dans l’intégration GareSNCF.',
                  en: 'No stations followed. Run discovery in the GareSNCF integration.',
                },
              },
            ],
      };
    },
  },
  [WIDGET_KEY]: {
    async get(gladys, { config, settings = {} }) {
      const station = await selectedStation(gladys, settings, config);
      let refreshError = null;
      let timetable;
      try {
        timetable = await refreshTimetable(gladys, config, { stationId: station.id });
      } catch (error) {
        refreshError = error.message;
        timetable = getCachedTimetable(station.id) ?? { trains: [] };
      }
      const trains = filterTrains(timetable.trains, {
        ...config,
        line_filter: settings.line_filter ?? config.line_filter,
        destination_filter: settings.destination_filter ?? config.destination_filter,
        transport_filter: settings.transport_filter ?? config.transport_filter,
      });
      const status = getTimetableStatus(station.id);
      refreshError ??= status.error;
      const age = status.fetchedAt
        ? Math.max(0, Math.floor((Date.now() - status.fetchedAt) / 60000))
        : null;
      return {
        ttl_seconds: Math.min(300, config.poll_frequency),
        components: [
          {
            type: 'status',
            items: [
              {
                label: { fr: 'Actualisation', en: 'Last update' },
                value: age === null ? { fr: 'Jamais', en: 'Never' } : `${age} min`,
                color: refreshError ? 'warning' : 'success',
              },
              ...(refreshError
                ? [
                    {
                      label: { fr: 'API SNCF', en: 'SNCF API' },
                      value: refreshError.slice(0, 40),
                      color: 'danger',
                    },
                  ]
                : []),
            ],
          },
          {
            type: 'button',
            label: { fr: 'Actualiser', en: 'Refresh' },
            icon: 'refresh-cw',
            style: 'secondary',
            action: { key: 'actualiser', params: { device: station.externalId } },
          },
          ...(trains.length
            ? [
                {
                  type: 'card-list',
                  display: 'list',
                  items: trains
                    .slice(
                      0,
                      Math.max(1, Math.min(settings.compact ? 3 : 8, Number(settings.limit) || 8)),
                    )
                    .map((train) => ({
                      title: `${train.code} — ${train.direction}`.slice(0, 60),
                      subtitle:
                        `${train.platform ? `Voie ${train.platform}` : 'Voie non communiquée'}${train.datetime ? ` · ${Math.max(0, Math.round((new Date(train.datetime) - Date.now()) / 60000))} min` : ''}`.slice(
                          0,
                          60,
                        ),
                      date: train.datetime ?? undefined,
                      badge: train.cancelled
                        ? { text: 'Supprimé', color: 'danger' }
                        : train.delayMinutes > 0
                          ? { text: `+${train.delayMinutes} min`, color: 'warning' }
                          : { text: 'À l’heure', color: 'success' },
                    })),
                },
              ]
            : [
                {
                  type: 'text',
                  variant: 'body',
                  text: {
                    fr: 'Aucun train ne correspond aux filtres pour cette gare.',
                    en: 'No trains match the filters for this station.',
                  },
                },
              ]),
          {
            type: 'text',
            variant: 'caption',
            text: {
              fr: 'Retirez une gare via la liste des appareils Gladys.',
              en: 'Remove a station from the Gladys devices list.',
            },
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
      refreshWidgets(gladys);
      logger.info('Widget timetable manually refreshed');
      return { fr: 'Tableau des trains actualisé.', en: 'Train board refreshed.' };
    },
  },
};

export function refreshWidgets(gladys) {
  for (const key of Object.keys(WIDGETS)) gladys.requestWidgetRefresh(key);
}

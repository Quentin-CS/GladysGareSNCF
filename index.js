import { GladysIntegration, logger } from '@gladysassistant/integration-sdk';
import { normalizeConfig } from './src/config.js';
import {
  discoverStations,
  refreshTimetable,
  resetTimetableCache,
  searchStations,
  stationIdFromExternalId,
  testConnection,
} from './src/timetable.js';
import { SCENE_ACTIONS } from './src/scenes.js';
import { WIDGETS, refreshWidgets } from './src/widgets.js';

const gladys = new GladysIntegration();
let config = normalizeConfig();

gladys.onScanRequest(async () => discoverStations(gladys, config));
gladys.onPoll(async (device) => {
  try {
    await refreshTimetable(gladys, config, {
      stationId: stationIdFromExternalId(gladys, device.external_id),
      stationName: device.name,
    });
  } catch (error) {
    logger.error(`SNCF timetable refresh failed for ${device?.name ?? 'unknown station'}`, error);
  }
});
gladys.onAction('tester_api', async () => testConnection(config));
gladys.onAction('rechercher_gare', async (fields) =>
  searchStations(fields.query, config.api_token),
);
for (const [key, handler] of Object.entries(SCENE_ACTIONS)) {
  gladys.onSceneAction(key, (fields) => handler(gladys, { fields, config }));
}
for (const [key, widget] of Object.entries(WIDGETS)) {
  gladys.onWidgetGet(key, (request) => widget.get(gladys, { ...request, config }));
  gladys.onWidgetAction(key, (actionKey, params, context) =>
    widget.action(gladys, { actionKey, params, ...context, config }),
  );
}

gladys.onConfigUpdated(async (raw) => {
  config = normalizeConfig(raw);
  resetTimetableCache();
  refreshWidgets(gladys);
});
gladys.on('connected', async () => {
  try {
    config = normalizeConfig(await gladys.getConfig());
    const ready = Boolean(
      config.api_token && (config.station_search.length >= 2 || config.station_id),
    );
    await gladys.setConnectionStatus(ready, {
      fr: 'Configurez le jeton API et un nom de gare, puis lancez la découverte pour choisir les gares à suivre.',
      en: 'Configure the API token and a station name, then scan to choose the stations to follow.',
    });
    refreshWidgets(gladys);
  } catch (error) {
    logger.error('Initialization failed', error);
    await gladys
      .setConnectionStatus(false, {
        fr: 'Initialisation impossible, consultez les logs.',
        en: 'Initialization failed; check the logs.',
      })
      .catch(() => {});
  }
});
gladys.handleShutdown((signal) => logger.info(`Arrêt demandé (${signal})`));
logger.info('Démarrage de GareSNCF');
gladys.connect().catch((error) => {
  logger.error('Connexion Gladys impossible', error);
  process.exit(1);
});

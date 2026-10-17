import { GladysIntegration, logger } from '@gladysassistant/integration-sdk';
import { normalizeConfig } from './src/config.js';
import {
  buildDevice,
  refreshTimetable,
  resetTimetableCache,
  searchStations,
  testConnection,
} from './src/timetable.js';
import { SCENE_ACTIONS } from './src/scenes.js';
import { WIDGETS, refreshWidgets } from './src/widgets.js';

const gladys = new GladysIntegration();
let config = normalizeConfig();

async function publishDevice() {
  await gladys.publishDiscoveredDevices([buildDevice(gladys, config)]);
}

gladys.onScanRequest(publishDevice);
gladys.onPoll(async () => {
  try {
    await refreshTimetable(gladys, config);
  } catch (error) {
    logger.error('SNCF timetable refresh failed', error);
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
  await publishDevice();
  refreshWidgets(gladys);
});
gladys.on('connected', async () => {
  try {
    config = normalizeConfig(await gladys.getConfig());
    await publishDevice();
    await gladys.setConnectionStatus(Boolean(config.api_token && config.station_id), {
      fr: 'Configurez le jeton API SNCF et l’identifiant de la gare.',
      en: 'Configure the SNCF API token and station identifier.',
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

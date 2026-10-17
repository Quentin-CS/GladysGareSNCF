import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateWidgetContent } from '@gladysassistant/integration-sdk';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { DEFAULT_CONFIG, normalizeConfig } from '../src/config.js';
import { fetchDepartures, findStations } from '../src/sncf.js';
import {
  buildDevice,
  discoverStations,
  refreshTimetable,
  resetTimetableCache,
  stationIdFromExternalId,
} from '../src/timetable.js';
import { SCENE_ACTIONS } from '../src/scenes.js';
import { WIDGETS, WIDGET_KEY } from '../src/widgets.js';

const station = { id: 'stop_area:OCE:SA:123', name: 'Langon', label: 'Gare de Langon' };
const config = normalizeConfig({
  api_token: 'test-token',
  station_search: 'Langon',
  direction: 'departures',
});
const sample = {
  departures: [
    {
      display_informations: {
        code: 'TGV 8500',
        direction: 'Bordeaux',
        commercial_mode: 'TGV INOUI',
      },
      stop_date_time: {
        departure_date_time: '20261017T235900',
        base_departure_date_time: '20261017T235500',
        platform: '4',
      },
      links: [{ type: 'vehicle_journey', id: 'vj-1' }],
    },
  ],
};

function withFetch(handler, run) {
  const original = globalThis.fetch;
  globalThis.fetch = handler;
  return Promise.resolve()
    .then(run)
    .finally(() => {
      globalThis.fetch = original;
    });
}

test('normalizeConfig applies defaults and bounds the per-station refresh interval', () => {
  assert.equal(normalizeConfig().direction, DEFAULT_CONFIG.direction);
  assert.equal(normalizeConfig({ poll_frequency: 1 }).poll_frequency, 300);
  assert.equal(normalizeConfig({ delay_threshold: 999 }).delay_threshold, 120);
  assert.equal(normalizeConfig({ direction: 'unexpected' }).direction, 'departures');
});

test('SNCF request uses HTTPS and Basic auth, and parses departures', async () => {
  await withFetch(
    async (url, options) => {
      assert.match(String(url), /^https:\/\/api\.sncf\.com\/v1\/coverage\/sncf\/stop_areas\//);
      assert.equal(
        options.headers.Authorization,
        `Basic ${Buffer.from('test-token:').toString('base64')}`,
      );
      return { ok: true, json: async () => sample };
    },
    async () => {
      const trains = await fetchDepartures({ ...config, station_id: station.id });
      assert.equal(trains[0].code, 'TGV 8500');
      assert.equal(trains[0].direction, 'Bordeaux');
      assert.equal(trains[0].delayMinutes, 4);
      assert.equal(trains[0].platform, '4');
    },
  );
});

test('station lookup returns stop_area identifiers', async () => {
  await withFetch(
    async () => ({
      ok: true,
      json: async () => ({
        places: [
          {
            embedded_type: 'stop_area',
            id: station.id,
            name: station.name,
            stop_area: { label: station.label },
          },
        ],
      }),
    }),
    async () => {
      assert.deepEqual(await findStations('Langon', 'token'), [station]);
    },
  );
});

test('discovery publishes a selectable device for every station returned by search', async () => {
  await withFetch(
    async () => ({
      ok: true,
      json: async () => ({
        places: [
          {
            embedded_type: 'stop_area',
            id: station.id,
            name: station.name,
            stop_area: { label: station.label },
          },
          {
            embedded_type: 'stop_area',
            id: 'stop_area:OCE:SA:456',
            name: 'Barsac',
            stop_area: { label: 'Gare de Barsac' },
          },
        ],
      }),
    }),
    async () => {
      const gladys = createFakeGladys();
      let published;
      gladys.publishDiscoveredDevices = async (devices) => {
        published = devices;
      };
      const devices = await discoverStations(gladys, config);
      assert.equal(devices.length, 2);
      assert.deepEqual(
        published.map((device) => device.name),
        ['Gare de Langon', 'Gare de Barsac'],
      );
      assert.equal(stationIdFromExternalId(gladys, devices[0].external_id), station.id);
    },
  );
});

test('legacy single-station config remains discoverable', async () => {
  const gladys = createFakeGladys();
  let published;
  gladys.publishDiscoveredDevices = async (devices) => {
    published = devices;
  };
  const devices = await discoverStations(
    gladys,
    normalizeConfig({ api_token: 'token', station_id: station.id }),
  );
  assert.equal(devices.length, 1);
  assert.equal(stationIdFromExternalId(gladys, published[0].external_id), station.id);
});

test('HTTP errors are surfaced without exposing the token', async () => {
  await withFetch(
    async () => ({ ok: false, status: 401 }),
    async () => {
      await assert.rejects(
        fetchDepartures({ ...config, station_id: station.id }),
        /Jeton API SNCF invalide/,
      );
    },
  );
});

test('discovered device uses stable station ID and a polled counter sensor', () => {
  const device = buildDevice(createFakeGladys(), station);
  assert.equal(device.should_poll, true);
  assert.equal(device.features.length, 1);
  assert.equal(device.features[0].category, 'counter-sensor');
  assert.equal(device.name, 'Gare de Langon');
  assert.ok(device.external_id);
});

test('dashboard widget content is valid for a selected station', async () => {
  await withFetch(
    async () => ({ ok: true, json: async () => sample }),
    async () => {
      resetTimetableCache();
      const gladys = createFakeGladys();
      const ids = gladys.externalIds('gare-sncf', station.id);
      const content = await WIDGETS[WIDGET_KEY].get(gladys, {
        config,
        settings: { device: ids.device },
        language: 'fr',
        units: 'metric',
      });
      assert.deepEqual(validateWidgetContent(content), []);
      assert.equal(
        content.components.find((component) => component.type === 'card-list').items.length,
        1,
      );
      assert.equal(
        content.components.find((component) => component.type === 'button').action.params.device,
        ids.device,
      );
    },
  );
});

test('scene action refreshes the selected station and returns its next train', async () => {
  await withFetch(
    async () => ({ ok: true, json: async () => sample }),
    async () => {
      resetTimetableCache();
      const gladys = createFakeGladys();
      const ids = gladys.externalIds('gare-sncf', station.id);
      const result = await SCENE_ACTIONS.prochains_trains(gladys, {
        fields: { device: ids.device },
        config,
      });
      assert.equal(result.count, 1);
      assert.equal(result.next_train, 'TGV 8500');
      assert.equal(result.destination, 'Bordeaux');
      assert.ok(result.minutes >= 0);
    },
  );
});

test('delay trigger includes the selected station and its device ID', async () => {
  await withFetch(
    async () => ({
      ok: true,
      json: async () => ({
        departures: [
          {
            display_informations: { code: 'TGV 8500', direction: 'Bordeaux' },
            stop_date_time: {
              departure_date_time: '20261017T235900',
              base_departure_date_time: '20261017T235000',
            },
            links: [{ type: 'vehicle_journey', id: 'vj-delay' }],
          },
        ],
      }),
    }),
    async () => {
      resetTimetableCache();
      const gladys = createFakeGladys();
      const result = await refreshTimetable(
        gladys,
        { ...config, delay_threshold: 5 },
        {
          stationId: station.id,
          stationName: station.label,
          force: true,
        },
      );
      assert.equal(result.trains.length, 1);
      assert.equal(gladys.fake.sceneEvents.length, 1);
      assert.equal(gladys.fake.sceneEvents[0].key, 'train_en_retard');
      assert.equal(
        gladys.fake.sceneEvents[0].data.device,
        gladys.externalIds('gare-sncf', station.id).device,
      );
      assert.equal(gladys.fake.sceneEvents[0].data.station, station.label);
      assert.equal(gladys.fake.sceneEvents[0].data.delay_minutes, 9);
    },
  );
});

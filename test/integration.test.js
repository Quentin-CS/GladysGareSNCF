import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateWidgetContent } from '@gladysassistant/integration-sdk';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { DEFAULT_CONFIG, normalizeConfig } from '../src/config.js';
import { fetchDepartures, findStations } from '../src/sncf.js';
import { buildDevice, resetTimetableCache, refreshTimetable } from '../src/timetable.js';
import { SCENE_ACTIONS } from '../src/scenes.js';
import { WIDGETS, WIDGET_KEY } from '../src/widgets.js';

const config = normalizeConfig({
  api_token: 'test-token',
  station_id: 'stop_area:OCE:SA:123',
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

test('normalizeConfig applies safe defaults and clamps intervals', () => {
  assert.equal(normalizeConfig().direction, DEFAULT_CONFIG.direction);
  assert.equal(normalizeConfig({ poll_frequency: 1 }).poll_frequency, 60);
  assert.equal(normalizeConfig({ delay_threshold: 999 }).delay_threshold, 120);
  assert.equal(normalizeConfig({ direction: 'unexpected' }).direction, 'departures');
});

test('SNCF request uses HTTPS, Basic auth header, and parses departures', async () => {
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
      const trains = await fetchDepartures(config);
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
            id: 'stop_area:OCE:SA:123',
            name: 'Langon',
            stop_area: { label: 'Langon' },
          },
        ],
      }),
    }),
    async () => {
      assert.deepEqual(await findStations('Langon', 'token'), [
        { id: 'stop_area:OCE:SA:123', name: 'Langon', label: 'Langon' },
      ]);
    },
  );
});

test('HTTP errors are surfaced without exposing the token', async () => {
  await withFetch(
    async () => ({ ok: false, status: 401 }),
    async () => {
      await assert.rejects(fetchDepartures(config), /Jeton API SNCF invalide/);
    },
  );
});

test('discovered device uses stable external IDs and one polled counter sensor', () => {
  const device = buildDevice(createFakeGladys(), config);
  assert.equal(device.should_poll, true);
  assert.equal(device.features.length, 1);
  assert.equal(device.features[0].category, 'counter-sensor');
  assert.ok(device.external_id);
});

test('dashboard widget content is valid for the Gladys widget renderer', async () => {
  await withFetch(
    async () => ({ ok: true, json: async () => sample }),
    async () => {
      resetTimetableCache();
      const gladys = createFakeGladys();
      const content = await WIDGETS[WIDGET_KEY].get(gladys, {
        config,
        settings: {},
        language: 'fr',
        units: 'metric',
      });
      assert.deepEqual(validateWidgetContent(content), []);
      assert.equal(
        content.components.find((component) => component.type === 'card-list').items.length,
        1,
      );
    },
  );
});

test('scene action returns declared outputs after fetching the timetable', async () => {
  await withFetch(
    async () => ({ ok: true, json: async () => sample }),
    async () => {
      resetTimetableCache();
      const result = await SCENE_ACTIONS.prochains_trains(createFakeGladys(), { config });
      assert.equal(result.count, 1);
      assert.equal(result.next_train, 'TGV 8500');
      assert.equal(result.destination, 'Bordeaux');
      assert.ok(result.minutes >= 0);
    },
  );
});

test('delay trigger fires only on observations meeting configured threshold', async () => {
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
      const delayedConfig = { ...config, delay_threshold: 5 };
      await refreshTimetable(gladys, delayedConfig, { force: true });
      assert.equal(gladys.fake.sceneEvents.length, 1);
      assert.equal(gladys.fake.sceneEvents[0].key, 'train_en_retard');
      assert.equal(gladys.fake.sceneEvents[0].data.delay_minutes, 9);
    },
  );
});

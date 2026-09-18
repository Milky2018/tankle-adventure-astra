import test from 'node:test';
import assert from 'node:assert/strict';
import { createFoldedPreferences } from './folded-settings.js';
import { createFoldedSave } from './folded-save.js';

test('rebinding swaps occupied controls and resetting keeps live consumers synchronized', () => {
  const prefs = createFoldedPreferences({}, () => {});
  const input = prefs.values.bindings;
  prefs.bind('camera', 'KeyW');
  assert.equal(input.camera, 'KeyW');
  assert.equal(input.up, 'KeyC');
  prefs.bind('fire', 'Mouse2');
  assert.equal(input.fire, 'Mouse2');
  assert.equal(input.magnet, 'Mouse0');
  prefs.bind('fire', 'Mouse2');
  assert.equal(input.magnet, 'Mouse0');
  prefs.resetBindings();
  assert.equal(prefs.values.bindings, input);
  assert.equal(input.up, 'KeyW');
  assert.equal(input.camera, 'KeyC');
  assert.equal(input.fire, 'Mouse0');
  assert.equal(input.magnet, 'Mouse2');
});

test('camera settings clamp old values and reset only the selected view', () => {
  const prefs = createFoldedPreferences(
    {
      cameraSettings: {
        third: { distance: 500, height: -1, sensitivity: '2', pitch: null },
        overhead: { angle: 65, scale: 24 },
      },
    },
    () => {},
  );
  const cameras = prefs.values.cameraSettings,
    third = cameras.third;
  assert.equal(third.distance, 20);
  assert.equal(third.height, 0);
  assert.equal(third.sensitivity, 1);
  assert.equal(third.pitch, (0.32 * 180) / Math.PI);
  prefs.resetCamera('third');
  assert.equal(cameras.third, third);
  assert.equal(third.distance, 12);
  assert.equal(third.height, 1.6);
  assert.equal(cameras.overhead.angle, 65);
  assert.equal(cameras.overhead.scale, 24);
});

test('preferences round-trip through real settings storage without altering campaign saves', () => {
  const data = new Map();
  const store = createFoldedSave(null, () => ({
    getItem: (key) => data.get(key),
    setItem: (key, value) => data.set(key, value),
  }));
  store.save({ anchor: 'awakening', overdrive: true });
  const campaign = data.get('furnace-born-v2-city');
  const prefs = createFoldedPreferences({ extension: 'preserved' }, store.saveSettings);
  prefs.bind('camera', 'KeyV');
  Object.assign(prefs.values, {
    volume: 0,
    music: false,
    sfx: false,
    quality: 'low',
    cameraView: 'overhead',
  });
  prefs.values.cameraSettings.third.sensitivity = 2;
  prefs.save();
  const loaded = createFoldedPreferences(store.loadSettings(), store.saveSettings);
  assert.deepEqual(loaded.values, prefs.values);
  assert.equal(data.get('furnace-born-v2-city'), campaign);
  loaded.resetBindings();
  assert.equal(prefs.values.bindings.camera, 'KeyV');
});

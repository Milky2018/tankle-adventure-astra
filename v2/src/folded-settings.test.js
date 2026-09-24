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

test('camera settings clamp old values and reset both views together', () => {
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
  assert.equal(third.sensitivity, 3);
  assert.equal(third.pitch, 15.3);
  prefs.resetCamera();
  assert.equal(cameras.third, third);
  assert.equal(third.distance, 15);
  assert.equal(third.height, 2.5);
  assert.deepEqual(
    cameras.overhead,
    createFoldedPreferences({}, () => {}).values.cameraSettings.overhead,
  );
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

test('absolute sensitivity defaults to 3 and preserves saved values within 1–10', () => {
  for (const [saved, expected] of [
    [undefined, 3],
    [0.25, 1],
    [2, 2],
    [10, 10],
    [99, 10],
  ]) {
    const preferences = createFoldedPreferences(
      { cameraSettings: { third: { sensitivity: saved } } },
      () => {},
    );
    assert.equal(preferences.values.cameraSettings.third.sensitivity, expected);
    preferences.resetCamera();
    assert.equal(preferences.values.cameraSettings.third.sensitivity, 3);
  }
});

test('shared fog distances persist, enforce ordering and reset with all camera settings', () => {
  let saved;
  const prefs = createFoldedPreferences({}, (values) => {
    saved = structuredClone(values);
  });
  assert.deepEqual(prefs.values.viewDistance, { fogNear: 200, fogFar: 220, renderDistance: 230 });
  assert.equal(prefs.setViewDistance('fogNear', 290), 210);
  assert.equal(prefs.setViewDistance('fogFar', 300), 220);
  assert.equal(prefs.setViewDistance('renderDistance', 40), 230);
  prefs.setViewDistance('renderDistance', 260);
  prefs.setViewDistance('fogFar', 220);
  prefs.setViewDistance('fogNear', 100);
  prefs.save();
  const restored = createFoldedPreferences(saved, () => {});
  assert.deepEqual(restored.values.viewDistance, {
    fogNear: 100,
    fogFar: 220,
    renderDistance: 260,
  });
  restored.setCamera('third', 'distance', 20);
  restored.setCamera('overhead', 'scale', 24);
  const distance = restored.values.viewDistance;
  restored.resetCamera();
  const defaults = createFoldedPreferences({}, () => {}).values;
  assert.equal(restored.values.viewDistance, distance);
  assert.deepEqual(restored.values.cameraSettings, defaults.cameraSettings);
  assert.deepEqual(restored.values.viewDistance, defaults.viewDistance);
});

test('legacy fog values migrate from the selected view and invalid distances are normalized', () => {
  const prefs = createFoldedPreferences(
    {
      cameraView: 'overhead',
      cameraSettings: {
        third: { fogNear: 40, fogFar: 100 },
        overhead: { fogNear: 75, fogFar: 160 },
      },
    },
    () => {},
  );
  assert.deepEqual(prefs.values.viewDistance, { fogNear: 75, fogFar: 160, renderDistance: 200 });
  assert.equal(prefs.values.cameraSettings.third.fogNear, undefined);
  const invalid = createFoldedPreferences(
    {
      viewDistance: {
        fogNear: 900,
        fogFar: 900,
        renderDistance: -100,
      },
    },
    () => {},
  );
  assert.deepEqual(invalid.values.viewDistance, { fogNear: 20, fogFar: 30, renderDistance: 40 });
  const bad = createFoldedPreferences(
    { viewDistance: { fogNear: null, fogFar: 'invalid' } },
    () => {},
  );
  assert.deepEqual(bad.values.viewDistance, { fogNear: 200, fogFar: 220, renderDistance: 230 });
});

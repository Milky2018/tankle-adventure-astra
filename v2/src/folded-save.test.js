import test from 'node:test';
import assert from 'node:assert/strict';
import { createFoldedSave, SETTINGS_KEY } from './folded-save.js';
import { foldedBlocked, initialFoldedState, foldedSolids } from './folded-layout.js';
import { sideObstacles } from './folded-side-layout.js';

function memoryStorage(entries = []) {
  const data = new Map(entries);
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
}

test('campaign and each preview preserve their 0.1.0 save keys and initial equipment', () => {
  const storage = memoryStorage();
  const campaign = createFoldedSave(null, () => storage);
  const progress = { ...campaign.load(), anchor: 'roof', phoenix: true, mortarModule: true };
  campaign.save(progress);
  assert.equal(JSON.parse(storage.getItem('furnace-born-v2-city')).anchor, 'roof');
  for (const route of ['foundry', 'garden', 'freight']) {
    const preview = createFoldedSave(route, () => storage);
    const state = preview.load();
    assert.equal(state.anchor, route === 'foundry' ? 'awakening' : 'turntable');
    assert.equal(state.overdrive, route !== 'foundry');
    assert.equal(state.magnetModule, route === 'garden');
    assert.equal(state.mortarModule, route === 'freight');
    preview.save(state);
    assert.ok(storage.getItem(`furnace-born-v2-folded-${route}`));
    preview.reset();
    assert.equal(storage.getItem(`furnace-born-v2-folded-${route}`), null);
    assert.equal(campaign.load().anchor, 'distribution');
    assert.equal(campaign.load().phoenix, true);
  }
});

test('old saves retain thermal and ending migrations but drop transient arena state', () => {
  const storage = memoryStorage([
    [
      'furnace-born-v2-city',
      JSON.stringify({
        anchor: 'last-refuge',
        keeper: true,
        'pressure-return': true,
        combatArena: 'keeper',
        unknown: true,
      }),
    ],
  ]);
  const saves = createFoldedSave(null, () => storage);
  const state = saves.load();
  assert.equal(state['core-feed'], true);
  assert.equal(state['pressure-thermal'], true);
  assert.equal(state.combatArena, undefined);
  assert.equal(state.unknown, undefined);
  saves.saveSettings({ cameraView: 'third', cameraSettings: { third: { sensitivity: 1.5 } } });
  assert.deepEqual(JSON.parse(storage.getItem(SETTINGS_KEY)), saves.loadSettings());
  saves.reset();
  assert.equal(saves.load().anchor, 'awakening');
  assert.equal(saves.loadSettings().cameraSettings.third.sensitivity, 1.5);
});

test('corrupt, denied and full storage cannot prevent a playable new session', () => {
  const broken = memoryStorage([
    ['furnace-born-v2-city', '{'],
    [SETTINGS_KEY, '{'],
  ]);
  for (const storage of [
    () => broken,
    () => {
      throw new Error('denied');
    },
    () => ({
      getItem() {
        throw new Error('denied');
      },
      setItem() {
        throw new Error('full');
      },
      removeItem() {
        throw new Error('denied');
      },
    }),
  ]) {
    const saves = createFoldedSave(null, storage);
    assert.equal(saves.load().anchor, 'awakening');
    assert.deepEqual(saves.loadSettings(), {});
    assert.doesNotThrow(() => {
      saves.save(saves.load());
      saves.saveSettings({});
      saves.reset();
    });
  }
});

test('moving machinery belongs to one session and never mutates authored geometry or saved progress', () => {
  const first = initialFoldedState(),
    second = initialFoldedState();
  const cover = first.bodies.obstacles.find((body) => body.id === 'sorter-cover');
  const carrier = first.bodies.solids.find((body) => body.id === 'press-carrier');
  cover.x = 136;
  carrier.x = -42;
  assert.equal(second.bodies.obstacles.find((body) => body.id === cover.id).x, 116);
  assert.equal(sideObstacles.find((body) => body.id === cover.id).x, 116);
  assert.equal(foldedSolids.find((body) => body.id === carrier.id).x, -30);
  assert.equal(foldedBlocked(137, 24, -107, first, 0)?.id, 'sorter-cover');
  assert.equal(foldedBlocked(-40, -16, 49, first, 0)?.id, 'press-carrier');
  assert.equal(JSON.parse(JSON.stringify(first)).bodies, undefined);
  assert.equal(
    initialFoldedState(first).bodies.obstacles.find((body) => body.id === cover.id).x,
    116,
  );
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createProgression, controlChanges } from './folded-progression.js';
import { initialFoldedState, completeProgress, recordPuzzleState } from './folded-state.js';
import { foldedControls, foldedSolids, foldedPickups, foldedLiftDefs } from './folded-content.js';
import { activeSolid } from './folded-layout.js';
import { circuitReady, circuitTargetKey } from './folded-signal-state.js';

const gate = (x) => ({ id: 'test-door', x, y: 0, z: 0, w: 1, d: 4, h: 3 });
const control = { id: 'test-switch', kind: 'shot', effects: ['test-switch', 'test-door'] };
const near = gate(18),
  far = gate(90);
const links = [near, far].map((target) => ({
  id: control.id,
  target: target.id,
  targetKey: circuitTargetKey(target),
  points: [
    [0, 0, 0],
    [target.x, 0, 0],
  ],
}));

test('a command, individual cable arrivals and save restoration work without a scene', () => {
  const state = initialFoldedState(),
    p = createProgression(state, links, [control]);
  assert.equal(p.activate(control.id, 'use', {}, 0), false);
  assert.equal(p.activate(control.id, 'cannon', {}, 0), true);
  assert.equal(p.activate(control.id, 'cannon', {}, 0), false);
  assert.equal(activeSolid(near, state), true);
  assert.equal(state['test-door'], undefined);
  p.advance(1.4, 1.4);
  assert.equal(activeSolid(near, state), false);
  assert.equal(activeSolid(far, state), true);
  const restored = initialFoldedState(JSON.parse(JSON.stringify(state)));
  const resumed = createProgression(restored, links, [control]);
  assert.equal(activeSolid(near, restored), false);
  resumed.advance(3.6, 5);
  assert.equal(activeSolid(far, restored), false);
  assert.equal(restored['test-door'], true);
  assert.equal(resumed.signals.elapsed(control.id, 5), 5);
});

test('completion events propagate exactly once, while reads cannot advance simulation', () => {
  const state = initialFoldedState(),
    p = createProgression(state, links, []);
  assert.ok(completeProgress(state, control.id));
  p.advance(0, 10);
  const before = JSON.stringify(state);
  for (let i = 0; i < 100; i++) {
    p.signals.active(control.id);
    p.signals.pending(control.id);
    circuitReady(state, control.id, near);
  }
  assert.equal(JSON.stringify(state), before);
  assert.equal(completeProgress(state, control.id), false);
  p.advance(5, 15);
  assert.equal(p.signals.pending(control.id), undefined);
  p.advance(0, 20);
  assert.equal(p.signals.pending(control.id), undefined);
  assert.equal(p.complete(control.id, 20), false);
});

test('all ordinary receiver commands describe their complete effects without mutating inputs', () => {
  for (const c of foldedControls.filter(
    (c) => !c.requires && !c.pressure && !c.cycle && !c.slide,
  )) {
    const state = initialFoldedState(),
      before = JSON.stringify(state);
    const weapon = c.weapons?.[0] || (c.kind === 'shot' ? 'cannon' : c.kind);
    const changes = controlChanges(c, weapon, { magnet: true }, state, 0);
    assert.deepEqual(
      changes,
      Object.fromEntries((c.effects || [c.id]).map((id) => [id, true])),
      c.id,
    );
    assert.equal(JSON.stringify(state), before, c.id);
    assert.equal(controlChanges(c, 'use', { magnet: true }, state, 0), null, c.id);
    if (c.kind === 'magnet')
      assert.equal(controlChanges(c, 'magnet', { magnet: false }, state, 0), null, c.id);
  }
});

test('puzzle completion records durable rewards once and keeps serialization separate from runtime', () => {
  const state = initialFoldedState();
  const puzzle = { rail: { solved: true }, gutter: { grown: true }, pending: {} };
  recordPuzzleState(state, puzzle);
  recordPuzzleState(state, puzzle);
  assert.deepEqual(state.progressEvents, ['rail-crossing', 'garden-bloom']);
  puzzle.gutter.grown = false;
  assert.equal(state.sidePuzzles.gutter.grown, true);
  const saved = JSON.parse(JSON.stringify(state));
  assert.equal(saved.progressEvents, undefined);
  assert.equal(saved.bodies, undefined);
  const restored = initialFoldedState(saved);
  assert.equal(restored['garden-bloom'], true);
  assert.deepEqual(restored.progressEvents, []);
});

test('authored content is immutable and sessions do not share nested machine configuration', () => {
  const first = initialFoldedState(),
    second = initialFoldedState();
  const a = first.bodies.solids.find((s) => s.rail);
  const b = second.bodies.solids.find((s) => s.id === a.id);
  const definition = foldedSolids.find((s) => s.id === a.id);
  a.rail.min -= 10;
  a.x += 4;
  assert.equal(b.rail.min, definition.rail.min);
  assert.equal(b.x, definition.x);
  assert.throws(() => {
    definition.rail.min = 0;
  }, TypeError);
  for (const data of [foldedControls, foldedSolids, foldedPickups, foldedLiftDefs])
    assert.ok(Object.isFrozen(data));
});

test('legacy magnetic unlocks restore without obsolete rail coordinates', () => {
  const state = initialFoldedState({
    'arsenal-return': true,
    'collimator-drawer': true,
    slidePositions: { 'arsenal-return': -44, 'collimator-drawer': -70 },
  });
  for (const id of ['arsenal-return', 'collimator-drawer']) {
    assert.equal(state.slidePositions[id], undefined);
    assert.equal(
      activeSolid(
        state.bodies.solids.find((b) => b.id === id),
        state,
      ),
      false,
    );
  }
});

test('machine completion does not replay an already delivered start command', () => {
  const state = initialFoldedState();
  const c = { id: 'delivery', kind: 'shot', effects: ['delivery-started'] };
  const p = createProgression(
    state,
    [
      {
        id: 'delivery',
        points: [
          [0, 0, 0],
          [18, 0, 0],
        ],
      },
    ],
    [c],
  );
  assert.ok(p.activate('delivery', 'cannon', {}, 0));
  p.advance(1.4, 1.4);
  assert.equal(state['delivery-started'], true);
  completeProgress(state, 'delivery');
  p.advance(0, 10);
  assert.equal(p.signals.pending('delivery'), undefined);
  assert.equal(p.signals.elapsed('delivery', 10), 10);
});

test('compiled content owns every object instead of freezing authored region exports', async () => {
  const content = await import('./folded-content.js');
  const sources = await Promise.all([
    import('./folded-city-layout.js'),
    import('./folded-expansion-layout.js'),
    import('./folded-exploration-layout.js'),
    import('./folded-refuge-network.js'),
    import('./folded-side-layout.js'),
  ]);
  const originals = new Set();
  function collect(value) {
    if (!value || typeof value !== 'object' || originals.has(value)) return;
    originals.add(value);
    for (const child of Object.values(value)) collect(child);
  }
  for (const source of sources)
    for (const value of Object.values(source)) if (Array.isArray(value)) collect(value);
  function check(value) {
    if (!value || typeof value !== 'object') return;
    assert.equal(originals.has(value), false, 'compiled data aliases an authored object');
    assert.ok(Object.isFrozen(value));
    for (const child of Object.values(value)) check(child);
  }
  for (const name of [
    'foldedDecks',
    'foldedSolids',
    'foldedControls',
    'foldedHives',
    'foldedPickups',
    'foldedEnemies',
    'foldedBattles',
    'foldedLiftDefs',
  ])
    check(content[name]);
});

test('signal observations are immutable snapshots, not writable simulation handles', () => {
  const state = initialFoldedState();
  const p = createProgression(state, links, [control]);
  p.activate(control.id, 'cannon', {}, 0);
  const pending = p.signals.pending(control.id);
  assert.throws(() => {
    pending.remaining = 0;
  }, TypeError);
  assert.throws(() => {
    pending.changes['test-door'] = false;
  }, TypeError);
  assert.throws(() => {
    pending.targets[0].duration = 0;
  }, TypeError);
  p.advance(1.4, 1.4);
  assert.equal(pending.remaining, 5, 'a captured observation must not advance with the clock');
  assert.equal(activeSolid(near, state), false);
  assert.equal(activeSolid(far, state), true);
  const restored = createProgression(initialFoldedState(JSON.parse(JSON.stringify(state))), links, [
    control,
  ]);
  assert.throws(() => {
    restored.signals.pending(control.id).changes['test-door'] = false;
  }, TypeError);
});

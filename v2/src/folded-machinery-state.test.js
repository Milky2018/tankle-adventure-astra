import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { initialFoldedState, serializeFoldedState, turnMirror } from './folded-state.js';
import { advanceMachineryState, resetMachineryLifts } from './folded-machinery-state.js';
import { stepLifts } from './folded-machinery.js';
import { traceFoldedLaser } from './folded-laser.js';

test('mechanical records are session-owned and excluded from durable saves', () => {
  const a = initialFoldedState(),
    b = initialFoldedState();
  for (const name of ['lifts', 'pickups', 'mirrors']) {
    assert.notEqual(a.machinery[name], b.machinery[name]);
    for (const body of a.machinery[name]) {
      assert.equal(body.root, undefined);
      assert.equal(body.mesh, undefined);
      assert.equal(body.material, undefined);
    }
  }
  a.machinery.lifts[0].stops[0] = -100;
  a.machinery.mirrors[0].normal.x = 42;
  assert.notEqual(b.machinery.lifts[0].stops[0], -100);
  assert.notEqual(b.machinery.mirrors[0].normal.x, 42);
  assert.equal(serializeFoldedState(a).machinery, undefined);
  assert.equal(JSON.parse(JSON.stringify(a)).machinery, undefined);
});

test('mirror commands advance the physical reflection without constructing a scene', () => {
  const state = initialFoldedState();
  const m = state.machinery.mirrors.find((mirror) => mirror.turnable);
  const start = m.normal.clone();
  turnMirror(state, m.id);
  assert.equal(m.angle, 0, 'the command starts a turn, not an instant teleport');
  advanceMachineryState(state.machinery, state, 0.125);
  assert.equal(m.angle, -Math.PI / 4);
  const half = start.clone().applyAxisAngle(new Vector3(0, 1, 0), -Math.PI / 4);
  assert.ok(m.normal.distanceTo(half) < 1e-10);
  let casts = 0;
  const direction = new Vector3(1, 0, 0);
  const path = traceFoldedLaser(new Vector3(), direction, () =>
    casts++ === 0 ? { mirror: m, point: direction.clone(), distance: 1 } : null,
  );
  assert.ok(
    path[1].end.clone().sub(path[1].start).normalize().distanceTo(direction.clone().reflect(half)) <
      1e-10,
  );
  advanceMachineryState(state.machinery, state, 0.125);
  assert.equal(m.angle, -Math.PI / 2);
  const restored = initialFoldedState(serializeFoldedState(state));
  assert.ok(
    restored.machinery.mirrors.find((mirror) => mirror.id === m.id).normal.distanceTo(m.normal) <
      1e-10,
  );
});

test('lift rewards follow simulation and reconstruction without a render update', () => {
  const state = initialFoldedState();
  const reward = state.machinery.pickups.find((pickup) => pickup.id === 'magnetModule');
  const lift = state.machinery.lifts.find((body) => body.id === reward.lift);
  assert.equal(reward.y, lift.stops.at(-1));
  state[lift.lock] = true;
  const before = lift.y;
  stepLifts(state.machinery.lifts, state, { x: 10000, y: 0, z: 10000 }, 0.5);
  advanceMachineryState(state.machinery, state, 0.5);
  assert.ok(lift.y < before);
  assert.equal(reward.y, lift.y);
  resetMachineryLifts(state.machinery, state);
  assert.equal(reward.y, lift.stops[0]);
  assert.equal(lift.wait, 0);
});

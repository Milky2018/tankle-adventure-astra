import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createFoldedEffects } from './effects.js';

test('sparks advance through death hold and dispose materials without disposing cached geometry', () => {
  const scene = new T.Scene(),
    effects = createFoldedEffects(scene);
  effects.burst(new T.Vector3(2, 3, 4), 0xffaa22, 3);
  const sparks = [...scene.children];
  let disposed = 0,
    geometryDisposed = 0;
  for (const spark of sparks) spark.material.addEventListener('dispose', () => disposed++);
  sparks[0].geometry.addEventListener('dispose', () => geometryDisposed++);
  effects.updateSparks(0.1);
  assert.ok(sparks[0].position.y > 3);
  assert.equal(scene.children.length, 3);
  effects.updateSparks(0.31);
  assert.equal(scene.children.length, 0);
  assert.equal(disposed, 3);
  assert.equal(geometryDisposed, 0);
});

test('blast rings expire or clear once while surviving geometry can be reused', () => {
  const scene = new T.Scene(),
    effects = createFoldedEffects(scene);
  const wave = effects.ripple(new T.Vector3(1, 2, 3), 6, 0xffffff, 1, 0.8);
  let disposed = 0;
  wave.material.addEventListener('dispose', () => disposed++);
  effects.updateWaves(0.2);
  assert.equal(wave.scale.x, 3);
  assert.ok(Math.abs(wave.material.opacity - 0.64) < 1e-9);
  effects.updateWaves(0.8);
  assert.equal(wave.parent, null);
  assert.equal(effects.waves.length, 0);
  const next = effects.ripple(new T.Vector3(), 4, 0xffffff, 1, 1);
  assert.equal(next.geometry, wave.geometry);
  next.material.addEventListener('dispose', () => disposed++);
  effects.clearWaves();
  effects.updateWaves(1);
  assert.equal(disposed, 2);
  assert.equal(scene.children.length, 0);
});

test('shield fragments share the spark lifetime without clearing another scene', () => {
  const scene = new T.Scene(),
    effects = createFoldedEffects(scene);
  const other = new T.Scene(),
    otherEffects = createFoldedEffects(other);
  otherEffects.burst(new T.Vector3(), 0xffffff, 1);
  effects.pullShield({ x: 0, y: 0, z: 0 }, new T.Vector3(10, 1.5, 0));
  const fragment = scene.children[0];
  effects.updateSparks(0.1);
  assert.equal(fragment.position.x, 1.8);
  effects.updateSparks(0.4);
  assert.equal(scene.children.length, 0);
  assert.equal(other.children.length, 1);
});

test('Phoenix exhaust projects behind the hull and reuses meshes across activation', async () => {
  const { createPhoenixExhaust } = await import('./effects.js');
  const body = new T.Group(),
    effect = createPhoenixExhaust(body);
  assert.equal(effect.root.visible, false);
  const jets = [...effect.root.children];
  effect.update(true, 1);
  body.rotation.y = Math.PI / 2;
  body.updateMatrixWorld(true);
  const tip = jets[0].localToWorld(new T.Vector3(0, 0, -1));
  const nozzle = jets[0].localToWorld(new T.Vector3());
  assert.ok(tip.x < nozzle.x - 2);
  effect.update(false, 2);
  assert.equal(effect.root.visible, false);
  effect.update(true, 3);
  assert.deepEqual(effect.root.children, jets);
});

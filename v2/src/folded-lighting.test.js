import test from 'node:test';
import assert from 'node:assert/strict';
import { Scene, Vector3 } from 'three';
import { makeFoldedLighting } from './folded-lighting.js';
import { makeRegionalLights } from './folded-regional-scenery.js';

const rooms = [
  { region: 'garden', x: 0, y: 0, z: 0, w: 20, d: 20 },
  { region: 'furnace', x: 100, y: -40, z: 0, w: 20, d: 20 },
];

test('regional light changes blend over time without changing the light or shadow budget', () => {
  const scene = new Scene(),
    lighting = makeFoldedLighting(scene, rooms);
  lighting.update({ x: 10, y: 0, z: 10 }, 0);
  const before = lighting.sun.color.clone(),
    intensity = lighting.sun.intensity;
  lighting.update({ x: 110, y: -40, z: 10 }, 0);
  assert.ok(lighting.sun.color.equals(before));
  lighting.update({ x: 110, y: -40, z: 10 }, 1 / 60);
  assert.ok(!lighting.sun.color.equals(before));
  assert.ok(Math.abs(lighting.sun.intensity - intensity) < 0.03);
  for (let i = 0; i < 300; i++) lighting.update({ x: 110, y: -40, z: 10 }, 1 / 60);
  const lights = scene.children.filter((o) => o.isLight);
  assert.equal(lights.length, 4);
  assert.equal(lights.filter((o) => o.castShadow).length, 1);
  assert.ok(
    lights.filter((o) => o.isAmbientLight || o.isHemisphereLight).every((o) => o.intensity >= 0.65),
  );
});

test('a bright furnace source fades before its pooled light moves to a different floor', () => {
  const scene = new Scene();
  const pool = makeRegionalLights(scene, [
    { x: 0, y: 4, z: 0, ground: 0, color: 0xffa35c, intensity: 110 },
    { x: 0, y: 28, z: 0, ground: 24, color: 0xffffff },
  ]);
  for (let i = 1; i <= 90; i++) pool.update(i / 60, { x: 0, y: 0, z: 0 });
  const slot = pool.slots.find((s) => s.source?.ground === 0);
  assert.ok(slot.light.intensity > 100);
  pool.update(91 / 60, { x: 0, y: 24, z: 0 });
  assert.ok(slot.light.position.equals(new Vector3(0, 4, 0)));
  for (let i = 92; i <= 300; i++) pool.update(i / 60, { x: 0, y: 24, z: 0 });
  assert.equal(pool.slots.filter((s) => s.light.intensity > 1).length, 1);
  assert.equal(pool.slots.find((s) => s.light.intensity > 1).source.ground, 24);
  assert.equal(scene.children.filter((o) => o.isLight).length, 3);
});

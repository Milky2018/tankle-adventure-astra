import { box } from './world.js';
import { Group } from 'three';
import test from 'node:test';
import assert from 'node:assert/strict';
import { MeshBasicMaterial, Mesh, BoxGeometry, Vector3 } from 'three';
import { createRenderPolicy, RENDER_ROLES } from './folded-render-policy.js';

test('every role owns its depth contract across fading and view changes, preserving shadow casters', () => {
  const policy = createRenderPolicy();
  for (const [role, rule] of Object.entries(RENDER_ROLES)) {
    const m = policy.material(new MeshBasicMaterial(), role),
      mesh = new Mesh(new BoxGeometry(), m);
    mesh.castShadow = true;
    const depth = policy.depthMaterial(role);
    for (const third of [true, false, true]) {
      policy.setView(third);
      policy.fade(m, 0.16);
      assert.equal(m.opacity, 0.16);
      assert.equal(m.depthWrite, false);
      assert.equal(mesh.castShadow, true);
      policy.fade(m, 1);
      assert.equal(m.opacity, 1);
      assert.equal(m.depthWrite, rule.depthWrite);
      assert.equal(depth.transparent, false);
      assert.equal(depth.depthWrite, true);
      assert.equal(depth.colorWrite, false);
    }
  }
});

test('conflicting material roles fail instead of silently changing another mesh', () => {
  const p = createRenderPolicy(),
    m = p.material(new MeshBasicMaterial(), 'floor');
  assert.equal(p.material(m, 'floor'), m);
  assert.throws(() => p.material(m, 'fixture'), /already registered/);
  const clone = p.material(m, 'fixture', { clone: true });
  assert.notEqual(m, clone);
  assert.equal(m.depthWrite, false);
  assert.equal(clone.depthWrite, true);
});

test('aim queries and color use the same obstruction cone, protecting support surfaces', () => {
  const p = createRenderPolicy(),
    player = new Vector3(),
    context = { third: true, camera: new Vector3(0, 5, 15) };
  assert.equal(p.aimVisible(new Vector3(0, 3.3, 7.5), player, context), false);
  assert.equal(p.aimVisible(new Vector3(8, 3.3, 7.5), player, context), true);
  const point = new Vector3(0, 3.3, 7.5);
  assert.equal(
    p.opacity(point, player, {
      ...context,
      terrain: true,
      support: [{ x: -2, z: 6, y: 3.3, w: 4, d: 4 }],
    }),
    1,
  );
});

test('scene shaders cannot mutate a shared primitive or inherit another session camera', () => {
  const source = box(new Group(), 1, 1, 1, 0, 0, 0, 0x749f94).material;
  const first = createRenderPolicy(),
    second = createRenderPolicy();
  assert.throws(() => first.material(source, 'scenery'), /Clone shared primitive/);
  const a = first.material(source, 'scenery', { clone: true }),
    b = second.material(source, 'scenery', { clone: true });
  assert.equal(source.userData.aperture, undefined);
  const compile = (material) => {
    const shader = {
      uniforms: {},
      vertexShader: '#include <common>\n#include <project_vertex>',
      fragmentShader: '#include <common>\n#include <opaque_fragment>',
    };
    material.onBeforeCompile(shader);
    return shader;
  };
  const sa = compile(a),
    sb = compile(b);
  first.update(new Vector3(1, 2, 3));
  second.update(new Vector3(10, 20, 30));
  assert.deepEqual(sa.uniforms.aperturePlayer.value.toArray(), [1, 2, 3]);
  assert.deepEqual(sb.uniforms.aperturePlayer.value.toArray(), [10, 20, 30]);
});

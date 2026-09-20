import * as T from 'three';
import { box, mat, C } from './world.js';
import { SIGNAL } from './folded-visibility.js';

// Scene-local effects own their materials; primitive geometry is shared.
// Separate update methods preserve the simulation's existing effect order.
export function createFoldedEffects(scene) {
  const sparks = [],
    waves = [];
  const projectileGeometry = new T.SphereGeometry(0.23, 10, 6);
  const blastGeometry = new T.RingGeometry(0.78, 1, 40);
  function burst(pos, color = C.yellow, count = 8) {
    for (let i = 0; i < count; i++) {
      const mesh = box(scene, 0.13, 0.13, 0.38, pos.x, pos.y, pos.z, mat(color, true), 0);
      sparks.push({
        mesh,
        velocity: new T.Vector3(Math.sin(i * 2.4) * 5, 2 + (i % 3), Math.cos(i * 2.4) * 5),
        age: 0,
      });
    }
  }
  function ripple(point, radius, color, life, opacity) {
    const mesh = new T.Mesh(
      blastGeometry,
      new T.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        depthWrite: false,
        side: T.DoubleSide,
      }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(point);
    mesh.position.y += 0.08;
    scene.add(mesh);
    waves.push({ mesh, age: 0, radius, life, opacity });
    return mesh;
  }

  function projectile(origin, dir, mortar = false, hostile = false, heavy = false) {
    const material = mat(hostile ? 0xff783e : 0xfff1b0, true),
      mesh = new T.Mesh(projectileGeometry, material);
    mesh.scale.setScalar(mortar ? 2 : heavy ? 2.4 : hostile ? 1.65 : 1.3);
    if (!mortar) box(mesh, 0.4, 0.4, 2.2, 0, 0, -0.5, material, 0.1).castShadow = false;
    mesh.position.copy(origin);
    mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), dir);
    scene.add(mesh);
    return mesh;
  }
  function updateSparks(dt) {
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.age += dt;
      s.velocity.y -= dt * 14;
      s.mesh.position.addScaledVector(s.velocity, dt);
      if (s.age > 0.4) {
        scene.remove(s.mesh);
        s.mesh.material.dispose();
        sparks.splice(i, 1);
      }
    }
  }
  function updateWaves(dt) {
    for (let i = waves.length - 1; i >= 0; i--) {
      const w = waves[i];
      w.age += dt;
      w.mesh.scale.setScalar(w.radius * Math.min(1, w.age / (w.life * 0.4)));
      w.mesh.material.opacity = w.opacity * Math.max(0, 1 - w.age / w.life);
      if (w.age >= w.life) {
        scene.remove(w.mesh);
        w.mesh.material.dispose();
        waves.splice(i, 1);
      }
    }
  }

  function pullShield(point, origin) {
    const fragment = box(
      scene,
      1.8,
      1.2,
      0.25,
      point.x,
      point.y + 1.5,
      point.z,
      mat(SIGNAL.magnet),
    );
    sparks.push({
      mesh: fragment,
      velocity: origin.clone().sub(fragment.position).normalize().multiplyScalar(18),
      age: 0,
    });
  }
  function clearWaves() {
    for (const wave of waves) {
      scene.remove(wave.mesh);
      wave.mesh.material.dispose();
    }
    waves.length = 0;
  }
  return {
    burst,
    ripple,
    projectile,
    pullShield,
    updateSparks,
    updateWaves,
    clearWaves,
    get waves() {
      return waves;
    },
  };
}

export function createPhoenixExhaust(body) {
  const root = new T.Group();
  root.name = 'phoenix-exhaust';
  body.add(root);
  root.visible = false;
  const geometry = new T.ConeGeometry(1, 1, 12).translate(0, 0.5, 0);
  geometry.rotateX(-Math.PI / 2);
  const outer = new T.MeshBasicMaterial({
    color: 0xffe99c,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });
  const inner = new T.MeshBasicMaterial({
    color: 0xfff9db,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });
  const jets = [-0.72, 0.72].map((x) => {
    const jet = new T.Mesh(geometry, outer);
    jet.position.set(x, 1.05, -1.4);
    const core = new T.Mesh(geometry, inner);
    core.scale.set(0.5, 0.5, 0.65);
    jet.add(core);
    root.add(jet);
    return jet;
  });
  return {
    root,
    update(active, time) {
      root.visible = active;
      for (const [i, jet] of jets.entries()) {
        const pulse = 1 + 0.09 * Math.sin(time * 31 + i * 2);
        jet.scale.set(0.4 * pulse, 0.3 * pulse, 3.2 * pulse);
      }
    },
  };
}

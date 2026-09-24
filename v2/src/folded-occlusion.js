import * as T from 'three';
import { inRect, deckHeight } from './hoist-layout.js';

export function createOcclusion(scene, aperture, batchStatic) {
  const occluders = [];
  const circuitDepth = new T.Group();
  circuitDepth.name = 'folded-circuit-depth';
  scene.add(circuitDepth);
  const circuitDepthMaterial = aperture.depthMaterial('floorDetail');
  function registerOccluder(
    root,
    owner = null,
    { clone = true, dynamic = false, layered = false, cameraSoft = false } = {},
  ) {
    const meshes = [],
      cache = new Map();
    root.traverse((mesh) => {
      if (!mesh.isMesh) return;
      if (cameraSoft) cache.clear();
      const original = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const materials = original.map((material) => {
        if (!cache.has(material)) {
          const role = owner?.mass
            ? 'structure'
            : owner?.beltSurface
              ? 'belt'
              : owner?.floorMark
                ? 'floorDetail'
                : 'fixture';
          cache.set(material, aperture.material(material, role, { clone }));
        }
        return cache.get(material);
      });
      mesh.material = Array.isArray(mesh.material) ? materials : materials[0];
      meshes.push({ mesh, materials: materials.map((material) => ({ material })) });
      // Fixed circuits also need depth, including their instanced lamps.
      if (owner?.circuit) {
        for (let i = 0; i < (mesh.isInstancedMesh ? mesh.count : 1); i++) {
          const depth = new T.Mesh(mesh.geometry, circuitDepthMaterial);
          depth.matrixAutoUpdate = false;
          if (mesh.isInstancedMesh) {
            mesh.getMatrixAt(i, depth.matrix);
            depth.matrix.premultiply(mesh.matrixWorld);
          } else depth.matrix.copy(mesh.matrixWorld);
          circuitDepth.add(depth);
        }
      }
    });
    const bounds = new T.Box3().setFromObject(root),
      local = bounds.clone().applyMatrix4(new T.Matrix4().copy(root.matrixWorld).invert());
    if (owner?.model) {
      const radius = Math.hypot(
        Math.max(Math.abs(local.min.x), Math.abs(local.max.x)),
        Math.max(Math.abs(local.min.z), Math.abs(local.max.z)),
      );
      local.min.x = local.min.z = -radius;
      local.max.x = local.max.z = radius;
    }
    if (owner?.shutter) local.max.y += 1.5;
    if (owner?.arms) bounds.max.y += 0.7;
    occluders.push({ root, owner, meshes, local, bounds, dynamic, layered, opacity: 1 });
  }
  const sight = new T.Ray(),
    sightPoint = new T.Vector3(),
    sightBounds = new T.Box3();
  function update(dt, p, { thirdPerson, supportPatches, sightDirection }) {
    if (thirdPerson) return;
    sight.origin.set(p.x, p.y + 1.3, p.z);
    sight.direction.copy(sightDirection);
    for (const object of occluders) {
      if (object.dynamic) {
        object.root.updateWorldMatrix(true, false);
        object.bounds.copy(object.local).applyMatrix4(object.root.matrixWorld);
      }
      sightBounds.copy(object.bounds);
      sightBounds.min.x -= 1.6;
      sightBounds.max.x += 1.6;
      sightBounds.min.z -= 1.6;
      sightBounds.max.z += 1.6;
      // Keep same-floor threats and inset controls legible while tall scenery fades.
      const supportingBelt =
        object.owner?.beltSurface &&
        supportPatches.some(
          (d) =>
            inRect(object.root.position.x, object.root.position.z, d) &&
            Math.abs(deckHeight(d, object.root.position.z) - object.root.position.y) < 0.3,
        );
      const eligible =
        !supportingBelt &&
        (object.owner?.mount
          ? Math.abs(object.owner.ground - p.y) > 3
          : object.owner?.model || object.owner?.enemy || object.owner?.arms
            ? Math.abs(object.owner.y - p.y) > 3
            : true);
      const hit =
        eligible && sightBounds.max.y > p.y + 2.4 && sight.intersectBox(sightBounds, sightPoint);
      const distance = hit ? sightPoint.distanceTo(sight.origin) : Infinity;
      const obscures = !!hit && distance > 1.8 && distance < 58;
      const ground =
        object.owner?.ground ?? (object.owner?.kind ? object.owner.y - 1.3 : object.owner?.y);
      const otherFloor = object.layered && Math.abs(ground - p.y) > 3;
      const targetOpacity =
        thirdPerson || object.owner?.mass || object.owner?.circuit
          ? 1
          : obscures
            ? object.owner?.h && Math.abs(object.owner.y - p.y) < 3
              ? 0.36
              : 0.14
            : otherFloor
              ? 0.28
              : 1;
      object.opacity = T.MathUtils.damp(object.opacity, targetOpacity, 10, dt);
      if (Math.abs(object.opacity - targetOpacity) < 0.001) object.opacity = targetOpacity;
      object.root.userData.cutaway = obscures && object.opacity < 0.4;
      if (object.owner) object.owner.opacity = object.opacity;
      if (object.lastOpacity === object.opacity) continue;
      for (const { materials } of object.meshes) {
        // Camera cutaways affect the color pass, never the physical shadow caster.
        for (const { material } of materials) aperture.fade(material, object.opacity);
      }
      object.lastOpacity = object.opacity;
    }
  }
  function reset() {
    for (const object of occluders) {
      object.opacity = 1;
      if (object.owner) object.owner.opacity = 1;
      object.lastOpacity = undefined;
      object.root.userData.cutaway = false;
      for (const part of object.meshes)
        for (const { material } of part.materials) aperture.fade(material, 1);
    }
  }
  function seal() {
    batchStatic(circuitDepth, { preserveGeometry: true });
    circuitDepth.updateWorldMatrix(true, true);
    circuitDepth.traverse((object) => {
      object.matrixAutoUpdate = false;
      object.matrixWorldAutoUpdate = false;
    });
  }
  return { register: registerOccluder, update, reset, seal, objects: occluders };
}

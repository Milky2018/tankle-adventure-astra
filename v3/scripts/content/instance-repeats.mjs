import { Matrix4 } from "three";

// Static batches in the editor can contain thousands of copies of the same
// primitive. WebGL2 can draw those copies together even without multi-draw.
export function instanceRepeatedShapes(scene, sourceView) {
  if (scene.animations?.length) return;
  const materials = new Map(scene.materials.map(m => [m.uuid, m]));
  const geometries = new Map(scene.geometries.map(g => [g.uuid, g]));
  const textures = new Map(scene.textures.map(t => [t.uuid, t]));
  const images = new Map(scene.images.map(i => [i.uuid, i]));
  function extract(node) {
    const m = materials.get(node.material);
    if (node.type !== "BatchedMesh" || !node.name?.startsWith("static/") ||
        node.userData?.binding || node.children?.length || node.colorsTexture ||
        node.instanceInfo.length < 128 || !m || (m.colorWrite !== false &&
        (m.userData?.renderRole !== "floor" || m.type !== "MeshToonMaterial"))) return [];
    const g = geometries.get(node.geometry);
    if (!g?.data?.index) return [];
    const data = images.get(textures.get(node.matricesTexture.uuid)?.image)?.url?.data;
    if (!data) return [];
    const repeats = new Map();
    node.instanceInfo.forEach((entry, i) => {
      if (!entry.active || !entry.visible) return;
      const id = entry.geometryIndex;
      if (!repeats.has(id)) repeats.set(id, []);
      repeats.get(id).push(i);
    });
    const instances = [];
    for (const [id, copies] of repeats) {
      if (copies.length < 96) continue;
      const info = node.geometryInfo[id];
      const tag = node.uuid + "-repeats-" + id;
      const attributes = {};
      for (const [name, attr] of Object.entries(g.data.attributes)) {
        const offset = info.vertexStart * attr.itemSize * globalThis[attr.type].BYTES_PER_ELEMENT;
        attributes[name] = { ...attr, array: { ...attr.array, byteOffset: attr.array.byteOffset + offset, length: info.vertexCount * attr.itemSize } };
      }
      const indices = sourceView(g.data.index.array).subarray(info.start, info.start + info.count);
      const index = { ...g.data.index, array: Array.from(indices, value => value - info.vertexStart) };
      scene.geometries.push({ uuid: tag, type: "BufferGeometry", data: { attributes, index, boundingSphere: info.boundingSphere } });
      const cells = new Map();
      for (const i of copies) {
        const offset = i * 16;
        const key = [12, 13, 14].map(axis => Math.floor(data[offset + axis] / 96 + 0.5)).join("/");
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key).push(...data.slice(offset, offset + 16));
        node.instanceInfo[i].visible = false;
      }
      for (const [cell, matrices] of cells) {
        instances.push({
          uuid: tag + "/" + cell, name: "Instanced city detail", type: "InstancedMesh",
          geometry: tag, material: node.material, matrix: node.matrix, layers: node.layers,
          matrixAutoUpdate: false, castShadow: node.castShadow, receiveShadow: node.receiveShadow,
          renderOrder: node.renderOrder, frustumCulled: node.frustumCulled, visible: node.visible,
          count: matrices.length / 16,
          instanceMatrix: { itemSize: 16, type: "Float32Array", array: matrices, normalized: false },
        });
      }
    }
    return instances;
  }
  function visit(parent) {
    if (!parent.children) return;
    parent.children = parent.children.flatMap(node => {
      visit(node);
      const extracted = extract(node);
      if (!extracted.length) return [node];
      return node.instanceInfo.some(i => i.active && i.visible) ? [node, ...extracted] : extracted;
    });
  }
  visit(scene.object);
  instanceBeltRollers(scene, materials);
}

function instanceBeltRollers(scene, materials) {
  const groups = new Map();
  for (const root of scene.object.children ?? []) {
    const belt = /^world\/belts\/([^/]+)\/segments\/\d+\/root$/.exec(root.userData?.binding ?? "");
    if (!belt || root.visible === false || root.renderOrder || root.type !== "Group") continue;
    for (const roller of root.children ?? []) {
      if (roller.type !== "Mesh" || roller.children?.length || roller.visible === false ||
          !roller.userData?.binding?.startsWith(root.userData.binding.slice(0, -4) + "rollers/")) continue;
      const material = materials.get(roller.material);
      if (!material) continue;
      const { uuid, name, ...properties } = material;
      const key = JSON.stringify([belt[1], roller.geometry, properties, roller.castShadow, roller.receiveShadow, roller.layers, roller.renderOrder]);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ root, roller, belt: belt[1] });
    }
  }
  let serial = 0;
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const matrices = [];
    const { roller: first, belt } = group[0];
    const binding = "world/beltInstances/" + belt + "/" + serial++;
    scene.object.children.push({
      uuid: binding, name: "Conveyor rollers", type: "InstancedMesh",
      matrix: new Matrix4().toArray(), matrixAutoUpdate: false, geometry: first.geometry, material: first.material,
      layers: first.layers, renderOrder: first.renderOrder, castShadow: first.castShadow, receiveShadow: first.receiveShadow,
      userData: { binding }, count: group.length, instanceMatrix: { type: "Float32Array", itemSize: 16, array: matrices, normalized: false },
    });
    for (const [index, { root, roller }] of group.entries()) {
      matrices.push(...new Matrix4().fromArray(root.matrix).multiply(new Matrix4().fromArray(roller.matrix)).elements);
      roller.type = "Object3D";
      roller.userData.rollerBatch = binding;
      roller.userData.instance = index;
      delete roller.material;
      delete roller.geometry;
    }
  }
}

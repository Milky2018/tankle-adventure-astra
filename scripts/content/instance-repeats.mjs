import { instance_belt_rollers } from "../../_build/js/release/build/tooling/art/art.js";

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
  instance_belt_rollers(scene);
}

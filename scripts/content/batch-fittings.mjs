// Combine fixed visual fittings in the frame of their movable parent. The
// editor keeps the individual meshes. Switch lamps, collision meshes and
// animated parts retain their runtime bindings, transforms and materials.
import { batch_fittings, project, geometry_center, read_geometry, depth_geometry } from "../../_build/js/release/build/tooling/art/art.js";

function cellKey(p, size) {
  return p.map(v => Math.floor(v / size + 0.5)).join("/");
}

export function batchFittings(scene, sourceView, barriers = [], controls = []) {
  if (scene.animations?.length) return;
  const geometry = new Map(scene.geometries.map(g => [g.uuid, g]));
  const materials = new Map(scene.materials.map(m => [m.uuid, m]));
  const centers = new Map();
  function geometryCenter(g) {
    if (!centers.has(g.uuid)) {
      const sphere = g.data.boundingSphere;
      if (sphere) {
        centers.set(g.uuid, sphere.center);
      } else {
        const a = g.data.attributes.position;
        centers.set(g.uuid, geometry_center(sourceView(a.array), a.itemSize));
      }
    }
    return centers.get(g.uuid);
  }

  const sources = new Map();
  function bufferGeometry(g) {
    if (sources.has(g.uuid)) return sources.get(g.uuid);
    const attributes = Object.fromEntries(Object.entries(g.data.attributes).map(([name, a]) =>
      [name, { ...a, array: sourceView(a.array) }]));
    const index = g.data.index ? sourceView(g.data.index.array) : indexTriangles(attributes);
    const result = read_geometry(attributes, index);
    sources.set(g.uuid, result);
    return result;
  }
  // With no color, alpha or texture input the depth pass only needs positions.
  // Preserve its original material, order and parent; combine the remaining
  // less-frequent shapes after repeated primitives have been instanced.
  function regroupDepth(multiDraw) {
    const textures = new Map(scene.textures.map(t => [t.uuid, t]));
    const images = new Map(scene.images.map(i => [i.uuid, i]));
    function groupDepth(node) {
      for (const child of node.children ?? []) groupDepth(child);
      const material = materials.get(node.material);
      if (node.type !== "BatchedMesh" || !node.name?.startsWith("static/") ||
          node.userData?.binding || node.children?.length || node.colorsTexture ||
          material?.type !== "MeshBasicMaterial" || material.colorWrite !== false ||
          material.transparent || material.map || material.alphaMap || material.envMap ||
          material.userData?.surfaceFinish || node.castShadow) return;
      const live = node.instanceInfo.map((instance, index) => ({ instance, index }))
        .filter(({ instance }) => instance.active && instance.visible);
      if (live.length < 64) return;
      const g = geometry.get(node.geometry);
      if (!g?.data?.index || g.data.attributes.position.type !== "Float32Array" || g.data.attributes.position.itemSize !== 3) return;
      const matrices = images.get(textures.get(node.matricesTexture.uuid)?.image)?.url.data;
      const positions = sourceView(g.data.attributes.position.array);
      const indices = sourceView(g.data.index.array);
      const bins = new Map();
      for (const { instance, index } of live) {
        const info = node.geometryInfo[instance.geometryIndex];
        const matrix = matrices.slice(16 * index, 16 * index + 16);
        const point = project(matrix, ...(info.boundingSphere?.center ?? [0, 0, 0]));
        const key = cellKey(point, 24);
        if (!bins.has(key)) bins.set(key, { positions: [], indices: [] });
        const bin = bins.get(key);
        const offset = bin.positions.length / 3 - info.vertexStart;
        for (let i = info.vertexStart; i < info.vertexStart + info.vertexCount; i++) {
          bin.positions.push(...project(matrix, positions[3*i], positions[3*i+1], positions[3*i+2]));
        }
        for (let i = info.start; i < info.start + info.count; i++) bin.indices.push(indices[i] + offset);
      }
      const cells = Array.from(bins.values(), bin => depth_geometry(bin.positions, bin.indices));
      const draw = multiDraw(cells);
      // Replace only batch storage. Keep the authored object identity, transform
      // and render state so other opaque/transparent passes keep their order.
      for (const key of ["geometry", "geometryInfo", "instanceInfo", "availableInstanceIds", "availableGeometryIds",
        "nextIndexStart", "nextVertexStart", "geometryCount", "maxInstanceCount", "maxVertexCount", "maxIndexCount",
        "geometryInitialized", "matricesTexture", "indirectTexture", "boundingSphere", "boundingBox"]) node[key] = draw[key];
    }
    groupDepth(scene.object);
  }
  batch_fittings(scene, barriers, controls, geometryCenter, bufferGeometry, regroupDepth);
}

// The editor stores many tools and cast housings as unindexed triangles.
// Share vertices only if *all* their attribute bytes match, including UV seams,
// split normals and authored vertex colors. Triangle order is unchanged.
function indexTriangles(attributesByName) {
  const attributes = Object.entries(attributesByName);
  const fields = attributes.map(([, a]) => ({
    bytes: Buffer.from(a.array.buffer, a.array.byteOffset, a.array.byteLength),
    width: a.itemSize * a.array.BYTES_PER_ELEMENT,
  }));
  const record = Buffer.allocUnsafe(fields.reduce((sum, f) => sum + f.width, 0));
  const unique = new Map();
  const first = [];
  const indices = [];
  for (let i = 0; i < attributesByName.position.array.length / attributesByName.position.itemSize; i++) {
    let offset = 0;
    for (const { bytes, width } of fields) {
      bytes.copy(record, offset, i * width, (i + 1) * width);
      offset += width;
    }
    const key = record.toString("latin1");
    let index = unique.get(key);
    if (index === undefined) {
      index = first.length;
      unique.set(key, index);
      first.push(i);
    }
    indices.push(index);
  }
  if (first.length !== indices.length) {
    for (const [name, attr] of attributes) {
      const width = attr.itemSize;
      const values = new attr.array.constructor(first.length * width);
      for (let j = 0; j < first.length; j++) {
        const start = first[j] * width;
        values.set(attr.array.subarray(start, start + width), j * width);
      }
      attr.array = values;
    }
  }
  return first.length > 65535 ? Uint32Array.from(indices) : Uint16Array.from(indices);
}

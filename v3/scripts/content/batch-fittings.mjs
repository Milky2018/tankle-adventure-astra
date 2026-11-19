// Combine fixed visual fittings in the frame of their movable parent. The
// editor keeps the individual meshes. Switch lamps, collision meshes and
// animated parts retain their runtime bindings, transforms and materials.
import { BatchedMesh, MeshBasicMaterial, BufferGeometry, BufferAttribute, Color, Matrix4, Vector3 } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// These groups contain authored scenery. Other named or bound groups remain
// transform/visibility boundaries, including moving machinery and raycast roots.
const scenery = /^(Works|Engine house|Workshop services|Hoist well|Carriage|Control bezel|Roof trusses|Roof soffits|Equipment|District equipment|Inspection gallery|Hydraulic rods|Filter garden|Angle guards) · /;
const fixedPlacement = /^world\/(?:occluders\/\d+|signs\/\d+|controlFeeds\/[^/]+|belts\/[^/]+\/segments\/\d+)\/root$/;

function cellKey(p, size) {
  return [p.x, p.y, p.z].map(v => Math.floor(v / size + 0.5)).join("/");
}

export function batchFittings(scene, sourceView, barriers = [], controls = []) {
  if (scene.animations?.length) return;
  const walls = new Map(barriers.filter(b => b.permanent && !b.motion && !b.rail && !b.arena)
    .map(b => ["world/walls/" + b.circuitKey + "/mesh", b]));
  const fixedControls = new Set(controls.filter(c => !c.mount).map(c => "world/controls/" + c.id + "/root"));
  const geometry = new Map(scene.geometries.map(g => [g.uuid, g]));
  const materials = new Map(scene.materials.map(m => [m.uuid, m]));
  const groups = new Map();
  const tinted = new Map();
  let serial = 0;
  const centers = new Map();
  function geometryCenter(g) {
    if (!centers.has(g.uuid)) {
      const sphere = g.data.boundingSphere;
      if (sphere) {
        centers.set(g.uuid, new Vector3(...sphere.center));
      } else {
        const a = g.data.attributes.position;
        const position = new BufferAttribute(sourceView(a.array), a.itemSize);
        const bounds = new BufferGeometry().setAttribute("position", position);
        bounds.computeBoundingBox();
        centers.set(g.uuid, bounds.boundingBox.getCenter(new Vector3()));
      }
    }
    return centers.get(g.uuid);
  }

  function visit(node, anchor, parentMatrix, picking) {
    const binding = node.userData?.binding ?? "";
    const transform = parentMatrix.clone().multiply(new Matrix4().fromArray(node.matrix));
    const fixedTrack = /^enemies\/[^/]+\/model\/tracks\/\d+$/.test(binding);
    const placement = fixedPlacement.test(binding);
    const fixedControl = fixedControls.has(binding);
    const fitting = placement || /^world\/occluders\/\d+\/meshes\/\d+\/mesh$/.test(binding);
    // Window sills and glazing share a depth plane with the facade. Their
    // original draw order matters when the camera fades that facade.
    const decoration = !binding && scenery.test(node.name);
    const wall = anchor === scene.object && walls.get(binding);
    // Authored snapshots can contain a displaced wall. Only flatten the mesh
    // when its placement also matches the simulation's stationary transform.
    const fixedWall = wall && transform.elements[12] === wall.x + wall.w / 2 &&
      transform.elements[13] === wall.y + wall.h / 2 && transform.elements[14] === wall.z + wall.d / 2;
    const m = materials.get(node.material);
    const g = geometry.get(node.geometry);
    const attrs = g?.data?.attributes;
    const supported = attrs && ["normal,position,uv", "color,normal,position,uv"].includes(Object.keys(attrs).sort().join());
    const collider = scenery.test(node.name) && binding.startsWith("structure/") && binding.endsWith("/fixture-collider");
    const canCross = node.visible !== false && !node.renderOrder && !node.animations?.length;
    const leaf = !node.children?.length;
    if ((fitting || (leaf && (fixedTrack || decoration))) && node.type === "Mesh" &&
        node.visible !== false && m?.color !== undefined && m.visible !== false && supported &&
        (!m.vertexColors || attrs.color?.itemSize === 3) && transform.determinant() > 0) {
      const { uuid, name, color, vertexColors, ...properties } = m;
      const signature = JSON.stringify(properties);
      if (!tinted.has(signature)) {
        const material = { ...properties, uuid: "fitting-material-" + serial++, color: 0xffffff, vertexColors: true };
        tinted.set(signature, material.uuid);
        scene.materials.push(material);
      }
      const id = tinted.get(signature);
      const center = geometryCenter(g).clone().applyMatrix4(transform);
      const size = anchor === scene.object ? 240 : 40;
      const cell = cellKey(center, size);
      const key = JSON.stringify([anchor.uuid, id, cell, node.castShadow, node.receiveShadow, node.renderOrder, node.layers]);
      if (!groups.has(key)) groups.set(key, { anchor, id, list: [] });
      groups.get(key).list.push({ node, transform, g, center, tint: new Color(color), vertexColors, picking });
    }
    // Unbound folders inside a mechanism inherit its motion. Bound children
    // (lamp, cover, arm, etc.) start a new frame of their own.
    const wrapper = !binding && (!node.name || node.name.startsWith("local-circuit:"));
    const flatten = canCross && (fixedWall || (fitting && node.type === "Mesh") || (node.type === "Group" && (placement || fixedControl || decoration || wrapper || collider)));
    for (const child of node.children ?? []) {
      visit(child, flatten ? anchor : node, flatten ? transform : new Matrix4(), collider || (flatten && picking));
    }
  }
  visit(scene.object, scene.object, new Matrix4(), false);
  const sources = new Map();
  function bufferGeometry(g) {
    if (sources.has(g.uuid)) return sources.get(g.uuid);
    const b = new BufferGeometry();
    for (const [name, a] of Object.entries(g.data.attributes)) {
      b.setAttribute(name, new BufferAttribute(sourceView(a.array), a.itemSize, a.normalized));
    }
    if (g.data.index) {
      b.setIndex(new BufferAttribute(sourceView(g.data.index.array), 1));
    } else {
      indexTriangles(b);
    }
    sources.set(g.uuid, b);
    return b;
  }

  function mergeParts(parts) {
    const pieces = parts.map(({ g, vertexColors, transform, tint }) => {
      const b = bufferGeometry(g).clone();
      b.applyMatrix4(transform);
      if (vertexColors) {
        const color = b.attributes.color;
        const values = new Float32Array(3 * color.count);
        for (let i = 0; i < color.count; i++) {
          values[3*i] = color.getX(i) * tint.r;
          values[3*i+1] = color.getY(i) * tint.g;
          values[3*i+2] = color.getZ(i) * tint.b;
        }
        b.setAttribute("color", new BufferAttribute(values, 3));
      } else {
        const rgb = tint.toArray();
        const colors = new Float32Array(3 * b.attributes.position.count);
        for (let i = 0; i < colors.length; i += 3) colors.set(rgb, i);
        b.setAttribute("color", new BufferAttribute(colors, 3));
      }
      return b;
    });
    const merged = mergeGeometries(pieces);
    merged.computeBoundingSphere();
    return merged;
  }

  // The extension submits the cells together. WebGL's fallback submits one
  // already merged cell at a time, rather than drawing every fitting again.
  function multiDraw(cells) {
    let vertices = 0, indices = 0;
    for (const g of cells) {
      vertices += g.attributes.position.count;
      indices += g.index.count;
    }
    const batch = new BatchedMesh(cells.length, vertices, indices, new MeshBasicMaterial());
    for (const g of cells) batch.addInstance(batch.addGeometry(g));
    batch.computeBoundingBox();
    batch.computeBoundingSphere();
    batch.uuid = "fitting-multidraw-" + serial++;
    batch.geometry.uuid = batch.uuid + "-geometry";
    for (const [k, t] of Object.entries({ matrices: batch._matricesTexture, indices: batch._indirectTexture })) {
      t.uuid = batch.uuid + "-" + k;
      t.source.uuid = t.uuid + "-source";
    }
    const json = batch.toJSON();
    scene.geometries.push(...json.geometries);
    scene.images.push(...json.images);
    scene.textures.push(...json.textures);
    for (const k of ["matricesTexture", "indirectTexture"]) json.object[k] = { uuid: json.object[k].uuid };
    return json.object;
  }
  // With no color, alpha or texture input the depth pass only needs positions.
  // Preserve its original material, order and parent; combine the remaining
  // less-frequent shapes after repeated primitives have been instanced.
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
    const matrix = new Matrix4();
    const point = new Vector3();
    const bins = new Map();
    for (const { instance, index } of live) {
      const info = node.geometryInfo[instance.geometryIndex];
      matrix.fromArray(matrices, 16 * index);
      point.fromArray(info.boundingSphere?.center ?? [0, 0, 0]).applyMatrix4(matrix);
      const key = cellKey(point, 24);
      if (!bins.has(key)) bins.set(key, { positions: [], indices: [] });
      const bin = bins.get(key);
      const offset = bin.positions.length / 3 - info.vertexStart;
      for (let i = info.vertexStart; i < info.vertexStart + info.vertexCount; i++) {
        point.fromArray(positions, 3 * i).applyMatrix4(matrix);
        bin.positions.push(point.x, point.y, point.z);
      }
      for (let i = info.start; i < info.start + info.count; i++) bin.indices.push(indices[i] + offset);
    }
    const cells = Array.from(bins.values(), bin => {
      const g = new BufferGeometry();
      g.setAttribute("position", new BufferAttribute(new Float32Array(bin.positions), 3));
      g.setIndex(bin.indices);
      return g;
    });
    const draw = multiDraw(cells);
    // Replace only batch storage. Keep the authored object identity, transform
    // and render state so other opaque/transparent passes keep their order.
    for (const key of ["geometry", "geometryInfo", "instanceInfo", "availableInstanceIds", "availableGeometryIds",
      "nextIndexStart", "nextVertexStart", "geometryCount", "maxInstanceCount", "maxVertexCount", "maxIndexCount",
      "geometryInitialized", "matricesTexture", "indirectTexture", "boundingSphere", "boundingBox"]) node[key] = draw[key];
  }
  groupDepth(scene.object);

  const replaced = new Set();
  for (const { anchor, id, list } of groups.values()) {
    if (list.length < 2) continue;
    const { castShadow, receiveShadow, renderOrder, layers } = list[0].node;
    const cells = new Map();
    for (const part of list) {
      const p = part.center;
      const key = anchor === scene.object ? cellKey(p, 24) : "local";
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push(part);
    }
    const geometries = Array.from(cells.values(), mergeParts);
    let draw;
    if (geometries.length > 1) {
      draw = multiDraw(geometries);
    } else {
      const [merged] = geometries;
      merged.uuid = "fitting-geometry-" + serial++;
      scene.geometries.push(merged.toJSON());
      draw = { uuid: "fitting-chunk-" + serial++, type: "Mesh", geometry: merged.uuid, matrix: new Matrix4().toArray() };
    }
    Object.assign(draw, { name: "Workshop fittings", material: id, matrixAutoUpdate: false, castShadow, receiveShadow, renderOrder, layers });
    anchor.children.push(draw);
    for (const { node, picking } of list) {
      if (picking) {
        node.visible = false;
      } else if (node.children?.length) {
        node.type = "Group";
        delete node.geometry;
        delete node.material;
      } else {
        replaced.add(node);
      }
    }
  }
  function removeOriginals(node) {
    if (!node.children) return;
    node.children = node.children.filter(child => !replaced.has(child));
    node.children.forEach(removeOriginals);
  }
  removeOriginals(scene.object);
}


// The editor stores many tools and cast housings as unindexed triangles.
// Share vertices only if *all* their attribute bytes match, including UV seams,
// split normals and authored vertex colors. Triangle order is unchanged.
function indexTriangles(geometry) {
  const attributes = Object.entries(geometry.attributes);
  const fields = attributes.map(([, a]) => ({
    bytes: Buffer.from(a.array.buffer, a.array.byteOffset, a.array.byteLength),
    width: a.itemSize * a.array.BYTES_PER_ELEMENT,
  }));
  const record = Buffer.allocUnsafe(fields.reduce((sum, f) => sum + f.width, 0));
  const unique = new Map();
  const first = [];
  const indices = [];
  for (let i = 0; i < geometry.attributes.position.count; i++) {
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
      geometry.setAttribute(name, new BufferAttribute(values, width, attr.normalized));
    }
  }
  geometry.setIndex(indices);
}

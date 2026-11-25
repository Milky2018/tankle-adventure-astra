// Bake the circulation works' visibility cells from the editable building envelope.
// A missing, slanted or unsupported face stays open. Cell boundaries never add walls.
import { compose_transform, determinant, project } from "../../_build/js/release/build/tooling/art/art.js";

const step = 6;
const low = [150, -42, 36],
  high = [474, 0, 216];
const size = high.map((v, i) => (v - low[i]) / step);
const axes = [0, 1, 2];
const tile = (p, axis) => p[0] + "/" + p[1] + "/" + p[2] + "/" + axis;
const cell = (p) => p[0] + size[0] * (p[1] + size[1] * p[2]);

export function bakeRoomPortals(scene, sourceView) {
  const walls = new Map();
  const geometry = new Map(scene.geometries.map((g) => [g.uuid, g]));
  const materials = new Map(scene.materials.map((m) => [m.uuid, m]));
  function visit(node, parent) {
    if (node.visible === false || node.animations?.length) return;
    const transform = compose_transform(parent, node.matrix);
    const mat = materials.get(node.material);
    if (
      node.userData?.renderRole === "enclosure" &&
      mat?.userData?.renderRole === "enclosure" &&
      !mat.transparent &&
      !mat.alphaTest &&
      !mat.alphaMap &&
      !mat.alphaHash &&
      !mat.wireframe &&
      !mat.side &&
      !mat.clippingPlanes?.length &&
      mat.depthTest !== false &&
      (mat.opacity ?? 1) === 1 &&
      mat.visible !== false &&
      mat.depthWrite !== false &&
      determinant(transform) > 0
    ) {
      const data = geometry.get(node.geometry)?.data;
      if (
        data?.index &&
        data.attributes.position?.itemSize === 3 &&
        !data.groups?.length &&
        !data.morphAttributes
      ) {
        const vertices = sourceView(data.attributes.position.array);
        const indices = sourceView(data.index.array);
        const point = (i) =>
          project(transform, vertices[i*3], vertices[i*3+1], vertices[i*3+2]);
        for (let j = 0; j + 5 < indices.length; j += 6) {
          const [a, b, c, d, e, f] = indices.subarray(j, j + 6);
          if (a !== d || c !== e) continue;
          const p = [a, b, c, f].map(point);
          const axis = axes.find((k) => p.every((v) => v[k] === p[0][k]));
          if (axis === undefined) continue;
          const u = (axis + 1) % 3,
            v = (axis + 2) % 3;
          // Only a complete axis-aligned rectangular pair with consistent winding seals tiles.
          const [a0, b0, c0, d0] = p;
          if (
            !(
              (a0[u] === b0[u] && b0[v] === c0[v] && c0[u] === d0[u] && d0[v] === a0[v]) ||
              (a0[v] === b0[v] && b0[u] === c0[u] && c0[v] === d0[v] && d0[u] === a0[u])
            )
          )
            continue;
          const cross = (b0[u] - a0[u]) * (c0[v] - a0[v]) - (b0[v] - a0[v]) * (c0[u] - a0[u]);
          const q = [0, 0, 0];
          q[axis] = (a0[axis] - low[axis]) / step;
          if (!cross || !Number.isInteger(q[axis]) || q[axis] < 0 || q[axis] > size[axis]) continue;
          const begin = (k) => Math.max(0, Math.ceil((Math.min(...p.map((w) => w[k])) - low[k]) / step));
          const end = (k) =>
            Math.min(size[k], Math.floor((Math.max(...p.map((w) => w[k])) - low[k]) / step));
          const u1 = end(u),
            v1 = end(v),
            v0 = begin(v);
          for (q[u] = begin(u); q[u] < u1; q[u]++)
            for (q[v] = v0; q[v] < v1; q[v]++) {
              const key = tile(q, axis);
              walls.set(key, (walls.get(key) ?? 0) | (cross > 0 ? 1 : 2));
            }
        }
      }
    }
    for (const child of node.children ?? []) visit(child, transform);
  }
  if (scene.animations?.length) return;
  const envelope = scene.object.children?.find((n) => n.name === "City · building envelope");
  if (!envelope || scene.object.visible === false || scene.object.animations?.length) return;
  visit(envelope, scene.object.matrix);
  if (!walls.size) return;
  const ids = new Int32Array(size[0] * size[1] * size[2]).fill(-1);
  const rooms = [];
  function slab(lo, hi, a, n, fn) {
    const u = (a + 1) % 3,
      v = (a + 2) % 3,
      p = [...lo];
    p[a] = n;
    for (p[v] = lo[v]; p[v] < hi[v]; p[v]++)
      for (p[u] = lo[u]; p[u] < hi[u]; p[u]++) if (!fn(p)) return false;
    return true;
  }
  for (let y = 0; y < size[1]; y++)
    for (let z = 0; z < size[2]; z++)
      for (let x = 0; x < size[0]; x++) {
        const lo = [x, y, z],
          hi = [x + 1, y + 1, z + 1];
        if (ids[cell(lo)] >= 0) continue;
        for (const a of [0, 2, 1]) {
          while (
            hi[a] < size[a] &&
            slab(lo, hi, a, hi[a], (p) => ids[cell(p)] < 0 && !walls.has(tile(p, a)))
          )
            hi[a]++;
        }
        const id = rooms.length;
        for (let i = lo[0]; i < hi[0]; i++)
          slab(lo, hi, 0, i, (p) => {
            ids[cell(p)] = id;
            return true;
          });
        rooms.push({ lo, hi, edges: [] });
      }
  const world = (p) => p.map((n, k) => low[k] + n * step);
  for (const { lo, hi, edges } of rooms)
    for (const a of axes)
      for (const sign of [-1, 1]) {
        const plane = sign > 0 ? hi[a] : lo[a],
          u = (a + 1) % 3,
          v = (a + 2) % 3;
        const width = hi[u] - lo[u],
          height = hi[v] - lo[v],
          labels = new Int32Array(width * height);
        slab(lo, hi, a, plane, (p) => {
          const next = [...p];
          if (sign < 0) next[a]--;
          const dest = next[a] < 0 || next[a] >= size[a] ? -1 : ids[cell(next)];
          const closed = !!((walls.get(tile(p, a)) ?? 0) & (sign > 0 ? 2 : 1));
          labels[(p[v] - lo[v]) * width + p[u] - lo[u]] = 2 * (dest + 1) + Number(closed);
          return true;
        });
        for (let j = 0; j < height; j++)
          for (let i = 0; i < width; i++) {
            const label = labels[j * width + i];
            if (label < 0) continue;
            let w = 1,
              h = 1;
            while (i + w < width && labels[j * width + i + w] === label) w++;
            while (
              j + h < height &&
              labels.subarray((j + h) * width + i, (j + h) * width + i + w).every((x) => x === label)
            )
              h++;
            for (let k = 0; k < h; k++) labels.fill(-1, (j + k) * width + i, (j + k) * width + i + w);
            const min = [...lo],
              max = [...lo];
            min[a] = max[a] = plane;
            min[u] += i;
            max[u] += i + w;
            min[v] += j;
            max[v] += j + h;
            edges.push([
              Math.floor(label / 2) - 1,
              (a + 1) * sign,
              label % 2,
              ...world(min),
              ...world(max),
            ]);
          }
      }
  // Moving hierarchies retain their normal renderer and picking paths.
  const fixed =
    /^(Workshop fittings$|Works · |Factory windows · |Roof soffits · |Workshop services · |Hoist well · |Filter garden · |city-architecture$|city-history$|West reservoir · |Furnace hall · |Garden filter banks · )/;
  const fixedBinding = /^world\/(surfaces|occluders|signs|controlFeeds)\//;
  function mark(node) {
    if (node.visible === false || node.animations?.length) return;
    const binding = node.userData?.binding;
    if (binding && !fixedBinding.test(binding) && !binding.endsWith("/fixture-collider")) return;
    const material = materials.get(node.material);
    if (
      ["Mesh", "BatchedMesh", "InstancedMesh"].includes(node.type) &&
      material &&
      material.depthTest !== false &&
      (node.layers ?? 1) === 1
    ) {
      node.userData ??= {};
      node.userData.portalStatic = true;
    }
    for (const child of node.children ?? []) mark(child);
  }
  for (const root of scene.object.children ?? []) {
    if (fixed.test(root.name) || fixedBinding.test(root.userData?.binding)) mark(root);
  }
  scene.object.userData ??= {};
  scene.object.userData.portalRooms = rooms.map(({ lo, hi, edges }) => [...world(lo), ...world(hi), edges]);
}

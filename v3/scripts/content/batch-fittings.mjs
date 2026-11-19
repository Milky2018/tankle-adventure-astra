// Combine fixed visual fittings in the frame of their movable parent. The
// editor keeps the individual meshes. Switch lamps, collision meshes and
// animated parts retain their runtime bindings, transforms and materials.
import { BufferGeometry, BufferAttribute, Color, Matrix4, Vector3 } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export function batchFittings(scene, sourceView) {
  const geometry = new Map(scene.geometries.map(g => [g.uuid, g]));
  const materials = new Map(scene.materials.map(m => [m.uuid, m]));
  const groups = new Map();
  const tinted = new Map();
  let serial = 0;
  function visit(node, anchor, matrix) {
    const binding = node.userData?.binding ?? "";
    const fixedTrack = /^enemies\/[^/]+\/model\/tracks\/\d+$/.test(binding);
    const fitting = fixedTrack || /^world\/occluders\/\d+\/meshes\/\d+\/mesh$/.test(binding);
    const staticRoot = /^world\/occluders\/\d+\/root$/.test(binding);
    const local = new Matrix4().fromArray(node.matrix);
    const transform = matrix.clone().multiply(local);
    const m = materials.get(node.material);
    const g = geometry.get(node.geometry);
    if (fitting && node.type === "Mesh" && !node.children?.length && node.visible !== false &&
        m && !m.vertexColors && m.color !== undefined && g?.data?.attributes?.normal &&
        transform.determinant() > 0 && Object.keys(g.data.attributes).sort().join() === "normal,position,uv") {
      const { uuid, name, color, ...properties } = m;
      const signature = JSON.stringify(properties);
      if (!tinted.has(signature)) {
        const material = { ...properties, uuid: "fitting-material-" + serial++, color: 0xffffff, vertexColors: true };
        tinted.set(signature, material.uuid);
        scene.materials.push(material);
      }
      const id = tinted.get(signature);
      const center = new Vector3().setFromMatrixPosition(transform);
      const cell = [center.x, center.y, center.z].map(v => Math.floor((v + 20) / 40));
      const key = JSON.stringify([anchor.uuid, id, cell, node.castShadow, node.receiveShadow, node.renderOrder, node.layers]);
      if (!groups.has(key)) groups.set(key, { anchor, id, list: [] });
      groups.get(key).list.push({ node, transform, g, tint: new Color(color) });
      return;
    }
    // Only the unanimated placement groups of the static occluders can be
    // crossed. All other parents keep control of their original descendants.
    const flatten = staticRoot && node.visible !== false;
    if (node.children) {
      for (const child of node.children) visit(child, flatten ? anchor : node, flatten ? transform : new Matrix4());
    }
  }
  visit(scene.object, scene.object, new Matrix4());
  const replaced = new Set();
  for (const { anchor, id, list } of groups.values()) {
    if (list.length < 2) continue;
    const pieces = list.map(({ node, transform, g, tint }) => {
      const b = new BufferGeometry();
      for (const [key, a] of Object.entries(g.data.attributes)) {
        b.setAttribute(key, new BufferAttribute(sourceView(a.array).slice(), a.itemSize, a.normalized));
      }
      if (g.data.index) b.setIndex(new BufferAttribute(sourceView(g.data.index.array), 1));
      if (!b.index) b.setIndex(Array.from({ length: b.attributes.position.count }, (_, i) => i));
      b.applyMatrix4(transform);
      const rgb = tint.toArray();
      const colors = new Float32Array(b.attributes.position.count * 3);
      for (let i = 0; i < colors.length; i += 3) colors.set(rgb, i);
      b.setAttribute("color", new BufferAttribute(colors, 3));
      replaced.add(node);
      return b;
    });
    const merged = mergeGeometries(pieces);
    merged.computeBoundingSphere();
    merged.uuid = "fitting-geometry-" + serial++;
    const g = merged.toJSON();
    scene.geometries.push(g);
    const first = list[0].node;
    anchor.children.push({ uuid:"fitting-chunk-"+serial++, type:"Mesh", name:"Workshop fittings",
      geometry:g.uuid, material:id, matrix:new Matrix4().toArray(), matrixAutoUpdate:false,
      layers:first.layers, castShadow:first.castShadow, receiveShadow:first.receiveShadow, renderOrder:first.renderOrder });
  }
  function removeOriginals(node) {
    if (!node.children) return;
    node.children = node.children.filter(child => !replaced.has(child));
    node.children.forEach(removeOriginals);
  }
  removeOriginals(scene.object);
}

// The driving colliders omit the building skins and decorative roof trusses.
// Bake their broad rectangular faces before the renderer batches their meshes.
import { identity, compose_transform, project } from "../../_build/js/release/build/tooling/art/art.js";

export function bakeCameraFaces(scene, sourceView) {
  const geometry = new Map(scene.geometries.map(g => [g.uuid, g]));
  const faces = new Map();
  const materials = new Map(scene.materials.map(m => [m.uuid, m]));
  function visit(node, parent, fixture) {
    if (node.visible === false || node.animations?.length) return;
    fixture ||= node.userData?.binding?.endsWith("/fixture-collider");
    const matrix = compose_transform(parent, node.matrix);
    const data = geometry.get(node.geometry)?.data;
    const material = materials.get(node.material);
    if ((fixture || node.userData?.renderRole === "enclosure") &&
        data?.attributes.position && material?.visible !== false && !material?.wireframe) {
      const vertices = sourceView(data.attributes.position.array);
      const indices = data.index && sourceView(data.index.array);
      function vertex(n) {
        const i = 3 * (indices ? indices[n] : n);
        return project(matrix, vertices[i], vertices[i+1], vertices[i+2]).map(v => Math.round(v*1000) * 0.001);
      }
      const count = indices?.length ?? vertices.length / 3;
      for (let i = 0; i + 5 < count; i += 6) {
        const points = Array.from({ length: 6 }, (_, j) => vertex(i + j));
        const coords = [0, 1, 2].map(axis =>
          [...new Set(points.map(p => p[axis]))].sort((a, b) => a - b));
        if (coords.some(v => v.length > 2) || coords.filter(v => v.length === 1).length !== 1) continue;
        const spans = coords.map(v => v.at(-1) - v[0]).sort((a, b) => b - a);
        if (spans[0] < 1.8 || spans[1] < 0.35) continue;
        // The triangles must meet along the rectangle's diagonal. Triangles
        // sharing an outside edge leave a hole that the camera can pass through.
        const first = points.slice(0, 3);
        const second = points.slice(3);
        const diagonal = first.filter(p => second.some(q => p.every((v,k) => v === q[k])));
        if (diagonal.length !== 2 ||
            diagonal[0].reduce((sum, v, k) => sum + (v-diagonal[1][k])**2, 0) < spans[0]**2 + spans[1]**2 - 0.00001 ||
            new Set(points.map(p => p.join(","))).size !== 4) continue;
        const face = [...coords.map(v => v[0]), ...coords.map(v => v.at(-1))];
        faces.set(face.join(","), face);
      }
    }
    for (const child of node.children ?? []) visit(child, matrix, fixture);
  }
  visit(scene.object, identity(), false);
  (scene.object.userData ??= {}).cameraFaces = [...faces.values()];
}

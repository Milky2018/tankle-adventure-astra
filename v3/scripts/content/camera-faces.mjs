// The driving colliders omit the building skins and decorative roof trusses.
// Bake their broad rectangular faces before the renderer batches their meshes.
import { Matrix4, Vector3 } from "three";

export function bakeCameraFaces(scene, sourceView) {
  const geometry = new Map(scene.geometries.map(g => [g.uuid, g]));
  const faces = new Map();
  const materials = new Map(scene.materials.map(m => [m.uuid, m]));
  function visit(node, parent, fixture) {
    if (node.visible === false || node.animations?.length) return;
    fixture ||= node.userData?.binding?.endsWith("/fixture-collider");
    const matrix = parent.clone().multiply(new Matrix4().fromArray(node.matrix));
    const data = geometry.get(node.geometry)?.data;
    const material = materials.get(node.material);
    if ((fixture || node.userData?.renderRole === "enclosure") &&
        data?.attributes.position && material?.visible !== false && !material?.wireframe) {
      const vertices = sourceView(data.attributes.position.array);
      const indices = data.index && sourceView(data.index.array);
      function vertex(n) {
        return new Vector3().fromArray(vertices, 3 * (indices ? indices[n] : n))
          .applyMatrix4(matrix).multiplyScalar(1000).round().divideScalar(1000);
      }
      const count = indices?.length ?? vertices.length / 3;
      for (let i = 0; i + 5 < count; i += 6) {
        const points = Array.from({ length: 6 }, (_, j) => vertex(i + j));
        const coords = ["x", "y", "z"].map(axis =>
          [...new Set(points.map(p => p[axis]))].sort((a, b) => a - b));
        if (coords.some(v => v.length > 2) || coords.filter(v => v.length === 1).length !== 1) continue;
        const spans = coords.map(v => v.at(-1) - v[0]).sort((a, b) => b - a);
        if (spans[0] < 1.8 || spans[1] < 0.35) continue;
        // The triangles must meet along the rectangle's diagonal. Triangles
        // sharing an outside edge leave a hole that the camera can pass through.
        const first = points.slice(0, 3);
        const second = points.slice(3);
        const diagonal = first.filter(p => second.some(q => p.equals(q)));
        if (diagonal.length !== 2 ||
            diagonal[0].distanceToSquared(diagonal[1]) < spans[0]**2 + spans[1]**2 - 0.00001 ||
            new Set(points.map(p => p.toArray().join(","))).size !== 4) continue;
        const face = [...coords.map(v => v[0]), ...coords.map(v => v.at(-1))];
        faces.set(face.join(","), face);
      }
    }
    for (const child of node.children ?? []) visit(child, matrix, fixture);
  }
  visit(scene.object, new Matrix4(), false);
  (scene.object.userData ??= {}).cameraFaces = [...faces.values()];
}

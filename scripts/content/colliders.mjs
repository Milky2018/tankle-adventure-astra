import { randomUUID } from "node:crypto";
import { Matrix4, Vector3, Quaternion } from "../../.editor/three-r185/build/three.core.js";

export const collisionCollections = new Set([
  "decks",
  "architecture",
  "obstacles",
]);

// Collision volumes are explicit authoring objects, separate from decorative art.
// They are shown only in the editor and never inserted into the runtime scene.
export function collisionObject(collection, record) {
  const height = collection === "decks" ? 0.25 : record.h;
  const matrix = new Matrix4().compose(
    new Vector3(
      record.x + record.w / 2,
      record.y + (collection === "decks" ? -height / 2 : height / 2),
      record.z + record.d / 2,
    ),
    new Quaternion(),
    new Vector3(record.w, height, record.d),
  );
  return {
    uuid: randomUUID(),
    type: "Mesh",
    name: `${collection}: ${record.id}`,
    geometry: "tankle-editor-collision-box",
    material: "tankle-editor-collision-material",
    matrix: matrix.toArray(),
    userData: {
      editorOnly: true,
      entity: { collection, id: record.id, key: record.id },
      placement: {
        origin: [record.x, record.y, record.z],
        matrix: matrix.toArray(),
      },
    },
  };
}

export function collisionResources(scene) {
  scene.geometries.push({
    uuid: "tankle-editor-collision-box",
    type: "BoxGeometry",
    width: 1,
    height: 1,
    depth: 1,
  });
  scene.materials.push({
    uuid: "tankle-editor-collision-material",
    type: "MeshBasicMaterial",
    color: 0x59d9ff,
    wireframe: true,
  });
}

export function resizeCollision(record, matrix, baseline, collection) {
  for (const index of [1, 2, 4, 6, 8, 9])
    if (Math.abs(matrix.elements[index]) > 1e-5)
      throw new Error(
        "Collision boxes must remain axis-aligned. Rotate the visual mesh separately.",
      );
  const scale = [0, 5, 10].map(
    (index) => matrix.elements[index] / baseline[index],
  );
  if (scale.some((value) => value <= 0 || !Number.isFinite(value)))
    throw new Error("Collision box scale must be positive.");
  const width = record.w * scale[0],
    depth = record.d * scale[2];
  record.x += (record.w - width) / 2;
  record.z += (record.d - depth) / 2;
  record.w = width;
  record.d = depth;
  if (collection !== "decks") {
    const height = record.h * scale[1];
    record.y += (record.h - height) / 2;
    record.h = height;
  } else record.y += 0.125 * (scale[1] - 1);
}

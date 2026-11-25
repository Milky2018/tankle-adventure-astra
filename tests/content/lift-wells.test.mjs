import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import test from "node:test";
import { Box3, Matrix4, Vector3 } from "../../.editor/three-r185/build/three.core.js";

test("static floor and depth batches leave the lift carriages room to descend", () => {
  const scene = JSON.parse(gunzipSync(readFileSync("content/art/city.scene.json.gz")));
  const lifts = JSON.parse(readFileSync("content/levels/city/lifts.json", "utf8"));
  const materials = new Map(scene.materials.map((m) => [m.uuid, m]));
  const images = new Map(scene.images.map((i) => [i.uuid, i]));
  let checked = 0;
  function visit(node, parent) {
    if (node.visible === false) return;
    const world = new Matrix4().multiplyMatrices(parent, new Matrix4().fromArray(node.matrix));
    if (node.type === "BatchedMesh" && materials.get(node.material)?.userData?.renderRole === "floor") {
      const matrices = images.get(node.matricesTexture.image).url.data;
      for (const [i, instance] of node.instanceInfo.entries()) {
        if (!instance.active || !instance.visible) continue;
        const geometry = node.geometryInfo[instance.geometryIndex];
        const transform = world.clone().multiply(new Matrix4().fromArray(matrices, i * 16));
        const bounds = new Box3(
          new Vector3(...geometry.boundingBox.min),
          new Vector3(...geometry.boundingBox.max),
        ).applyMatrix4(transform);
        // A landing ramp can abut a shaft. Only slabs wholly inside the shaft
        // need clearance below the carriage, including on the depth pass.
        for (const lift of lifts) {
          if (bounds.min.x < lift.x - 0.01 || bounds.max.x > lift.x + lift.w + 0.01 ||
              bounds.min.z < lift.z - 0.01 || bounds.max.z > lift.z + lift.d + 0.01) continue;
          if (bounds.max.y < lift.stops[0] - 4 || bounds.min.y > lift.stops.at(-1) + 1) continue;
          checked++;
          assert.ok(bounds.max.y < lift.stops[0] - 0.7, lift.id + " has static flooring in the carriage path");
        }
      }
    }
    for (const child of node.children ?? []) visit(child, world);
  }
  visit(scene.object, new Matrix4());
  assert.ok(checked > 0, "expected recessed landing slabs in the packed city");
});

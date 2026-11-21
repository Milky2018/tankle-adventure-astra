import test from "node:test";
import assert from "node:assert/strict";
import { Matrix4 } from "three";
import { bakeCameraFaces } from "../../scripts/content/camera-faces.mjs";

test("camera bounds follow the placed fixture without sealing gaps between panels", () => {
  const matrix = new Matrix4().identity().toArray();
  const geometry = { uuid: "panel", data: {
    attributes: { position: { array: [0,0,0, 0,3,0, 0,3,4, 0,0,4] } },
    index: { array: [0,1,2, 0,2,3] },
  } };
  const mesh = { matrix, geometry: "panel", material: "metal" };
  const scene = {
    materials: [{ uuid: "metal" }], geometries: [geometry],
    object: { matrix: new Matrix4().makeTranslation(5,0,0).toArray(),
      userData: { binding: "station/fixture-collider" }, children: [
        mesh, { ...mesh, visible: false, matrix: new Matrix4().makeTranslation(0,0,4).toArray() },
      ] },
  };
  bakeCameraFaces(scene, array => array);
  assert.deepEqual(scene.object.userData.cameraFaces, [[5,0,0,5,3,4]]);
  geometry.data.index.array = [0,1,2, 0,1,3];
  bakeCameraFaces(scene, array => array);
  assert.deepEqual(scene.object.userData.cameraFaces, []);
});

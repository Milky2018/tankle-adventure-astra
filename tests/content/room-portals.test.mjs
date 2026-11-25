import assert from "node:assert/strict";
import test from "node:test";
import { Matrix4 } from "../../.editor/three-r185/build/three.core.js";
import { bakeRoomPortals } from "../../scripts/content/room-portals.mjs";

function build(material = {}) {
  // One front-facing panel on x=156, with a doorway immediately to its right.
  const matrix = new Matrix4().toArray();
  const userData = { renderRole: "enclosure" };
  const mesh = { type: "Mesh", material: "wall", geometry: "panel", userData, matrix };
  const scene = {
    object: { matrix, children: [{ name: "City · building envelope", matrix, children: [mesh] }] },
    materials: [{ uuid: "wall", userData, ...material }],
    geometries: [{ uuid: "panel", data: {
      index: { array: Uint16Array.from([0,1,2,0,2,3]) },
      attributes: { position: { itemSize: 3, array: Float32Array.from([
        156,-42,36, 156,0,36, 156,0,42, 156,-42,42,
      ]) } },
    } }],
  };
  bakeRoomPortals(scene, array => array);
  return scene.object.userData?.portalRooms;
}

test("a one-sided enclosure seals its front only and leaves the adjacent doorway open", () => {
  const rooms = build();
  function faceAt(sign, z) {
    const edges = rooms.flatMap(room => room[6]);
    return edges.find(([dest,face,,x,y,minZ,,maxY,maxZ]) =>
      dest >= 0 && face === sign && x === 156 && y < -15 && maxY > -15 && minZ < z && z < maxZ);
  }
  assert.equal(faceAt(-1, 39)[2], 1);
  assert.equal(faceAt(1, 39)[2], 0);
  assert.equal(faceAt(-1, 45)[2], 0);
  assert.equal(faceAt(1, 45)[2], 0);
  assert.equal(build({ transparent: true }), undefined);
  assert.equal(build({ alphaTest: 0.5 }), undefined);
});

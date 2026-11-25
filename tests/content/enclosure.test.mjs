import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { gunzipSync } from "node:zlib";
import { BufferGeometryLoader, FrontSide, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from "../../.editor/three-r185/build/three.core.js";

const read = name => gunzipSync(readFileSync("content/art/city." + name + ".gz"));

test("workshop interiors are enclosed and the open reservoir looks onto the quarry bank", () => {
  const scene = JSON.parse(read("scene.json"));
  const bytes = read("buffers.bin");
  const shell = scene.object.children.find(node => node.name === "City · building envelope");
  const geometries = new Map(scene.geometries.map(g => [g.uuid, g]));
  const materials = new Map(scene.materials.map(m => [m.uuid, m]));
  for (const material of materials.values()) {
    const role = material.userData?.renderRole;
    const solidFinish = ["paving", "masonry", "ironwork"].includes(material.userData?.surfaceFinish);
    if (["structure", "floor", "floorDetail", "scenery", "belt"].includes(role) &&
        (!material.map || solidFinish) &&
        material.colorWrite !== false && (material.opacity ?? 1) === 1 &&
        !material.alphaMap && (material.alphaTest ?? 0) === 0) {
      assert.notEqual(material.transparent, true, role + " should draw in the opaque pass");
      assert.notEqual(material.depthWrite, false, role + " should write its own depth");
    }
  }
  function meshFor(node) {
    const geometry = geometries.get(node.geometry);
    for (const attr of [geometry.data.index, ...Object.values(geometry.data.attributes)].filter(Boolean)) {
      const { byteOffset, type, length } = attr.array;
      attr.array = new globalThis[type](bytes.buffer, bytes.byteOffset + byteOffset, length);
    }
    const mesh = new Mesh(new BufferGeometryLoader().parse(geometry), new MeshBasicMaterial({
      side: materials.get(node.material).side ?? FrontSide,
    }));
    mesh.matrix.fromArray(node.matrix);
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrixWorld();
    return mesh;
  }
  const meshes = shell.children.map(node => {
    const material = materials.get(node.material);
    assert.equal(node.userData.renderRole, "enclosure");
    assert.notEqual(material.transparent, true);
    assert.notEqual(material.depthWrite, false);
    return meshFor(node);
  });
  function firstHit(point, direction, objects = meshes) {
    const ray = new Raycaster(new Vector3(...point), new Vector3(...direction));
    return ray.intersectObjects(objects, false)[0]?.distance ?? Infinity;
  }
  const interiors = {
    repair: [0, -6, 86], dispatch: [-126, 10, 19],
    proving: [82, 18, -129], lens: [284, 26, -24], intake: [290, -22, 120],
    hearth: [69, -38, 63],
  };
  for (const [name, point] of Object.entries(interiors)) {
    for (const dir of [[0,1,0], [0,-1,0], [1,0,0], [-1,0,0], [0,0,1], [0,0,-1]]) {
      const distance = firstHit(point, dir);
      assert.ok(distance > 1 && distance < 230, name + " sightline " + dir + " ends at " + distance);
    }
  }
  const bank = meshFor(scene.object.children.find(node => node.name === "Reservoir · far quarry face"));
  const quay = [-143, -6, 115];
  for (const direction of [[-1,0,0], [0,0,1]]) {
    const distance = firstHit(quay, direction, [bank]);
    assert.ok(distance > 45 && distance < 150, "the far bank frames the open water");
    assert.ok(firstHit(quay, direction) > distance, "no workshop wall hides the bank");
  }
  for (const direction of [[0,-1,0], [1,0,0], [0,0,-1]]) {
    assert.ok(firstHit(quay, direction) < 230, "the reservoir retains its basin and service walls");
  }
  assert.ok(firstHit([-110, -6, 83], [0,1,0]) < 30, "the adjoining pump bay stays roofed");
  for (const point of [[198, 42, 146], [183, 26, -30], quay]) {
    assert.equal(firstHit(point, [0,1,0]), Infinity);
  }
  const lifts = JSON.parse(readFileSync("content/levels/city/lifts.json"));
  for (const { id, x, z, w, d, stops } of lifts) {
    const low = Math.min(...stops), high = Math.max(...stops);
    assert.ok(firstHit([x + w/2, low, z + d/2], [0,1,0]) > high - low + 2, id);
  }
});

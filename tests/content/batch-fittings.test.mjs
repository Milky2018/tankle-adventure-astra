import test from "node:test";
import assert from "node:assert/strict";
import { DoubleSide, Matrix4 } from "../../.editor/three-r185/build/three.core.js";
import { batchFittings } from "../../scripts/content/batch-fittings.mjs";
import { instanceRepeatedShapes } from "../../scripts/content/instance-repeats.mjs";

const matrix = x => new Matrix4().makeTranslation(x, 0, 0).toArray();
function scene() {
  const attr = (itemSize, array) => ({ itemSize, array: new Float32Array(array), type: "Float32Array" });
  return {
    object: { type: "Scene", uuid: "scene", matrix: matrix(0), children: [] },
    geometries: [{ uuid: "tri", data: { attributes: {
      position: attr(3, [0, 0, 0, 1, 0, 0, 0, 1, 0]),
      normal: attr(3, [0, 0, 1, 0, 0, 1, 0, 0, 1]),
      uv: attr(2, [0, 0, 1, 0, 0, 1]),
    } } }],
    materials: [{ uuid: "iron", type: "MeshBasicMaterial", color: 0xffffff, side: DoubleSide }],
    textures: [], images: [],
  };
}
const mesh = (binding, x) => ({
  type: "Mesh", uuid: binding, geometry: "tri", material: "iron", matrix: matrix(x),
  userData: { binding }, castShadow: true, receiveShadow: true, layers: 1,
});

test("stationary wall fittings share a spatial draw and walls keep their picking meshes", () => {
  const s = scene();
  const defs = [0, 36, 48].map((x, i) => ({ x: x-1, y:-1, z:-1, w:2, h:2, d:2, permanent:i!==2, circuitKey:String(i) }));
  const walls = defs.map((v,i) => mesh("world/walls/"+i+"/mesh", v.x+1));
  for (const [i, wall] of walls.slice(0,2).entries()) {
    wall.children = [mesh("world/occluders/" + (i+1) + "/meshes/0/mesh", 0)];
  }
  const door = walls[2];
  door.children = [mesh("world/occluders/0/meshes/0/mesh", 1), mesh("world/occluders/0/meshes/1/mesh", 2)];
  s.object.children.push(...walls);
  batchFittings(s, a => a, defs);
  for (const wall of walls.slice(0,2)) {
    assert.equal(wall.geometry, "tri");
    const pick = s.materials.find(m => m.uuid === wall.material);
    assert.equal(pick.uuid, "iron");
    assert.equal(pick.side, DoubleSide);
  }
  const batch = s.object.children.find(n => n.type === "BatchedMesh");
  assert.equal(batch.castShadow, true);
  assert.equal(batch.instanceInfo.length, 2);
  assert.deepEqual(batch.boundingBox, { min: [0,0,0], max: [37,1,0] });
  assert.equal(door.material, "iron");
  assert.equal(door.children.length, 1);
  const merged = s.geometries.find(g => g.uuid === door.children[0].geometry);
  assert.equal(merged.data.attributes.position.array[0], 1);
});

test("hardware instances retain active transforms, depth layers and the original index range", () => {
  const s = scene();
  const packed = new Uint16Array([0,1,2,3,4,5]);
  s.geometries[0].data.index = { type: "Uint16Array", itemSize: 1, array: packed };
  for (const attr of Object.values(s.geometries[0].data.attributes)) {
    attr.array = { type:attr.type, byteOffset:0, length:6*attr.itemSize };
  }
  s.materials[0].colorWrite = false;
  s.textures.push({uuid:"matrices",image:"data"});
  s.images.push({uuid:"data",url:{data:Array.from({length:128},(_,i)=>matrix(i)).flat()}});
  const batch = {
    type:"BatchedMesh", uuid:"depth", name:"static/plates", geometry:"tri", material:"iron",
    matrix:matrix(5), layers:4, matricesTexture:{uuid:"matrices"},
    geometryInfo:[{vertexStart:3,vertexCount:3,start:3,count:3}],
    instanceInfo:Array.from({length:128},(_,i)=>({geometryIndex:0, active:i!==1, visible:i!==3})),
  };
  s.object.children.push(batch);
  instanceRepeatedShapes(s, a => a);
  assert.ok(s.object.children.every(o=>o.type==="InstancedMesh" && o.layers===4 && o.matrix[12]===5));
  const xs = s.object.children.flatMap(o=>o.instanceMatrix.array.filter((_,i)=>i%16===12));
  assert.deepEqual(xs.sort((a,b)=>a-b),Array.from({length:128},(_,i)=>i).filter(i=>i!==1 && i!==3));
  const extracted = s.geometries.at(-1).data;
  assert.deepEqual(extracted.index.array,[0,1,2]);
  assert.equal(extracted.attributes.position.array.byteOffset,36);
});

test("roller instances keep segment transforms and independent belt animations", () => {
  const s = scene();
  for (const [belt, offset] of [["feed", 10], ["return", 80]]) {
    const segment = "world/belts/" + belt + "/segments/0";
    s.object.children.push({
      type: "Group", matrix: matrix(offset), userData: { binding: segment + "/root" },
      children: [mesh(segment + "/rollers/0", -2), mesh(segment + "/rollers/1", 3)],
    });
  }
  instanceRepeatedShapes(s, a => a);
  for (const belt of ["feed", "return"]) {
    const root = s.object.children.find(n => n.userData?.binding === "world/belts/" + belt + "/segments/0/root");
    assert.ok(root, belt + " segment was lost");
    const [a, b] = root.children;
    const batch = s.object.children.find(n => n.userData.binding === a.userData.rollerBatch);
    assert.equal(batch.type, "InstancedMesh");
    assert.equal(batch.count, 2);
    assert.equal(b.userData.rollerBatch, batch.userData.binding);
    for (const roller of [a, b]) {
      assert.equal(roller.type, "Object3D");
      const x = batch.instanceMatrix.array[roller.userData.instance * 16 + 12];
      assert.equal(x, root.matrix[12] + roller.matrix[12]);
    }
  }
});

test("fixed switch housings batch across circuit folders while mounted controls and lamps remain independent", () => {
  const s = scene();
  const controls = [{ id: "left" }, { id: "right" }, { id: "carriage", mount: "lift" }];
  const roots = controls.map(({ id }, i) => {
    const binding = "world/controls/" + id;
    return {
      type: "Group", uuid: id, matrix: matrix(i * 20), userData: { binding: binding + "/root" },
      children: [
        { type: "Group", name: "local-circuit:" + id, matrix: matrix(1), children: [
          { ...mesh("", 2), name: "Control bezel · outer" },
          { ...mesh("", 4), name: "Control bezel · inner" },
        ] },
        mesh(binding + "/lamp", 5),
      ],
    };
  });
  s.object.children.push(...roots);
  batchFittings(s, a => a, [], controls);
  const combined = s.object.children.filter(n => n.type === "BatchedMesh");
  assert.equal(combined.length, 1);
  assert.deepEqual(combined[0].boundingBox, { min: [3, 0, 0], max: [26, 1, 0] });
  assert.equal(roots[2].children.filter(n => n.type === "Mesh" && !n.userData?.binding).length, 1);
  for (const root of roots) {
    assert.equal(root.children.find(n => n.userData?.binding.endsWith("/lamp")).material, "iron");
  }
});

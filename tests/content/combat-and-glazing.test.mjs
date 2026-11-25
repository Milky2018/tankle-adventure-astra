import assert from "node:assert/strict";
import test from "node:test";
import { Box3, BufferGeometryLoader, Mesh, Raycaster, Vector3 } from "../../.editor/three-r185/build/three.core.js";
import { readScene, walk } from "../../scripts/content/scene.mjs";

test("enemy models stay outside the scenery cutaway, including detached boss parts", () => {
  const scene = readScene();
  const materials = new Map(scene.materials.map(m => [m.uuid, m]));
  let casings = 0;
  walk(scene.object, node => {
    const binding = node.userData?.binding ?? "";
    if (!binding.startsWith("enemies/") || !node.material) return;
    const m = materials.get(node.material);
    assert.ok(!m.userData?.renderRole, binding);
    if (binding.endsWith("/model/casting")) {
      assert.equal(m.userData?.surfaceFinish, "enemyEnamel", binding);
      casings++;
    }
  });
  assert.ok(casings > 0);
});

test("workshop panes transmit the scene and sit in open window frames", () => {
  const scene = readScene();
  const glazing = new Set(scene.materials.filter(m => m.userData?.surfaceFinish === "glass").map(m => {
    assert.equal(m.transparent, true);
    assert.equal(m.depthWrite, false);
    assert.ok(m.opacity > 0 && m.opacity < 1);
    return m.uuid;
  }));
  const geometry = new Map(scene.geometries.map(g => [g.uuid, g]));
  let tested = 0;
  walk(scene.object, node => {
    if (!node.name?.startsWith("Engine house · ") || node.type !== "Group") return;
    const pane = node.children.find(c => glazing.has(c.material));
    assert.ok(pane, node.name);
    const parse = n => new BufferGeometryLoader().parse(geometry.get(n.geometry));
    const vertices = parse(pane).getAttribute("position");
    const surround = node.children.filter(c => c !== pane).map(n => new Mesh(parse(n)));
    // Sample off-centre in each rectangular bay so the ray misses its mullions.
    for (let start = 0; start < vertices.count; start += 36) {
      const bounds = new Box3();
      for (let i = start; i < start + 36; i++) bounds.expandByPoint(new Vector3().fromBufferAttribute(vertices, i));
      const p = bounds.getCenter(new Vector3());
      p.x += (bounds.max.x - bounds.min.x) * .19;
      p.z = bounds.max.z + .04;
      const hit = new Raycaster(p, new Vector3(0, 0, -1)).intersectObjects(surround, false)[0];
      assert.ok(hit && hit.distance > .45, node.name + " needs a recess behind the pane");
      tested++;
    }
  });
  assert.ok(tested > 0);
});

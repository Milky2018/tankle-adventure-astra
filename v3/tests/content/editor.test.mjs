import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  cpSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  Scene,
  Group,
  Mesh,
  BoxGeometry,
  MeshBasicMaterial,
  BatchedMesh,
  ObjectLoader,
} from "three";
import { exportProject, importProject } from "../../scripts/scene-editor.mjs";
import { readScene, writeScene } from "../../scripts/content/scene.mjs";

const workspace = process.cwd();
let sandbox;
const records = (name) =>
  JSON.parse(readFileSync(`content/levels/city/${name}.json`));
beforeEach(() => {
  sandbox = mkdtempSync(join(tmpdir(), "tankle-authoring-"));
  mkdirSync(join(sandbox, "content/art"), { recursive: true });
  cpSync(join(workspace, "content/levels"), join(sandbox, "content/levels"), {
    recursive: true,
  });
  process.chdir(sandbox);
  const prototype = records("enemies").find(
    (record) => record.id === "prototype",
  );
  const scene = new Scene();
  const root = new Group();
  root.name = "Prototype";
  root.position.set(prototype.x, prototype.y, prototype.z);
  root.userData = {
    binding: "enemies/prototype/model/root",
    entity: { collection: "enemies", id: "prototype", key: "prototype" },
  };
  for (const role of ["body", "turret"]) {
    const part = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
    part.name = role;
    part.userData.binding = `enemies/prototype/model/${role}`;
    root.add(part);
  }
  scene.add(root);
  scene.updateMatrixWorld(true);
  writeScene(scene.toJSON());
});
afterEach(() => {
  process.chdir(workspace);
  rmSync(sandbox, { recursive: true, force: true });
});

test("batched architecture survives the editor loader and Save serialization", () => {
  const scene = new Scene();
  const batch = new BatchedMesh(1, 24, 36, new MeshBasicMaterial());
  batch.addInstance(batch.addGeometry(new BoxGeometry()));
  scene.add(batch);
  writeScene(scene.toJSON());
  const project = exportProject();
  const loaded = new ObjectLoader().parse(project.scene);
  project.scene = loaded.toJSON();
  assert.doesNotThrow(() => importProject(project));
});

test("editor translation and user data update gameplay without depending on display names", () => {
  const before = records("enemies").find((record) => record.id === "prototype");
  const project = exportProject("enemies:prototype");
  const root = project.scene.object.children[0];
  root.name = "Human readable name";
  root.matrix[12] += 2;
  root.userData.game.hp = 11;
  importProject(project);
  const after = records("enemies").find((record) => record.id === "prototype");
  assert.equal(after.x, before.x + 2);
  assert.equal(after.hp, 11);
  const imported = readScene().object.children[0];
  assert.equal(imported.name, "Human readable name");
  assert.equal(imported.userData.binding, "enemies/prototype/model/root");
  assert.equal(imported.userData.game, undefined);
  assert.equal(
    exportProject("enemies:prototype").scene.object.children[0].name,
    "Human readable name",
  );
});

test("unchanged editor round trip preserves gameplay records", () => {
  const before = records("enemies");
  importProject(exportProject("enemies:prototype"));
  assert.deepEqual(records("enemies"), before);
});

test("stale exports and script injection are rejected before writing", () => {
  const project = exportProject("enemies:prototype");
  project.scripts.test = [{ source: 'throw new Error("not gameplay")' }];
  assert.throws(() => importProject(project), /scripts are not supported/);
  project.scripts = {};
  const path = "content/levels/city/enemies.json";
  const source = readFileSync(path, "utf8");
  writeFileSync(path, source + "\n");
  assert.throws(() => importProject(project), /Content changed since export/);
});

test("missing animation bindings and duplicate identities fail clearly", () => {
  const project = exportProject("enemies:prototype");
  const children = project.scene.object.children[0].children;
  children[1].userData.binding = children[0].userData.binding;
  assert.throws(() => importProject(project), /Duplicate binding/);
  children.pop();
  assert.throws(
    () => importProject(project),
    /Required runtime binding removed/,
  );
});

test("editor collision resizing changes physics dimensions without shipping helper meshes", () => {
  const before = records("decks").find(
    (record) => record.id === "press-working-floor",
  );
  const project = exportProject("decks:press-working-floor");
  const box = project.scene.object.children[0];
  box.matrix[0] *= 2;
  box.matrix[12] += 3;
  importProject(project);
  const after = records("decks").find((record) => record.id === before.id);
  assert.equal(after.w, before.w * 2);
  assert.equal(after.x, before.x + 3 - before.w / 2);
  assert.equal(
    readScene().object.children.some((object) => object.userData?.editorOnly),
    false,
  );
});

test("exported roots cannot be nested into a duplicate hierarchy", () => {
  const project = exportProject("enemies:prototype");
  const root = project.scene.object.children.shift();
  project.scene.object.children.push({
    uuid: "new-group",
    type: "Group",
    children: [root],
  });
  assert.throws(() => importProject(project), /Keep exported roots/);
});

test("full-scene settings round trip, while preview lights stay out of runtime assets", () => {
  const project = exportProject();
  project.scene.object.background = 0x123456;
  importProject(project);
  assert.equal(readScene().object.background, 0x123456);
  const single = exportProject("enemies:prototype");
  assert.ok(
    single.scene.object.children.some((object) => object.userData?.editorOnly),
  );
  importProject(single);
  assert.equal(
    readScene().object.children.some((object) => object.userData?.editorOnly),
    false,
  );
});

test("full-level collider export can distinguish repeated deck IDs", () => {
  const before = records("decks");
  const index = before.findIndex(
    (record, index) =>
      before.findIndex((other) => other.id === record.id) < index,
  );
  assert.ok(index >= 0);
  const project = exportProject(undefined, { colliders: true });
  const helper = project.scene.object.children.find(
    (object) =>
      object.userData?.entity?.collection === "decks" &&
      object.userData.entity.index === index,
  );
  helper.matrix[12] += 2;
  importProject(project);
  const after = records("decks");
  assert.equal(after[index].x, before[index].x + 2);
  const first = before.findIndex((record) => record.id === before[index].id);
  assert.deepEqual(after[first], before[first]);
});

test("the shipped city and all colliders round trip without changing gameplay definitions", () => {
  cpSync(join(workspace, "content/art"), "content/art", { recursive: true });
  const names = [
    "decks",
    "barriers",
    "obstacles",
    "architecture",
    "lifts",
    "enemies",
    "controls",
    "hives",
    "pickups",
    "mirrors",
    "belts",
    "heat",
    "currents",
    "circuits",
  ];
  const before = names.map((name) => records(name));
  importProject(exportProject(undefined, { colliders: true }));
  names.forEach((name, index) =>
    assert.deepEqual(records(name), before[index], name),
  );
});

test("consecutive local saves and undo keep absolute placement and reject stale tabs", () => {
  const before = records("enemies").find((record) => record.id === "prototype");
  const project = exportProject("enemies:prototype");
  const stale = structuredClone(project);
  const root = project.scene.object.children[0];
  root.matrix[12] += 2;
  project.scene.object.userData.tankle.revision =
    importProject(project).revision;
  root.matrix[12] += 1;
  project.scene.object.userData.tankle.revision =
    importProject(project).revision;
  assert.equal(
    records("enemies").find((record) => record.id === "prototype").x,
    before.x + 3,
  );
  assert.throws(() => importProject(stale), /Content changed since export/);
  root.matrix[12] -= 3;
  importProject(project);
  assert.deepEqual(
    records("enemies").find((record) => record.id === "prototype"),
    before,
  );
});

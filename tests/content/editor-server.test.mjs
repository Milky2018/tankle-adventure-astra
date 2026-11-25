import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createEditorServer } from "../../scripts/editor-server.mjs";
import { Scene, Mesh, BoxGeometry, MeshBasicMaterial } from "../../.editor/three-r185/build/three.core.js";
import { writeScene } from "../../scripts/content/scene.mjs";

test("local skill editing validates writes, rejects stale tabs and foreign origins", async () => {
  const workspace = process.cwd();
  const directory = mkdtempSync(join(tmpdir(), "tankle-editor-server-"));
  cpSync("content", join(directory, "content"), { recursive: true });
  process.chdir(directory);
  const scene = new Scene();
  scene.add(new Mesh(new BoxGeometry(), new MeshBasicMaterial()));
  writeScene(scene.toJSON());
  const server = createEditorServer().listen(0, "127.0.0.1");
  await once(server, "listening");
  const origin = `http://127.0.0.1:${server.address().port}`;
  const post = (body, source = origin) =>
    fetch(`${origin}/api/abilities`, {
      method: "POST",
      headers: { Origin: source, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  try {
    const data = await (await fetch(`${origin}/api/abilities`)).json();
    const original = readFileSync("content/abilities.json", "utf8");
    data.values.cannon.damage = -2;
    assert.equal((await post(data)).status, 400);
    const projectResponse = await fetch(`${origin}/api/scene`);
    assert.equal(projectResponse.headers.get("content-encoding"), "gzip");
    const project = await projectResponse.json();
    project.scene.object.children[0].matrix[12] = 2;
    const sceneSave = () =>
      fetch(`${origin}/api/scene`, {
        method: "POST",
        headers: { Origin: origin, "Content-Type": "application/json" },
        body: JSON.stringify(project),
      });
    const savedScene = await sceneSave();
    assert.equal(savedScene.status, 200);
    assert.equal((await savedScene.json()).written, true);
    assert.equal((await sceneSave()).status, 400);
    assert.equal(readFileSync("content/abilities.json", "utf8"), original);
    data.values.cannon.damage = 4;
    assert.equal((await post(data, "http://example.com")).status, 403);
    const saved = await post(data);
    assert.equal(saved.status, 200);
    assert.notEqual((await saved.json()).revision, data.revision);
    assert.equal(
      JSON.parse(readFileSync("content/abilities.json")).cannon.damage,
      4,
    );
    assert.equal((await post(data)).status, 400);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    process.chdir(workspace);
    rmSync(directory, { recursive: true, force: true });
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { Matrix4 } from "three";
import { buildRuntimeArt } from "../../scripts/content/runtime-art.mjs";

test("compiled art preserves typed pixels and independent attributes with identical contents", () => {
  const dir = mkdtempSync(join(tmpdir(), "astra-art-"));
  try {
    const matrix = new Matrix4().toArray();
    const attr = {
      itemSize: 3, type: "Float32Array",
      array: { byteOffset: 0, length: 3, type: "Float32Array" },
    };
    const scene = {
      object: { uuid: "scene", type: "Scene", matrix, children: [
        { uuid: "model", type: "Mesh", geometry: "mesh", material: "metal", matrix },
      ] },
      geometries: [{ uuid: "mesh", data: { attributes: { position: attr, normal: attr } } }],
      materials: [{ uuid: "metal", envMap: "probe" }, { uuid: "unused" }],
      textures: [{ uuid: "probe", image: "hdr" }],
      images: [{ uuid: "hdr", url: { type: "Uint16Array", width: 1, height: 1, data: [0, 3, 32768, 65535] } }],
    };
    writeFileSync(join(dir, "city.scene.json.gz"), gzipSync(JSON.stringify(scene)));
    writeFileSync(join(dir, "city.buffers.bin.gz"), gzipSync(Buffer.from(new Float32Array([-4, 7, 3.5]).buffer)));
    buildRuntimeArt(dir, dir);
    const unpack = name => gunzipSync(readFileSync(join(dir, name)));
    const packed = JSON.parse(unpack("folded-scene.json.gz"));
    const views = JSON.parse(unpack("folded-views.json.gz"));
    const bytes = unpack("folded-buffers.bin.gz");
    function values(view) {
      return Array.from(new globalThis[view.type](bytes.buffer, bytes.byteOffset + view.byteOffset, view.length));
    }
    assert.deepEqual(packed.materials.map(m => m.uuid), ["metal"]);
    assert.deepEqual(packed.images[0].url.data, []);
    assert.deepEqual(values(views.images.probe), [0, 3, 32768, 65535]);
    assert.deepEqual(values(views.geometry.mesh.position), [-4, 7, 3.5]);
    assert.equal(views.geometry.mesh.position.byteOffset, views.geometry.mesh.normal.byteOffset);
    assert.equal(views.geometry.mesh.normal.copy, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

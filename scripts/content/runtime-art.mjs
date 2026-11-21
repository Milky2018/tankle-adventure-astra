// Compile the editable ObjectLoader archive for the game. Keep the editor's
// individual trim instances in the source; the visible batches already draw them.
import { instanceRepeatedShapes } from "./instance-repeats.mjs";
import { bakeCameraFaces } from "./camera-faces.mjs";
import { bakeRoomPortals } from "./room-portals.mjs";
import { batchFittings } from "./batch-fittings.mjs";
import { mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { gunzipSync, gzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { join } from "node:path";

export function buildRuntimeArt(source, destination, barriers = [], controls = []) {
  const scene = JSON.parse(gunzipSync(readFileSync(join(source, "city.scene.json.gz"))));
  const original = gunzipSync(readFileSync(join(source, "city.buffers.bin.gz")));
  const views = { geometry: {}, images: {}, instances: {} };
  const chunks = [];
  let length = 0;
  const stored = new Map();

  function append(bytes, type, count) {
    const key = type + ":" + createHash("sha256").update(bytes).digest("hex");
    if (stored.has(key)) return { ...stored.get(key), copy: true };
    const padding = (8 - length % 8) % 8;
    chunks.push(Buffer.alloc(padding), bytes);
    length += padding;
    const descriptor = { byteOffset: length, type, length: count };
    length += bytes.length;
    stored.set(key, descriptor);
    return descriptor;
  }
  function sourceView(a) {
    return new globalThis[a.type](original.buffer, original.byteOffset + a.byteOffset, a.length);
  }
  function prepare(node) {
    if (node.visible === false && node.children?.length &&
        node.children.every(child => /^world\/surfaces\/\d+\/trim$/.test(child.userData?.binding))) {
      delete node.children;
    }
    if (node.type === "BatchedMesh") {
      for (const key of ["matricesTexture", "indirectTexture", "colorsTexture"]) {
        if (node[key]) node[key] = { uuid: node[key].uuid };
      }
    }

    for (const child of node.children ?? []) prepare(child);
  }
  prepare(scene.object);

  instanceRepeatedShapes(scene, sourceView);
  bakeCameraFaces(scene, sourceView);
  batchFittings(scene, sourceView, barriers, controls);
  bakeRoomPortals(scene, sourceView);
  function packInstances(node) {
    if (node.type === "InstancedMesh") {
      const attrs = {};
      for (const key of ["instanceMatrix", "instanceColor"]) {
        const a = node[key];
        if (!a) continue;
        const view = Array.isArray(a.array) ? new globalThis[a.type](a.array) : sourceView(a.array);
        attrs[key] = append(Buffer.from(view.buffer, view.byteOffset, view.byteLength), a.type, view.length);
        a.array = [];
      }
      views.instances[node.uuid] = attrs;
    }
    for (const child of node.children ?? []) packInstances(child);
  }
  packInstances(scene.object);
  const libraries = ["geometries", "materials", "textures", "images", "shapes", "animations", "skeletons"];
  const resources = new Map(libraries.flatMap(k => (scene[k] ?? []).map(entry => [entry.uuid, entry])));
  const used = new Set();
  function collect(v) {
    if (typeof v === "string" && resources.has(v) && !used.has(v)) {
      used.add(v);
      collect(resources.get(v));
    } else if (Array.isArray(v)) {
      if (typeof v[0] !== "number") v.forEach(collect);
    } else if (v && typeof v === "object") Object.values(v).forEach(collect);
  }
  collect(scene.object);
  // Clips may be used by name without an Object3D.animations binding.
  for (const clip of scene.animations ?? []) collect(clip.uuid);
  for (const key of libraries) {
    if (scene[key]) scene[key] = scene[key].filter(entry => used.has(entry.uuid));
  }
  for (const g of scene.geometries) {
    if (!g.data) continue;
    const attrs = {};
    for (const [key, a] of Object.entries({ ...g.data.attributes, index: g.data.index })) {
      if (!a?.array) continue;
      const view = Array.isArray(a.array) ? new globalThis[a.type](a.array) : sourceView(a.array);
      attrs[key] = append(Buffer.from(view.buffer, view.byteOffset, view.byteLength), a.type, view.length);
      a.array = [];
    }
    views.geometry[g.uuid] = attrs;
  }
  const imageDir = join(destination, "images");
  mkdirSync(imageDir, { recursive: true });
  const imageFiles = new Set();
  const pixelsBySource = new Map();
  for (const image of scene.images) {
    if (typeof image.url === "string") {
      const match = /^data:image\/(png|jpeg);base64,/.exec(image.url);
      if (!match) continue;
      const bytes = Buffer.from(image.url.slice(match[0].length), "base64");
      const hash = createHash("sha256").update(bytes).digest("hex");
      const filename = hash.slice(0, 24) + "." + match[1];
      imageFiles.add(filename);
      writeFileSync(join(imageDir, filename), bytes);
      image.url = "/generated/art/images/" + filename;
    } else if (Array.isArray(image.url?.data)) {
      const pixels = new globalThis[image.url.type](image.url.data);
      pixelsBySource.set(image.uuid, append(Buffer.from(pixels.buffer), image.url.type, pixels.length));
      image.url.data = [];
    }
  }
  for (const texture of scene.textures) {
    const pixels = pixelsBySource.get(texture.image);
    if (pixels) views.images[texture.uuid] = pixels;
  }
  mkdirSync(destination, { recursive: true });
  const save = (name, bytes) => writeFileSync(join(destination, name), gzipSync(bytes));
  save("folded-scene.json.gz", JSON.stringify(scene));
  save("folded-views.json.gz", JSON.stringify(views));
  save("folded-buffers.bin.gz", Buffer.concat(chunks));
  for (const name of readdirSync(imageDir)) {
    if (/^[a-f0-9]{24}\.(png|jpeg)$/.test(name) && !imageFiles.has(name)) unlinkSync(join(imageDir, name));
  }
}

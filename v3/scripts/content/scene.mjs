import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync, gzipSync } from "node:zlib";

const scenePath = "content/art/city.scene.json.gz";
const buffersPath = "content/art/city.buffers.bin.gz";

export function walk(object, visit, parent = null) {
  visit(object, parent);
  for (const child of object.children ?? []) walk(child, visit, object);
}

export function readScene() {
  const scene = JSON.parse(gunzipSync(readFileSync(scenePath)));
  const buffer = gunzipSync(readFileSync(buffersPath));
  function unpack(attribute) {
    if (!attribute?.array || Array.isArray(attribute.array)) return;
    const { byteOffset, length, type } = attribute.array;
    const Constructor = globalThis[type];
    if (
      !Constructor ||
      !/^(Float32|Float64|Uint8|Uint16|Uint32|Int8|Int16|Int32)Array$/.test(
        type,
      )
    )
      throw new Error(`Unsupported attribute type: ${type}`);
    attribute.array = Array.from(
      new Constructor(buffer.buffer, buffer.byteOffset + byteOffset, length),
    );
  }
  for (const geometry of scene.geometries ?? []) {
    unpack(geometry.data?.index);
    for (const attribute of Object.values(geometry.data?.attributes ?? {}))
      unpack(attribute);
  }
  walk(scene.object, (object) => {
    unpack(object.instanceMatrix);
    unpack(object.instanceColor);
  });
  return scene;
}

export function writeScene(scene) {
  const chunks = [];
  let byteLength = 0;
  function pack(attribute) {
    if (!Array.isArray(attribute?.array)) return;
    const Constructor = globalThis[attribute.type];
    if (
      !Constructor ||
      !/^(Float32|Float64|Uint8|Uint16|Uint32|Int8|Int16|Int32)Array$/.test(
        attribute.type,
      )
    )
      throw new Error(`Unsupported attribute type: ${attribute.type}`);
    const buffer = Buffer.from(new Constructor(attribute.array).buffer);
    attribute.array = {
      byteOffset: byteLength,
      length: attribute.array.length,
      type: attribute.type,
    };
    chunks.push(buffer);
    byteLength += buffer.length;
    const padding = (8 - (byteLength % 8)) % 8;
    if (padding) {
      chunks.push(Buffer.alloc(padding));
      byteLength += padding;
    }
  }
  for (const geometry of scene.geometries ?? []) {
    pack(geometry.data?.index);
    for (const attribute of Object.values(geometry.data?.attributes ?? {}))
      pack(attribute);
  }
  walk(scene.object, (object) => {
    pack(object.instanceMatrix);
    pack(object.instanceColor);
  });
  writeFileSync(buffersPath, gzipSync(Buffer.concat(chunks)));
  writeFileSync(scenePath, gzipSync(JSON.stringify(scene)));
}

// Keep only resources reachable from an exported object, including texture images.
export function selectResources(scene, object) {
  const resources = [
    "geometries",
    "materials",
    "textures",
    "images",
    "animations",
    "skeletons",
  ];
  const byId = new Map(
    resources.flatMap((kind) =>
      (scene[kind] ?? []).map((value) => [value.uuid, { kind, value }]),
    ),
  );
  const selected = new Set();
  function collect(value) {
    if (typeof value === "string" && byId.has(value) && !selected.has(value)) {
      selected.add(value);
      const { uuid, ...rest } = byId.get(value).value;
      collect(rest);
    } else if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === "object")
      Object.values(value).forEach(collect);
  }
  collect(object);
  return {
    metadata: scene.metadata,
    ...Object.fromEntries(
      resources.map((kind) => [
        kind,
        (scene[kind] ?? []).filter((value) => selected.has(value.uuid)),
      ]),
    ),
    object,
  };
}

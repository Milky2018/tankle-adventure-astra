// Deduplicate immutable authored resources. Materials remain independently mutable.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
const path = 'output/art/folded-scene.json';
const data = JSON.parse(readFileSync(path));
if (!Array.isArray(data.artBeltSegments)) throw new Error("Re-export art to include conveyor segment dimensions");
const segments = data.artBeltSegments.map(belt => "  [" + belt.map(([travel, heaters]) => `(${travel}, ${heaters})`).join(", ") + "],").join("\n");
writeFileSync("renderer/belt-data.mbt", `///|\n// Immutable segment dimensions of the exported conveyor meshes.\nfn belt_segments() -> Array[Array[(Double, Int32)]] {\n[\n${segments}\n]\n}\n`);
delete data.artBeltSegments;
const remap = new Map();
function deduplicate(entries) {
  const unique = new Map();
  for (const entry of entries) {
    const { uuid, ...content } = entry;
    const hash = createHash('sha256').update(JSON.stringify(content)).digest('hex');
    if (unique.has(hash)) remap.set(uuid, unique.get(hash).uuid);
    else unique.set(hash, entry);
  }
  return [...unique.values()];
}
function replace(value) {
  if (typeof value === 'string') return remap.get(value) ?? value;
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(replace);
  for (const key of Object.keys(value)) value[key] = replace(value[key]);
  return value;
}
data.geometries = deduplicate(data.geometries);
data.images = deduplicate(data.images);
replace(data.textures);
data.textures = deduplicate(data.textures);
replace(data.materials);
replace(data.object);
// Keep vertex and instance buffers binary: parsing millions of decimal numbers blocks the first frame.
const chunks=[];
let byteLength=0;
function packAttribute(attribute) {
  if (!Array.isArray(attribute?.array)) return;
  const Constructor=globalThis[attribute.type];
  const buffer=Buffer.from(new Constructor(attribute.array).buffer);
  attribute.array={byteOffset:byteLength,length:attribute.array.length,type:attribute.type};
  chunks.push(buffer);byteLength+=buffer.length;
  const padding=(4-byteLength%4)%4;if(padding){chunks.push(Buffer.alloc(padding));byteLength+=padding;}
}
for(const geometry of data.geometries){
  if(!geometry.data)continue;
  packAttribute(geometry.data.index);
  for(const attribute of Object.values(geometry.data.attributes??{}))packAttribute(attribute);
}
function packInstances(object){packAttribute(object.instanceMatrix);packAttribute(object.instanceColor);for(const child of object.children??[])packInstances(child);}
packInstances(data.object);
writeFileSync('public/art/folded-buffers.bin.gz',gzipSync(Buffer.concat(chunks)));
const json = JSON.stringify(data);

writeFileSync('public/art/folded-scene.json.gz', gzipSync(json));
console.log({bytes: json.length, geometries:data.geometries.length, images:data.images.length});

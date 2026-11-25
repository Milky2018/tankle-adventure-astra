// Native Three.js projects store the entire geometry library in one JSON array.
// Serialize its entries separately so a city can exceed V8's single-string limit.
import { closeSync, openSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { constants } from "node:buffer";
import { randomUUID } from "node:crypto";

export function writeEditorJSON(path, project) {
  const { scene, ...settings } = project;
  const { geometries = [], ...resources } = scene;
  const tmp = path + "." + randomUUID();
  try {
    const fd = openSync(tmp, "wx");
    try {
      const header = JSON.stringify({ ...settings, scene: { ...resources, geometries: [] } });
      writeFileSync(fd, header.slice(0, -3)); // Leave the final geometry array open.
      geometries.forEach((g, index) => writeFileSync(fd, (index ? "," : "") + JSON.stringify(g)));
      writeFileSync(fd, "]}}");
    } finally { closeSync(fd); }
    renameSync(tmp, path);
  } finally { rmSync(tmp, { force: true }); }
}

export function readEditorJSON(path) {
  const bytes = readFileSync(path);
  if (bytes.length <= constants.MAX_STRING_LENGTH) return JSON.parse(bytes);
  // Find a geometry library token outside quoted strings. Geometry records can
  // contain arbitrary user data, including strings with braces or escaped quotes.
  const space = (i) => {
    while ([9, 10, 13, 32].includes(bytes[i])) i++;
    return i;
  };
  function endQuote(i) {
    while (++i < bytes.length) {
      if (bytes[i] === 92) i++;
      else if (bytes[i] === 34) return i;
    }
    throw new Error("Unterminated string in editor project");
  }
  let nesting = 0, sceneStart = -1;
  for (let at = 0; at < bytes.length; at++) {
    const c = bytes[at];
    if (c === 123 || c === 91) nesting++;
    else if (c === 125 || c === 93) {
      nesting--;
      if (nesting < 2) sceneStart = -1;
    }
    if (c !== 34) continue;
    const quote = at;
    at = endQuote(at);
    if (nesting > 2 || at - quote > 12) continue;
    const colon = space(at + 1);
    if (bytes[colon] !== 58) continue;
    const key = bytes.toString("utf8", quote + 1, at);
    const start = space(colon + 1);
    if (nesting === 1 && key === "scene" && bytes[start] === 123) sceneStart = start;
    if (nesting !== 2 || sceneStart < 0 || key !== "geometries" || bytes[start] !== 91) continue;
    const geometries = [];
    let begin = start + 1, depth = 0;
    for (let i = begin; i < bytes.length; i++) {
      const c = bytes[i];
      if (c === 34) i = endQuote(i);
      else if (c === 44 && depth === 0) {
        geometries.push(JSON.parse(bytes.subarray(begin, i)));
        begin = i + 1;
      } else if (c === 93 && depth === 0) {
        if (space(begin) !== i || geometries.length) geometries.push(JSON.parse(bytes.subarray(begin, i)));
        const project = JSON.parse(Buffer.concat([bytes.subarray(0, start), Buffer.from("[]"), bytes.subarray(i + 1)]));
        project.scene.geometries = geometries;
        return project;
      } else if (c === 123 || c === 91) depth++;
      else if (c === 125 || c === 93) depth--;
    }
    throw new Error("Unterminated geometry library in editor project");
  }
  throw new Error("Large editor project has no geometry library");
}

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile, rename, rm } from "node:fs/promises";
import { dirname } from "node:path";

import { fileURLToPath } from "node:url";

// Upstream editor distribution pinned independently from the game renderer.
const revision = "2431a09f46f34c560bc8e44b33be0e567723d5b9";
export const upstreamDirectory = fileURLToPath(new URL("../.editor/three-r185/", import.meta.url));
const raw = "https://raw.githubusercontent.com/mrdoob/three.js/" + revision + "/";

async function cacheFile(path, url) {
  const dest = upstreamDirectory + path;
  try { await access(dest); return; } catch (err) { if (err.code !== "ENOENT") throw err; }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Editor dependency ${path}: HTTP ${res.status}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  await mkdir(dirname(dest), { recursive: true });
  const tmp = dest + "." + crypto.randomUUID();
  try { await writeFile(tmp, bytes); await rename(tmp, dest); }
  finally { await rm(tmp, { force: true }); }
}

export function ensureThreeFile(path) {
  if (!/^(?:build|examples\/jsm)\/[a-zA-Z0-9_./-]+$/.test(path) || path.split("/").includes(".."))
    throw new Error("Invalid editor library path");
  return cacheFile(path, raw + path);
}

export const prepareEditorCore = () => ensureThreeFile("build/three.core.js");
export async function setupEditor() {
  await Promise.all([
    prepareEditorCore(), ensureThreeFile("build/three.module.js"),
  ]);
  try {
    if ((await readFile(`${upstreamDirectory}/.ready`, "utf8")) === revision)
      return;
  } catch {}
  console.log("Preparing the pinned Three.js editor (about 2 MB, once)...");
  const response = await fetch(
    `https://api.github.com/repos/mrdoob/three.js/git/trees/${revision}?recursive=1`,
  );
  if (!response.ok)
    throw new Error(`Editor source lookup failed: ${response.status}`);
  const { tree } = await response.json();
  const files = tree.filter(
    (file) =>
      file.type === "blob" &&
      (file.path === "LICENSE" || /^editor\/(js|css|images)\//.test(file.path)),
  );
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      for (let file; (file = files.pop()); ) {
        // Fetch the immutable blob, preserving upstream source and license.
        const response = await fetch(
          `${raw}${file.path}`,
        );
        if (!response.ok)
          throw new Error(
            `Could not download ${file.path}: ${response.status}`,
          );
        const data = Buffer.from(await response.arrayBuffer());
        const hash = createHash("sha1")
          .update(`blob ${data.length}\0`)
          .update(data)
          .digest("hex");
        if (hash !== file.sha)
          throw new Error(`Source hash mismatch: ${file.path}`);
        const destination = `${upstreamDirectory}/${file.path}`;
        await mkdir(dirname(destination), { recursive: true });
        await writeFile(destination, data);
      }
    }),
  );
  await writeFile(`${upstreamDirectory}/.ready`, revision);
}

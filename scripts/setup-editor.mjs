import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

// Three.js r185, matching the project's installed Three.js release.
const revision = "2431a09f46f34c560bc8e44b33be0e567723d5b9";
export const upstreamDirectory = ".editor/three-r185";
export async function setupEditor() {
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
          `https://raw.githubusercontent.com/mrdoob/three.js/r185/${file.path}`,
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

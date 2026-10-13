// Large native editor JSON is transient. Exiting releases its heap after each operation.
import { gzipSync } from "node:zlib";
import { exportProject, importProject } from "./scene-editor.mjs";

try {
  let result;
  if (process.argv[2] === "GET") {
    result = exportProject(undefined, { colliders: true });
  } else {
    const chunks = [];
    let size = 0;
    for await (const chunk of process.stdin) {
      size += chunk.length;
      if (size > 256 * 1024 * 1024)
        throw new Error("Project exceeds the 256 MB save limit");
      chunks.push(chunk);
    }
    result = importProject(JSON.parse(Buffer.concat(chunks)));
  }
  process.stdout.write(gzipSync(JSON.stringify(result)));
} catch (error) {
  process.stderr.write(error.message);
  process.exitCode = 1;
}

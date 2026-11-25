import { createServer } from "node:http";
import { readFile, writeFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { runTuning } from "./content/tuning.mjs";
import { ensureThreeFile, upstreamDirectory } from "./setup-editor.mjs";

const digest = (data) => createHash("sha256").update(data).digest("hex");
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gz": "application/gzip",
  ".woff2": "font/woff2",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".webm": "audio/webm",
};
async function readJSON(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 256 * 1024 * 1024)
      throw new Error("Project exceeds the 256 MB save limit");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks));
}
function buildGame() {
  return new Promise((resolve, reject) => {
    const child = spawn("moon", ["run", "scripts/build.mbtx"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let log = "";
    for (const stream of [child.stdout, child.stderr])
      stream.on("data", (chunk) => {
        log = (log + chunk).slice(-10000);
      });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(log)),
    );
  });
}

function processScene(request) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "moon",
      [
        "-C", fileURLToPath(new URL("..", import.meta.url)), "run", "cmd/editor", "--",
        "scene-worker", request.method, process.cwd(),
      ],
      { stdio: ["pipe", "pipe", "pipe"] },
    );
    const output = [];
    let error = "";
    child.stdout.on("data", (chunk) => output.push(chunk));
    child.stderr.on("data", (chunk) => {
      error = (error + chunk).slice(-10000);
    });
    child.on("error", reject);
    child.stdin.on("error", () => {}); // Validation failure may close input early.
    request.on("aborted", () => child.kill());
    child.on("close", (code) =>
      code === 0
        ? resolve(Buffer.concat(output))
        : reject(new Error(error || "Scene operation was interrupted")),
    );
    if (request.method === "POST") request.pipe(child.stdin);
    else child.stdin.end();
  });
}

export function createEditorServer() {
  let busy = false;
  return createServer(async (request, response) => {
    const json = (value, status = 200) => {
      const data = Buffer.from(JSON.stringify(value));
      const compress =
        /\bgzip\b/.test(request.headers["accept-encoding"] ?? "") &&
        data.length > 4096;
      response.writeHead(status, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        ...(compress ? { "Content-Encoding": "gzip" } : {}),
      });
      response.end(compress ? gzipSync(data) : data);
    };
    let ownsLock = false;
    try {
      const url = new URL(request.url, "http://localhost");
      if (request.method === "GET" && url.pathname === "/api/templates") {
        response.writeHead(200, {
          "Content-Type": "application/json",
          "Content-Encoding": "gzip",
          "Cache-Control": "no-cache",
        });
        return response.end(
          await readFile("content/editor/templates.scene.json.gz"),
        );
      }
      if (
        request.method === "GET" &&
        url.pathname === "/api/template-definitions"
      )
        return json(
          JSON.parse(await readFile("content/editor/templates.json", "utf8")),
        );
      if (
        request.method === "POST" &&
        request.headers.origin !== `http://${request.headers.host}`
      )
        return json(
          { error: "Open the editor from its localhost address before saving" },
          403,
        );
      if (
        url.pathname === "/api/scene" &&
        ["GET", "POST"].includes(request.method)
      ) {
        if (busy)
          return json(
            { error: "Another scene operation, save or build is in progress" },
            409,
          );
        busy = ownsLock = true;
        const data = await processScene(request);
        response.writeHead(200, {
          "Content-Type": "application/json",
          "Content-Encoding": "gzip",
          "Cache-Control": "no-store",
        });
        return response.end(data);
      }
      if (request.method === "POST") {
        if (busy)
          return json({ error: "Another save or build is in progress" }, 409);
        busy = ownsLock = true;
        if (url.pathname === "/api/abilities") {
          const { values, revision } = await readJSON(request);
          const source = await readFile("content/abilities.json");
          if (revision !== digest(source))
            throw new Error("Skills changed on disk. Reload before saving.");
          const data = JSON.stringify(values, null, 2) + "\n";
          await runTuning(["-"], data);
          await writeFile("content/abilities.json", data);
          return json({ revision: digest(data) });
        }
        if (url.pathname === "/api/build") {
          await buildGame();
          return json({ url: "/play/?chapter=folded" });
        }
        return json({ error: "Unknown operation" }, 404);
      }
      if (request.method !== "GET")
        return json({ error: "Method not supported" }, 405);
      if (url.pathname === "/api/abilities") {
        const source = await readFile("content/abilities.json");
        return json({ values: JSON.parse(source), revision: digest(source) });
      }
      if (url.pathname === "/pathtracer/index.module.js" || url.pathname === "/bvh/index.module.js") {
        const module = new URL("../editor/vendor" + url.pathname + ".gz", import.meta.url);
        response.writeHead(200, { "Content-Type": "text/javascript", "Content-Encoding": "gzip" });
        return response.end(await readFile(module));
      }
      const routes = [
        ["/upstream/", `${upstreamDirectory}/editor`],
        ["/build/", upstreamDirectory + "build"],
        ["/examples/", upstreamDirectory + "examples"],
        ["/assets/", "dist/assets"],
        ["/generated/", "dist/generated"],
        ["/music/", "dist/music"],
        ["/art/", "dist/art"],
        ["/play/", "dist"],
        ["/", "editor"],
      ];
      const [prefix, directory] = routes.find(([prefix]) =>
        url.pathname.startsWith(prefix),
      );
      const root = resolve(directory);
      const path = resolve(
        root,
        decodeURIComponent(url.pathname.slice(prefix.length)) || "index.html",
      );
      if (!path.startsWith(root + sep))
        return json({ error: "Invalid path" }, 403);
      if (prefix === "/examples/" || prefix === "/build/")
        await ensureThreeFile(prefix.slice(1) + path.slice(root.length + 1));
      if (!(await stat(path)).isFile())
        return json({ error: "Not a file" }, 404);
      response.writeHead(200, {
        "Content-Type": types[extname(path)] ?? "application/octet-stream",
        "Cache-Control": "no-cache",
      });
      response.end(await readFile(path));
    } catch (error) {
      json({ error: error.message }, error.code === "ENOENT" ? 404 : 400);
    } finally {
      if (ownsLock) busy = false;
    }
  });
}

export function serveEditor() {
  const port = Number(process.env.EDITOR_PORT ?? 5176);
  createEditorServer().listen(port, "127.0.0.1", () =>
    console.log(`Project editor: http://127.0.0.1:${port}`),
  );
}

import { prepareEditorCore, setupEditor } from "./setup-editor.mjs";

const [command = "serve"] = process.argv.slice(2);
switch (command) {
  case "serve": {
    await setupEditor();
    (await import("./editor-server.mjs")).serveEditor();
    break;
  }
  case "scene-worker":
    process.chdir(process.argv[4]);
    await import("./editor-scene-worker.mjs");
    break;
  case "export":
  case "import":
    await prepareEditorCore();
    await import("./scene-editor.mjs");
    break;
  case "templates":
    await prepareEditorCore();
    await import("./build-editor-templates.mjs");
    break;
  case "test": {
    await prepareEditorCore();
    const { execFileSync } = await import("node:child_process");
    execFileSync("moon", ["build", "tooling/art", "--release"], { stdio: "inherit" });
    const { readdirSync } = await import("node:fs");
    const { run } = await import("node:test");
    const { spec } = await import("node:test/reporters");
    const files = readdirSync("tests/content").filter(name => name.endsWith(".test.mjs")).map(name => "tests/content/" + name);
    const stream = run({ files });
    stream.on("test:fail", () => { process.exitCode = 1; });
    stream.compose(spec).pipe(process.stdout);
    break;
  }
  default:
    throw new Error("Usage: moon run cmd/editor -- [serve|export|import|templates|test]");
}

///|
extern "js" fn start_editor() -> Unit =
  #| () => import("node:url").then(({pathToFileURL}) =>
  #|   import(new URL("scripts/editor-cli.mjs", pathToFileURL(process.cwd() + "/")))
  #| ).catch(err => { console.error(err); process.exitCode = 1 })

///|
fn main {
  start_editor()
}

///|
extern "js" fn build_content() -> Unit =
  #| () => import("node:url").then(({pathToFileURL}) =>
  #|   import(new URL("scripts/build-content.mjs", pathToFileURL(process.cwd() + "/")))
  #| ).catch(err => { console.error(err); process.exitCode = 1 })

///|
fn main {
  build_content()
}

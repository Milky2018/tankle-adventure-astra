///|
let revision = "2431a09f46f34c560bc8e44b33be0e567723d5b9"

///|
extern "js" fn cwd() -> String = "()=>process.cwd()"

///|
extern "js" fn change_directory(p : String) -> Unit = "p=>process.chdir(p)"

///|
extern "js" fn download(url : String) -> @js_async.Promise[Raw] = "u=>fetch(u)"

///|
extern "js" fn download_bytes(res : Raw) -> @js_async.Promise[Raw] = "r=>r.arrayBuffer().then(b=>Buffer.from(b))"

///|
extern "js" fn blob_hash(data : Raw) -> String =
  #| b=>process.getBuiltinModule('crypto').createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex')

///|
async fn fetch_file(url : String) -> Raw {
  let res = download(url).wait()
  guard @model.truth(res, "ok") else {
    raise Failure(
      "Could not download " +
      url +
      ": HTTP " +
      @archive.stringify(res.get("status")),
    )
  }
  download_bytes(res).wait()
}

///|
async fn cache_file(root : String, path : String, sha? : String) -> Unit {
  let dest = root + "/.editor/three-r185/" + path
  if sha is None && @archive.exists(dest) {
    return
  }
  let url = "https://raw.githubusercontent.com/mrdoob/three.js/" +
    revision +
    "/" +
    path
  let content = fetch_file(url)
  if sha is Some(expected) && blob_hash(content) != expected {
    raise Failure("Source hash mismatch: " + path)
  }
  @archive.mkdir(dirname(dest))
  let tmp = temp_name(dest)
  defer (if @archive.exists(tmp) { @archive.unlink(tmp) })
  @archive.write_file(tmp, content)
  rename(tmp, dest)
}

///|
async fn ensure_three_file(root : String, path : String) -> Unit {
  guard (path.has_prefix("build/") || path.has_prefix("examples/jsm/")) &&
    !path.split("/").any(part => part == "..") &&
    path
    .iter()
    .all(c => {
      (c >= 'a' && c <= 'z') ||
      (c >= 'A' && c <= 'Z') ||
      (c >= '0' && c <= '9') ||
      c is ('/' | '.' | '_' | '-')
    }) else {
    raise Failure("Invalid editor library path")
  }
  cache_file(root, path)
}

///|
async fn setup(root : String) -> Unit {
  ignore(
    @async.all([
      async fn() { ensure_three_file(root, "build/three.core.js") },
      async fn() { ensure_three_file(root, "build/three.module.js") },
    ]),
  )
  let ready = root + "/.editor/three-r185/.ready"
  if @archive.exists(ready) &&
    @model.buffer_text(@archive.read_file(ready)) == revision {
    return
  }
  println("Preparing the pinned Three.js editor...")
  let tree = @archive.parse(
    fetch_file(
      "https://api.github.com/repos/mrdoob/three.js/git/trees/" +
      revision +
      "?recursive=1",
    ),
  )
  let jobs : Array[async () -> Unit] = []
  for f in @model.array(tree, "tree") {
    let path = str(f, "path")
    if str(f, "type") == "blob" &&
      (
        path == "LICENSE" ||
        ["editor/js/", "editor/css/", "editor/images/"]
        .iter()
        .any(p => path.has_prefix(p))
      ) {
      jobs.push(async fn() { cache_file(root, path, sha=str(f, "sha")) })
    }
  }
  ignore(@async.all(jobs[:], max_concurrency=4))
  @archive.write_file(ready, Raw::of(revision))
}

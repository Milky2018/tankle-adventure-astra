///|
let revision = "2431a09f46f34c560bc8e44b33be0e567723d5b9"

///|
fn cwd() -> String raise {
  guard @env.current_dir() is Some(path) else {
    raise Failure("Cannot determine the current directory")
  }
  path
}

///|
extern "js" fn change_directory(path : String) -> @js_async.Promise[Unit] =
  #| async path=>process.chdir(path)

///|
fn blob_hash(data : Bytes) -> String {
  let header = @utf8.encode("blob \{data.length()}\u0000")
  @crypto.bytes_to_hex_string(@crypto.sha1(header + data))
}

///|
async fn fetch_file(url : String) -> Bytes {
  let (response, body) = @http.get(url)
  guard response.code >= 200 && response.code < 300 else {
    raise Failure("Could not download \{url}: HTTP \{response.code}")
  }
  body.binary()
}

///|
async fn cache_file(root : String, path : String, sha? : String) -> Unit {
  let dest = root + "/.editor/three-r185/" + path
  if sha is None && @fs.path_exists(dest) {
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
  @fs.create_dir(@path.Path(dest).dirname().to_string())
  let tmp = temp_name(dest)
  defer (if @fs.path_exists(tmp) { @fs.remove_file(tmp) })
  @fs.write_bytes_to_file(tmp, content)
  rename(tmp, dest).wait()
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
  if @fs.path_exists(ready) && @fs.read_file_to_string(ready) == revision {
    return
  }
  println("Preparing the pinned Three.js editor...")
  let tree = @archive.parse(
    @utf8.decode_lossy(
      fetch_file(
        "https://api.github.com/repos/mrdoob/three.js/git/trees/" +
        revision +
        "?recursive=1",
      ),
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
  @fs.write_string_to_file(ready, revision)
}

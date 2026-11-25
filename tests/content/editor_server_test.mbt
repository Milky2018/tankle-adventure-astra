///|
#module("node:child_process")
extern "js" fn spawn(
  exe : String,
  args : FixedArray[String],
  options : Raw,
) -> Raw = "spawn"

///|
extern "js" fn editor_output(proc : Raw) -> @js_async.JsReadableStream = "p=>process.getBuiltinModule('stream').Readable.toWeb(p.stdout)"

///|
#module("node:os")
extern "js" fn platform() -> String = "platform"

///|
#module("node:child_process")
extern "js" fn spawn_sync(exe : String, args : FixedArray[String]) -> Unit = "spawnSync"

///|
extern "js" fn kill_child(proc : Raw) -> Unit = "p=>p.kill()"

///|
// Moon may have both its JS runner and an active scene worker below it.
fn stop_editor(proc : Raw) -> Unit raise {
  if !proc.get("exitCode").is_null() || !proc.get("signalCode").is_null() {
    return
  }
  let pid : Int32 = proc.get("pid").cast()
  if platform() == "win32" {
    spawn_sync("taskkill", ["/pid", pid.to_string(), "/T", "/F"])
  } else if !@node.terminate_group(pid) {
    kill_child(proc)
  }
}

///|
async test "local HTTP editing validates writes, detects stale tabs and rejects foreign origins" {
  let repo = cwd()
  let sandbox = temp_dir()
  defer @fs.remove_dir(sandbox)
  make_fixture(repo, sandbox)
  copy_fixture(
    repo + "/content/abilities.json",
    sandbox + "/content/abilities.json",
  )
  let env = @env.get_env_vars()
  env["EDITOR_PORT"] = "0"
  let proc = spawn(
    "moon",
    ["run", "--quiet", "cmd/editor", "--", "serve", sandbox],
    raw({
      "cwd": @json.to_json(repo),
      "env": @json.to_json(env),
      "stdio": ["ignore", "pipe", "inherit"],
      "detached": true,
    }),
  )
  defer stop_editor(proc)
  let reader = @js_async.ReadableStream::from_js(editor_output(proc))
  let origin = for ;; {
    guard reader.read_until(b"\n") is Some(line) else {
      fail("Editor exited before reporting a listening port")
    }
    if @utf8.decode(line).trim().split_once("http://127.0.0.1:")
      is Some((_, port)) {
      break "http://127.0.0.1:" + port.to_owned()
    }
  }
  async fn post(
    path : String,
    data : Raw,
    source : String,
  ) -> (@http.ResponseHeader, @http.MessageBody) {
    @http.post_text(origin + path, @archive.stringify(data), headers={
      "Origin": source,
      "Content-Type": "application/json",
    })
  }
  let abilities = "/api/abilities"
  let scenes = "/api/scene"
  let path = sandbox + "/content/abilities.json"
  let (_, ability_body) = @http.get(origin + abilities)
  let data = raw(ability_body.json())
  let original = @fs.read_file_to_string(path)
  let (bad, explanation) = @http.post_text(origin + abilities, "{", headers={
    "Origin": origin,
  })
  assert_eq(bad.code, 400)
  let error = explanation.json()
  assert_true(
    error is { "error": String(msg), .. } && msg.contains("Invalid JSON"),
    msg=error.stringify(),
  )
  data.get("values").get("cannon").set("damage", Raw::of(-2))
  assert_eq(post(abilities, data, origin).0.code, 400)
  let (header, scene_body) = @http.get(origin + scenes)
  assert_eq(header.headers.get("content-encoding"), Some("gzip"))
  let project = raw(scene_body.json())
  shift_x(@model.children(project_world(project))[0], 2)
  let (first, accepted) = post(scenes, project, origin)
  assert_eq(first.code, 200)
  assert_true(accepted.json() is { "written": true, .. })
  assert_eq(post(scenes, project, origin).0.code, 400)
  assert_eq(@fs.read_file_to_string(path), original)
  data.get("values").get("cannon").set("damage", Raw::of(4))
  assert_eq(post(abilities, data, "http://example.com").0.code, 403)
  let (saved, body) = post(abilities, data, origin)
  assert_eq(saved.code, 200, msg=body.text())
  let saved_data = body.json()
  assert_true(
    saved_data is { "revision": String(revision), .. } &&
    revision != @model.str(data, "revision"),
  )
  assert_eq(quantity(@model.get(read_json(path), "cannon"), "damage"), 4)
  assert_eq(post(abilities, data, origin).0.code, 400)
}

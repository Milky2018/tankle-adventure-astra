///|
extern "js" fn launch_editor(
  exe : String,
  args : FixedArray[String],
  repo : String,
) -> Raw =
  #| (exe,args,cwd)=>process.getBuiltinModule("child_process").spawn(exe,args,{cwd,env:{...process.env,EDITOR_PORT:"0"},stdio:["ignore","pipe","inherit"],detached:true})

///|
extern "js" fn lines(stream : Raw) -> Raw =
  #| stream => process.getBuiltinModule("readline").createInterface({input:stream})[Symbol.asyncIterator]()

///|
extern "js" fn next_line(reader : Raw) -> @js_async.Promise[Raw] = "reader=>reader.next()"

///|
// Moon may have both its JS runner and an active scene worker below it.
extern "js" fn stop_editor(proc : Raw) -> Unit =
  #| p => {
  #|   if (p.exitCode !== null || p.signalCode !== null) return;
  #|   if (process.platform === "win32") {
  #|     process.getBuiltinModule("child_process").spawnSync("taskkill",["/pid",String(p.pid),"/T","/F"]);
  #|   } else {
  #|     try { process.kill(-p.pid,"SIGTERM") }
  #|     catch (e) { if (e.code !== "ESRCH" && e.code !== "EPERM") throw e; p.kill() }
  #|   }
  #| }

///|
extern "js" fn request(url : String, init : Raw) -> @js_async.Promise[Raw] = "(url,init)=>fetch(url,init)"

///|
extern "js" fn response_body(r : Raw) -> @js_async.Promise[Raw] = "r=>r.json()"

///|
async test "local HTTP editing validates writes, detects stale tabs and rejects foreign origins" {
  let repo = cwd()
  let sandbox = temp_dir()
  defer {
    chdir(repo)
    remove_dir(sandbox)
  }
  make_fixture(repo, sandbox, three_core(repo))
  chdir(repo)
  copy_dir(
    repo + "/content/abilities.json",
    sandbox + "/content/abilities.json",
  )
  let proc = launch_editor(
    "moon",
    ["run", "--quiet", "cmd/editor", "--", "serve", sandbox],
    repo,
  )
  defer stop_editor(proc)
  let reader = lines(proc.get("stdout"))
  let origin = for ;; {
    let line = next_line(reader).wait()
    guard !flag(line, "done") else {
      fail("Editor exited before reporting a listening port")
    }
    if name_at(line, "value").split_once("http://127.0.0.1:") is Some((_, port)) {
      break "http://127.0.0.1:" + port.to_owned()
    }
  }
  async fn get(path : String) -> Raw {
    request(origin + path, raw({})).wait()
  }
  async fn post(path : String, data : Raw, source : String) -> Raw {
    let init = raw({
      "method": "POST",
      "headers": {
        "Origin": @json.to_json(source),
        "Content-Type": "application/json",
      },
    })
    init.set("body", Raw::of(@archive.stringify(data)))
    request(origin + path, init).wait()
  }
  let abilities = "/api/abilities"
  let scenes = "/api/scene"
  let data = response_body(get(abilities)).wait()
  let original = @model.buffer_text(
    @archive.read_file(sandbox + "/content/abilities.json"),
  )
  lookup(data, "values.cannon").set("damage", Raw::of(-2))
  assert_eq(quantity(post(abilities, data, origin), "status"), 400)
  let response = get(scenes)
  let encoding : String = @model.call(response.get("headers"), "get", [
    Raw::of("content-encoding"),
  ]).cast()
  assert_eq(encoding, "gzip")
  let project = response_body(response).wait()
  shift_x(lookup(project, "scene.object.children.0"), 2)
  let first = post(scenes, project, origin)
  assert_eq(quantity(first, "status"), 200)
  assert_true(flag(response_body(first).wait(), "written"))
  assert_eq(quantity(post(scenes, project, origin), "status"), 400)
  assert_eq(
    @model.buffer_text(@archive.read_file(sandbox + "/content/abilities.json")),
    original,
  )
  lookup(data, "values.cannon").set("damage", Raw::of(4))
  assert_eq(
    quantity(post(abilities, data, "http://example.com"), "status"),
    403,
  )
  let saved = post(abilities, data, origin)
  let saved_data = response_body(saved).wait()
  assert_eq(quantity(saved, "status"), 200, msg=@archive.stringify(saved_data))
  assert_false(name_at(saved_data, "revision") == name_at(data, "revision"))
  assert_eq(
    quantity(read_json(sandbox + "/content/abilities.json"), "cannon.damage"),
    4,
  )
  assert_eq(quantity(post(abilities, data, origin), "status"), 400)
}

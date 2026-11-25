///|
// Chrome DevTools pipe transport. Chrome reads NUL-delimited commands on fd 3
// and writes responses and events on fd 4. One command is outstanding at a time.
#external
type Chrome

///|
#module("node:os")
extern "js" fn system_tmpdir() -> String = "tmpdir"

///|
#module("node:fs")
extern "js" fn make_temp(prefix : String) -> String = "mkdtempSync"

///|
extern "js" fn launch(executable : String, args : FixedArray[String]) -> Chrome =
  #| (path,args) => process.getBuiltinModule("child_process").spawn(path,args,{stdio:["ignore","ignore","ignore","pipe","pipe"]})

///|
extern "js" fn kill(proc : Chrome) -> @js_async.Promise[Unit] =
  #| p => new Promise(r=>{if(p.exitCode!==null||p.signalCode!==null)r();else {p.once("exit",r);p.kill()}})

///|
extern "js" fn debugger_output(proc : Chrome) -> @js_async.JsReadableStream =
  #| p=>process.getBuiltinModule("stream").Readable.toWeb(p.stdio[4])

///|
extern "js" fn write_pipe(proc : Chrome, json : String) -> Unit =
  #| (p,msg)=>p.stdio[3].write(msg+"\0")

///|
priv struct Browser {
  proc : Chrome
  stream : @js_async.ReadableStream
  mut id : Int32
  mut session : String
  errors : Array[String]
  base : String
  mut probe_id : String
  mut firing : Bool
  mut width : Int32
  mut height : Int32
}

///|
fn prop(v : Json, key : String) -> Json {
  match v {
    Object(fields) => fields.get(key).unwrap_or(@json.null)
    _ => @json.null
  }
}

///|
fn text(v : Json) -> String {
  match v {
    String(s) => s
    _ => v.stringify()
  }
}

///|
async fn Browser::command(
  self : Browser,
  verb : String,
  params~ : Json = {},
  target~ : Bool = true,
) -> Json {
  self.id += 1
  let msg : Map[String, Json] = {
    "id": Json::number(self.id.to_double()),
    "method": Json::string(verb),
    "params": params,
  }
  if target {
    msg["sessionId"] = Json::string(self.session)
  }
  write_pipe(self.proc, Json::object(msg).stringify())
  for ;; {
    guard @async.with_timeout(
        30000,
        () => self.stream.read_until(b"\x00"),
        error=Failure("Chrome stopped responding to " + verb),
      )
      is Some(bytes) else {
      raise Failure("Chrome closed its DevTools pipe")
    }
    let m = @json.parse(@utf8.decode(bytes))
    if prop(m, "id") == Json::number(self.id.to_double()) {
      guard prop(m, "error") is Null else {
        raise Failure(verb + ": " + prop(m, "error").stringify())
      }
      return prop(m, "result")
    }
    match prop(m, "method") {
      String("Runtime.executionContextsCleared") => self.probe_id = ""
      String("Runtime.exceptionThrown") =>
        self.errors.push(
          prop(prop(m, "params"), "exceptionDetails").stringify(),
        )
      String("Network.responseReceived") => {
        let response = prop(prop(m, "params"), "response")
        if prop(response, "status") is Number(n, ..) && n >= 400 {
          self.errors.push(
            "HTTP " + n.to_string() + " " + text(prop(response, "url")),
          )
        }
      }
      _ => ()
    }
  }
}

///|
async fn Browser::attach(self : Browser) -> Unit {
  let targets = self.command("Target.getTargets", target=false)
  guard prop(targets, "targetInfos") is Array(ts) &&
    ts.iter().find_first(t => prop(t, "type") == "page") is Some(tab) else {
    raise Failure("No page in isolated Chrome")
  }
  let result = self.command(
    "Target.attachToTarget",
    params={ "targetId": prop(tab, "targetId"), "flatten": true },
    target=false,
  )
  self.session = text(prop(result, "sessionId"))
  for verb in ["Page.enable", "Runtime.enable", "Network.enable"] {
    ignore(self.command(verb))
  }
  ignore(
    self.command("Page.addScriptToEvaluateOnNewDocument", params={
      "source": @fs.read_file_to_string(
        "_build/js/release/build/tests/browser/probe/probe.js",
      ),
    }),
  )
  self.resize(1280, 720)
}

///|
async fn Browser::resize(self : Browser, w : Int32, h : Int32) -> Unit {
  self.width = w
  self.height = h
  ignore(
    self.command("Emulation.setDeviceMetricsOverride", params={
      "width": w,
      "height": h,
      "deviceScaleFactor": 1,
      "mobile": false,
    }),
  )
}

///|
async fn Browser::probe(self : Browser, request : @protocol.Request) -> Json {
  if self.probe_id == "" {
    let remote = self.command("Runtime.evaluate", params={
      "expression": "globalThis.__tankleProbe",
    })
    guard prop(prop(remote, "result"), "objectId") is String(id) else {
      return @json.null
    }
    self.probe_id = id
  }
  let payload = @json.ToJson::to_json(request)
  let r = self.command("Runtime.callFunctionOn", params={
    "objectId": self.probe_id,
    "functionDeclaration": "function(request){return this(request)}",
    "arguments": [{ "value": payload }],
    "returnByValue": true,
    "awaitPromise": true,
    "userGesture": true,
  }) catch {
    Failure(msg) if msg.contains("Cannot find context") ||
      msg.contains("Could not find object") ||
      msg.contains("Inspected target navigated") => {
      self.probe_id = ""
      return @json.null
    }
    err => raise err
  }
  guard prop(r, "exceptionDetails") is Null else {
    raise Failure(
      payload.stringify() + ": " + prop(r, "exceptionDetails").stringify(),
    )
  }
  prop(prop(r, "result"), "value")
}

///|
async fn Browser::until(
  self : Browser,
  description : String,
  ready : async () -> Bool,
  timeout~ : Int32 = 15000,
) -> Unit {
  let start = @async.now()
  while @async.now() - start < timeout.to_int64() {
    if ready() {
      return
    }
    @async.sleep(35)
  }
  raise Failure(
    "Timed out waiting for " + description + ": " + text(self.probe(BodyText)),
  )
}

///|
async fn Browser::game_ready(self : Browser) -> Bool {
  self.probe(GameReady) is True
}

///|
async fn Browser::goto(self : Browser, suffix : String) -> Unit {
  // Blank the old document before observing readiness on navigations to the same URL.
  ignore(self.command("Page.navigate", params={ "url": "about:blank" }))
  self.until("blank page", () => self.probe(PageUrl) == "about:blank")
  ignore(self.command("Page.navigate", params={ "url": self.base + suffix }))
  self.until("game startup", () => self.game_ready(), timeout=90000)
  self.firing = false
}

///|
async fn Browser::shot(self : Browser, name : String) -> Unit {
  let r = self.command("Page.captureScreenshot", params={ "format": "png" })
  @fs.write_bytes_to_file(
    "output/browser/" + name + ".png",
    @base64.decode(text(prop(r, "data"))),
  )
}

///|
fn ensure(ok : Bool, message : String) -> Unit raise {
  if !ok {
    raise Failure(message)
  }
}

///|
fn chrome_path() -> String raise {
  if @env.get_env_var("CHROME") is Some(path) {
    ensure(@fs.path_exists(path), "Chrome executable does not exist: " + path)
    return path
  }
  for
    p in [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome",
      "/usr/bin/chromium", "/usr/bin/chromium-browser", "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    ] {
    if @fs.path_exists(p) {
      return p
    }
  }
  raise Failure("Set CHROME to the installed Chromium or Chrome executable")
}

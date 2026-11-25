///|
// Chrome DevTools pipe transport. Chrome reads NUL-delimited commands on fd 3
// and writes responses and events on fd 4. One command is outstanding at a time.
#external
type Chrome

///|
extern "js" fn launch(
  executable : String,
  args : FixedArray[String],
) -> @js_async.Promise[Chrome] =
  #| (path,args)=>new Promise((ok,fail)=>{
  #|   const child=process.getBuiltinModule("child_process").spawn(path,args,{stdio:["ignore","ignore","ignore","pipe","pipe"]});
  #|   child.once("error",fail);child.once("spawn",()=>ok(child));
  #| })

///|
extern "js" fn kill(proc : Chrome) -> @js_async.Promise[Unit] =
  #| p => new Promise(r=>{if(p.exitCode!==null||p.signalCode!==null)r();else {p.once("exit",r);p.kill()}})

///|
extern "js" fn debugger_output(proc : Chrome) -> @js_async.JsReadableStream =
  #| p=>process.getBuiltinModule("stream").Readable.toWeb(p.stdio[4])

///|
extern "js" fn write_pipe(
  proc : Chrome,
  data : String,
) -> @js_async.Promise[Unit] =
  #| (p,msg)=>new Promise((ok,fail)=>p.stdio[3].write(msg,e=>e?fail(e):ok()))

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
  @async.with_timeout(
    30000,
    () => {
      write_pipe(self.proc, Json::object(msg).stringify() + "\u0000").wait()
      for ;; {
        guard self.stream.read_until(b"\x00") is Some(bytes) else {
          raise Failure("Chrome closed its DevTools pipe")
        }
        match @json.parse(@utf8.decode(bytes)) {
          { "id": Number(id, ..), .. } as reply if id == self.id.to_double() =>
            match reply {
              { "error": detail, .. } =>
                raise Failure(verb + ": " + detail.stringify())
              { "result": result, .. } => break result
              _ => raise Failure(verb + ": missing CDP result")
            }
          { "method": "Runtime.executionContextsCleared", .. } =>
            self.probe_id = ""
          {
            "method": "Runtime.exceptionThrown",
            "params": { "exceptionDetails": detail, .. },
            ..
          } => self.errors.push(detail.stringify())
          {
            "method": "Network.responseReceived",
            "params": {
              "response": {
                "status": Number(status, ..),
                "url": String(url),
                ..
              },
              ..
            },
            ..
          } if status >= 400 =>
            self.errors.push("HTTP " + status.to_string() + " " + url)
          _ => ()
        }
      }
    },
    error=Failure("Chrome stopped responding to " + verb),
  )
}

///|
async fn Browser::attach(self : Browser) -> Unit {
  guard self.command("Target.getTargets", target=false)
    is { "targetInfos": Array(targets), .. } &&
    targets.iter().find_first(t => t is { "type": "page", .. })
    is Some({ "targetId": String(tab), .. }) else {
    raise Failure("No page in isolated Chrome")
  }
  let result = self.command(
    "Target.attachToTarget",
    params={ "targetId": Json::string(tab), "flatten": true },
    target=false,
  )
  guard result is { "sessionId": String(session), .. } else {
    raise Failure("Chrome did not supply a session ID")
  }
  self.session = session
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
    guard remote is { "result": { "objectId": String(id), .. }, .. } else {
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
  match r {
    { "exceptionDetails": detail, .. } =>
      raise Failure(payload.stringify() + ": " + detail.stringify())
    { "result": { "value": value, .. }, .. } => value
    { "result": { "type": "undefined", .. }, .. } => @json.null
    _ => raise Failure("Invalid browser probe result: " + r.stringify())
  }
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
  guard r is { "data": String(encoded), .. } else {
    raise Failure("Chrome returned no screenshot data")
  }
  @fs.write_bytes_to_file(
    "output/browser/" + name + ".png",
    @base64.decode(encoded),
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

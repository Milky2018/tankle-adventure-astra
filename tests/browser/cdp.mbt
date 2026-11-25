///|
// Chrome DevTools pipe transport. Chrome reads NUL-delimited commands on fd 3
// and writes responses and events on fd 4. One command is outstanding at a time.
#external
type Chrome

///|
#external
type Stream

///|
extern "js" fn temp_profile() -> String =
  #| () => process.getBuiltinModule("fs").mkdtempSync(process.getBuiltinModule("path").join(process.getBuiltinModule("os").tmpdir(),"tankle-browser-"))

///|
extern "js" fn remove_profile(path : String) -> Unit =
  #| p => process.getBuiltinModule("fs").rmSync(p,{recursive:true,force:true,maxRetries:6})

///|
extern "js" fn launch(executable : String, args : FixedArray[String]) -> Chrome =
  #| (path,args) => process.getBuiltinModule("child_process").spawn(path,args,{stdio:["ignore","ignore","ignore","pipe","pipe"]})

///|
extern "js" fn kill(proc : Chrome) -> @js_async.Promise[Unit] =
  #| p => new Promise(r=>{if(p.exitCode!==null||p.signalCode!==null)r();else {p.once("exit",r);p.kill()}})

///|
extern "js" fn pipe_stream(proc : Chrome) -> Stream =
  #| p=>p.stdio[4].setEncoding("utf8")[Symbol.asyncIterator]()

///|
extern "js" fn read_pipe(stream : Stream) -> @js_async.Promise[String] =
  #| r=>r.next().then(({value,done})=>{if(done)throw Error("Chrome closed its DevTools pipe");return value})

///|
extern "js" fn write_pipe(proc : Chrome, json : String) -> Unit =
  #| (p,msg)=>p.stdio[3].write(msg+"\0")

///|
extern "js" fn save_image(path : String, base64 : String) -> Unit =
  #| (p,v)=>process.getBuiltinModule("fs").writeFileSync(p,Buffer.from(v,"base64"))

///|
extern "js" fn mkdir(path : String) -> Unit =
  #| p=>process.getBuiltinModule("fs").mkdirSync(p,{recursive:true})

///|
extern "js" fn file_exists(path : String) -> Bool =
  #| p=>process.getBuiltinModule("fs").existsSync(p)

///|
extern "js" fn now_ms() -> Double = "()=>performance.now()"

///|
priv struct Browser {
  proc : Chrome
  stream : Stream
  mut carry : String
  mut id : Int32
  mut session : String
  errors : Array[String]
  base : String
  mut yaw : Double
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
    while self.carry.find("\u0000") is None {
      self.carry += @async.with_timeout(
        30000,
        () => read_pipe(self.stream).wait(),
        error=Failure("Chrome stopped responding to " + verb),
      )
    }
    let end = self.carry.find("\u0000").unwrap()
    let m = @json.parse(self.carry[:end])
    self.carry = self.carry[end + 1:].to_owned()
    if prop(m, "id") == Json::number(self.id.to_double()) {
      guard prop(m, "error") is Null else {
        raise Failure(verb + ": " + prop(m, "error").stringify())
      }
      return prop(m, "result")
    }
    match prop(m, "method") {
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
async fn Browser::evaluate(self : Browser, expr : String) -> Json {
  let r = self.command("Runtime.evaluate", params={
    "expression": expr,
    "awaitPromise": true,
    "returnByValue": true,
    "userGesture": true,
  })
  guard prop(r, "exceptionDetails") is Null else {
    raise Failure(
      "Browser evaluation: " + prop(r, "exceptionDetails").stringify(),
    )
  }
  prop(prop(r, "result"), "value")
}

///|
async fn Browser::until(
  self : Browser,
  condition : String,
  timeout~ : Int32 = 15000,
) -> Unit {
  let start = now_ms()
  while now_ms() - start < timeout.to_double() {
    if self.evaluate(condition) is True {
      return
    }
    @async.sleep(35)
  }
  raise Failure(
    "Timed out waiting for " +
    condition +
    ": " +
    text(self.evaluate("document.body.innerText.slice(0,400)")),
  )
}

///|
async fn Browser::goto(self : Browser, suffix : String) -> Unit {
  // Blank the old document before observing readiness on navigations to the same URL.
  ignore(self.command("Page.navigate", params={ "url": "about:blank" }))
  self.until("location.href==='about:blank'")
  ignore(self.command("Page.navigate", params={ "url": self.base + suffix }))
  self.until(
    "typeof window.__typedRead==='function'&&!document.body.classList.contains('starting')",
    timeout=90000,
  )
  self.yaw = -@math.PI / 2
  self.firing = false
}

///|
async fn Browser::shot(self : Browser, name : String) -> Unit {
  let r = self.command("Page.captureScreenshot", params={ "format": "png" })
  save_image("output/browser/" + name + ".png", text(prop(r, "data")))
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
    ensure(file_exists(path), "Chrome executable does not exist: " + path)
    return path
  }
  for
    p in [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome",
      "/usr/bin/chromium", "/usr/bin/chromium-browser", "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    ] {
    if file_exists(p) {
      return p
    }
  }
  raise Failure("Set CHROME to the installed Chromium or Chrome executable")
}

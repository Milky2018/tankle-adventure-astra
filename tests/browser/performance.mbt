///|
extern "js" fn run_moon(args : FixedArray[String]) -> Unit =
  #| args=>process.getBuiltinModule("child_process").execFileSync("moon",args,{stdio:"inherit"})

///|
extern "js" fn read_text(path : String) -> String =
  #| p=>process.getBuiltinModule("fs").readFileSync(p,"utf8")

///|
extern "js" fn write_text(path : String, v : String) -> Unit =
  #| (p,v)=>process.getBuiltinModule("fs").writeFileSync(p,v)

///|
async fn Browser::performance(self : Browser) -> Unit {
  run_moon(["build", "tests/browser/probe", "--release"])
  self.goto("?chapter=folded&test")
  let ready = self.evaluate(
    "performance.getEntriesByName('moonbit-first-frame')[0]?.startTime??performance.now()",
  )
  let entries = self.evaluate(
    "performance.getEntriesByType('resource').map(r=>r.toJSON())",
  )
  let loads : Array[Json] = []
  if entries is Array(rs) {
    for r in rs {
      if prop(r, "transferSize") is Number(n, ..) && n > 200000 {
        loads.push({
          "name": prop(r, "name"),
          "bytes": n,
          "end": prop(r, "responseEnd"),
        })
      }
    }
  }
  @async.sleep(1000)
  ignore(
    self.evaluate(
      read_text("_build/js/release/build/tests/browser/probe/probe.js"),
    ),
  )
  self.mouse("mouseMoved", 680, 280, 0)
  self.fire(true)
  for _ in 0..<3 {
    for k in ["KeyA", "KeyW", "KeyD", "KeyS"] {
      self.key(k, true)
      @async.sleep(300)
      self.key(k, false)
    }
  }
  self.fire(false)
  @async.sleep(1200)
  let times : Array[Double] = @json.from_json(
    self.evaluate("__tankleEndFrameSample()"),
  )
  times.sort()
  let n = times.length()
  ensure(n > 0, "Browser recorded no animation frames")
  let pct = fn(q : Double) { times[(n.to_double() * q).to_int()] }
  let stats : Json = {
    "frames": n,
    "p50": pct(0.5),
    "p95": pct(0.95),
    "p99": pct(0.99),
    "max": times[n - 1],
    "over33": times.filter(t => t > 33.5).length(),
  }
  write_text(
    "output/browser/performance.json",
    Json::object({
      "startup": { "ready": ready, "resources": Json::array(loads) },
      "result": stats,
    }).stringify(indent=2),
  )
  println(stats.stringify())
  self.shot("performance")
  self.press("Escape")
}

///|
async fn Browser::performance(self : Browser) -> Unit {
  self.goto("?chapter=folded&test")
  let startup = self.probe(StartupTiming)
  @async.sleep(1000)
  ignore(self.probe(BeginFrameSample))
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
  let times : Array[Double] = @json.from_json(self.probe(EndFrameSample))
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
  @fs.write_string_to_file(
    "output/browser/performance.json",
    Json::object({ "startup": startup, "result": stats }).stringify(indent=2),
  )
  println(stats.stringify())
  self.shot("performance")
  self.press("Escape")
}

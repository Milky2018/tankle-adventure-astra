///|
let save_key = "tankle-moonbit-v1"

///|
async fn Browser::saved(self : Browser) -> Json {
  @json.parse(text(self.evaluate("localStorage.getItem('" + save_key + "')")))
}

///|
async fn Browser::new_game(self : Browser) -> Unit {
  self.goto("?test")
  ensure(self.visible("#journey-start"), "Title screen did not offer New Game")
  ensure(
    self.evaluate("localStorage.getItem('" + save_key + "')") is Null,
    "Profile already has a save",
  )
  ensure(!self.visible("#journey-continue"), "Continue offered without a save")
  self.click("#journey-start")
  self.until(
    "!!localStorage.getItem('" +
    save_key +
    "') && !document.querySelector('#journey').open",
  )
  let saved = self.saved()
  guard prop(saved, "flags") is Object(flags) else {
    raise Failure("Save is missing progression")
  }
  flags["relay-west"] = true
  ignore(
    self.evaluate(
      "localStorage.setItem('" +
      save_key +
      "'," +
      Json::string(saved.stringify()).stringify() +
      ")",
    ),
  )
  self.goto("?test")
  ensure(self.visible("#journey-start"), "New Game missing with a save")
  self.click("#journey-continue")
  ensure(self.player().flag("relay-west"), "Continue lost progress")
  self.press("Escape")
  self.click("#journey-button")
  self.click("#journey-start")
  self.until(
    "typeof window.__typedRead==='function' && !document.querySelector('#journey').open && !__typedRead().flags['relay-west'] && !document.body.classList.contains('starting')",
  )
  ensure(
    prop(prop(self.saved(), "flags"), "relay-west") != true,
    "Old save survived restart",
  )
  self.goto("?test")
  self.click("#journey-continue")
  ensure(!self.player().flag("relay-west"), "Old progress returned on reload")
}

///|
async fn Browser::slider(self : Browser, id : String, value : String) -> Unit {
  let el = element(id)
  ignore(self.evaluate(el + ".value=" + Json::string(value).stringify()))
  for event in ["input", "change"] {
    ignore(
      self.evaluate(
        el + ".dispatchEvent(new Event('" + event + "',{bubbles:true}))",
      ),
    )
  }
}

///|
async fn Browser::interface_check(self : Browser) -> Unit {
  self.goto("?test&view=third")
  self.click("#journey-continue")
  self.until("!!document.querySelector('#interaction').getClientRects().length")
  self.press("Tab")
  ensure(self.visible("#region"), "Map did not open")
  let layers : Int32 = @json.from_json(
    self.evaluate("document.querySelectorAll('#map-layers button').length"),
  )
  ensure(layers >= 2, "Discovered map layers missing")
  let last = "#map-layers button:last-child"
  self.click(last)
  self.until(element(last) + ".getAttribute('aria-pressed')==='true'")
  self.shot("map")
  self.press("Escape")
  self.press("Escape")
  let before = self.player()
  self.click("#binding-up")
  self.press("KeyI")
  ensure(
    self.evaluate(element("#binding-up") + ".textContent") == "KeyI",
    "Binding was not replaced",
  )
  self.click("#camera-adjust summary")
  let dist = "#camera-distance"
  let range = "#camera-render-distance"
  let old_dist = self.evaluate(element(dist) + ".value")
  let old_range = self.evaluate(element(range) + ".value")
  self.slider(dist, "18")
  self.slider(range, "80")
  let prefs = @json.parse(
    text(self.evaluate("localStorage.getItem('tankle-moonbit-settings-v1')")),
  )
  ensure(
    prop(prop(prefs, "camera"), "render_distance") == 80,
    "Render distance was not saved",
  )
  self.shot("camera-preview")
  self.click("#reset-camera")
  ensure(
    self.evaluate(element(dist) + ".value") == old_dist &&
    self.evaluate(element(range) + ".value") == old_range,
    "Camera reset failed",
  )
  self.click("#camera-adjust summary")
  self.click("#resume")
  self.key("KeyI", true)
  @async.sleep(1700)
  self.key("KeyI", false)
  let moved = self.player()
  ensure(
    @math.hypot(moved.x - before.x, moved.z - before.z) >= 1,
    "Remapped driving did not move the tank",
  )
  self.fire(true)
  @async.sleep(600)
  self.fire(false)
  ensure(self.player().heat > moved.heat, "Mouse firing did not increase heat")
  self.shot("third-person")
  self.press("Escape")
  self.click("#reset-bindings")
  let t = self.player().time
  @async.sleep(300)
  ensure(self.player().time == t, "Paused simulation advanced")
}

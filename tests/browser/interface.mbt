///|
let save_key = "tankle-moonbit-v1"

///|
async fn Browser::storage_id(self : Browser) -> Json {
  let tree = self.command("Page.getFrameTree")
  let key = self.command("Storage.getStorageKeyForFrame", params={
    "frameId": prop(prop(prop(tree, "frameTree"), "frame"), "id"),
  })
  {
    "securityOrigin": prop(
      prop(prop(tree, "frameTree"), "frame"),
      "securityOrigin",
    ),
    "storageKey": prop(key, "storageKey"),
    "isLocalStorage": true,
  }
}

///|
async fn Browser::stored(self : Browser, key : String) -> String? {
  let response = self.command("DOMStorage.getDOMStorageItems", params={
    "storageId": self.storage_id(),
  })
  let entries : Array[(String, String)] = @json.from_json(
    prop(response, "entries"),
  )
  entries.iter().find_first(e => e.0 == key).map(e => e.1)
}

///|
async fn Browser::saved(self : Browser) -> Json {
  guard self.stored(save_key) is Some(s) else {
    raise Failure("Save is missing")
  }
  @json.parse(s)
}

///|
async fn Browser::new_game(self : Browser) -> Unit {
  self.goto("?test")
  ensure(self.visible("#journey-start"), "Title screen did not offer New Game")
  ensure(self.stored(save_key) is None, "Profile already has a save")
  ensure(!self.visible("#journey-continue"), "Continue offered without a save")
  self.click("#journey-start")
  self.until("autosave and closed journey", () => {
    self.stored(save_key) is Some(_) &&
    self.probe(HasAttribute("#journey", "open")) is False
  })
  let saved = self.saved()
  guard prop(saved, "flags") is Object(flags) else {
    raise Failure("Save is missing progression")
  }
  flags["relay-west"] = true
  ignore(
    self.command("DOMStorage.setDOMStorageItem", params={
      "storageId": self.storage_id(),
      "key": save_key,
      "value": saved.stringify(),
    }),
  )
  self.goto("?test")
  ensure(self.visible("#journey-start"), "New Game missing with a save")
  self.click("#journey-continue")
  ensure(self.player().flag("relay-west"), "Continue lost progress")
  self.press("Escape")
  self.click("#journey-button")
  self.click("#journey-start")
  self.until("new game replacing relay progress", () => {
    self.game_ready() &&
    self.probe(HasAttribute("#journey", "open")) is False &&
    !self.player().flag("relay-west")
  })
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
  ignore(self.probe(SetSlider(id, value)))
}

///|
async fn Browser::interface_check(self : Browser) -> Unit {
  self.goto("?test&view=third")
  self.click("#journey-continue")
  self.until("interaction prompt", () => self.visible("#interaction"))
  self.press("Tab")
  ensure(self.visible("#region"), "Map did not open")
  let layers : Int32 = @json.from_json(
    self.probe(ElementCount("#map-layers button")),
  )
  ensure(layers >= 2, "Discovered map layers missing")
  let last = "#map-layers button:last-child"
  self.click(last)
  self.until("selected map layer", () => {
    self.probe(Attribute(last, "aria-pressed")) == "true"
  })
  self.shot("map")
  self.press("Escape")
  self.press("Escape")
  let before = self.player()
  self.click("#binding-up")
  self.press("KeyI")
  ensure(
    self.probe(TextContent("#binding-up")) == "KeyI",
    "Binding was not replaced",
  )
  self.click("#camera-adjust summary")
  let dist = "#camera-distance"
  let range = "#camera-render-distance"
  let old_dist = self.probe(InputValue(dist))
  let old_range = self.probe(InputValue(range))
  self.slider(dist, "18")
  self.slider(range, "80")
  guard self.stored("tankle-moonbit-settings-v1") is Some(settings) else {
    raise Failure("Settings were not saved")
  }
  let prefs = @json.parse(settings)
  ensure(
    prop(prop(prefs, "camera"), "render_distance") == 80,
    "Render distance was not saved",
  )
  self.shot("camera-preview")
  self.click("#reset-camera")
  ensure(
    self.probe(InputValue(dist)) == old_dist &&
    self.probe(InputValue(range)) == old_range,
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

///|
let save_key = "tankle-moonbit-v1"

///|
async fn Browser::storage_id(self : Browser) -> Json {
  guard self.command("Page.getFrameTree")
    is {
      "frameTree": {
        "frame": { "id": String(id), "securityOrigin": String(origin), .. },
        ..
      },
      ..
    } else {
    raise Failure("Chrome returned no page frame")
  }
  guard self.command("Storage.getStorageKeyForFrame", params={
      "frameId": Json::string(id),
    })
    is { "storageKey": String(key), .. } else {
    raise Failure("Chrome returned no storage key")
  }
  {
    "securityOrigin": Json::string(origin),
    "storageKey": Json::string(key),
    "isLocalStorage": true,
  }
}

///|
async fn Browser::stored(self : Browser, key : String) -> String? {
  let response = self.command("DOMStorage.getDOMStorageItems", params={
    "storageId": self.storage_id(),
  })
  guard response is { "entries": items, .. } else {
    raise Failure("Chrome returned no storage entries")
  }
  let entries : Array[(String, String)] = @json.from_json(items)
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
  guard saved is { "flags": Object(flags), .. } else {
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
    self.saved() is { "flags": Object(cleared), .. } &&
    cleared.get("relay-west") != Some(true),
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
  let current_hp = self.player().hp.ceil().to_int()
  ensure(
    self.probe(Attribute("#hp", "aria-valuenow")) ==
    Json::string(current_hp.to_string()) &&
    self.probe(ElementCount("#hp i:not(.empty)")) is Number(n, ..) &&
    n > 0 &&
    self.probe(Attribute("#fire-key [role=img]", "data-button")) == "Mouse0",
    "HUD did not display the current hull or mouse binding",
  )
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
    prefs is { "camera": { "render_distance": 80, .. }, .. },
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
  guard self.stored("tankle-moonbit-settings-v1") is Some(raw) else {
    raise Failure("Settings missing after resetting bindings")
  }
  let settings = @json.parse(raw)
  guard settings is { "bindings": Object(bindings), .. } else {
    raise Failure("Saved bindings missing")
  }
  let label = "<em>custom fire</em>"
  bindings["fire"] = Json::string(label)
  ignore(
    self.command("DOMStorage.setDOMStorageItem", params={
      "storageId": self.storage_id(),
      "key": "tankle-moonbit-settings-v1",
      "value": settings.stringify(),
    }),
  )
  self.goto("?test")
  self.click("#journey-continue")
  self.press("Escape")
  ensure(
    self.probe(TextContent("#binding-fire")) == Json::string(label) &&
    self.probe(TextContent("#fire-key")) == Json::string(label) &&
    self.probe(ElementCount("#binding-fire *, #fire-key *")) == 0,
    "A saved binding label was interpreted as markup",
  )
}

///|
#derive(Eq, Hash)
priv enum Action {
  Forward
  Backward
  Left
  Right
  Fire
  Magnet
  Boost
  Weapon
  Flotation
  Interact
  MapScreen
  Pause
  Skip
}

///|
let controls : ReadOnlyArray[(Action, String, String)] = [
  (Forward, "up", "KeyW"),
  (Backward, "down", "KeyS"),
  (Left, "left", "KeyA"),
  (Right, "right", "KeyD"),
  (Fire, "fire", "Mouse0"),
  (Magnet, "magnet", "Mouse2"),
  (Boost, "boost", "ShiftLeft"),
  (Weapon, "weapon", "KeyQ"),
  (Flotation, "float", "KeyF"),
  (Interact, "interact", "KeyE"),
  (MapScreen, "map", "Tab"),
  (Pause, "pause", "Escape"),
  (Skip, "skip", "Space"),
]

///|
priv struct Bindings(Map[Action, String])

///|
fn Bindings::defaults() -> Bindings {
  let keys = Map([])
  for (action, _, key) in controls {
    keys[action] = key
  }
  Bindings(keys)
}

///|
impl @json.FromJson for Bindings with fn from_json(value, path) {
  let saved : Map[String, String] = @json.from_json(value, path~)
  let keys = Map([])
  for (action, id, key) in controls {
    keys[action] = saved.get(id).unwrap_or(key)
  }
  Bindings(keys)
}

///|
impl @json.ToJson for Bindings with fn to_json(keys) {
  let record = Map([])
  for (action, id, _) in controls {
    record[id] = Json::string(keys.0[action])
  }
  Json::object(record)
}

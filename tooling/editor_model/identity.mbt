///|
/// The identity embedded in a Three.js object's userData. Barriers bind by their
/// circuit key; colliders with repeated display IDs are distinguished by row.
#derive(FromJson, ToJson)
priv struct EntityRef {
  collection : String
  id : String
  key : String
  index : Int32?
}

///|
fn EntityRef::read(value : Raw) -> EntityRef raise {
  @json.from_json(value.to_json())
}

///|
fn EntityRef::label(self : EntityRef) -> String {
  self.collection + ":" + self.id
}

///|
pub fn entity_key(e : Raw) -> String {
  str(e, "collection") + ":" + str(e, "id")
}

///|
pub fn editable(collection : String) -> Bool {
  collection is ("enemies" | "controls" | "pickups")
}

///|
fn prefix_for(collection : String, key : String) -> String? {
  let base = match collection {
    "enemies" => "enemies"
    "controls" => "world/controls"
    "pickups" => "world/views/pickups"
    "barriers" => "world/walls"
    "lifts" => "world/views/lifts"
    "mirrors" => "world/views/mirrors"
    "hives" => "world/hives"
    _ => return None
  }
  Some(base + "/" + key)
}

///|
pub fn belongs_to(b : String, prefix : String) -> Bool {
  b == prefix || b.has_prefix(prefix + "/")
}

///|
fn EntityRef::check_new(self : EntityRef, game_id : String) -> Unit raise {
  let id = self.id
  guard editable(self.collection) &&
    self.key == id &&
    game_id == id &&
    id.length() <= 96 &&
    id.iter().next() is Some(first) &&
    first.is_ascii_alphabetic() &&
    id
    .iter()
    .all(c => c.is_ascii_alphabetic() || c.is_ascii_digit() || c is ('_' | '-')) else {
    raise Failure("Invalid new gameplay identity: " + self.label())
  }
}

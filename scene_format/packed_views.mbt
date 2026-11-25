///|
/// Describes an element range inside the scene's shared binary asset.
/// A copy gives a mutable attribute its own storage when bytes were deduplicated.
pub(all) struct BufferView {
  byte_offset : Int32
  type_name : String
  length : Int32
  copy : Bool
}

///|
pub impl @json.ToJson for BufferView with fn to_json(self) {
  let fields : Map[String, Json] = {
    "byteOffset": self.byte_offset,
    "type": self.type_name,
    "length": self.length,
  }
  if self.copy {
    fields["copy"] = true
  }
  Json::object(fields)
}

///|
pub impl @json.FromJson for BufferView with fn from_json(value, path) {
  guard value is { "byteOffset": offset, "type": name, "length": length, .. } else {
    raise path.error(
      "Expected a packed buffer view with byteOffset, type and length",
    )
  }
  let copy = match value {
    { "copy": Null, .. } => false
    { "copy": flag, .. } => @json.from_json(flag, path=path.add_key("copy"))
    _ => false
  }
  {
    byte_offset: @json.from_json(offset, path=path.add_key("byteOffset")),
    type_name: @json.from_json(name, path=path.add_key("type")),
    length: @json.from_json(length, path=path.add_key("length")),
    copy,
  }
}

///|
#derive(@json.ToJson)
pub(all) struct PackedViews {
  geometry : Map[String, Map[String, BufferView]]
  images : Map[String, BufferView]
  instances : Map[String, Map[String, BufferView]]
}

///|
pub impl @json.FromJson for PackedViews with fn from_json(value, path) {
  guard value is { "geometry": geometry, "images": images, .. } else {
    raise path.error("Expected packed geometry and image tables")
  }
  // Scenes baked before instance attributes were packed omit this table.
  let instances = match value {
    { "instances": Null, .. } => {}
    { "instances": table, .. } =>
      @json.from_json(table, path=path.add_key("instances"))
    _ => {}
  }
  {
    geometry: @json.from_json(geometry, path=path.add_key("geometry")),
    images: @json.from_json(images, path=path.add_key("images")),
    instances,
  }
}

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
pub fn element_width(name : String) -> Int32? {
  match name {
    "Uint8Array" | "Uint8ClampedArray" | "Int8Array" => Some(1)
    "Uint16Array" | "Int16Array" => Some(2)
    "Float32Array" | "Uint32Array" | "Int32Array" => Some(4)
    "Float64Array" => Some(8)
    _ => None
  }
}

///|
pub fn BufferView::check_range(
  self : BufferView,
  bytes : Int32,
  id~ : String,
) -> Unit raise {
  guard element_width(self.type_name) is Some(stride) else {
    raise Failure("Packed view \{id}: unsupported array type \{self.type_name}")
  }
  let offset = self.byte_offset
  if offset % stride != 0 {
    raise Failure(
      "Packed view \{id}: byte offset \{offset} is not aligned to \{stride} bytes for \{self.type_name}",
    )
  }
  if offset < 0 ||
    offset > bytes ||
    self.length < 0 ||
    self.length > (bytes - offset) / stride {
    raise Failure(
      "Packed view \{id}: \{self.type_name} at byte \{offset} with \{self.length} elements is outside the \{bytes}-byte buffer",
    )
  }
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

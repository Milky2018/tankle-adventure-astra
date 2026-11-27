///|
pub fn walk(node : Raw, visit : (Raw) -> Unit raise?) -> Unit raise? {
  visit(node)
  for child in items(node.get("children")) {
    walk(child, visit)
  }
}

///|
fn attributes(scene : Raw, visit : (Raw) -> Unit raise?) -> Unit raise? {
  for g in items(scene.get("geometries")) {
    let data = g.get("data")
    if data.is_undefined() {
      continue
    }
    let index = data.get("index")
    if !index.is_undefined() {
      visit(index)
    }
    let attrs = data.get("attributes")
    for k in keys(attrs) {
      visit(attrs.get(k))
    }
  }
  walk(scene.get("object"), n => {
    for k in ["instanceMatrix", "instanceColor"] {
      let a = n.get(k)
      if !a.is_undefined() {
        visit(a)
      }
    }
  })
}

///|
fn check_descriptor(desc : Raw, buffer : Bytes) -> Unit raise {
  let view : @scene_format.BufferView = @json.from_json(desc.to_json())
  view.check_range(buffer.length(), id="geometry attribute")
}

///|
/// Validate even resources that the runtime bake will subsequently discard.
pub fn validate_views(scene : Raw, buffer : Bytes) -> Unit raise {
  attributes(scene, a => {
    let desc = a.get("array")
    if is_record(desc) {
      check_descriptor(desc, buffer)
    }
  })
}

///|
pub fn read_packed_scene() -> Raw raise {
  read_json_gz("content/art/city.scene.json.gz")
}

///|
pub fn read_scene(
  decode~ : (@core.TypedArray) -> Raw = array_copy,
) -> Raw raise {
  let scene = read_packed_scene()
  hydrate_scene(scene, decode~)
  scene
}

///|
fn packed_scene(scene : Raw) -> Map[String, Bytes] raise {
  let data = @buffer.Buffer()
  let mut original : Bytes? = None
  let attributes_to_pack = []
  attributes(scene, attribute => {
    attributes_to_pack.push((attribute, attribute.get("array")))
  })
  defer (for (attribute, values) in attributes_to_pack {
    attribute.set("array", values)
  })
  for (attribute, values) in attributes_to_pack {
    let ty = str(attribute, "type")
    guard @scene_format.element_width(ty) is Some(_) else {
      raise Failure("Unsupported scene attribute type: " + ty)
    }
    let array : @core.TypedArray = if @dom.JsObscure::is_typed_array(
        values.cast(),
      ) {
      let array : @core.TypedArray = values.cast()
      guard array.type_name() == ty else {
        raise Failure("Scene attribute type mismatch: " + ty)
      }
      array
    } else if is_array(values) {
      typed(ty, values)
    } else if is_record(values) {
      let bytes = match original {
        Some(bytes) => bytes
        None => {
          let bytes = decompress(
            @fs.read_file_to_bytes("content/art/city.buffers.bin.gz"),
          )
          original = Some(bytes)
          bytes
        }
      }
      guard str(values, "type") == ty else {
        raise Failure("Packed scene attribute type mismatch: " + ty)
      }
      check_descriptor(values, bytes)
      view(bytes, values)
    } else {
      raise Failure("Missing scene attribute array: " + ty)
    }
    let offset = data.length()
    data.write_bytesview(byte_view(array))
    attribute.set(
      "array",
      obj([
        ("byteOffset", Raw::of(offset)),
        ("length", Raw::of(array.length())),
        ("type", Raw::of(ty)),
      ]),
    )
    let padding = (8 - data.length() % 8) % 8
    if padding > 0 {
      data.write_bytesview(Bytes::make(padding, 0))
    }
  }
  {
    "content/art/city.buffers.bin.gz": compress(data.to_bytes()),
    "content/art/city.scene.json.gz": compress(@utf8.encode(stringify(scene))),
  }
}

///|
pub fn write_scene(
  scene : Raw,
  files~ : Map[String, Bytes] = {},
  check_current~ : () -> Unit raise = () => (),
) -> Unit raise {
  let output = packed_scene(scene)
  for path, bytes in files {
    output[path] = bytes
  }
  publish_content(output, check_current~)
}

///|
pub let resource_libraries : ReadOnlyArray[String] = [
  "geometries", "materials", "textures", "images", "shapes", "animations", "skeletons",
  "nodes",
]

///|
// Follow UUID references through material, texture and geometry libraries.
pub fn reachable(
  scene : Raw,
  root : Raw,
  retain_clips~ : Bool = false,
) -> Set[String] {
  let index = Map([])
  for k in resource_libraries {
    for entry in items(scene.get(k)) {
      index[str(entry, "uuid")] = entry
    }
  }
  let used = Set([])
  fn collect(v : Raw) {
    if is_string(v) {
      let id : String = v.cast()
      if !used.contains(id) && index.get(id) is Some(entry) {
        used.insert(id)
        collect(entry)
      }
    } else if is_array(v) {
      for item in items(v) {
        collect(item)
      }
    } else if !@dom.JsObscure::is_typed_array(v.cast()) && is_record(v) {
      for key in keys(v) {
        collect(v.get(key))
      }
    }
  }
  collect(root)
  if retain_clips {
    for clip in items(scene.get("animations")) {
      collect(clip.get("uuid"))
    }
  }
  used
}

///|
pub fn select_resources(
  scene : Raw,
  root : Raw,
  retain_clips~ : Bool = false,
) -> Raw {
  let used = reachable(scene, root, retain_clips~)
  let result = obj([("metadata", scene.get("metadata")), ("object", root)])
  for k in resource_libraries {
    if scene.get(k).is_undefined() {
      continue
    }
    let chosen = []
    for item in items(scene.get(k)) {
      if used.contains(str(item, "uuid")) {
        chosen.push(item)
      }
    }
    result.set(k, Raw::from_array(chosen[:]))
  }
  result
}

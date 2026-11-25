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
pub fn read_scene(
  decode~ : (@core.TypedArray) -> Raw = array_copy,
) -> Raw raise {
  let scene = read_json_gz("content/art/city.scene.json.gz")
  let bytes = decompress(
    @fs.read_file_to_bytes("content/art/city.buffers.bin.gz"),
  )
  attributes(scene, a => {
    let desc = a.get("array")
    if is_record(desc) {
      check_descriptor(desc, bytes)
      a.set("array", decode(view(bytes, desc)))
    }
  })
  scene
}

///|
pub fn write_scene(scene : Raw) -> Unit raise {
  let data = @buffer.Buffer()
  let mut offset = 0
  attributes(scene, a => {
    let values = a.get("array")
    if is_array(values) {
      let ty = str(a, "type")
      let b = byte_view(typed(ty, values))
      a.set(
        "array",
        obj([
          ("byteOffset", Raw::of(offset)),
          ("length", values.get("length")),
          ("type", Raw::of(ty)),
        ]),
      )
      data.write_bytes(b)
      offset += b.length()
      let padding = (8 - offset % 8) % 8
      if padding > 0 {
        data.write_bytes(Bytes::make(padding, 0))
        offset += padding
      }
    }
  })
  @fs.write_bytes_to_file(
    "content/art/city.buffers.bin.gz",
    compress(data.to_bytes()),
  )
  write_json_gz("content/art/city.scene.json.gz", scene)
}

///|
// Follow UUID references through material, texture and geometry libraries.
pub fn reachable(
  scene : Raw,
  root : Raw,
  libraries : Array[String],
  retain_clips~ : Bool = false,
) -> Set[String] {
  let index = Map([])
  for k in libraries {
    for entry in items(scene.get(k)) {
      index[str(entry, "uuid")] = entry
    }
  }
  let used = Set([])
  fn collect(v : Raw) {
    if is_string(v) {
      let id : String = v.cast()
      if !used.contains(id) && index.get(id) is Some(entry) {
        used.add(id)
        collect(entry)
      }
    } else if is_array(v) {
      for item in items(v) {
        collect(item)
      }
    } else if is_record(v) {
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
pub fn select_resources(scene : Raw, root : Raw) -> Raw {
  let libraries = [
    "geometries", "materials", "textures", "images", "animations", "skeletons",
  ]
  let used = reachable(scene, root, libraries)
  let result = obj([("metadata", scene.get("metadata")), ("object", root)])
  for k in libraries {
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

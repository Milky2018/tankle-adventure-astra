///|
pub fn walk(node : Raw, visit : (Raw) -> Unit) -> Unit {
  visit(node)
  for child in items(node.get("children")) {
    walk(child, visit)
  }
}

///|
fn attributes(scene : Raw, visit : (Raw) -> Unit) -> Unit {
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
/// Validate even resources that the runtime bake will subsequently discard.
pub fn validate_views(scene : Raw, buffer : Raw) -> Unit {
  attributes(scene, a => {
    let desc = a.get("array")
    if kind(desc) == "object" && !desc.is_null() {
      ignore(view(buffer, desc))
    }
  })
}

///|
pub fn read_scene() -> Raw {
  let scene = read_json_gz("content/art/city.scene.json.gz")
  let bytes = gunzip(read_file("content/art/city.buffers.bin.gz"))
  attributes(scene, a => {
    let desc = a.get("array")
    if kind(desc) == "object" && !desc.is_null() {
      a.set("array", array_copy(view(bytes, desc)))
    }
  })
  scene
}

///|
pub fn write_scene(scene : Raw) -> Unit {
  let chunks = []
  let mut offset = 0
  attributes(scene, a => {
    let values = a.get("array")
    if kind(values) == "array" {
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
      chunks.push(b)
      let n : Int32 = b.get("length").cast()
      offset += n
      let padding = (8 - offset % 8) % 8
      if padding > 0 {
        chunks.push(zeros(padding))
        offset += padding
      }
    }
  })
  write_file(
    "content/art/city.buffers.bin.gz",
    gzip(concat(FixedArray::from_array(chunks[:]))),
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
    match kind(v) {
      "string" => {
        let id : String = v.cast()
        if !used.contains(id) && index.get(id) is Some(entry) {
          used.add(id)
          collect(entry)
        }
      }
      "array" =>
        for entry in items(v) {
          collect(entry)
        }
      "object" =>
        if !v.is_null() {
          for k in keys(v) {
            collect(v.get(k))
          }
        }
      _ => ()
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

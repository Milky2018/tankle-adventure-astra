///|
fn int_field(v : Raw, k : String) -> Int32 {
  v.get(k).cast()
}

///|
fn put_array(v : Raw, k : String, a : Array[Raw]) -> Unit {
  v.set(k, Raw::from_array(a[:]))
}

///|
fn user_data(v : Raw) -> Raw {
  let data = v.get("userData")
  if !data.is_undefined() {
    return data
  }
  let data = Raw::object()
  v.set("userData", data)
  data
}

///|
pub fn bake_city(
  source : String,
  dest : String,
  barriers : FixedArray[Raw],
  controls : FixedArray[Raw],
) -> Unit {
  let scene = @archive.read_json_gz(source + "/city.scene.json.gz")
  let original = @archive.gunzip(
    @archive.read_file(source + "/city.buffers.bin.gz"),
  )
  @archive.validate_views(scene, original)
  let root = scene.get("object")
  fn view(desc : Raw) -> Raw {
    @archive.view(original, desc)
  }
  fn prepare(n : Raw) {
    let ch = children(n)
    if !visible(n) &&
      ch.length() > 0 &&
      ch
      .iter()
      .all(c => {
        match binding(c).split("/").to_array() {
          ["world", "surfaces", i, "trim"] => numbered(i)
          _ => false
        }
      }) {
      @archive.remove(n, "children")
    }
    if string_field(n, "type") == "BatchedMesh" {
      for k in ["matricesTexture", "indirectTexture", "colorsTexture"] {
        if truthy(n, k) {
          n.set(k, @archive.obj([("uuid", n.get(k).get("uuid"))]))
        }
      }
    }
    for c in children(n) {
      prepare(c)
    }
  }
  prepare(root)
  extract_repeats(scene, view)
  camera_faces(scene, view)
  bake_fittings(scene, view, barriers, controls)
  room_portals(scene, view)
  let chunks = []
  let stored = Map([])
  let mut length = 0
  fn append(b : Raw, ty : String, count : Int32) -> Raw {
    let key = ty + ":" + @archive.digest(b)
    if stored.get(key) is Some(existing) {
      let d = @archive.copy(existing)
      d.set("copy", Raw::of(true))
      return d
    }
    let pad = (8 - length % 8) % 8
    chunks.push(@archive.zeros(pad))
    chunks.push(b)
    length += pad
    let d = @archive.obj([
      ("byteOffset", Raw::of(length)),
      ("type", Raw::of(ty)),
      ("length", Raw::of(count)),
    ])
    length += int_field(b, "length")
    stored[key] = d
    d
  }
  fn pack_attr(a : Raw) -> Raw {
    let ty = string_field(a, "type")
    let values = a.get("array")
    let data = if @archive.kind(values) == "array" {
      @archive.typed(ty, values)
    } else {
      view(values)
    }
    let descriptor = append(
      @archive.byte_view(data),
      ty,
      int_field(data, "length"),
    )
    put_array(a, "array", [])
    descriptor
  }
  let instances = Raw::object()
  @archive.walk(root, n => {
    if string_field(n, "type") == "InstancedMesh" {
      let attrs = Raw::object()
      for k in ["instanceMatrix", "instanceColor"] {
        if truthy(n, k) {
          attrs.set(k, pack_attr(n.get(k)))
        }
      }
      instances.set(string_field(n, "uuid"), attrs)
    }
  })
  let libs = [
    "geometries", "materials", "textures", "images", "shapes", "animations", "skeletons",
  ]
  let used = @archive.reachable(scene, root, libs, retain_clips=true)
  for k in libs {
    if !scene.get(k).is_undefined() {
      put_array(
        scene,
        k,
        [
          for a in array_field(scene, k) if used.contains(
            string_field(a, "uuid"),
          ) => a
        ],
      )
    }
  }
  let geometries = Raw::object()
  for g in array_field(scene, "geometries") {
    guard truthy(g, "data") else { continue }
    let data = g.get("data")
    let result = Raw::object()
    let attrs = @archive.copy(data.get("attributes"))
    attrs.set("index", data.get("index"))
    for k in @archive.keys(attrs) {
      if truthy(attrs.get(k), "array") {
        result.set(k, pack_attr(attrs.get(k)))
      }
    }
    geometries.set(string_field(g, "uuid"), result)
  }
  let image_dir = dest + "/images"
  @archive.mkdir(image_dir)
  let image_files = Set([])
  let pixels = Map([])
  for img in array_field(scene, "images") {
    let url = img.get("url")
    if @archive.kind(url) == "string" {
      let uri : String = url.cast()
      for ext in ["png", "jpeg"] {
        if uri.strip_prefix("data:image/" + ext + ";base64,") is Some(base64) {
          let b = @archive.from_base64(base64.to_owned())
          let name = @archive.digest(b)[:24].to_owned() + "." + ext
          image_files.add(name)
          @archive.write_file(image_dir + "/" + name, b)
          img.set("url", Raw::of("/generated/art/images/" + name))
          break
        }
      }
    } else if @archive.kind(@archive.prop(url, "data")) == "array" {
      let ty = string_field(url, "type")
      let data = @archive.typed(ty, url.get("data"))
      pixels[string_field(img, "uuid")] = append(
        @archive.byte_view(data),
        ty,
        int_field(data, "length"),
      )
      put_array(url, "data", [])
    }
  }
  let images = Raw::object()
  for t in array_field(scene, "textures") {
    if pixels.get(string_field(t, "image")) is Some(p) {
      images.set(string_field(t, "uuid"), p)
    }
  }
  @archive.write_json_gz(dest + "/folded-scene.json.gz", scene)
  @archive.write_json_gz(
    dest + "/folded-views.json.gz",
    @archive.obj([
      ("geometry", geometries),
      ("images", images),
      ("instances", instances),
    ]),
  )
  @archive.write_file(
    dest + "/folded-buffers.bin.gz",
    @archive.gzip(@archive.concat(FixedArray::from_array(chunks[:]))),
  )
  for name in @archive.list_files(image_dir) {
    if name.split_once(".") is Some((hash, extension)) &&
      hash.length() == 24 &&
      (extension == "png" || extension == "jpeg") &&
      hash.iter().all(c => (c >= 'a' && c <= 'f') || (c >= '0' && c <= '9')) &&
      !image_files.contains(name) {
      @archive.unlink(image_dir + "/" + name)
    }
  }
}

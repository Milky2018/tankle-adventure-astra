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
fn validate_roles(scene : Raw, required : Array[String]) -> Unit raise {
  let geometries = Set([])
  for g in @archive.items(scene.get("geometries")) {
    geometries.insert(@archive.str(g, "uuid"))
  }
  let bindings = Set([])
  fn visit(n : @archive.Raw) -> Unit raise {
    let id = @archive.str(n, "geometry")
    if !id.is_empty() && !geometries.contains(id) {
      raise Failure(
        "Missing geometry " + id + " for " + @archive.str(n, "name"),
      )
    }
    let matrix : FixedArray[Double] = @archive.items(n.get("matrix")).map(x => {
      x.cast()
    })
    guard matrix.iter().all(v => v.is_finite()) else {
      raise Failure("Invalid scene transform: " + @archive.str(n, "uuid"))
    }
    let binding = @archive.str(n.get("userData"), "binding")
    if !binding.is_empty() {
      if bindings.contains(binding) {
        raise Failure("Duplicate scene binding: " + binding)
      }
      bindings.insert(binding)
    }
    for c in @archive.items(n.get("children")) {
      visit(c)
    }
  }
  visit(scene.get("object"))
  for role in required {
    guard bindings.contains(role) else {
      raise Failure(
        "Missing scene role: " + role + ". Add its bound art before building.",
      )
    }
  }
}

///|
pub fn bake_city(
  source : String,
  dest : String,
  fixtures : FixtureLayout,
  required_bindings : Array[String],
) -> Unit raise {
  let scene = @archive.read_json_gz(source + "/city.scene.json.gz")
  validate_roles(scene, required_bindings)
  let original = @archive.decompress(
    @fs.read_file_to_bytes(source + "/city.buffers.bin.gz"),
  )
  @archive.validate_views(scene, original)
  let root = scene.get("object")
  fn view(desc : Raw) -> @core.TypedArray {
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
    if str(n, "type") == "BatchedMesh" {
      for k in ["matricesTexture", "indirectTexture", "colorsTexture"] {
        if has_field(n, k) {
          n.set(k, @archive.obj([("uuid", n.get(k).get("uuid"))]))
        }
      }
    }
    for c in children(n) {
      prepare(c)
    }
  }
  prepare(root)
  solid_faces(scene, view, fixtures)
  extract_repeats(scene, view)
  camera_faces(scene, view)
  bake_fittings(scene, view, fixtures)
  room_portals(scene, view)
  let binary = @buffer.Buffer()
  let recipes = @buffer.Buffer()
  let stored : Map[(String, String), @scene_format.BufferView] = Map([])
  fn store(
    data : @core.TypedArray,
    attribute : (String, Int32)?,
  ) -> @scene_format.BufferView {
    let bytes = @archive.byte_view(data)
    let key = (data.type_name(), @archive.digest(bytes))
    if stored.get(key) is Some(first) {
      return { ..first, copy: true, }
    }
    let recipe = attribute.bind(fn(info) {
      let (name, item_size) = info
      @geometry.encode(bytes, name~, type_name=key.0, item_size~)
    })
    let storage = if recipe is Some(_) { recipes } else { binary }
    let pad = (8 - storage.length() % 8) % 8
    storage.write_bytesview(Bytes::make(pad, 0))
    let descriptor : @scene_format.BufferView = {
      byte_offset: storage.length(),
      type_name: key.0,
      length: data.length(),
      copy: false,
      recipe_bytes: recipe.map(Bytes::length).unwrap_or(0),
    }
    storage.write_bytesview(recipe.unwrap_or(bytes))
    stored[key] = descriptor
    descriptor
  }
  fn pack_attr(
    a : Raw,
    attribute : (String, Int32)?,
  ) -> @scene_format.BufferView {
    let values = a.get("array")
    let data = if @archive.is_array(values) {
      @archive.typed(str(a, "type"), values)
    } else {
      view(values)
    }
    put_array(a, "array", [])
    store(data, attribute)
  }
  let packed : @scene_format.PackedViews = {
    geometry: Map([]),
    images: Map([]),
    instances: Map([]),
  }
  @archive.walk(root, n => {
    if str(n, "type") == "InstancedMesh" {
      let attrs = Map([])
      for k in ["instanceMatrix", "instanceColor"] {
        if has_field(n, k) {
          attrs[k] = pack_attr(n.get(k), None)
        }
      }
      packed.instances[str(n, "uuid")] = attrs
    }
  })
  let used = @archive.reachable(scene, root, retain_clips=true)
  for k in @archive.resource_libraries {
    if !scene.get(k).is_undefined() {
      put_array(
        scene,
        k,
        [
          for a in array_field(scene, k) if used.contains(str(a, "uuid")) => a
        ],
      )
    }
  }
  for g in array_field(scene, "geometries") {
    guard has_field(g, "data") else { continue }
    let data = g.get("data")
    let result = Map([])
    let attrs = @archive.copy(data.get("attributes"))
    attrs.set("index", data.get("index"))
    for k in @archive.keys(attrs) {
      if has_field(attrs.get(k), "array") {
        let a = attrs.get(k)
        let size = if k == "index" { 1 } else { int_field(a, "itemSize") }
        result[k] = pack_attr(a, Some((k, size)))
      }
    }
    packed.geometry[str(g, "uuid")] = result
  }
  let image_dir = dest + "/images"
  @fs.create_dir(image_dir)
  let image_files = Set([])
  let pixels = Map([])
  for img in array_field(scene, "images") {
    let url = img.get("url")
    if @archive.is_string(url) {
      let uri : String = url.cast()
      for ext in ["png", "jpeg"] {
        if uri.strip_prefix("data:image/" + ext + ";base64,") is Some(base64) {
          let b = @base64.decode(base64, ignore_whitespace=true)
          let name = @archive.digest(b)[:24].to_owned() + "." + ext
          image_files.insert(name)
          @fs.write_bytes_to_file(image_dir + "/" + name, b)
          img.set("url", Raw::of("/generated/art/images/" + name))
          break
        }
      }
    } else if @archive.is_array(@archive.prop(url, "data")) {
      let ty = str(url, "type")
      let data = @archive.typed(ty, url.get("data"))
      pixels[str(img, "uuid")] = store(data, None)
      put_array(url, "data", [])
    }
  }
  for t in array_field(scene, "textures") {
    if pixels.get(str(t, "image")) is Some(p) {
      packed.images[str(t, "uuid")] = p
    }
  }
  @archive.write_json_gz(dest + "/folded-scene.json.gz", scene)
  @archive.write_json_gz(
    dest + "/folded-views.json.gz",
    Raw::from_json(@json.to_json(packed)),
  )
  @fs.write_bytes_to_file(
    dest + "/folded-buffers.bin.gz",
    @archive.compress(binary.to_bytes()),
  )
  @fs.write_bytes_to_file(
    dest + "/folded-recipes.bin.gz",
    @archive.compress(recipes.to_bytes()),
  )
  for name in @fs.read_dir(image_dir) {
    if name.split_once(".") is Some((hash, extension)) &&
      hash.length() == 24 &&
      (extension == "png" || extension == "jpeg") &&
      hash.iter().all(c => (c >= 'a' && c <= 'f') || (c >= '0' && c <= '9')) &&
      !image_files.contains(name) {
      @fs.remove_file(image_dir + "/" + name)
    }
  }
}

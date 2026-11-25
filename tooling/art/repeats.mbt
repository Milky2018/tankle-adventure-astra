///|
fn enabled_instance(n : Raw) -> Bool {
  truthy(n, "active") && truthy(n, "visible")
}

///|
fn matrices_for(
  batch : Raw,
  textures : Map[String, Raw],
  images : Map[String, Raw],
) -> FixedArray[Double] {
  guard textures.get(string_field(batch.get("matricesTexture"), "uuid"))
    is Some(t) &&
    images.get(string_field(t, "image")) is Some(img) else {
    return []
  }
  img.get("url").get("data").cast()
}

///|
pub fn extract_repeats(scene : Raw, view : (Raw) -> Raw) -> Unit {
  if array_field(scene, "animations").length() > 0 {
    return
  }
  let materials = resource_index(array_field(scene, "materials"))
  let geometry = resource_index(array_field(scene, "geometries"))
  let textures = resource_index(array_field(scene, "textures"))
  let images = resource_index(array_field(scene, "images"))
  fn extract(n : Raw) -> Array[Raw] {
    let instances = array_field(n, "instanceInfo")
    guard string_field(n, "type") == "BatchedMesh" &&
      string_field(n, "name").has_prefix("static/") &&
      binding(n).is_empty() &&
      children(n).length() == 0 &&
      !truthy(n, "colorsTexture") &&
      instances.length() >= 128 &&
      materials.get(string_field(n, "material")) is Some(m) else {
      return []
    }
    guard m.get("colorWrite").strict_equal(Raw::of(false)) ||
      (
        string_field(m.get("userData"), "renderRole") == "floor" &&
        string_field(m, "type") == "MeshToonMaterial"
      ) else {
      return []
    }
    guard geometry.get(string_field(n, "geometry")) is Some(g) &&
      truthy(g.get("data"), "index") else {
      return []
    }
    let data = g.get("data")
    let matrices = matrices_for(n, textures, images)
    if matrices.length() == 0 {
      return []
    }
    let groups : Map[Int32, Array[Int32]] = Map([])
    for i, e in instances {
      if enabled_instance(e) {
        let id = int_field(e, "geometryIndex")
        if !groups.contains(id) {
          groups[id] = []
        }
        groups[id].push(i)
      }
    }
    let extracted = []
    for id, copies in groups {
      guard copies.length() >= 96 else { continue }
      let info = array_field(n, "geometryInfo")[id]
      let tag = string_field(n, "uuid") + "-repeats-" + id.to_string()
      let attrs = Raw::object()
      let source = data.get("attributes")
      let vertex = int_field(info, "vertexStart")
      let count = int_field(info, "vertexCount")
      for key in @archive.keys(source) {
        let a = @archive.copy(source.get(key))
        let d = @archive.copy(a.get("array"))
        let size = int_field(a, "itemSize")
        let width = match string_field(a, "type") {
          "Float64Array" => 8
          "Uint8Array" | "Int8Array" => 1
          "Uint16Array" | "Int16Array" => 2
          _ => 4
        }
        d.set(
          "byteOffset",
          Raw::of(int_field(d, "byteOffset") + vertex * size * width),
        )
        d.set("length", Raw::of(count * size))
        a.set("array", d)
        attrs.set(key, a)
      }
      let index = @archive.copy(data.get("index"))
      let indices : FixedArray[Int32] = view(index.get("array")).cast()
      let start = int_field(info, "start")
      index.set(
        "array",
        Raw::of(
          FixedArray::makei(int_field(info, "count"), i => {
            indices[start + i] - vertex
          }),
        ),
      )
      let lib = @archive.obj([
        ("uuid", Raw::of(tag)),
        ("type", Raw::of("BufferGeometry")),
        (
          "data",
          @archive.obj([
            ("attributes", attrs),
            ("index", index),
            ("boundingSphere", info.get("boundingSphere")),
          ]),
        ),
      ])
      append_item(scene.get("geometries"), lib)
      let cells : Map[String, Array[Double]] = Map([])
      for i in copies {
        let matrix = FixedArray::makei(16, j => matrices[i * 16 + j])
        let key = cell_key([matrix[12], matrix[13], matrix[14]], 96)
        if !cells.contains(key) {
          cells[key] = []
        }
        for x in matrix {
          cells[key].push(x)
        }
        instances[i].set("visible", Raw::of(false))
      }
      for cell, values in cells {
        let draw = @archive.obj([
          ("uuid", Raw::of(tag + "/" + cell)),
          ("name", Raw::of("Instanced city detail")),
          ("type", Raw::of("InstancedMesh")),
          ("geometry", Raw::of(tag)),
        ])
        for k in ["material", "matrix", "layers"] {
          draw.set(k, n.get(k))
        }
        draw.set("matrixAutoUpdate", Raw::of(false))
        for
          k in [
            "castShadow", "receiveShadow", "renderOrder", "frustumCulled", "visible",
          ] {
          draw.set(k, n.get(k))
        }
        draw.set("count", Raw::of(values.length() / 16))
        draw.set(
          "instanceMatrix",
          @archive.obj([
            ("itemSize", Raw::of(16)),
            ("type", Raw::of("Float32Array")),
            ("array", Raw::from_array(values[:])),
            ("normalized", Raw::of(false)),
          ]),
        )
        extracted.push(draw)
      }
    }
    extracted
  }
  fn visit(parent : Raw) {
    if parent.get("children").is_undefined() {
      return
    }
    let result = []
    for n in children(parent) {
      visit(n)
      let extra = extract(n)
      if extra.is_empty() ||
        array_field(n, "instanceInfo").iter().any(enabled_instance) {
        result.push(n)
      }
      for e in extra {
        result.push(e)
      }
    }
    put_array(parent, "children", result)
  }
  visit(scene.get("object"))
  instance_belt_rollers(scene)
}

///|
extern "js" fn append_item(array : Raw, item : Raw) -> Unit = "(a,v)=>a.push(v)"

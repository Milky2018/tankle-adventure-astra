///|
fn enabled_instance(n : Raw) -> Bool {
  n.get("active").strict_equal(Raw::of(true)) &&
  n.get("visible").strict_equal(Raw::of(true))
}

///|
fn matrices_for(
  batch : Raw,
  textures : Map[String, Raw],
  images : Map[String, Raw],
) -> FixedArray[Double] {
  guard textures.get(str(batch.get("matricesTexture"), "uuid")) is Some(t) &&
    images.get(str(t, "image")) is Some(img) else {
    return []
  }
  img.get("url").get("data").cast()
}

///|
pub fn extract_repeats(scene : Raw, view : (Raw) -> @core.TypedArray) -> Unit {
  if array_field(scene, "animations").length() > 0 {
    return
  }
  let materials = resource_index(array_field(scene, "materials"))
  let geometry = resource_index(array_field(scene, "geometries"))
  let textures = resource_index(array_field(scene, "textures"))
  let images = resource_index(array_field(scene, "images"))
  fn extract(n : Raw) -> Array[Raw] {
    let instances = array_field(n, "instanceInfo")
    guard str(n, "type") == "BatchedMesh" &&
      str(n, "name").has_prefix("static/") &&
      binding(n).is_empty() &&
      children(n).length() == 0 &&
      !has_field(n, "colorsTexture") &&
      instances.length() >= 128 &&
      materials.get(str(n, "material")) is Some(m) else {
      return []
    }
    guard m.get("colorWrite").strict_equal(Raw::of(false)) ||
      (
        str(m.get("userData"), "renderRole") == "floor" &&
        str(m, "type") == "MeshToonMaterial"
      ) else {
      return []
    }
    guard geometry.get(str(n, "geometry")) is Some(g) &&
      has_field(g.get("data"), "index") else {
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
        groups.get_or_init(id, () => []).push(i)
      }
    }
    let extracted = []
    for id, copies in groups {
      guard copies.length() >= 96 else { continue }
      let info = array_field(n, "geometryInfo")[id]
      let tag = str(n, "uuid") + "-repeats-" + id.to_string()
      let attrs = Raw::object()
      let source = data.get("attributes")
      let vertex = int_field(info, "vertexStart")
      let count = int_field(info, "vertexCount")
      for key in @archive.keys(source) {
        let a = @archive.copy(source.get(key))
        let d = @archive.copy(a.get("array"))
        let size = int_field(a, "itemSize")
        let width = @scene_format.element_width(str(a, "type")).unwrap()
        d.set(
          "byteOffset",
          Raw::of(int_field(d, "byteOffset") + vertex * size * width),
        )
        d.set("length", Raw::of(count * size))
        a.set("array", d)
        attrs.set(key, a)
      }
      let index = @archive.copy(data.get("index"))
      let indices = view(index.get("array"))
      let start = int_field(info, "start")
      index.set(
        "array",
        Raw::of(
          FixedArray::makei(int_field(info, "count"), i => {
            indices.get_int(start + i) - vertex
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
      @archive.append(scene.get("geometries"), lib)
      let cells : Map[String, Array[Double]] = Map([])
      for i in copies {
        let start = i * 16
        let key = cell_key(
          [matrices[start + 12], matrices[start + 13], matrices[start + 14]],
          96,
        )
        let values = cells.get_or_init(key, () => [])
        for j in start..<(start + 16) {
          values.push(matrices[j])
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

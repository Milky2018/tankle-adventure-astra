///|
// Use complete attribute bytes as the key so different UVs, colors or normals
// at a shared position stay distinct.
fn index_triangles(attrs : Raw) -> Raw {
  let fields = []
  for k in @archive.keys(attrs) {
    let a = attrs.get(k)
    let data = a.get("array")
    fields.push(
      (
        @archive.byte_view(data),
        int_field(a, "itemSize") * int_field(data, "BYTES_PER_ELEMENT"),
      ),
    )
  }
  let indices = []
  let first = []
  let seen = Map([])
  let position = attrs.get("position")
  let count = int_field(position.get("array"), "length") /
    int_field(position, "itemSize")
  for i in 0..<count {
    let key = StringBuilder()
    for pair in fields {
      key.write_string(bytes_key(pair.0, i * pair.1, (i + 1) * pair.1))
    }
    let signature = key.to_string()
    let index = match seen.get(signature) {
      Some(n) => n
      None => {
        let n = first.length()
        seen[signature] = n
        first.push(i)
        n
      }
    }
    indices.push(index)
  }
  if first.length() != count {
    for k in @archive.keys(attrs) {
      let a = attrs.get(k)
      let data = a.get("array")
      let size = int_field(a, "itemSize")
      let out = @archive.typed(
        string_field(a, "type"),
        Raw::of(first.length() * size),
      )
      for j, i in first {
        copy_span(out, j * size, data, i * size, size)
      }
      a.set("array", out)
    }
  }
  @archive.typed(
    if first.length() > 65535 {
      "Uint32Array"
    } else {
      "Uint16Array"
    },
    Raw::from_array(indices[:]),
  )
}

///|
extern "js" fn bytes_key(bytes : Raw, begin : Int32, end : Int32) -> String = "(b,i,j)=>b.toString('latin1',i,j)"

///|
extern "js" fn copy_span(
  dst : Raw,
  start : Int32,
  src : Raw,
  offset : Int32,
  length : Int32,
) -> Unit = "(d,i,s,j,n)=>d.set(s.subarray(j,j+n),i)"

///|
pub fn bake_fittings(
  scene : Raw,
  view : (Raw) -> Raw,
  barriers : FixedArray[Raw],
  controls : FixedArray[Raw],
) -> Unit {
  if array_field(scene, "animations").length() > 0 {
    return
  }
  let geometry = resource_index(array_field(scene, "geometries"))
  let materials = resource_index(array_field(scene, "materials"))
  let textures = resource_index(array_field(scene, "textures"))
  let images = resource_index(array_field(scene, "images"))
  let centers = Map([])
  let sources = Map([])
  fn center(g : Raw) -> FixedArray[Double] {
    let id = string_field(g, "uuid")
    if centers.get(id) is Some(v) {
      return v
    }
    let d = g.get("data")
    let a = d.get("attributes").get("position")
    let v = if truthy(d, "boundingSphere") {
      d.get("boundingSphere").get("center").cast()
    } else {
      geometry_center(view(a.get("array")).cast(), int_field(a, "itemSize"))
    }
    centers[id] = v
    v
  }
  fn decode(g : Raw) -> @core.BufferGeometry {
    let id = string_field(g, "uuid")
    if sources.get(id) is Some(v) {
      return v
    }
    let d = g.get("data")
    let attrs = Raw::object()
    let input = d.get("attributes")
    for k in @archive.keys(input) {
      let a = @archive.copy(input.get(k))
      a.set("array", view(a.get("array")))
      attrs.set(k, a)
    }
    let indices = if truthy(d, "index") {
      view(d.get("index").get("array"))
    } else {
      index_triangles(attrs)
    }
    let mesh = read_geometry(attrs, indices)
    sources[id] = mesh
    mesh
  }
  fn regroup(multidraw : (FixedArray[@core.BufferGeometry]) -> Raw) {
    fn visit(n : Raw) {
      for child in children(n) {
        visit(child)
      }
      guard string_field(n, "type") == "BatchedMesh" &&
        string_field(n, "name").has_prefix("static/") &&
        binding(n).is_empty() &&
        children(n).length() == 0 &&
        !truthy(n, "colorsTexture") &&
        materials.get(string_field(n, "material")) is Some(m) &&
        string_field(m, "type") == "MeshBasicMaterial" &&
        m.get("colorWrite").strict_equal(Raw::of(false)) &&
        !["transparent", "map", "alphaMap", "envMap"].any(k => truthy(m, k)) &&
        !truthy(m.get("userData"), "surfaceFinish") &&
        !truthy(n, "castShadow") else {
        return
      }
      let entries = array_field(n, "instanceInfo")
      guard entries.iter().filter(enabled_instance).count() >= 64 &&
        geometry.get(string_field(n, "geometry")) is Some(g) else {
        return
      }
      let data = g.get("data")
      let pos = data.get("attributes").get("position")
      guard truthy(data, "index") &&
        string_field(pos, "type") == "Float32Array" &&
        int_field(pos, "itemSize") == 3 else {
        return
      }
      let matrices = matrices_for(n, textures, images)
      let coords : FixedArray[Double] = view(pos.get("array")).cast()
      let idx : FixedArray[Int32] = view(data.get("index").get("array")).cast()
      let bins : Map[String, (Array[Double], Array[Int32])] = Map([])
      for i, e in entries {
        guard enabled_instance(e) else { continue }
        let info = array_field(n, "geometryInfo")[int_field(e, "geometryIndex")]
        let matrix = FixedArray::makei(16, j => matrices[i * 16 + j])
        let c : FixedArray[Double] = if truthy(info, "boundingSphere") {
          info.get("boundingSphere").get("center").cast()
        } else {
          [0, 0, 0]
        }
        let key = cell_key(project(matrix, c[0], c[1], c[2]), 24)
        if !bins.contains(key) {
          bins[key] = ([], [])
        }
        let (vertices, indices) = bins[key]
        let first = int_field(info, "vertexStart")
        let offset = vertices.length() / 3 - first
        for v in first..<(first + int_field(info, "vertexCount")) {
          for
            x in project(
              matrix,
              coords[3 * v],
              coords[3 * v + 1],
              coords[3 * v + 2],
            ) {
            vertices.push(x)
          }
        }
        let start = int_field(info, "start")
        for j in start..<(start + int_field(info, "count")) {
          indices.push(idx[j] + offset)
        }
      }
      let cells = bins
        .values()
        .map(pair => {
          depth_geometry(
            FixedArray::from_array(pair.0[:]),
            FixedArray::from_array(pair.1[:]),
          )
        })
        .to_array()
      let draw = multidraw(FixedArray::from_array(cells[:]))
      for
        k in [
          "geometry", "geometryInfo", "instanceInfo", "availableInstanceIds", "availableGeometryIds",
          "nextIndexStart", "nextVertexStart", "geometryCount", "maxInstanceCount",
          "maxVertexCount", "maxIndexCount", "geometryInitialized", "matricesTexture",
          "indirectTexture", "boundingSphere", "boundingBox",
        ] {
        n.set(k, draw.get(k))
      }
    }
    visit(scene.get("object"))
  }
  batch_fittings(scene, barriers, controls, center, decode, regroup)
}

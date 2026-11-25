///|
/// Keep UV seams and material colors distinct even when vertices share a position.
fn index_triangles(
  attrs : Map[String, @core.BufferAttribute],
) -> @core.TypedArray {
  let fields = attrs
    .values()
    .map(a => (array_bytes(a.array), a.item_size * a.array.bytes_per_element()))
    .to_array()
  let stride = fields.iter().fold(init=0, (total, field) => total + field.1)
  let first = []
  let indices = []
  let seen : Map[Bytes, Int32] = Map([])
  let count = attrs["position"].count
  for i in 0..<count {
    let key = FixedArray::make(stride, b'\x00')
    let mut offset = 0
    for field in fields {
      let (bytes, width) = field
      key.blit_from_bytes(offset, bytes, i * width, width)
      offset += width
    }
    let index = seen.get_or_init(Bytes::from_array(key[:]), () => {
      first.push(i)
      first.length() - 1
    })
    indices.push(index)
  }
  if first.length() != count {
    for name, a in attrs {
      let size = a.item_size
      let data = a.array.new_like(first.length() * size)
      for j, i in first {
        data.set_from(
          a.array.subarray(start=i * size, end=(i + 1) * size),
          offset=j * size,
        )
      }
      attrs[name] = @core.BufferAttribute::new(
        data,
        size,
        normalized=a.normalized,
      )
    }
  }
  if first.length() > 65535 {
    @core.TypedArray::uint32(indices)
  } else {
    @core.TypedArray::uint16(indices)
  }
}

///|
extern "js" fn array_bytes(data : @core.TypedArray) -> Bytes = "a => new Uint8Array(a.buffer, a.byteOffset, a.byteLength)"

///|
/// Resource indices and decoded geometry are shared by the color and depth draws.
priv struct FittingBake {
  scene : Raw
  geometries : Map[String, Raw]
  materials : Map[String, Raw]
  centers : Map[String, FixedArray[Double]]
  decoded : Map[String, @core.BufferGeometry]
  read_view : (Raw) -> Raw
  mut serial : Int32
}

///|
pub fn bake_fittings(
  scene : Raw,
  view : (Raw) -> Raw,
  fixtures : FixtureLayout,
) -> Unit {
  if array_field(scene, "animations").length() > 0 {
    return
  }
  let bake : FittingBake = {
    scene,
    geometries: resource_index(array_field(scene, "geometries")),
    materials: resource_index(array_field(scene, "materials")),
    centers: Map([]),
    decoded: Map([]),
    read_view: view,
    serial: 0,
  }
  bake.batch_fittings(fixtures)
}

///|
fn FittingBake::center(self : FittingBake, g : Raw) -> FixedArray[Double] {
  let id = string_field(g, "uuid")
  if self.centers.get(id) is Some(v) {
    return v
  }
  let d = g.get("data")
  let a = d.get("attributes").get("position")
  let v = if truthy(d, "boundingSphere") {
    d.get("boundingSphere").get("center").cast()
  } else {
    geometry_center(
      (self.read_view)(a.get("array")).cast(),
      int_field(a, "itemSize"),
    )
  }
  self.centers[id] = v
  v
}

///|
fn FittingBake::decode(self : FittingBake, g : Raw) -> @core.BufferGeometry {
  let id = string_field(g, "uuid")
  if self.decoded.get(id) is Some(v) {
    return v
  }
  let d = g.get("data")
  let attrs = Map([])
  let input = d.get("attributes")
  for k in @archive.keys(input) {
    let a = input.get(k)
    attrs[k] = @core.BufferAttribute::new(
      (self.read_view)(a.get("array")).cast(),
      int_field(a, "itemSize"),
      normalized=truthy(a, "normalized"),
    )
  }
  let indices = if truthy(d, "index") {
    (self.read_view)(d.get("index").get("array")).cast()
  } else {
    index_triangles(attrs)
  }
  let mesh = @core.BufferGeometry::new()
  for k, a in attrs {
    ignore(mesh.set_attribute(k, a))
  }
  ignore(mesh.set_index(@core.BufferAttribute::new(indices, 1)))
  self.decoded[id] = mesh
  mesh
}

///|
fn FittingBake::regroup_depth(self : FittingBake) -> Unit {
  let textures = resource_index(array_field(self.scene, "textures"))
  let images = resource_index(array_field(self.scene, "images"))
  fn visit(n : Raw) {
    for child in children(n) {
      visit(child)
    }
    guard string_field(n, "type") == "BatchedMesh" &&
      string_field(n, "name").has_prefix("static/") &&
      binding(n).is_empty() &&
      children(n).length() == 0 &&
      !truthy(n, "colorsTexture") &&
      self.materials.get(string_field(n, "material")) is Some(m) &&
      string_field(m, "type") == "MeshBasicMaterial" &&
      m.get("colorWrite").strict_equal(Raw::of(false)) &&
      !["transparent", "map", "alphaMap", "envMap"].any(k => truthy(m, k)) &&
      !truthy(m.get("userData"), "surfaceFinish") &&
      !truthy(n, "castShadow") else {
      return
    }
    let entries = array_field(n, "instanceInfo")
    guard entries.iter().filter(enabled_instance).count() >= 64 &&
      self.geometries.get(string_field(n, "geometry")) is Some(g) else {
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
    let coords : FixedArray[Double] = (self.read_view)(pos.get("array")).cast()
    let idx : FixedArray[Int32] = (self.read_view)(
      data.get("index").get("array"),
    ).cast()
    let bins : Map[String, (Array[Double], Array[Int32])] = Map([])
    for i, e in entries {
      guard enabled_instance(e) else { continue }
      let info = array_field(n, "geometryInfo")[int_field(e, "geometryIndex")]
      let matrix = @math.Matrix4::new().from_array(
        [
          for j in 0..<16 => matrices[i * 16 + j]
        ],
      )
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
    let draw = self.multidraw(FixedArray::from_array(cells[:]))
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
  visit(self.scene.get("object"))
}

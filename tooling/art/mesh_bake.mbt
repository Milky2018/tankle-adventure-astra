///|
/// Keep UV seams and material colors distinct even when vertices share a position.
fn index_triangles(
  attrs : Map[String, @core.BufferAttribute],
) -> @core.TypedArray {
  let fields = attrs
    .values()
    .map(a => {
      (@archive.byte_view(a.array), a.item_size * a.array.bytes_per_element())
    })
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
/// Resource indices and decoded geometry are shared by the color and depth draws.
priv struct FittingBake {
  scene : Raw
  geometries : Map[String, Raw]
  materials : Map[String, Raw]
  centers : Map[String, FixedArray[Double]]
  decoded : Map[String, @core.BufferGeometry]
  read_view : (Raw) -> @core.TypedArray
  mut serial : Int32
}

///|
pub fn bake_fittings(
  scene : Raw,
  view : (Raw) -> @core.TypedArray,
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
  let id = str(g, "uuid")
  if self.centers.get(id) is Some(v) {
    return v
  }
  let d = g.get("data")
  let a = d.get("attributes").get("position")
  let v = if has_field(d, "boundingSphere") {
    d.get("boundingSphere").get("center").cast()
  } else {
    geometry_center((self.read_view)(a.get("array")), int_field(a, "itemSize"))
  }
  self.centers[id] = v
  v
}

///|
fn FittingBake::decode(self : FittingBake, g : Raw) -> @core.BufferGeometry {
  let id = str(g, "uuid")
  if self.decoded.get(id) is Some(v) {
    return v
  }
  let d = g.get("data")
  let attrs = Map([])
  let input = d.get("attributes")
  for k in @archive.keys(input) {
    let a = input.get(k)
    attrs[k] = @core.BufferAttribute::new(
      (self.read_view)(a.get("array")),
      int_field(a, "itemSize"),
      normalized=a.get("normalized").strict_equal(Raw::of(true)),
    )
  }
  let indices = if has_field(d, "index") {
    (self.read_view)(d.get("index").get("array"))
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
    guard str(n, "type") == "BatchedMesh" &&
      str(n, "name").has_prefix("static/") &&
      binding(n).is_empty() &&
      children(n).length() == 0 &&
      !has_field(n, "colorsTexture") &&
      self.materials.get(str(n, "material")) is Some(m) &&
      str(m, "type") == "MeshBasicMaterial" &&
      m.get("colorWrite").strict_equal(Raw::of(false)) &&
      !m.get("transparent").strict_equal(Raw::of(true)) &&
      ["map", "alphaMap", "envMap"].every(k => str(m, k).is_empty()) &&
      str(m.get("userData"), "surfaceFinish").is_empty() &&
      !n.get("castShadow").strict_equal(Raw::of(true)) else {
      return
    }
    let entries = array_field(n, "instanceInfo")
    guard entries.iter().filter(enabled_instance).count() >= 64 &&
      self.geometries.get(str(n, "geometry")) is Some(g) else {
      return
    }
    let data = g.get("data")
    let pos = data.get("attributes").get("position")
    guard has_field(data, "index") &&
      str(pos, "type") == "Float32Array" &&
      int_field(pos, "itemSize") == 3 else {
      return
    }
    let matrices = matrices_for(n, textures, images)
    let coords = (self.read_view)(pos.get("array"))
    let idx = (self.read_view)(data.get("index").get("array"))
    let bins : Map[String, (Array[Double], Array[Int32])] = Map([])
    for i, e in entries {
      guard enabled_instance(e) else { continue }
      let info = array_field(n, "geometryInfo")[int_field(e, "geometryIndex")]
      let matrix = @math.Matrix4::new().from_array(
        [
          for j in 0..<16 => matrices[i * 16 + j]
        ],
      )
      let c : FixedArray[Double] = if has_field(info, "boundingSphere") {
        info.get("boundingSphere").get("center").cast()
      } else {
        [0, 0, 0]
      }
      let key = cell_key(project(matrix, c[0], c[1], c[2]), 24)
      let (vertices, indices) = bins.get_or_init(key, () => ([], []))
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
        indices.push(idx.get_int(j) + offset)
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

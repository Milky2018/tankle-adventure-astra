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
/// Repack fixed, opaque architecture into spatial draw ranges. Adjacent pieces
/// keep their original attributes and material while sharing one draw command.
fn FittingBake::regroup_architecture(
  self : FittingBake,
  n : Raw,
  g : Raw,
  matrices : FixedArray[Double],
) -> Raw? {
  let entries = array_field(n, "instanceInfo")
  let info = array_field(n, "geometryInfo")
  let source = self.decode(g)
  let index = source.index.unwrap()
  let bins : Map[String, Array[@core.BufferGeometry]] = Map([])
  let identity = @math.Matrix4::new().elements
  let mut vertices = 0
  for i, e in entries {
    if enabled_instance(e) {
      // Translation leaves local texture projections and authored normals intact.
      for j in 0..<12 {
        if matrices[16 * i + j] != identity[j] {
          return None
        }
      }
      vertices += int_field(info[int_field(e, "geometryIndex")], "vertexCount")
    }
  }
  // Highly repeated details are better stored as instances.
  guard vertices <= 2 * source.get_attribute("position").unwrap().count() else {
    return None
  }
  for i, entry in entries {
    guard enabled_instance(entry) else { continue }
    let part = info[int_field(entry, "geometryIndex")]
    let first = int_field(part, "vertexStart")
    let count = int_field(part, "vertexCount")
    let piece = @core.BufferGeometry::new()
    let dx = matrices[16 * i + 12]
    let dy = matrices[16 * i + 13]
    let dz = matrices[16 * i + 14]
    for name, attr in source.attributes {
      guard attr is Buffer(a) else { return None }
      let size = a.item_size
      let data = a.array.subarray(
        start=first * size,
        end=(first + count) * size,
      )
      let copy = @core.BufferAttribute::new(
        if name == "position" {
          data.slice()
        } else {
          data
        },
        size,
        normalized=a.normalized,
      )
      if name == "position" {
        for j in 0..<count {
          copy.set_xyz(
            j,
            copy.get_x(j) + dx,
            copy.get_y(j) + dy,
            copy.get_z(j) + dz,
          )
          |> ignore
        }
      }
      piece.set_attribute(name, copy) |> ignore
    }
    let start = int_field(part, "start")
    piece.set_index(
      [
        for j in start..<(start + int_field(part, "count")) => {
          index.get_x(j).to_int() - first
        }
      ],
    )
    |> ignore
    piece.compute_bounding_sphere()
    let c = piece.bounding_sphere.unwrap().center
    let cell = cell_key([c.x, c.y, c.z], 32)
    bins.get_or_init(cell, () => []).push(piece)
  }
  let cells = [
    for parts in bins.values() => merge_batch(parts[:]).get_geometry().unwrap()
  ]
  Some(self.multidraw(FixedArray::from_array(cells[:])))
}

///|
fn replace_ranges(n : Raw, draw : Raw) -> Unit {
  for
    k in [
      "geometry", "geometryInfo", "instanceInfo", "availableInstanceIds", "availableGeometryIds",
      "nextIndexStart", "nextVertexStart", "geometryCount", "maxInstanceCount", "maxVertexCount",
      "maxIndexCount", "geometryInitialized", "matricesTexture", "indirectTexture",
      "boundingSphere", "boundingBox",
    ] {
    n.set(k, draw.get(k))
  }
}

///|
fn FittingBake::regroup_static(self : FittingBake) -> Unit {
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
      ["MeshBasicMaterial", "MeshStandardMaterial", "MeshToonMaterial"].contains(
        str(m, "type"),
      ) &&
      !m.get("transparent").strict_equal(Raw::of(true)) else {
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
    if matrices.length() < entries.length() * 16 {
      return
    }
    if !m.get("colorWrite").strict_equal(Raw::of(false)) {
      if self.regroup_architecture(n, g, matrices) is Some(draw) {
        replace_ranges(n, draw)
      }
      return
    }
    guard str(m, "type") == "MeshBasicMaterial" &&
      ["map", "alphaMap", "envMap"].every(k => str(m, k).is_empty()) &&
      str(m.get("userData"), "surfaceFinish").is_empty() &&
      !n.get("castShadow").strict_equal(Raw::of(true)) else {
      return
    }
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
    replace_ranges(n, draw)
  }
  visit(self.scene.get("object"))
}

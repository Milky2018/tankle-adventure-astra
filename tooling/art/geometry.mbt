///|
fn matrix(values : FixedArray[Double]) -> @math.Matrix4 {
  @math.Matrix4::new().from_array(Array::from_fixed_array(values))
}

///|
pub fn identity() -> FixedArray[Double] {
  FixedArray::from_array(@math.Matrix4::new().elements[:])
}

///|
pub fn compose_transform(
  parent : FixedArray[Double],
  child : FixedArray[Double],
) -> FixedArray[Double] {
  FixedArray::from_array(matrix(parent).multiply(matrix(child)).elements[:])
}

///|
pub fn determinant(transform : FixedArray[Double]) -> Double {
  matrix(transform).determinant()
}

///|
pub fn project(
  transform : FixedArray[Double],
  x : Double,
  y : Double,
  z : Double,
) -> FixedArray[Double] {
  let p = @math.Vector3::new(x, y, z).apply_matrix4(matrix(transform))
  [p.x, p.y, p.z]
}

///|
pub fn geometry_center(
  positions : @core.TypedArray,
  size : Int32,
) -> FixedArray[Double] {
  let geometry = @core.BufferGeometry::new()
  geometry.set_attribute(
    "position",
    @core.BufferAttribute::new(positions, size),
  )
  |> ignore
  geometry.compute_bounding_box()
  let p = geometry.bounding_box.unwrap().get_center(@math.Vector3::new(0, 0, 0))
  [p.x, p.y, p.z]
}

///|
extern "js" fn keys(value : @core.JsValue) -> FixedArray[String] = "(v) => Object.keys(v)"

///|
pub fn read_geometry(
  attributes : @core.JsValue,
  indices : @core.JsValue,
) -> @core.BufferGeometry {
  let geo = @core.BufferGeometry::new()
  for name in keys(attributes) {
    let a = attributes.get(name)
    geo.set_attribute(
      name,
      @core.BufferAttribute::new(
        a.get("array").cast(),
        a.get("itemSize").cast(),
        normalized=truthy(a, "normalized"),
      ),
    )
    |> ignore
  }
  geo.set_index(@core.BufferAttribute::new(indices.cast(), 1)) |> ignore
  geo
}

///|
fn merge_parts(
  sources : FixedArray[@core.BufferGeometry],
  matrices : FixedArray[FixedArray[Double]],
  colors : FixedArray[Int32],
  vertex_colors : FixedArray[Bool],
) -> @core.BufferGeometry {
  let pieces = []
  for i in 0..<sources.length() {
    let g = sources[i].clone().apply_matrix4(matrix(matrices[i]))
    let tint = @math.Color::from_hex(colors[i])
    let count = g.get_attribute("position").unwrap().count()
    let color = @core.Float32BufferAttribute::new(count * 3, 3)
    let old = g.get_attribute("color")
    for j in 0..<count {
      if vertex_colors[i] && old is Some(c) {
        color.set_xyz(
          j,
          c.get_x(j) * tint.r,
          c.get_y(j) * tint.g,
          c.get_z(j) * tint.b,
        )
        |> ignore
      } else {
        color.set_xyz(j, tint.r, tint.g, tint.b) |> ignore
      }
    }
    g.set_attribute("color", color) |> ignore
    pieces.push(g)
  }
  let merged = @utils.BufferGeometryUtils::merge_geometries(pieces).unwrap()
  merged.compute_bounding_sphere()
  merged
}

///|
pub fn depth_geometry(
  vertices : FixedArray[Double],
  indices : FixedArray[Int32],
) -> @core.BufferGeometry {
  let g = @core.BufferGeometry::new()
  g.set_attribute(
    "position",
    @core.Float32BufferAttribute::new(Array::from_fixed_array(vertices), 3),
  )
  |> ignore
  g.set_index(Array::from_fixed_array(indices))
}

///|
fn geometry_json(g : @core.BufferGeometry, uuid : String) -> @core.JsValue {
  g.uuid = uuid
  @core.JsValue::from_json(g.to_json())
}

///|
fn batch_json(
  cells : FixedArray[@core.BufferGeometry],
  uuid : String,
) -> @core.JsValue {
  let mut vertices = 0
  let mut indices = 0
  for g in cells {
    vertices += g.get_attribute("position").unwrap().count()
    indices += g.index.unwrap().count()
  }
  let obj = @core.BatchedMesh::new(
    cells.length(),
    vertices,
    max_index_count=indices,
  )
  for g in cells {
    obj.add_instance(obj.add_geometry(g)) |> ignore
  }
  obj.compute_bounding_box()
  obj.compute_bounding_sphere()
  obj.uuid = uuid
  guard obj.kind is Mesh(mesh) && mesh.kind is BatchedMesh(batch) else {
    abort("invalid batch")
  }
  mesh.geometry.uuid = uuid + "-geometry"
  for
    entry in [
      ("matrices", batch._matrices_texture),
      ("indices", batch._indirect_texture),
    ] {
    let t = entry.1.unwrap()
    t.uuid = uuid + "-" + entry.0
    t.source.uuid = t.uuid + "-source"
  }
  @core.JsValue::from_json(obj.to_json())
}

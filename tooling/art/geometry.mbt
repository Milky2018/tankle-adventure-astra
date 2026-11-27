///|
fn node_matrix(node : Raw) -> @math.Matrix4 {
  let values : FixedArray[Double] = node.get("matrix").cast()
  @math.Matrix4::new().from_array(Array::from_fixed_array(values))
}

///|
fn project(
  transform : @math.Matrix4,
  x : Double,
  y : Double,
  z : Double,
) -> FixedArray[Double] {
  let p = @math.Vector3::new(x, y, z).apply_matrix4(transform)
  [p.x, p.y, p.z]
}

///|
fn geometry_center(
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
fn FittingBake::merge_parts(
  self : FittingBake,
  parts : Array[Part],
) -> @core.BufferGeometry {
  let pieces = []
  for part in parts {
    let g = self.decode(part.geometry).clone().apply_matrix4(part.transform)
    let tint = @math.Color::from_hex(part.color)
    let count = g.get_attribute("position").unwrap().count()
    let color = @core.Float32BufferAttribute::new(count * 3, 3)
    let old = g.get_attribute("color")
    for j in 0..<count {
      if part.vertex_colors && old is Some(c) {
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
  let merged = merge_batch(pieces[:]).get_geometry().unwrap()
  merged.compute_bounding_sphere()
  merged
}

///|
fn depth_geometry(
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
fn merge_batch(cells : ArrayView[@core.BufferGeometry]) -> @core.Object3D {
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
  obj
}

///|
fn batch_json(
  cells : FixedArray[@core.BufferGeometry],
  uuid : String,
) -> @core.JsValue {
  let obj = merge_batch(cells[:])
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

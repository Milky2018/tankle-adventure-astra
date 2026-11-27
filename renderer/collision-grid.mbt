///|
/// Visit every grid cell touched by the finite ray, including both sides
/// of an exact corner. Vertical rays visit just their starting cell.
fn ray_cells(
  ray : @sim.Ray,
  range : Double,
  visit : ((Int32, Int32)) -> Unit,
) -> Unit {
  let mut x = camera_cell(ray.origin.x)
  let mut z = camera_cell(ray.origin.z)
  let end = ray.point(range)
  let ex = camera_cell(end.x)
  let ez = camera_cell(end.z)
  let sx = if ray.direction.x > 0 { 1 } else { -1 }
  let sz = if ray.direction.z > 0 { 1 } else { -1 }
  let dx = 16.0 / ray.direction.x.abs()
  let dz = 16.0 / ray.direction.z.abs()
  let mut tx = (
      ((x + (if sx > 0 { 1 } else { 0 })) * 16).to_double() - ray.origin.x
    ) /
    ray.direction.x
  let mut tz = (
      ((z + (if sz > 0 { 1 } else { 0 })) * 16).to_double() - ray.origin.z
    ) /
    ray.direction.z
  visit((x, z))
  while x != ex || z != ez {
    if z == ez || (x != ex && tx < tz) {
      x += sx
      tx += dx
    } else if x == ex || tz < tx {
      z += sz
      tz += dz
    } else {
      visit((x + sx, z))
      visit((x, z + sz))
      x += sx
      z += sz
      tx += dx
      tz += dz
    }
    visit((x, z))
  }
}

///|
/// Only the indices are partitioned. The raycaster still intersects the same
/// authored vertices with the original transform, winding and material.
fn enclosure_colliders(node : @core.Object3D, out : Array[Collider]) -> Unit {
  guard node.kind
    is Mesh({ kind: PlainMesh, material: Single(material), geometry: g, .. }) &&
    node.children.is_empty() &&
    g.index is Some(index) &&
    index.count() >= 192 &&
    g.draw_range.start == 0 &&
    g.draw_range.count >= index.count().to_double() &&
    g.get_attribute("position") is Some(position) else {
    out.push(collider(node, @sim.Terrain))
    return
  }
  let bins : Map[(Int32, Int32, Int32), (Array[Int32], @m3.Box3)] = Map([])
  let a = @m3.Vector3::new(0, 0, 0)
  let b = a.clone()
  let c = a.clone()
  let center = a.clone()
  for j = 0; j + 2 < index.count(); j = j + 3 {
    let ia = index.get_x(j).to_int()
    let ib = index.get_x(j + 1).to_int()
    let ic = index.get_x(j + 2).to_int()
    node.get_vertex_position(ia, a) |> ignore
    node.get_vertex_position(ib, b) |> ignore
    node.get_vertex_position(ic, c) |> ignore
    center
    .copy(a)
    .add(b)
    .add(c)
    .multiply_scalar(1.0 / 3)
    .apply_matrix4(node.matrix_world)
    |> ignore
    let key = (
      camera_cell(center.x),
      camera_cell(center.y),
      camera_cell(center.z),
    )
    let (indices, bounds) = bins.get_or_init(key, () => ([], @m3.Box3::new()))
    indices.push(ia)
    indices.push(ib)
    indices.push(ic)
    bounds.expand_by_point(a).expand_by_point(b).expand_by_point(c) |> ignore
  }
  for (indices, box) in bins.values() {
    let chunk = @core.BufferGeometry::new()
      .set_attribute("position", position)
      .set_index(indices)
    chunk.bounding_sphere = Some(box.get_bounding_sphere(@m3.Sphere::new()))
    chunk.bounding_box = Some(box)
    let mesh = @core.Mesh::new(geometry=chunk, material=Single(material))
    mesh.matrix_world.copy(node.matrix_world) |> ignore
    mesh.layers = node.layers
    let world = box.clone().apply_matrix4(node.matrix_world)
    out.push({
      object: mesh,
      target: @sim.Terrain,
      min: point(world.min),
      max: point(world.max),
    })
  }
}

///|
/// The packed city never changes the placements inside a scenery batch.
/// Cache their bounds once and reuse the draw list storage for each camera.
fn install_static_batch(
  node : @core.Object3D,
  pass : Ref[OcclusionBuffer?],
  cut : Cutaway,
) -> Unit {
  guard (node.name.has_prefix("static/") || node.name == "Workshop fittings") &&
    node.kind
    is Mesh(
      { kind: BatchedMesh(batch), material: Single(material), geometry, .. },
    ) &&
    node.extension is None &&
    !material.transparent &&
    material.depth_test &&
    material.depth_write &&
    material.wireframe != Some(true) &&
    geometry.index is Some(index) &&
    batch._indirect_texture is Some(texture) &&
    texture.source.data is DataImage({ data: Some(ids), .. }) else {
    return
  }
  let matrix = @m3.Matrix4::new()
  let bytes = index.array().bytes_per_element()
  let original = node.matrix_world.clone()
  let distance = if scene_field(material.user_data, "renderRole")
    is Some("enclosure" | "backdrop" | "structure") {
    cut.exterior_distance
  } else {
    cut.distance
  }
  let draws = []
  let blocks : Map[(Int32, Int32, Int32), @m3.Box3] = Map([])
  let center = @m3.Vector3::new(0, 0, 0)
  for i, instance in batch._instance_info {
    if instance.active && instance.visible {
      let geom = batch._geometry_info[instance.geometry_index]
      node.get_matrix_at(i, matrix) |> ignore
      let bounds = node
        .get_bounding_sphere_at(instance.geometry_index, @m3.Sphere::new())
        .unwrap()
        .apply_matrix4(matrix)
      let box = node
        .get_bounding_box_at(instance.geometry_index, @m3.Box3::new())
        .unwrap()
        .apply_matrix4(matrix)
        .apply_matrix4(original)
      box.get_center(center) |> ignore
      let cell = (
        (center.x / 32).floor().to_int(),
        (center.y / 24).floor().to_int(),
        (center.z / 32).floor().to_int(),
      )
      blocks.get_or_init(cell, () => @m3.Box3::new()).union(box) |> ignore
      draws.push(
        (
          i,
          bounds,
          box,
          (geom.start * bytes).to_double(),
          geom.count.to_double(),
        ),
      )
    }
  }
  let frustum = @m3.Frustum::new()
  fn prepare(camera : @core.Object3D, color : Bool) {
    matrix
    .multiply_matrices(
      camera.projection_matrix(),
      camera.matrix_world_inverse(),
    )
    .multiply(node.matrix_world)
    |> ignore
    frustum.set_from_projection_matrix(
      matrix,
      reversed_depth=camera.reversed_depth(),
    )
    |> ignore
    let mut n = 0
    let mut changed = false
    let stable = color && node.matrix_world.equals(original)
    let range = match distance.value {
      Number(d) => d
      _ => 1.0 / 0.0
    }
    for (id, bounds, box, start, count) in draws {
      if frustum.intersects_sphere(bounds) {
        if stable &&
          (
            box.distance_to_point(cut.player) > range + 0.03 ||
            (pass.val is Some(depth) && depth.hidden(box))
          ) {
          continue
        }
        // The reflected view and the shadow map can leave a different list.
        if ids.get_int(n) != id ||
          batch._multi_draw_counts.get(n) != count ||
          batch._multi_draw_starts.get(n) != start {
          ids[n] = id.to_double()
          batch._multi_draw_starts[n] = start
          batch._multi_draw_counts[n] = count
          changed = true
        }
        n += 1
      }
    }
    batch._multi_draw_count = n
    batch._multi_draw_bytes_per_element = bytes
    if changed {
      texture.set_needs_update(true)
    }
  }
  node.set_extension(BatchFootprint::{
    placement: original,
    blocks: blocks.values().to_array(),
    last: 0,
  })
  |> ignore
  node.on_before_render = (_, _, camera, _, _, _) => prepare(camera, true)
  node.on_before_shadow = (_, _, _, camera, _, _, _) => prepare(camera, false)
}

///|
/// A single sphere around an entire district can intersect a mirror or shadow
/// frustum even when every occupied block lies outside it.
priv struct BatchFootprint {
  placement : @m3.Matrix4
  blocks : Array[@m3.Box3]
  mut last : Int32
}

///|
impl @core.Object3DExtension for BatchFootprint with fn type_name(_) {
  "BatchedMesh"
}

///|
impl @core.Object3DExtension for BatchFootprint with fn construct(_) {
  @core.BatchedMesh::new(0, 0)
}

///|
impl @core.Object3DExtension for BatchFootprint with fn intersects_frustum(
  self,
  node,
  frustum,
) {
  guard frustum is Single(f) && node.matrix_world.equals(self.placement) else {
    return node.intersects_frustum_kind(frustum)
  }
  if self.blocks.is_empty() {
    return false
  }
  if f.intersects_box(self.blocks[self.last]) {
    return true
  }
  for i, box in self.blocks {
    if f.intersects_box(box) {
      self.last = i
      return true
    }
  }
  false
}

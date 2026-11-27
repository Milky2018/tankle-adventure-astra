///|
priv struct OpaqueFace {
  bounds : @m3.Box3
  axis : Int32
  sign : Double
}

///|
fn opaque_faces(root : @core.Object3D) -> Array[OpaqueFace] {
  let baked : Array[(Int32, Double, Double, Double, Double, Double)] = scene_field(
    root.user_data,
    "opaqueFaces",
  ).unwrap_or([])
  let faces = []
  for (side, plane, u0, v0, u1, v1) in baked {
    let a = side.abs() - 1
    if a < 0 || a > 2 || u1 <= u0 || v1 <= v0 {
      continue
    }
    let u = (a + 1) % 3
    let v = (a + 2) % 3
    let lo = @m3.Vector3::new(0, 0, 0)
    let hi = lo.clone()
    lo.set_component(a, plane).set_component(u, u0).set_component(v, v0)
    |> ignore
    hi.set_component(a, plane).set_component(u, u1).set_component(v, v1)
    |> ignore
    faces.push({
      bounds: @m3.Box3::new(min=lo, max=hi),
      axis: a,
      sign: if side > 0 {
        1
      } else {
        -1
      },
    })
  }
  faces
}

///|
fn RoomVisibility::occlusion_buffer(
  self : RoomVisibility,
  camera : @core.Object3D,
  cut : Cutaway,
  range : Double,
  reflected~ : Bool,
) -> OcclusionBuffer {
  let eye = camera.position
  let aperture = cut.enabled.value is Number(v) && v > 0
  let opening = @m3.Box3::new()
    .expand_by_point(eye)
    .expand_by_point(cut.player.clone().add(@m3.Vector3::new(0, 1.3, 0)))
    .expand_by_scalar(2.45)
  let frustum = @m3.Frustum::new().set_from_projection_matrix(
    self.projection.multiply_matrices(
      camera.projection_matrix(),
      camera.matrix_world_inverse(),
    ),
  )
  let buffer = OcclusionBuffer::new(camera)
  let safe = @m3.Box3::new(
    min=cut.player.clone().add_scalar(-0.57 * (range - 1)),
    max=cut.player.clone().add_scalar(0.57 * (range - 1)),
  )
  let clipped = @m3.Box3::new()
  for f in self.faces {
    let mut b = f.bounds
    let d = (eye.get_component(f.axis) - b.min.get_component(f.axis)) * f.sign
    if d <= 1 ||
      (aperture && opening.intersects_box(b)) ||
      !frustum.intersects_box(b) {
      continue
    }
    if reflected {
      let near = frustum.planes[5]
      let n = near.normal
      let depth = near.constant +
        n.x * (if n.x > 0 { b.min.x } else { b.max.x }) +
        n.y * (if n.y > 0 { b.min.y } else { b.max.y }) +
        n.z * (if n.z > 0 { b.min.z } else { b.max.z })
      if depth <= 0.02 {
        continue
      }
    }
    let dx = (b.min.x - cut.player.x).abs().max((b.max.x - cut.player.x).abs())
    let dy = (b.min.y - cut.player.y).abs().max((b.max.y - cut.player.y).abs())
    let dz = (b.min.z - cut.player.z).abs().max((b.max.z - cut.player.z).abs())
    if dx * dx + dy * dy + dz * dz >= (range - 1) * (range - 1) {
      b = clipped.copy(b).intersect(safe)
      if b.is_empty() {
        continue
      }
    }
    if project_bounds(b, buffer.projection.elements) is Some(rect) &&
      (rect.right - rect.left) * DepthWidth.to_double() >= 2 &&
      (rect.top - rect.bottom) * DepthHeight.to_double() >= 2 {
      buffer.fill(camera, { ..f, bounds: b, }, rect)
    }
  }
  buffer
}

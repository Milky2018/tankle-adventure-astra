///|
test "distance culling preserves shadow casters and rejects stale world bounds" {
  let wall = @core.Object3D::new()
  let lift = @core.Group::new()
  let rider = @core.Object3D::new()
  lift.add(rider) |> ignore
  wall.position.set_x(255) |> ignore
  lift.position.set_x(255) |> ignore
  wall.update_matrix_world(force=true)
  lift.update_matrix_world(force=true)
  let bounds = @m3.Box3::new(
    min=@m3.Vector3::new(250, 0, -20),
    max=@m3.Vector3::new(260, 10, -10),
  )
  let bin : SceneryBin = {
    bounds,
    exterior: false,
    members: [
      (wall, wall.matrix_world.clone(), bounds),
      (rider, rider.matrix_world.clone(), bounds),
    ],
    rooms: [],
    outer_faces: 0,
  }
  let shadow = @core.Layers::new()
  let visibility : RoomVisibility = {
    pass: Ref(None),
    faces: [],
    rooms: [],
    bins: [bin],
    hidden: [],
    shadow_layers: [shadow],
    projection: @m3.Matrix4::new(),
  }
  let camera = @core.PerspectiveCamera::new()
  camera.look_at(bounds.get_center(@m3.Vector3::new(0, 0, 0)))
  camera.update_matrix_world(force=true)
  let cut = Cutaway::new(@core.Scene::new())
  cut.player.set(0, 0, 0) |> ignore
  lift.position.set_x(5) |> ignore
  lift.update_matrix_world(force=true)
  visibility.apply(camera, cut)
  assert_false(camera.layers.test_(wall.layers))
  assert_true(shadow.test_(wall.layers))
  assert_true(camera.layers.test_(rider.layers))
  visibility.restore()
  assert_eq(wall.layers.mask, 1)
  assert_eq(shadow.mask, 1)
  cut.distance.value = Number(300)
  visibility.apply(camera, cut)
  assert_true(camera.layers.test_(wall.layers))
}

///|
test "animated instances stay out of static visibility bins" {
  let scene = @core.Scene::new()
  scene.user_data.set(
    "portalRooms",
    @core.JsValue::from_json([[-8, -8, -8, 8, 8, 8, []]]),
  )
  let batch = @core.InstancedMesh::new(
    geometry=@geometries.BoxGeometry::new(),
    material=Single(@core.MeshBasicMaterial::new()),
    1,
  )
  scene.add(batch).update_matrix_world(force=true)
  batch.user_data.set("portalStatic", @core.JsValue::of(false))
  assert_true(RoomVisibility::new(scene, enabled=true).bins.is_empty())
  batch.user_data.set("portalStatic", @core.JsValue::of(true))
  assert_eq(RoomVisibility::new(scene, enabled=true).bins.length(), 1)
}

///|
test "a wall hides distant geometry while its doorway and foreground stay visible" {
  let camera = @core.PerspectiveCamera::new(
    fov=70,
    aspect=1.6,
    near=0.15,
    far=100,
  )
  camera.update_matrix_world(force=true)
  let depth = OcclusionBuffer::new(camera)
  fn box(x0 : Double, x1 : Double, z0 : Double, z1 : Double) -> @m3.Box3 {
    @m3.Box3::new(
      min=@m3.Vector3::new(x0, -1, z0),
      max=@m3.Vector3::new(x1, 1, z1),
    )
  }
  for (lo, hi) in [(-8.0, -1.0), (1.0, 8.0)] {
    let face : OpaqueFace = {
      bounds: @m3.Box3::new(
        min=@m3.Vector3::new(lo, -4, -5),
        max=@m3.Vector3::new(hi, 4, -5),
      ),
      axis: 2,
      sign: 1,
    }
    depth.fill(camera, face, viewport)
  }
  assert_true(depth.hidden(box(-8, -7, -13, -12)))
  assert_false(depth.hidden(box(-0.5, 0.5, -13, -12)))
  assert_false(depth.hidden(box(-8, 0, -13, -12)))
  assert_false(depth.hidden(box(-2, -1, -4, -3)))
}

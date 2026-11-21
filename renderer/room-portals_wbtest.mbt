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
  let bin : SceneryBin = {
    bounds: @m3.Box3::new(
      min=@m3.Vector3::new(250, 0, 0),
      max=@m3.Vector3::new(260, 10, 10),
    ),
    members: [
      (wall, wall.matrix_world.clone()),
      (rider, rider.matrix_world.clone()),
    ],
    rooms: [],
    fog_limited: true,
    outer_faces: 0,
  }
  let shadow = @core.Layers::new()
  let visibility : RoomVisibility = {
    rooms: [],
    bins: [bin],
    hidden: [],
    shadow_layers: [shadow],
    projection: @m3.Matrix4::new(),
  }
  let camera = @core.PerspectiveCamera::new()
  let cut = Cutaway::new(@core.Scene::new())
  cut.player.set(0, 0, 0) |> ignore
  lift.position.set_x(5) |> ignore
  lift.update_matrix_world(force=true)
  visibility.apply(camera, cut, false, true)
  assert_false(camera.layers.test_(wall.layers))
  assert_true(shadow.test_(wall.layers))
  assert_true(camera.layers.test_(rider.layers))
  visibility.restore()
  assert_eq(wall.layers.mask, 1)
  assert_eq(shadow.mask, 1)
  bin.fog_limited = false
  visibility.apply(camera, cut, false, true)
  assert_true(camera.layers.test_(wall.layers))
}

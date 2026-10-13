///|
pub(all) struct View {
  priv nodes : Map[String, @three.Object3D]
  priv belts : Array[BeltVisual]
  priv hives : Array[HiveVisual]
  priv player_visual : PlayerVisual
  priv renewal : Renewal
  priv effects : Effects
  priv feeds : Array[Feed]
  priv machinery : Machinery
  priv enemies : Array[EnemyVisual]
  priv projectiles : Projectiles
  priv cutaway : Cutaway
  scene : @three.Scene
  renderer : @three.WebGLRenderer
  ending : @three.PerspectiveCamera
  mut film : Bool
  third : @three.PerspectiveCamera
  overhead : @three.OrthographicCamera
  root : @three.Object3D
  body : @three.Object3D
  turret : @three.Object3D
  barrel : @three.Object3D
  mut distance : Double
  mut camera_height : Double
  mut shoulder : Double
  mut sensitivity : Double
  mut overhead_angle : Double
  mut area : Double
  mut ground_clearance : Double
  mut yaw : Double
  mut pitch : Double
  mut third_person : Bool
}

///|
pub fn View::new(scene : @three.Scene, game : @sim.Game) -> View {
  scene.update_matrix_world(true)
  let nodes : Map[String, @three.Object3D] = Map([])
  scene.traverse(fn(node) { if node.name() != "" { nodes[node.name()] = node } })
  let renderer = @host.create_renderer()
  renderer.set_pixel_ratio(@host.pixel_ratio())
  renderer.set_shadows_enabled(true)
  renderer.set_shadow_map_type(@three.ShadowMapType::PCF)
  renderer.set_tone_mapping(@three.NeutralToneMapping)
  renderer.set_tone_mapping_exposure(1.1)
  let root = nodes.get("player/root").unwrap()
  let body = root.get_object_by_name("player/body").unwrap()
  let turret = root.get_object_by_name("player/turret").unwrap()
  for object in [root, body, turret] {
    object.set_matrix_auto_update(true)
  }
  let view = {
    scene,
    nodes,
    renderer,
    machinery: Machinery::new(nodes, game),
    feeds: feeds(scene),
    effects: Effects::new(),
    belts: belts(nodes, game),
    hives: hives(nodes, game),
    player_visual: PlayerVisual::new(nodes),
    renewal: Renewal::new(nodes),
    root,
    body,
    turret,
    barrel: root.get_object_by_name("player/barrel").unwrap(),
    distance: 15,
    camera_height: 2.5,
    shoulder: 0,
    sensitivity: 3,
    overhead_angle: @math.atan2(39.6, (28.0 * 28 * 2).sqrt()),
    area: 17,
    ground_clearance: 0,
    cutaway: Cutaway::new(scene),
    projectiles: Projectiles::new(),
    enemies: enemy_visuals(nodes),
    ending: @three.PerspectiveCamera::PerspectiveCamera(55, 1, 0.15, 290),
    film: false,
    third: @three.PerspectiveCamera::PerspectiveCamera(60, 1, 0.15, 290),
    overhead: @three.OrthographicCamera::OrthographicCamera(
      -30, 30, 17, -17, 0.1, 290,
    ),
    yaw: -@math.PI / 2,
    pitch: 15.3 * @math.PI / 180,
    third_person: true,
  }
  view.resize()
  view
}

///|
pub fn View::resize(self : View) -> Unit {
  let w = @host.width()
  let h = @host.height()
  self.renderer.set_size(w, h)
  self.third.set_aspect(w.to_double() / h.to_double())
  self.third.update_projection_matrix()
  self.ending.set_aspect(w.to_double() / h.to_double())
  self.ending.update_projection_matrix()
  let half = self.area * w.to_double() / h.to_double()
  self.overhead.set_top(self.area)
  self.overhead.set_bottom(-self.area)
  self.overhead.set_left(-half)
  self.overhead.set_right(half)
  self.overhead.update_projection_matrix()
}

///|
pub fn View::turn(self : View, dx : Double, dy : Double) -> Unit {
  self.yaw -= dx * 0.0025 * self.sensitivity
  self.pitch = @sim.clamp(
    self.pitch + dy * 0.002 * self.sensitivity,
    -0.65,
    0.95,
  )
}

///|
pub fn View::camera(self : View) -> @three.Camera {
  if self.film {
    self.ending.as_camera()
  } else if self.third_person {
    self.third.as_camera()
  } else {
    self.overhead.as_camera()
  }
}

///|
pub fn View::position_player(
  self : View,
  player : @sim.Player,
  world : @sim.World,
  dt : Double,
) -> Unit {
  self.ground_pose(player, world, dt)
  self.body.set_rotation_xyz(0, player.heading, 0)
  self.turret.set_rotation_xyz(0, player.aim, 0)
  self.root.update_matrix_world(true)
  if self.third_person {
    let forward = @three.Vector3::Vector3(
      @math.sin(self.yaw) * @math.cos(self.pitch),
      -@math.sin(self.pitch),
      @math.cos(self.yaw) * @math.cos(self.pitch),
    )
    let right = @three.Vector3::Vector3(
      -@math.cos(self.yaw),
      0,
      @math.sin(self.yaw),
    )
    let up = @three.Vector3::Vector3(0, 0, 0)
      .cross_vectors(right, forward)
      .normalize()
    let offset = forward
      .clone()
      .multiply_scalar(-self.distance)
      .add_scaled_vector(up, self.camera_height)
      .add_scaled_vector(right, self.shoulder)
    offset.set_y(Double::max(2.5, offset.y())) |> ignore
    self.third.set_position(
      offset.add(@three.Vector3::Vector3(player.x, player.y + 1.8, player.z)),
    )
    self.third.look_at(self.third.position().clone().add(forward))
    self.third.update_matrix_world(true)
  } else {
    self.overhead.set_position_xyz(
      player.x + 28,
      player.y + (28.0 * 28 * 2).sqrt() * @math.tan(self.overhead_angle),
      player.z + 28,
    )
    self.overhead.look_at(@three.Vector3::Vector3(player.x, player.y, player.z))
    self.overhead.update_matrix_world(true)
  }
}

///|
pub fn View::draw(
  self : View,
  player : @sim.Player,
  world : @sim.World,
) -> Unit {
  self.cutaway.enabled.set_float(if self.film { 0 } else { 1 })
  self.cutaway.update(player, world, self.camera(), self.third_person)
  self.renderer.render(self.scene, self.camera())
}

///|
pub fn View::project(self : View, position : @sim.Vec3) -> @sim.Vec2 {
  let p = vector(position).project(self.camera())
  {
    x: (p.x() + 1) * @host.width().to_double() / 2,
    z: (1 - p.y()) * @host.height().to_double() / 2,
  }
}

///|
pub fn View::set_visibility(
  self : View,
  near : Double,
  far : Double,
  range : Double,
) -> Unit {
  if self.scene.fog() is Some(fog) {
    fog.set_near(near)
    fog.set_far(far)
  }
  self.cutaway.distance.set_float(range)
  self.third.set_far(range + 70)
  self.ending.set_far(range + 70)
  self.overhead.set_far(range + 70)
  self.third.update_projection_matrix()
  self.ending.update_projection_matrix()
  self.overhead.update_projection_matrix()
}

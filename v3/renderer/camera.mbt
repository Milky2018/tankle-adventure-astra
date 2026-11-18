///|
pub(all) struct View {
  priv nodes : Map[String, @core.Object3D]
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
  scene : @core.Object3D
  renderer : @webgl.WebGLRenderer
  ending : @core.Object3D
  mut film : Bool
  third : @core.Object3D
  overhead : @core.Object3D
  root : @core.Object3D
  body : @core.Object3D
  turret : @core.Object3D
  barrel : @core.Object3D
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
pub fn View::new(scene : @core.Object3D, game : @sim.Game) -> View {
  scene.update_matrix_world(force=true)
  let nodes : Map[String, @core.Object3D] = Map([])
  scene.traverse(fn(node) {
    let binding = scene_binding(node)
    if binding != "" {
      nodes[binding] = node
    }
  })
  let renderer = @host.create_renderer()
  renderer.set_pixel_ratio(@host.pixel_ratio())
  renderer.shadow_map.enabled = true
  renderer.shadow_map.type_ = @core.PCFShadowMap
  renderer.tone_mapping = @core.NeutralToneMapping
  renderer.tone_mapping_exposure = 1.1
  let root = nodes.get("player/root").unwrap()
  let body = nodes.get("player/body").unwrap()
  let turret = nodes.get("player/turret").unwrap()
  for object in [root, body, turret] {
    object.matrix_auto_update = true
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
    barrel: nodes.get("player/barrel").unwrap(),
    distance: 15,
    camera_height: 2.5,
    shoulder: 0,
    sensitivity: 3,
    overhead_angle: @math.atan2(39.6, (28.0 * 28 * 2).sqrt()),
    area: 17,
    ground_clearance: 0,
    cutaway: Cutaway::new(scene),
    projectiles: Projectiles::new(),
    enemies: enemy_visuals(nodes, game),
    ending: @core.PerspectiveCamera::new(fov=55, aspect=1, near=0.15, far=290),
    film: false,
    third: @core.PerspectiveCamera::new(fov=60, aspect=1, near=0.15, far=290),
    overhead: @core.OrthographicCamera::new(
      left=-30,
      right=30,
      top=17,
      bottom=-17,
      near=0.1,
      far=290,
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
  self.renderer.set_size(w.to_double(), h.to_double())
  self.third.as_perspective_camera().aspect = w.to_double() / h.to_double()
  self.third.update_projection_matrix()
  self.ending.as_perspective_camera().aspect = w.to_double() / h.to_double()
  self.ending.update_projection_matrix()
  let half = self.area * w.to_double() / h.to_double()
  self.overhead.as_orthographic_camera().top = self.area
  self.overhead.as_orthographic_camera().bottom = -self.area
  self.overhead.as_orthographic_camera().left = -half
  self.overhead.as_orthographic_camera().right = half
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
pub fn View::camera(self : View) -> @core.Object3D {
  if self.film {
    self.ending
  } else if self.third_person {
    self.third
  } else {
    self.overhead
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
  self.body.rotation.set(0, player.heading, 0) |> ignore
  self.turret.rotation.set(0, player.aim, 0) |> ignore
  self.root.update_matrix_world(force=true)
  if self.third_person {
    let forward = @m3.Vector3::new(
      @math.sin(self.yaw) * @math.cos(self.pitch),
      -@math.sin(self.pitch),
      @math.cos(self.yaw) * @math.cos(self.pitch),
    )
    let right = @m3.Vector3::new(-@math.cos(self.yaw), 0, @math.sin(self.yaw))
    let up = @m3.Vector3::new(0, 0, 0).cross_vectors(right, forward).normalize()
    let offset = forward
      .clone()
      .multiply_scalar(-self.distance)
      .add_scaled_vector(up, self.camera_height)
      .add_scaled_vector(right, self.shoulder)
    offset.set_y(Double::max(2.5, offset.y)) |> ignore
    self.third.position.copy(
      offset.add(@m3.Vector3::new(player.x, player.y + 1.8, player.z)),
    )
    |> ignore
    self.third.look_at(self.third.position.clone().add(forward))
    self.third.update_matrix_world(force=true)
  } else {
    self.overhead.position.set(
      player.x + 28,
      player.y + (28.0 * 28 * 2).sqrt() * @math.tan(self.overhead_angle),
      player.z + 28,
    )
    |> ignore
    self.overhead.look_at(@m3.Vector3::new(player.x, player.y, player.z))
    self.overhead.update_matrix_world(force=true)
  }
}

///|
pub fn View::draw(
  self : View,
  player : @sim.Player,
  world : @sim.World,
) -> Unit {
  self.cutaway.enabled.value = Number(if self.film { 0 } else { 1 })
  self.cutaway.update(player, world, self.camera(), self.third_person)
  self.renderer.render(self.scene, self.camera())
}

///|
pub fn View::project(self : View, position : @sim.Vec3) -> @sim.Vec2 {
  let p = vector(position).project(self.camera())
  {
    x: (p.x + 1) * @host.width().to_double() / 2,
    z: (1 - p.y) * @host.height().to_double() / 2,
  }
}

///|
pub fn View::set_visibility(
  self : View,
  near : Double,
  far : Double,
  range : Double,
) -> Unit {
  if self.scene.as_scene().fog is Some(Fog(fog)) {
    fog.near = near
    fog.far = far
  }
  self.cutaway.distance.value = Number(range)
  self.third.as_perspective_camera().far = range + 70
  self.ending.as_perspective_camera().far = range + 70
  self.overhead.as_orthographic_camera().far = range + 70
  self.third.update_projection_matrix()
  self.ending.update_projection_matrix()
  self.overhead.update_projection_matrix()
}

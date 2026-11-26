///|
pub(all) struct View {
  priv nodes : Map[String, @core.Object3D]
  priv belts : Array[BeltVisual]
  priv grates : Array[(@sim.Belt, @core.Object3D)]
  priv hives : Array[HiveVisual]
  priv player_visual : PlayerVisual
  priv renewal : Renewal
  priv mortar_scope : MortarScope
  priv effects : Effects
  priv feeds : Array[Feed]
  priv machinery : Machinery
  priv enemies : Array[EnemyVisual]
  priv projectiles : Projectiles
  priv lighting : CityLights
  priv room_visibility : RoomVisibility
  priv mut release_delay : Double
  priv mut boom_length : Double
  priv camera_space : CameraSpace
  priv progress : @sim.Progress
  priv cutaway : Cutaway
  scene : @core.Object3D
  renderer : @webgl.WebGLRenderer
  ending : @core.Object3D
  mut film : Bool
  third : @core.Object3D
  root : @core.Object3D
  body : @core.Object3D
  turret : @core.Object3D
  barrel : @core.Object3D
  mut distance : Double
  mut camera_height : Double
  mut shoulder : Double
  mut sensitivity : Double
  mut ground_clearance : Double
  mut yaw : Double
  mut pitch : Double
}

///|
pub fn View::new(scene : @core.Object3D, game : @sim.Game) -> View {
  scene.update_matrix_world(force=true)
  let nodes : Map[String, @core.Object3D] = Map([])
  scene.traverse(fn(node) {
    let binding = scene_binding(node)
    // Static fittings inherit motion from their parent. Their local matrices
    // already contain the imported transform.
    if node.kind is Mesh(_) &&
      (
        binding.has_prefix("world/occluders/") ||
        (
          binding == "" &&
          (node.name.contains(" / ") || node.name == "Workshop fittings")
        )
      ) {
      node.matrix_auto_update = false
    }
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
  let barrel = nodes.get("player/barrel").unwrap()
  for object in [root, body, turret, barrel] {
    object.matrix_auto_update = true
  }
  let enemies = enemy_visuals(nodes, game)
  let player_visual = PlayerVisual::new(nodes)
  let view = {
    scene,
    nodes,
    renderer,
    lighting: CityLights::new(nodes),
    machinery: Machinery::new(nodes, game),
    feeds: feeds(scene),
    mortar_scope: MortarScope::new(),
    effects: Effects::new(scene),
    belts: belts(nodes, game),
    grates: game.floor_heat.filter_map(fn(grate) {
      nodes
      .get("process/heat/\{grate.deck.id}/elements")
      .map(fn(node) { (grate, node) })
    }),
    hives: hives(nodes, game),
    player_visual,
    renewal: Renewal::new(nodes),
    root,
    body,
    turret,
    barrel,
    distance: 15,
    camera_height: 2.5,
    shoulder: 0,
    sensitivity: 3,
    ground_clearance: 0,
    boom_length: 15,
    release_delay: 0,
    progress: game.progress,
    camera_space: CameraSpace::new(scene, game.world),
    cutaway: Cutaway::new(scene, currents=game.currents, player=player_visual),
    room_visibility: RoomVisibility::new(
      scene,
      enabled=@host.query("portals") != "off",
    ),
    projectiles: Projectiles::new(),
    enemies,
    ending: @core.PerspectiveCamera::new(fov=55, aspect=1, near=0.15, far=290),
    film: false,
    third: @core.PerspectiveCamera::new(fov=60, aspect=1, near=0.15, far=290),
    yaw: -@math.PI / 2,
    pitch: 15.3 * @math.PI / 180,
  }
  // World matrices are current at this point, including moving ancestors.
  let before = scene.as_scene().on_before_render
  scene.as_scene().on_before_render = fn(renderer, root, camera, target) {
    before(renderer, root, camera, target)
    if target is None && !view.film && camera.id == view.third.id {
      view.room_visibility.apply(camera, view.cutaway)
    }
  }
  view.install_mirrors(game.mirrors)
  view.update_player(game, 0)
  view.resize()
  view
}

///|
pub fn View::resize(self : View) -> Unit {
  self.mortar_scope.viewport = None
  let w = @host.width()
  let h = @host.height()
  self.renderer.set_size(w.to_double(), h.to_double())
  self.third.as_perspective_camera().aspect = w.to_double() / h.to_double()
  self.third.update_projection_matrix()
  self.ending.as_perspective_camera().aspect = w.to_double() / h.to_double()
  self.ending.update_projection_matrix()
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
  } else {
    self.third
  }
}

///|
pub fn View::position_player(
  self : View,
  player : @sim.Player,
  world : @sim.World,
  dt : Double,
) -> Unit {
  if self.cutaway.water_time.value is Number(elapsed) {
    self.cutaway.water_time.value = Number(elapsed + dt)
  }
  self.ground_pose(player, world, dt)
  self.body.rotation.set(0, player.heading, 0) |> ignore
  self.root.update_matrix_world(force=true)
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
  let anchor = @sim.Vec3::{
    x: player.x,
    y: self.root.position.y + 1.8,
    z: player.z,
  }
  let desired = offset.length()
  let free = self.camera_space.boom_limit(
    anchor,
    point(offset),
    world,
    self.progress,
  )
  // Compress immediately on contact, ease back after rounding the corner.
  let target = Double::min(desired, Double::max(5.5, free))
  if dt <= 0 {
    self.boom_length = target
    self.release_delay = 0
  } else if target <= self.boom_length {
    if target < desired - 0.05 {
      self.release_delay = 0.18
    }
    self.boom_length = target
  } else {
    let available = Double::max(0, dt - self.release_delay)
    self.release_delay = Double::max(0, self.release_delay - dt)
    self.boom_length = damp(self.boom_length, target, 4, available)
  }
  self.third.position.copy(
    offset.multiply_scalar(self.boom_length / desired).add(vector(anchor)),
  )
  |> ignore
  // Ground clearance and wall contact constrain the eye. Mouse pitch still
  // controls the sightline when the boom has no more room to orbit.
  self.third.look_at(self.third.position.clone().add(forward))
  self.third.update_matrix_world(force=true)
}

///|
pub fn View::draw(
  self : View,
  player : @sim.Player,
  world : @sim.World,
) -> Unit {
  let camera = self.camera()

  if self.nodes.get("city/sky") is Some(sky) {
    sky.matrix_auto_update = true
    sky.position.copy(camera.position) |> ignore
    sky.update_matrix_world(force=true)
  }
  self.lighting.update(
    if self.film {
      point(camera.position)
    } else {
      player.position()
    },
    self.scene,
  )
  self.cutaway.update(player, world, camera)
  let blocked = !self.film &&
    self.camera_space.hull_hidden(
      self.body,
      self.visible_muzzle(player),
      point(self.third.position),
      world,
      self.progress,
    )
  self.cutaway.enabled.value = Number(if blocked { 1 } else { 0 })
  self.renderer.render(self.scene, camera)
  self.room_visibility.restore()
  self.draw_mortar_scope(player)
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
pub fn View::set_render_distance(self : View, range : Double) -> Unit {
  self.cutaway.distance.value = Number(range)
  self.third.as_perspective_camera().far = range + 70
  self.ending.as_perspective_camera().far = range + 70
  self.third.update_projection_matrix()
  self.ending.update_projection_matrix()
}

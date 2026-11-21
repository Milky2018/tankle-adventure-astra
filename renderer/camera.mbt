///|
pub(all) struct View {
  priv nodes : Map[String, @core.Object3D]
  priv belts : Array[BeltVisual]
  priv grates : Array[(@sim.Belt, @core.Object3D)]
  priv hives : Array[HiveVisual]
  priv player_visual : PlayerVisual
  priv renewal : Renewal
  priv effects : Effects
  priv feeds : Array[Feed]
  priv machinery : Machinery
  priv enemies : Array[EnemyVisual]
  priv projectiles : Projectiles
  priv lighting : CityLights
  priv clerestories : Array[@core.Object3D]
  priv room_visibility : RoomVisibility
  priv mut boom_length : Double
  priv camera_space : CameraSpace
  priv progress : @sim.Progress
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
  let clerestories = []
  for binding, node in nodes {
    if binding.has_prefix("presentation/clerestory/") {
      clerestories.push(node)
    }
  }
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
  let view = {
    scene,
    nodes,
    renderer,
    lighting: CityLights::new(nodes),
    machinery: Machinery::new(nodes, game),
    feeds: feeds(scene),
    effects: Effects::new(scene),
    belts: belts(nodes, game),
    grates: game.floor_heat.filter_map(fn(grate) {
      nodes
      .get("process/heat/\{grate.deck.id}/elements")
      .map(fn(node) { (grate, node) })
    }),
    hives: hives(nodes, game),
    player_visual: PlayerVisual::new(nodes),
    renewal: Renewal::new(nodes),
    root,
    body,
    turret,
    barrel,
    distance: 15,
    camera_height: 2.5,
    shoulder: 0,
    sensitivity: 3,
    overhead_angle: @math.atan2(39.6, (28.0 * 28 * 2).sqrt()),
    area: 17,
    ground_clearance: 0,
    boom_length: 15,
    progress: game.progress,
    camera_space: CameraSpace::new(scene, game.world),
    cutaway: Cutaway::new(scene),
    clerestories,
    room_visibility: RoomVisibility::new(scene),
    projectiles: Projectiles::new(),
    enemies,
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
  // World matrices are current at this point, including moving ancestors.
  let before = scene.as_scene().on_before_render
  scene.as_scene().on_before_render = fn(renderer, root, camera, target) {
    before(renderer, root, camera, target)
    if target is None &&
      !view.film &&
      (camera.id == view.third.id || camera.id == view.overhead.id) {
      view.room_visibility.apply(
        camera,
        view.cutaway,
        view.third_person,
        root.as_scene().fog is Some(_),
      )
    }
  }
  view.update_player(game, 0)
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
  if self.cutaway.water_time.value is Number(elapsed) {
    self.cutaway.water_time.value = Number(elapsed + dt)
  }
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
    self.boom_length = if target <= self.boom_length || dt <= 0 {
      target
    } else {
      damp(self.boom_length, target, 4, dt)
    }
    self.third.position.copy(
      offset.multiply_scalar(self.boom_length / desired).add(vector(anchor)),
    )
    |> ignore
    let close = 1.0 - smooth(4, 9, self.boom_length)
    let cam = self.third.as_perspective_camera()
    let fov = 60.0 + 18.0 * close
    if (cam.fov - fov).abs() > 0.01 {
      cam.fov = fov
      self.third.update_projection_matrix()
    }
    // Ground clearance and wall contact constrain the eye. Mouse pitch still
    // controls the sightline when the boom has no more room to orbit.
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
  self.cutaway.update(player, world, self.camera(), self.third_person)
}

///|
pub fn View::draw(
  self : View,
  player : @sim.Player,
  world : @sim.World,
) -> Unit {
  self.cutaway.enabled.value = Number(if self.film { 0 } else { 1 })
  let camera = self.camera()
  for roof in self.clerestories {
    roof.visible = self.third_person || self.film
  }
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
  if self.film ||
    (self.cutaway.mode.value is Number(mode) && (mode > 0) != self.third_person) {
    self.cutaway.update(player, world, camera, self.third_person)
  }
  self.renderer.render(self.scene, camera)
  self.room_visibility.restore()
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

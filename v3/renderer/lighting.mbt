///|
priv struct WorkLamp {
  position : @m3.Vector3
  tint : Int32
}

///|
priv struct CityLights {
  key : @core.Object3D?
  target : @core.Object3D?
  ambient : @core.Object3D?
  hemisphere : @core.Object3D?
  sky : @core.Object3D?
  horizon : @core.Object3D?
  anchors : Array[WorkLamp]
  lights : Array[@core.Object3D]
  previous : @m3.Vector3
  mut depth : Double
}

///|
fn CityLights::new(nodes : Map[String, @core.Object3D]) -> CityLights {
  let anchors = []
  for binding, node in nodes {
    if binding.has_prefix("lighting/lamp/") {
      let tint = if binding.has_prefix("lighting/lamp/furnace/") {
        0xff8a42
      } else if binding.has_prefix("lighting/lamp/optics/") {
        0xc7e3eb
      } else {
        0xffda9b
      }
      anchors.push({ position: node.position, tint, })
    }
  }
  let lights = []
  for i in 0..<3 {
    if nodes.get("world/presentation/localLights/slots/\{i}/light")
      is Some(light) {
      lights.push(light)
    }
  }
  {
    key: nodes.get("lighting/key"),
    target: nodes.get("lighting/target"),
    ambient: nodes.get("lighting/fill"),
    hemisphere: nodes.get("lighting/skyFill"),
    sky: nodes.get("city/sky"),
    horizon: nodes.get("lighting/horizon"),
    anchors,
    lights,
    previous: @m3.Vector3::new(-10000, -10000, -10000),
    depth: -1,
  }
}

///|
fn CityLights::update(
  self : CityLights,
  p : @sim.Vec3,
  scene : @core.Object3D,
) -> Unit {
  let depth = @sim.clamp((-12 - p.y) / 22, 0, 1)
  if self.depth != depth {
    self.depth = depth
    if self.ambient is Some(n) {
      n.as_light().intensity = 0.65 - 0.23 * depth
    }
    if self.hemisphere is Some(n) {
      n.as_light().intensity = 1.25 - 0.73 * depth
    }
    if self.key is Some(n) {
      n.as_light().intensity = 2.6 - 1.23 * depth
    }
    let exterior : Double = 1 -
      (1 - depth) * (1 - depth) * (1 - depth) * (1 - depth)
    for object in [self.sky, self.horizon] {
      if object is Some(n) &&
        n.get_material() is Some(Single({ color: Some(c), .. })) {
        c.set_rgb(
          1 - 0.971 * exterior,
          1 - 0.981 * exterior,
          1 - 0.987 * exterior,
        )
        |> ignore
      }
    }
    if scene.as_scene().fog is Some(Fog(fog)) {
      fog.color.set_hex(0xb2bfb7) |> ignore
      fog.color.multiply_scalar(1 - 0.968 * exterior) |> ignore
      if scene.as_scene().background is Some(Color(background)) {
        background.copy(fog.color) |> ignore
      }
    }
  }
  let dx = p.x - self.previous.x
  let dy = p.y - self.previous.y
  let dz = p.z - self.previous.z
  if dx * dx + dy * dy + dz * dz < 0.75 {
    return
  }
  self.previous.set(p.x, p.y, p.z) |> ignore
  if self.key is Some(n) && self.target is Some(t) {
    n.position.set(p.x - 18, p.y + 55, p.z + 16) |> ignore
    t.position.copy(self.previous) |> ignore
    n.update_matrix()
    t.update_matrix()
    t.update_matrix_world(force=true)
  }
  let nearest : Array[WorkLamp] = []
  for lamp in self.anchors {
    let d = lamp.position.distance_to_squared(self.previous)
    if d > 32 * 32 {
      continue
    }
    let mut i = 0
    while i < nearest.length() &&
          nearest[i].position.distance_to_squared(self.previous) <= d {
      i += 1
    }
    if i < self.lights.length() {
      nearest.insert(i, lamp)
      if nearest.length() > self.lights.length() {
        nearest.pop() |> ignore
      }
    }
  }
  for i, n in self.lights {
    if i < nearest.length() {
      let lamp = nearest[i]
      n.position.copy(lamp.position) |> ignore
      n.update_matrix()
      n.as_light().color.set_hex(lamp.tint) |> ignore
      n.as_light().intensity = 84 *
        @sim.clamp((32 - lamp.position.distance_to(self.previous)) / 10, 0, 1)
    } else {
      n.as_light().intensity = 0
    }
  }
}

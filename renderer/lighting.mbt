///|
priv struct WorkLamp {
  position : @m3.Vector3
  tint : Int32
  bounce : @m3.Color
  intensity : Double
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
  basin : @core.Texture
  exposure : @core.Uniform
  cloud_tint : @m3.Color
  sunset_tint : @m3.Color
  mut roof : Double
  mut depth : Double
}

///|
fn CityLights::new(nodes : Map[String, @core.Object3D]) -> CityLights {
  let anchors = []
  for binding, node in nodes {
    if binding.has_prefix("lighting/lamp/") {
      let tint = if binding.has_prefix("lighting/lamp/furnace/") {
        0xff9c55
      } else if binding.has_prefix("lighting/lamp/optics/") {
        0xb7ddff
      } else {
        0xffddb0
      }
      let bounce = if binding.has_prefix("lighting/lamp/furnace/") {
        0xffbd94
      } else if binding.has_prefix("lighting/lamp/circulation/") {
        0xa9cecb
      } else if binding.has_prefix("lighting/lamp/optics/") {
        0xbdcfec
      } else if binding.has_prefix("lighting/lamp/garden/") {
        0xd7e6cc
      } else {
        0xf0debd
      }
      anchors.push({
        position: node.position,
        tint,
        bounce: @m3.Color::from_hex(bounce),
        intensity: scene_field(node.user_data, "lampIntensity").unwrap_or(135),
      })
    }
  }
  let lights = []
  for i in 0..<3 {
    if nodes.get("world/presentation/localLights/slots/\{i}/light")
      is Some(light) {
      lights.push(light)
    }
  }
  let exposure = @core.Uniform::new(Number(0))
  let sky = nodes.get("city/sky")
  let basin = @loaders.TextureLoader::new().load("art/signal-basin.jpg")
  basin.color_space = @m3.SRGBColorSpace
  basin.wrap_s = @core.RepeatWrapping
  signal_sky(sky, exposure, basin)
  {
    basin,
    exposure,
    cloud_tint: @m3.Color::from_hex(0xffd8b6),
    sunset_tint: @m3.Color::from_hex(0xffba77),
    roof: -1,
    key: nodes.get("lighting/key"),
    target: nodes.get("lighting/target"),
    ambient: nodes.get("lighting/fill"),
    hemisphere: nodes.get("lighting/skyFill"),
    sky,
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
  let roof = signal_exposure(p)
  if self.depth != depth || self.roof != roof {
    self.roof = roof
    self.exposure.value = Number(roof)
    self.depth = depth
    if self.ambient is Some(n) {
      n.as_light().intensity = 0.62 - 0.12 * depth - 0.19 * roof
    }
    if self.hemisphere is Some(n) {
      n.as_light().intensity = 1.48 - 0.64 * depth + 0.52 * roof
      n.as_light().color.set_hex(0xc4d4df).lerp(self.cloud_tint, roof) |> ignore
    }
    if self.key is Some(n) {
      n.as_light().intensity = 2.48 - 1.32 * depth + 0.55 * roof
      n.as_light().color.set_hex(0xffd5a4).lerp(self.sunset_tint, roof)
      |> ignore
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
    if scene.as_scene().background is Some(Color(background)) {
      background.set_hex(0xb2bfb7).multiply_scalar(1 - 0.968 * exterior)
      |> ignore
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
    if roof == 0 {
      n.position.set(p.x - 31, p.y + 42, p.z + 23) |> ignore
    } else {
      let bearing = -0.932 + roof * (SignalSunBearing - 2 * @math.PI + 0.932)
      let reach = 38.6 + roof * 13
      n.position.set(
        p.x + @math.sin(bearing) * reach,
        p.y + 42 - roof * 36.55,
        p.z + @math.cos(bearing) * reach,
      )
      |> ignore
    }
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
  if self.ambient is Some(fill) {
    let bounce = fill.as_light().color
    bounce.set_hex(0xe2e8ec) |> ignore
    for i = nearest.length() - 1; i >= 0; i = i - 1 {
      let lamp = nearest[i]
      let weight = 0.52 * (1 - lamp.position.distance_to(self.previous) / 32)
      bounce.lerp(lamp.bounce, weight) |> ignore
    }
  }
  for i, n in self.lights {
    if i < nearest.length() {
      let lamp = nearest[i]
      n.position.copy(lamp.position) |> ignore
      n.update_matrix()
      n.as_light().color.set_hex(lamp.tint) |> ignore
      n.as_light().intensity = lamp.intensity *
        @sim.clamp((32 - lamp.position.distance_to(self.previous)) / 10, 0, 1)
    } else {
      n.as_light().intensity = 0
    }
  }
}

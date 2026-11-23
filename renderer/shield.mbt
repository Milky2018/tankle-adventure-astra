///|
priv struct ShieldMount {
  parent : @core.Object3D
  position : @m3.Vector3
  scale : @m3.Vector3
  orientation : @m3.Quaternion
  mut release : ShieldFlight?
}

///|
priv struct ShieldFlight {
  start : Double
  origin : @sim.Vec3
  landing : @sim.Vec3
  rotation : @m3.Quaternion
}

///|
fn ShieldMount::new(plate : @core.Object3D) -> ShieldMount {
  {
    parent: plate.parent.unwrap(),
    position: plate.position.clone(),
    scale: plate.scale.clone(),
    orientation: plate.quaternion.clone(),
    release: None,
  }
}

///|
fn ShieldMount::update(
  self : ShieldMount,
  plate : @core.Object3D,
  scene : @core.Object3D,
  game : @sim.Game,
  e : @sim.Enemy,
) -> Unit {
  if !e.shield_removed {
    if self.release is Some(_) {
      self.parent.add(plate) |> ignore
      plate.scale.copy(self.scale) |> ignore
      self.release = None
    }
    plate.visible = true
    plate.position
    .copy(self.position)
    .set_z(self.position.z + 0.9 * e.shield_pull)
    |> ignore
    plate.quaternion.copy(self.orientation) |> ignore
    plate.rotate_z(0.13 * e.shield_pull * @math.sin(game.time * 33)) |> ignore
    return
  }
  let flight = match self.release {
    Some(f) => f
    None => {
      scene.attach(plate) |> ignore
      let origin = point(plate.position)
      let pull = game.player.position().sub(origin)
      let distance = Double::max(
        0.01,
        @sim.Vec2::{ x: pull.x, z: pull.z, }.length(),
      )
      let x = origin.x + 2.4 * pull.x / distance
      let z = origin.z + 2.4 * pull.z / distance
      let floor = game.world
        .support(x, z, e.y, false)
        .map(fn(s) { s.height })
        .unwrap_or(e.y)
      let f : ShieldFlight = {
        start: game.time,
        origin,
        landing: { x, y: floor + 0.22, z, },
        rotation: plate.quaternion.clone(),
      }
      self.release = Some(f)
      f
    }
  }
  let t = @sim.clamp((game.time - flight.start) / 0.68, 0, 1)
  let p = flight.origin.lerp(flight.landing, t)
  plate.position.set(p.x, p.y + 4 * t * (1 - t) * 1.1, p.z) |> ignore
  plate.quaternion.copy(flight.rotation) |> ignore
  plate.rotate_x(t * 1.48) |> ignore
  plate.rotate_z(0.45 * t) |> ignore
  plate.update_matrix_world(force=true)
}

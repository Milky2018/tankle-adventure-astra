///|
priv struct HullColor {
  material : @core.Material
  color : @m3.Color
  opacity : Double
  transparent : Bool
  depth : Bool
}

///|
priv struct PlayerVisual {
  smoke : @core.Object3D?
  turret_y : Double
  floats : @core.Object3D?
  arms : Array[@core.Object3D?]
  wheels : Array[@core.Object3D]
  radiator : @core.Object3D?
  exhaust : @core.Object3D?
  materials : Array[HullColor]
  mut speed : Double
  mut pitch : Double
  mut position : @sim.Vec3
}

///|
fn PlayerVisual::new(nodes : Map[String, @core.Object3D]) -> PlayerVisual {
  let wheels : Array[@core.Object3D] = []
  for i in 0..<12 {
    if nodes.get("player/tracks/\{i}") is Some(wheel) {
      wheel.matrix_auto_update = true
      wheels.push(wheel)
    }
  }
  let materials : Array[HullColor] = []
  let seen : Set[String] = Set([])
  nodes
  .get("player/root")
  .unwrap()
  .traverse(fn(node) {
    if node.kind is Mesh(mesh) {
      for material in mesh_materials(mesh.material) {
        if !seen.contains(material.uuid) {
          seen.add(material.uuid) |> ignore
          materials.push({
            material,
            color: material.color.unwrap().clone(),
            opacity: material.opacity,
            transparent: material.transparent,
            depth: material.depth_write,
          })
        }
      }
    }
  })
  {
    smoke: nodes.get("player-death-smoke"),
    turret_y: nodes.get("player/turret").unwrap().position.y,
    floats: nodes.get("player/floats"),
    arms: Array::makei(2, fn(i) { nodes.get("player/float-arms/\{i}") }),
    wheels,
    radiator: nodes.get("player/radiator"),
    exhaust: nodes.get("phoenix-exhaust"),
    materials,
    speed: 0,
    pitch: 0,
    position: { x: 0, y: -8, z: 86, },
  }
}

///|
pub fn View::update_player(self : View, game : @sim.Game, dt : Double) -> Unit {
  let v = self.player_visual
  let p = game.player
  let travel = @sim.Vec2::{ x: p.x - v.position.x, z: p.z - v.position.z, }.length()
  for wheel in v.wheels {
    if travel < 5 {
      wheel.rotate_y(-travel * 2.4) |> ignore
    }
  }
  if dt > 0 && travel < 5 {
    let forward = (p.x - v.position.x) * @math.sin(p.heading) +
      (p.z - v.position.z) * @math.cos(p.heading)
    let speed = damp(v.speed, forward / dt, 12, dt)
    let acceleration = (speed - v.speed) / dt
    v.pitch = damp(
      v.pitch,
      @sim.clamp(-acceleration * 0.0028, -0.095, 0.095),
      13,
      dt,
    )
    v.speed = speed
  } else {
    v.speed = 0
    v.pitch = 0
  }
  v.position = p.position()
  if v.floats is Some(floats) {
    floats.visible = p.deployed
    floats.matrix_auto_update = true
    floats.position.set_y(
      if travel > 0.001 {
        @math.sin(game.time * 4) * 0.025
      } else {
        0
      },
    )
    |> ignore
  }
  for i, arm in v.arms {
    if arm is Some(arm) {
      arm.matrix_auto_update = true
      let side = if i == 0 { -1.0 } else { 1.0 }
      arm.position.set_x(
        damp(
          arm.position.x,
          side * (if p.deployed { 1.65 } else { 1.25 }),
          8,
          dt,
        ),
      )
      |> ignore
      arm.rotation.set(0, 0, @math.sin(game.time * 3 + side) * 0.015) |> ignore
    }
  }
  if v.exhaust is Some(exhaust) {
    exhaust.visible = p.hp > 0 && p.phoenix_ready() && p.ending_time == 0
    exhaust.matrix_auto_update = true
    exhaust.scale.set(1, 1, 0.85 + @math.sin(game.time * 50) * 0.15) |> ignore
  }
  let tint = @m3.Color::from_hex(
    if p.ending_time > 0 {
      0xe99955
    } else if p.hp <= 0 {
      0x24302e
    } else {
      0xd75043
    },
  )
  let factor = if p.ending_time > 0 {
    Double::min(0.55, p.ending_time * 0.08)
  } else if p.hp <= 0 {
    0.8
  } else if p.red_contact() {
    0.75
  } else {
    0.0
  }
  let fade = p.hit_opacity(game.time)
  for entry in v.materials {
    entry.material.color.unwrap().copy(entry.color).lerp(tint, factor) |> ignore
    entry.material.opacity = entry.opacity * fade
    entry.material.transparent = entry.transparent || fade < 1
    entry.material.depth_write = entry.depth && fade == 1
  }
  if v.radiator is Some(radiator) {
    color(
      radiator,
      if p.hp <= 0 {
        0x24302e
      } else if p.overheated {
        0xd75043
      } else {
        0xf07941
      },
    )
  }
  let age = game.death_at.map(fn(at) { game.time - at }).unwrap_or(0)
  let settle = smooth(0, 0.65, age)
  self.body.rotation.set(0, p.heading, settle * 0.09) |> ignore
  self.body.rotate_x(v.pitch) |> ignore
  let shot_age = game.time - p.last_shot
  let recoil = if shot_age >= 0 && shot_age < 0.22 {
    0.36 * (1 - smooth(0, 0.22, shot_age))
  } else {
    0
  }
  self.barrel.position.set_z(-recoil) |> ignore
  self.turret.position.set_y(v.turret_y - settle * 0.4) |> ignore
  self.turret.rotation.set(
    self.turret.rotation.x,
    self.turret.rotation.y,
    -settle * 0.16,
  )
  |> ignore
  if v.smoke is Some(smoke) {
    smoke.visible = p.hp <= 0
    for i, puff in smoke.children {
      let t = age - i.to_double() * 0.15
      puff.visible = p.hp <= 0 && t >= 0 && t < 2
      puff.matrix_auto_update = true
      puff.position.set(
        p.x + @math.sin(i.to_double() * 2.4) * (0.2 + t * 0.4),
        p.y + 1.3 + t * 1.8,
        p.z - 0.35 + @math.cos(i.to_double() * 2.4) * t * 0.4,
      )
      |> ignore
      let scale = Double::max(0.01, 0.2 + t * 0.65)
      puff.scale.set(scale, scale, scale) |> ignore
      if puff.kind is Mesh(mesh) {
        for m in mesh_materials(mesh.material) {
          m.opacity = Double::max(0, Double::min(1, t * 5) * (1 - t / 2) * 0.5)
        }
      }
    }
  }
  self.root.update_matrix_world(force=true)
}

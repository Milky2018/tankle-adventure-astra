///|
priv struct HullColor {
  material : @three.Material
  color : @three.Color
  opacity : Double
  transparent : Bool
  depth : Bool
}

///|
priv struct PlayerVisual {
  smoke : @three.Object3D?
  turret_y : Double
  floats : @three.Object3D?
  arms : Array[@three.Object3D?]
  wheels : Array[@three.Object3D]
  radiator : @three.Object3D?
  exhaust : @three.Object3D?
  materials : Array[HullColor]
  mut position : @sim.Vec3
}

///|
extern "js" fn material_color(material : @three.Material) -> @three.Color =
  #| material => material.color

///|
fn PlayerVisual::new(nodes : Map[String, @three.Object3D]) -> PlayerVisual {
  let wheels : Array[@three.Object3D] = []
  for i in 0..<12 {
    if nodes.get("player/tracks/\{i}") is Some(wheel) {
      wheel.set_matrix_auto_update(true)
      wheels.push(wheel)
    }
  }
  let materials : Array[HullColor] = []
  let seen : Set[String] = Set([])
  nodes
  .get("player/root")
  .unwrap()
  .traverse(fn(node) {
    if node.as_mesh() is Some(mesh) {
      for material in mesh.materials() {
        if !seen.contains(material.uuid()) {
          seen.add(material.uuid()) |> ignore
          materials.push({
            material,
            color: material_color(material).clone(),
            opacity: material.opacity(),
            transparent: material.transparent(),
            depth: material.depth_write(),
          })
        }
      }
    }
  })
  {
    smoke: nodes.get("player-death-smoke"),
    turret_y: nodes.get("player/turret").unwrap().position().y(),
    floats: nodes.get("player/floats"),
    arms: Array::makei(2, fn(i) { nodes.get("player/float-arms/\{i}") }),
    wheels,
    radiator: nodes.get("player/radiator"),
    exhaust: nodes.get("phoenix-exhaust"),
    materials,
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
  v.position = p.position()
  if v.floats is Some(floats) {
    floats.set_visible(p.deployed)
    floats.set_matrix_auto_update(true)
    floats
    .position()
    .set_y(if travel > 0.001 { @math.sin(game.time * 4) * 0.025 } else { 0 })
    |> ignore
  }
  for i, arm in v.arms {
    if arm is Some(arm) {
      arm.set_matrix_auto_update(true)
      let side = if i == 0 { -1.0 } else { 1.0 }
      arm
      .position()
      .set_x(
        damp(
          arm.position().x(),
          side * (if p.deployed { 1.65 } else { 1.25 }),
          8,
          dt,
        ),
      )
      |> ignore
      arm.set_rotation_xyz(0, 0, @math.sin(game.time * 3 + side) * 0.015)
    }
  }
  if v.exhaust is Some(exhaust) {
    exhaust.set_visible(p.hp > 0 && p.phoenix_ready() && p.ending_time == 0)
    exhaust.set_matrix_auto_update(true)
    exhaust.set_scale_xyz(1, 1, 0.85 + @math.sin(game.time * 50) * 0.15)
  }
  let tint = @three.Color::from_hex(
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
    material_color(entry.material).copy(entry.color).lerp(tint, factor)
    |> ignore
    entry.material.set_opacity(entry.opacity * fade)
    entry.material.set_transparent(entry.transparent || fade < 1)
    entry.material.set_depth_write(entry.depth && fade == 1)
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
  self.body.set_rotation_xyz(0, p.heading, settle * 0.09)
  self.turret.position().set_y(v.turret_y - settle * 0.4) |> ignore
  self.turret.set_rotation_xyz(
    self.turret.rotation().x(),
    self.turret.rotation().y(),
    -settle * 0.16,
  )
  if v.smoke is Some(smoke) {
    smoke.set_visible(p.hp <= 0)
    for i, puff in smoke.children() {
      let t = age - i.to_double() * 0.15
      puff.set_visible(p.hp <= 0 && t >= 0 && t < 2)
      puff.set_matrix_auto_update(true)
      puff.set_position_xyz(
        p.x + @math.sin(i.to_double() * 2.4) * (0.2 + t * 0.4),
        p.y + 1.3 + t * 1.8,
        p.z - 0.35 + @math.cos(i.to_double() * 2.4) * t * 0.4,
      )
      let scale = Double::max(0.01, 0.2 + t * 0.65)
      puff.set_scale_xyz(scale, scale, scale)
      if puff.as_mesh() is Some(mesh) {
        for m in mesh.materials() {
          m.set_opacity(
            Double::max(0, Double::min(1, t * 5) * (1 - t / 2) * 0.5),
          )
        }
      }
    }
  }
  self.root.update_matrix_world(true)
}

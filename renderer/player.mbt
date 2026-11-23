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
  equipment : CrawlerEquipment
  smoke : @core.Object3D?
  turret_y : Double
  floats : @core.Object3D?
  arms : Array[@core.Object3D?]
  wheels : Array[@core.Object3D]
  radiator : @core.Object3D?
  exhaust : @core.Object3D?
  fill_strength : @core.Uniform
  materials : Array[HullColor]
  mut speed : Double
  mut pitch : Double
  mut position : @sim.Vec3
}

///|
// Work in view space so turning the camera still reveals the turret profile.
// Limit the fill by the light already reaching the paint. Unlit lenses keep
// their authored colour and the underside receives no fill.
let hull_fill_fragment : String =
  #| float facing = max(dot(normal, vec3(-0.54, 0.64, 0.55)), 0.0);
  #| const vec3 luma = vec3(0.2126, 0.7152, 0.0722);
  #| float paint = max(dot(diffuseColor.rgb, luma), 0.001);
  #| float exposure = dot(outgoingLight, luma) / paint;
  #| float shadow = 1.0 - smoothstep(0.18, 0.95, exposure);
  #| outgoingLight += diffuseColor.rgb * vec3(0.90, 0.96, 1.0) * (0.32 * facing * shadow * hullFill);
  #| #include <opaque_fragment>

///|
fn PlayerVisual::new(nodes : Map[String, @core.Object3D]) -> PlayerVisual {
  let wheels : Array[@core.Object3D] = []
  for i in 0..<8 {
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
    equipment: CrawlerEquipment::new(nodes),
    smoke: nodes.get("player-death-smoke"),
    turret_y: nodes.get("player/turret").unwrap().position.y,
    floats: nodes.get("player/floats"),
    arms: Array::makei(2, fn(i) { nodes.get("player/float-arms/\{i}") }),
    wheels,
    radiator: nodes.get("player/radiator"),
    exhaust: nodes.get("phoenix-exhaust"),
    fill_strength: @core.Uniform::new(Number(1)),
    materials,
    speed: 0,
    pitch: 0,
    position: { x: 0, y: -8, z: 86, },
  }
}

///|
fn View::update_player(self : View, game : @sim.Game, dt : Double) -> Unit {
  let v = self.player_visual
  let p = game.player
  v.equipment.update(game, dt)
  let travel = @sim.Vec2::{ x: p.x - v.position.x, z: p.z - v.position.z, }.length()
  if dt > 0 && travel < 5 {
    let forward = (p.x - v.position.x) * @math.sin(p.heading) +
      (p.z - v.position.z) * @math.cos(p.heading)
    if !p.afloat {
      for wheel in v.wheels {
        wheel.rotate_x(forward / 0.32) |> ignore
      }
    }
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
  self.cutaway.wake_speed.value = Number(if p.afloat { v.speed } else { 0 })
  for (current, velocity) in self.cutaway.currents {
    let flow = current.flow(game.progress)
    velocity.set(flow.x, flow.z, current.y) |> ignore
  }
  if v.floats is Some(floats) {
    floats.visible = p.abilities.flotation
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
    if p.abilities.flotation && arm is Some(arm) {
      arm.matrix_auto_update = true
      let side = if i == 0 { -1.0 } else { 1.0 }
      arm.position.set_x(
        damp(
          arm.position.x,
          side * (if p.deployed { 2.04 } else { 1.72 }),
          8,
          dt,
        ),
      )
      |> ignore
      arm.position.set_y(
        damp(arm.position.y, if p.deployed { 0.18 } else { 1.18 }, 8, dt),
      )
      |> ignore
      arm.rotation.set(
        0,
        0,
        damp(arm.rotation.z, if p.deployed { 0 } else { -side * 1.32 }, 8, dt),
      )
      |> ignore
    }
  }
  if v.exhaust is Some(exhaust) {
    exhaust.visible = p.hp > 0 && p.phoenix_ready() && p.ending_time == 0
    exhaust.matrix_auto_update = true
    let pulse = 0.9 + @math.sin(game.time * 50) * 0.1
    for jet in exhaust.children {
      jet.scale.set_z(pulse * 3.0) |> ignore
    }
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
  v.fill_strength.value = Number(
    if p.hp <= 0 || p.ending_time > 0 || p.red_contact() {
      0
    } else {
      1
    },
  )
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

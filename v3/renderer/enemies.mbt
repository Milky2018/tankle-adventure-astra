///|
priv struct EnemyVisual {
  root : @three.Object3D
  body : @three.Object3D
  turret : @three.Object3D
  warning : @three.Object3D?
  charge : @three.Object3D?
  zone : @three.Object3D?
  armor : @three.Object3D?
  wake : @three.Object3D?
  arm : @three.Object3D?
  radiator : @three.Object3D?
  part_shutters : Array[@three.Object3D?]
  part_lamps : Array[@three.Object3D?]
  core_lamp : @three.Object3D?
  core_shutters : Array[@three.Object3D?]
  scale : @three.Vector3
}

///|
extern "js" fn line_points(
  line : @three.Object3D,
  points : FixedArray[@three.Vector3],
) -> Unit =
  #| (line,points) => { line.geometry.setFromPoints(points); line.geometry.setDrawRange(0,points.length); line.geometry.computeBoundingSphere(); }

///|
fn enemy_visuals(
  nodes : Map[String, @three.Object3D],
  game : @sim.Game,
) -> Array[EnemyVisual] {
  let visuals : Array[EnemyVisual] = []
  for enemy in game.enemies {
    let prefix = "enemies/\{enemy.definition.id}"
    let root = nodes.get(prefix + "/model/root").unwrap()
    fn get(suffix : String) -> @three.Object3D? {
      let node = nodes.get(prefix + suffix)
      if node is Some(node) {
        node.set_matrix_auto_update(true)
      }
      node
    }
    let visual = {
      root,
      body: get("/model/body").unwrap(),
      turret: get("/model/turret").unwrap(),
      warning: get("/warning"),
      charge: get("/charge/root"),
      zone: get("/zone"),
      armor: get("/model/frontArmor"),
      wake: get("/model/wake"),
      arm: get("/model/arm"),
      radiator: get("/model/radiator"),
      part_shutters: Array::makei(2, fn(j) { get("/parts/\{j}/shutter") }),
      part_lamps: Array::makei(2, fn(j) { get("/parts/\{j}/lamp") }),
      core_lamp: get("/coreModel/lamp"),
      core_shutters: Array::makei(2, fn(j) { get("/coreModel/shutters/\{j}") }),
      scale: root.scale().clone(),
    }
    for
      node in [
        Some(root),
        Some(visual.body),
        Some(visual.turret),
        visual.charge,
        visual.zone,
        visual.armor,
        visual.arm,
      ] {
      if node is Some(object) {
        object.set_matrix_auto_update(true)
      }
    }
    visuals.push(visual)
  }
  visuals
}

///|
pub fn View::update_enemies(self : View, game : @sim.Game, dt : Double) -> Unit {
  for i, v in self.enemies {
    let e = game.enemies[i]
    let alive = e.hp > 0
    v.root.set_visible(
      alive || (e.dead_at is Some(_) && e.definition.reserve_for is None),
    )
    let collapse = e.dead_at
      .map(fn(t) { @sim.clamp((game.time - t) / 0.45, 0, 1) })
      .unwrap_or(0)
    v.root.set_scale_xyz(
      v.scale.x(),
      v.scale.y() * (1 - collapse * 0.7),
      v.scale.z(),
    )
    v.root.set_rotation_xyz(0, 0, collapse * 0.12)
    let deploy = if e.deploy_until > 0 {
      1.8 * Double::max(0, (e.deploy_until - game.time) / 2)
    } else {
      0.0
    }
    v.root.set_position_xyz(
      e.x,
      e.y -
      deploy +
      (if e.afloat { @math.sin(game.time * 2.7 + e.x) * 0.055 } else { 0.0 }),
      e.z,
    )
    v.body.set_rotation_xyz(
      0,
      if e.definition.kind == @sim.Hunter {
        e.travel_heading.unwrap_or(e.aim)
      } else {
        e.aim
      },
      0,
    )
    v.turret.set_rotation_xyz(0, e.aim, 0)
    if v.armor is Some(armor) {
      armor.set_visible(!e.shield_removed)
      if e.definition.magnetic_shield {
        armor
        .position()
        .set_z(
          (if e.definition.kind == @sim.Dredger { 1.85 } else { 1.05 }) +
          e.shield_pull * 0.9,
        )
        |> ignore
      }
    }
    if e.definition.id == "prototype" && v.armor is Some(armor) {
      armor
      .position()
      .set_y(
        damp(
          armor.position().y(),
          if e.phase == @sim.Vent {
            2.7
          } else {
            1.2
          },
          12,
          dt,
        ),
      )
      |> ignore
    }
    for j, part in e.parts {
      if j < 2 {
        if v.part_shutters[j] is Some(shutter) {
          shutter
          .position()
          .set_y(
            damp(
              shutter.position().y(),
              if e.phase == @sim.Vent {
                3.2
              } else {
                1.7
              },
              10,
              dt,
            ),
          )
          |> ignore
        }
        if v.part_lamps[j] is Some(lamp) {
          color(lamp, if part.hp > 0 { 0xf07941 } else { 0x243e39 })
        }
      }
    }
    let core_open = e.hp > 0 &&
      e.parts.all(fn(p) { p.hp <= 0 }) &&
      (e.definition.id != "foundry" || e.phase == @sim.Vent)
    if v.core_lamp is Some(lamp) {
      color(lamp, if core_open { 0xf07941 } else { 0x243e39 })
    }
    for j, node in v.core_shutters {
      if node is Some(node) {
        node
        .position()
        .set_x(
          damp(
            node.position().x(),
            (if j == 0 { -1.0 } else { 1.0 }) *
            (if core_open { 1 } else { 0.325 }),
            10,
            dt,
          ),
        )
        |> ignore
      }
    }
    if v.wake is Some(wake) {
      wake.set_visible(e.afloat)
    }
    if v.warning is Some(warning) {
      warning.set_visible(
        alive && (e.phase == @sim.Warn || e.phase == @sim.RailShot),
      )
      if e.phase == @sim.Warn {
        line_points(warning, [
          vector(e.position().add({ x: 0, y: 1.5, z: 0, })),
          vector(e.lock),
        ])
      }
      if e.phase == @sim.RailShot {
        line_points(warning, [
          vector(e.position().add({ x: 0, y: 1.5, z: 0, })),
          vector(e.rail_end),
        ])
      }
    }
    if v.charge is Some(charge) {
      charge.set_visible(
        alive && e.phase == @sim.Warn && e.attack != Some(@sim.CannonAttack),
      )
      charge.set_position_xyz(e.x, e.y, e.z)
      charge.set_rotation_xyz(0, e.aim, 0)
      charge.update_matrix_world(true)
    }
    if v.zone is Some(zone) {
      zone.set_visible(
        alive && e.definition.kind == @sim.Artillery && e.phase == @sim.Warn,
      )
      zone.set_position_xyz(e.lock.x, e.lock.y + 0.1, e.lock.z)
      zone.update_matrix_world(true)
    }
    if v.arm is Some(arm) {
      if e.phase == @sim.Warn || e.phase == @sim.Sweep {
        arm.set_rotation_xyz(
          0,
          if e.phase == @sim.Warn {
            -0.9
          } else {
            -0.9 + 1.8 * (1 - e.timer / 1.8)
          },
          0,
        )
      }
      if e.phase == @sim.Vent {
        arm
        .scale()
        .set_z(
          arm.scale().z() + (0.28 - arm.scale().z()) * (1 - @math.exp(-6 * dt)),
        )
        |> ignore
      } else {
        arm.scale().set_z(1) |> ignore
      }
    }
    if v.radiator is Some(radiator) && radiator.as_mesh() is Some(mesh) {
      for material in mesh.materials() {
        if material.as_basic_material() is Some(basic) {
          basic
          .color()
          .set_hex(
            if e.phase == @sim.Warn {
              0xffda73
            } else if e.phase == @sim.Vent {
              0xf07941
            } else {
              0xff5837
            },
          )
          |> ignore
        }
      }
    }
    v.root.update_matrix_world(true)
  }
}

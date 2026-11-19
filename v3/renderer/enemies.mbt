///|
priv struct EnemyVisual {
  root : @core.Object3D
  body : @core.Object3D
  turret : @core.Object3D
  warning : @core.Object3D?
  charge : @core.Object3D?
  zone : @core.Object3D?
  armor : @core.Object3D?
  wake : @core.Object3D?
  arm : @core.Object3D?
  radiator : @core.Object3D?
  part_shutters : Array[@core.Object3D?]
  part_lamps : Array[@core.Object3D?]
  core_lamp : @core.Object3D?
  core_shutters : Array[@core.Object3D?]
  scale : @m3.Vector3
}

///|
fn line_points(line : @core.Object3D, points : Array[@m3.Vector3]) -> Unit {
  let geometry = line.get_geometry().unwrap()
  geometry.set_from_points(points) |> ignore
  geometry.set_draw_range(0, points.length().to_double())
  geometry.compute_bounding_sphere()
}

///|
fn enemy_visuals(
  nodes : Map[String, @core.Object3D],
  game : @sim.Game,
) -> Array[EnemyVisual] {
  let visuals : Array[EnemyVisual] = []
  for enemy in game.enemies {
    let prefix = "enemies/\{enemy.definition.id}"
    let root = nodes.get(prefix + "/model/root").unwrap()
    fn get(suffix : String) -> @core.Object3D? {
      let node = nodes.get(prefix + suffix)
      if node is Some(node) {
        node.matrix_auto_update = true
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
      scale: root.scale.clone(),
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
        object.matrix_auto_update = true
      }
    }
    visuals.push(visual)
  }
  visuals
}

///|
fn View::update_enemies(self : View, game : @sim.Game, dt : Double) -> Unit {
  for i, v in self.enemies {
    let e = game.enemies[i]
    let alive = e.hp > 0
    v.root.visible = alive ||
      (e.dead_at is Some(_) && e.definition.reserve_for is None)
    let collapse = e.dead_at
      .map(fn(t) { @sim.clamp((game.time - t) / 0.45, 0, 1) })
      .unwrap_or(0)
    v.root.scale.set(v.scale.x, v.scale.y * (1 - collapse * 0.7), v.scale.z)
    |> ignore
    v.root.rotation.set(0, 0, collapse * 0.12) |> ignore
    let deploy = if e.deploy_until > 0 {
      1.8 * Double::max(0, (e.deploy_until - game.time) / 2)
    } else {
      0.0
    }
    v.root.position.set(
      e.x,
      e.y -
      deploy +
      (if e.afloat { @math.sin(game.time * 2.7 + e.x) * 0.055 } else { 0.0 }),
      e.z,
    )
    |> ignore
    v.body.rotation.set(
      0,
      if e.definition.kind == @sim.Hunter {
        e.travel_heading.unwrap_or(e.aim)
      } else {
        e.aim
      },
      0,
    )
    |> ignore
    if e.flash > 0 && e.armor <= 0 {
      v.body.rotate_x(-0.10 * @sim.clamp(e.flash / 0.14, 0, 1)) |> ignore
    }
    v.turret.rotation.set(0, e.aim, 0) |> ignore
    if v.armor is Some(armor) {
      armor.visible = !e.shield_removed
      if e.definition.magnetic_shield {
        armor.position.set_z(
          (if e.definition.kind == @sim.Dredger { 1.85 } else { 1.05 }) +
          e.shield_pull * 0.9,
        )
        |> ignore
      }
    }
    if e.definition.kind == @sim.Prototype && v.armor is Some(armor) {
      armor.position.set_y(
        damp(
          armor.position.y,
          if e.phase.is_venting() {
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
          shutter.position.set_y(
            damp(
              shutter.position.y,
              if e.phase.is_venting() {
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
      (e.definition.kind != @sim.Overseer || e.phase.is_venting())
    if v.core_lamp is Some(lamp) {
      color(lamp, if core_open { 0xf07941 } else { 0x243e39 })
    }
    for j, node in v.core_shutters {
      if node is Some(node) {
        node.position.set_x(
          damp(
            node.position.x,
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
      wake.visible = e.afloat
    }
    if v.warning is Some(warning) {
      warning.visible = alive &&
        (e.phase.is_warning() || e.phase is @sim.RailShot(_))
      if e.phase.is_warning() {
        line_points(warning, [
          vector(e.position().add({ x: 0, y: 1.5, z: 0, })),
          vector(e.lock),
        ])
      }
      if e.phase is @sim.RailShot(end) {
        line_points(warning, [
          vector(e.position().add({ x: 0, y: 1.5, z: 0, })),
          vector(end),
        ])
      }
    }
    if v.charge is Some(charge) {
      charge.visible = alive &&
        e.phase.is_warning() &&
        !(e.phase is @sim.Warn(Fire(CannonAttack)))
      charge.position.set(e.x, e.y, e.z) |> ignore
      charge.rotation.set(0, e.aim, 0) |> ignore
      charge.update_matrix_world(force=true)
    }
    if v.zone is Some(zone) {
      zone.visible = alive &&
        e.definition.kind is (@sim.Artillery | @sim.Siege) &&
        e.phase.is_warning()
      zone.position.set(e.lock.x, e.lock.y + 0.1, e.lock.z) |> ignore
      zone.update_matrix_world(force=true)
    }
    if v.arm is Some(arm) {
      if e.phase.is_warning() || e.phase is @sim.Sweep(_) {
        arm.rotation.set(
          0,
          if e.phase.is_warning() {
            -0.9
          } else {
            -0.9 + 1.8 * (1 - e.timer / 1.8)
          },
          0,
        )
        |> ignore
      }
      if e.phase.is_venting() {
        arm.scale.set_z(
          arm.scale.z + (0.28 - arm.scale.z) * (1 - @math.exp(-6 * dt)),
        )
        |> ignore
      } else {
        arm.scale.set_z(1) |> ignore
      }
    }
    if v.radiator is Some(radiator) && radiator.kind is Mesh(mesh) {
      for material in mesh_materials(mesh.material) {
        if material.material_type is MeshBasicMaterial &&
          material.color is Some(basic) {
          basic.set_hex(
            if e.phase.is_warning() {
              0xffda73
            } else if e.phase.is_venting() {
              0xf07941
            } else {
              0xff5837
            },
          )
          |> ignore
        }
      }
    }
    v.root.update_matrix_world(force=true)
  }
}

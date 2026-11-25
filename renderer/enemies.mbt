///|
priv struct EnemyVisual {
  root : @core.Object3D
  body : @core.Object3D
  turret : @core.Object3D
  launcher : @core.Object3D?
  part_guns : Array[@core.Object3D?]
  warning : @core.Object3D?
  charge : @core.Object3D?
  zone : @core.Object3D?
  armor : @core.Object3D?
  shield_mount : ShieldMount?
  wake : @core.Object3D?
  arm : @core.Object3D?
  radiator : @core.Object3D?
  part_shutters : Array[@core.Object3D?]
  part_lamps : Array[@core.Object3D?]
  core_lamp : @core.Object3D?
  core_shutters : Array[@core.Object3D?]
  hull_finish : @core.Material?
  shield_finish : @core.Material?
  mut wreck_settle : Double
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
    // Casings share geometry and textures, but each combatant owns its signal.
    let mut hull_finish : @core.Material? = None
    let mut shield_finish : @core.Material? = None
    fn prepare(part : @core.Object3D) {
      part.traverse(fn(node) {
        if node.kind is Mesh(mesh) &&
          mesh.material is Single(source) &&
          metadata_string(source.user_data, "surfaceFinish") == "enemyEnamel" {
          if enemy.definition.magnetic_shield &&
            scene_binding(node) == prefix + "/model/frontArmor" {
            let finish = source.clone()
            mesh.material = Single(finish)
            shield_finish = Some(finish)
          } else {
            let finish = match hull_finish {
              Some(m) => m
              None => {
                let m = source.clone()
                hull_finish = Some(m)
                m
              }
            }
            mesh.material = Single(finish)
          }
        }
      })
    }
    prepare(root)
    for j in 0..<enemy.parts.length() {
      if nodes.get(prefix + "/parts/\{j}/root") is Some(part) {
        prepare(part)
      }
    }
    let visual = {
      root,
      body: get("/model/body").unwrap(),
      turret: get("/model/turret").unwrap(),
      launcher: get("/model/launcher"),
      part_guns: Array::makei(enemy.parts.length(), fn(j) {
        get("/parts/\{j}/gun")
      }),
      warning: get("/warning"),
      charge: get("/charge/root"),
      zone: get("/zone"),
      armor: get("/model/frontArmor"),
      shield_mount: if enemy.definition.magnetic_shield {
        get("/model/frontArmor").map(ShieldMount::new)
      } else {
        None
      },
      wake: get("/model/wake"),
      arm: get("/model/arm"),
      radiator: get("/model/radiator"),
      part_shutters: Array::makei(2, fn(j) { get("/parts/\{j}/shutter") }),
      part_lamps: Array::makei(2, fn(j) { get("/parts/\{j}/lamp") }),
      core_lamp: get("/coreModel/lamp"),
      core_shutters: Array::makei(2, fn(j) { get("/coreModel/shutters/\{j}") }),
      hull_finish,
      shield_finish,
      wreck_settle: 0,
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
    let alive = e.on_field()
    let pulling = game.magnet_lock is Some(@sim.EnemyTarget(target, _)) &&
      target == i &&
      alive
    let impact = if alive {
      @sim.clamp(Double::max(e.flash / 0.14, e.armor / 0.2), 0, 1)
    } else {
      0.0
    }
    if v.hull_finish is Some(m) && m.emissive is Some(tint) {
      if impact > 0 {
        tint.set_hex(if e.armor > 0 { 0xff7b24 } else { 0xff5010 }) |> ignore
        m.emissive_intensity = Some(impact * 1.10)
      } else if pulling && e.magnet_pullable() {
        tint.set_hex(0x168cff) |> ignore
        m.emissive_intensity = Some(0.55 + 0.23 * @math.sin(game.time * 16))
      } else {
        m.emissive_intensity = Some(0)
      }
    }
    if v.shield_finish is Some(m) && m.emissive is Some(tint) {
      tint.set_hex(if impact > 0 { 0xff7421 } else { 0x1385ff }) |> ignore
      m.emissive_intensity = Some(
        if !alive {
          0
        } else if impact > 0 {
          impact * 0.90
        } else if pulling {
          0.64 + 0.24 * @math.sin(game.time * 16)
        } else {
          0.075
        },
      )
    }
    v.root.visible = alive || e.dead_at is Some(_)
    let collapse = e.dead_at
      .map(fn(t) { @sim.clamp((game.time - t) / 0.45, 0, 1) })
      .unwrap_or(0)
    let settle = collapse * (2 - collapse)
    let lean = if i % 2 == 0 { 1.0 } else { -1.0 }
    v.root.rotation.set(settle * 0.10, 0, lean * settle * 0.14) |> ignore
    if settle != v.wreck_settle {
      v.wreck_settle = settle
      for finish in [v.hull_finish, v.shield_finish] {
        if finish is Some(m) && m.color is Some(paint) {
          paint.set_rgb(1 - settle * 0.69, 1 - settle * 0.75, 1 - settle * 0.77)
          |> ignore
        }
      }
    }
    let base = e.model_position(game.time)
    v.root.position.set(base.x, base.y, base.z) |> ignore
    v.body.rotation.set(
      0,
      if e.definition.kind == Hunter {
        e.travel_heading.unwrap_or(e.aim)
      } else {
        e.aim
      },
      0,
    )
    |> ignore
    if impact > 0 && e.armor <= 0 {
      v.body.rotate_x(-0.10 * @sim.clamp(e.flash / 0.14, 0, 1)) |> ignore
    }
    let pose = e.weapon_pose
    v.turret.rotation.set(0, pose.map(fn(p) { p.yaw }).unwrap_or(e.aim), 0)
    |> ignore
    if v.launcher is Some(launcher) {
      launcher.rotation.set(-pose.map(fn(p) { p.tilt }).unwrap_or(0), 0, 0)
      |> ignore
    } else if pose is Some(p) {
      // The imported tool is modeled about the chassis origin. Pitch it about the bearing.
      let pivot = p.pivot_height / v.root.scale.y
      let shift = pivot * @math.sin(p.tilt)
      v.turret.position.set(
        shift * @math.sin(p.yaw),
        pivot * (1 - @math.cos(p.tilt)),
        shift * @math.cos(p.yaw),
      )
      |> ignore
      v.turret.rotate_x(-p.tilt) |> ignore
    } else {
      v.turret.position.set(0, 0, 0) |> ignore
    }
    if collapse > 0 {
      v.turret.rotate_z(lean * settle * 0.19) |> ignore
      v.turret.rotate_x(settle * 0.30) |> ignore
    }
    for j, gun in v.part_guns {
      if gun is Some(node) && e.parts[j].hp <= 0 {
        node.rotation.set(0, 0, 0.65) |> ignore
      } else if gun is Some(node) && e.parts[j].weapon_pose is Some(p) {
        node.rotation.set(0, p.yaw, 0) |> ignore
        node.rotate_x(-p.tilt) |> ignore
        node.update_matrix_world(force=true)
      }
    }
    if v.armor is Some(armor) && v.shield_mount is Some(mount) {
      mount.update(armor, self.scene, game, e)
    }
    if e.definition.kind == ScrapRam && v.armor is Some(armor) {
      armor.position.set_y(
        damp(
          armor.position.y,
          if e.drive_exposed() {
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
              if e.battery_exposed(j) {
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
          color(
            lamp,
            if !alive || part.hp <= 0 {
              0x243e39
            } else if e.battery_exposed(j) {
              0xffdf99
            } else {
              0x655f4b
            },
          )
        }
      }
    }
    let core_open = e.hp > 0 && e.parts.all(fn(p) { p.hp <= 0 })
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
      wake.visible = alive && e.afloat
    }
    if v.warning is Some(warning) {
      warning.visible = alive &&
        (e.phase.is_warning() || e.phase is @sim.RailShot(_))
      if e.phase.is_warning() {
        line_points(warning, [
          vector(
            pose
            .map(fn(p) { p.muzzle })
            .unwrap_or(e.position().add({ x: 0, y: 1.5, z: 0, })),
          ),
          vector(e.lock),
        ])
      }
      if e.phase is @sim.RailShot(end) {
        line_points(warning, [
          vector(
            pose
            .map(fn(p) { p.muzzle })
            .unwrap_or(e.position().add({ x: 0, y: 1.5, z: 0, })),
          ),
          vector(end),
        ])
      }
    }
    if v.charge is Some(charge) {
      charge.visible = alive &&
        e.phase.is_warning() &&
        (
          e.definition.kind != ScrapRam ||
          e.phase is @sim.Warn(Fire(ChargeAttack))
        ) &&
        e.definition.kind != Sorter
      charge.position.set(e.x, e.y, e.z) |> ignore
      charge.rotation.set(0, e.aim, 0) |> ignore
      charge.update_matrix_world(force=true)
    }
    if v.zone is Some(zone) {
      zone.visible = alive &&
        e.definition.kind is (Artillery | Siege) &&
        e.phase.is_warning()
      zone.position.set(e.lock.x, e.lock.y + 0.1, e.lock.z) |> ignore
      zone.update_matrix_world(force=true)
    }
    if v.arm is Some(arm) && e.definition.kind == Sorter {
      let (turn, extension) = e.arm_pose()
      v.turret.rotation.set(0, e.aim, 0) |> ignore
      arm.rotation.set(0, turn, 0) |> ignore
      arm.scale.set_z(extension) |> ignore
    }
    if v.radiator is Some(radiator) && radiator.kind is Mesh(mesh) {
      for material in mesh_materials(mesh.material) {
        if material.material_type is MeshBasicMaterial &&
          material.color is Some(basic) {
          basic.set_hex(
            if !alive {
              0x302d29
            } else if e.definition.kind is (ScrapRam | Sorter) {
              if e.drive_exposed() {
                0xffda73
              } else {
                0xe9964d
              }
            } else if e.definition.kind == Guardian {
              0xffc06b
            } else if e.phase.is_warning() {
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

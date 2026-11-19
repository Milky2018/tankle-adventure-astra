///|
priv struct Trail {
  root : @core.Object3D
  mut life : Double
  duration : Double
  size : Double
  mut velocity : @sim.Vec3
  stretch : Double
}

///|
priv struct Effects {
  beams : Array[@core.Object3D]
  mines : Map[Int32, @core.Object3D]
  bursts : Array[Trail]
  box : @core.BufferGeometry
  sphere : @core.BufferGeometry
  grit : @core.Material
  bright : @core.Material
  red : @core.Material
}

///|
fn Effects::new() -> Effects {
  {
    beams: [],
    mines: {},
    bursts: [],
    box: @geometries.BoxGeometry::new(),
    sphere: @geometries.SphereGeometry::new(
      radius=1,
      width_segments=10,
      height_segments=8,
    ),
    grit: basic_material(0xb99c76),
    bright: basic_material(0xffdc8b),
    red: basic_material(0xff6846),
  }
}

///|
fn View::update_effects(
  self : View,
  game : @sim.Game,
  aim : @sim.Vec3,
  queries : @sim.Queries,
  dt : Double,
) -> Unit {
  let effects = self.effects
  let mut count = 0
  fn beam(
    from : @sim.Vec3,
    to : @sim.Vec3,
    width : Double,
    hue : Int32,
  ) -> Unit {
    if count == effects.beams.length() {
      let mesh = @core.Mesh::new(
        geometry=effects.box,
        material=Single(basic_material(hue)),
      )
      self.scene.add(mesh) |> ignore
      effects.beams.push(mesh)
    }
    let mesh = effects.beams[count]
    count += 1
    color(mesh, hue)
    mesh.visible = true
    mesh.position.copy(vector(from.lerp(to, 0.5))) |> ignore
    mesh.scale.set(width, width, from.distance(to)) |> ignore
    mesh.look_at(vector(to))
    mesh.update_matrix_world(force=true)
  }
  for b in game.beams {
    beam(b.origin, b.origin.add(b.direction.scale(b.length)), b.width, 0xff6c42)
  }
  for b in game.laser_path {
    beam(
      b.from,
      b.to,
      if b.live {
        0.12
      } else {
        0.025
      },
      if b.live {
        0xffdf96
      } else {
        0x91c8bb
      },
    )
  }
  if game.magnet_end is Some(end) {
    beam(
      game.player.position().add({ x: 0, y: 2, z: 0, }),
      end,
      0.09,
      if game.player.overheated {
        0xff6846
      } else {
        0x86d5ef
      },
    )
  }
  if game.player.weapon == @sim.Mortar &&
    game.player.hp > 0 &&
    game.ending_at is None {
    let (points, hit, blocked) = game.predict_mortar(
      queries,
      self.weapon_origin(),
      aim,
    )
    let hue = if blocked { 0xffad62 } else { 0xffe4a9 }
    for i in 1..<points.length() {
      beam(points[i - 1], points[i], 0.035, hue)
    }
    if hit is Some(hit) {
      let center = game
        .ground_target(queries, hit.point.add({ x: 0, y: 0.15, z: 0, }))
        .add({ x: 0, y: 0.07, z: 0, })
      for i in 0..<24 {
        let a = i.to_double() * @math.PI / 12
        let b = a + @math.PI / 18
        beam(
          center.add({ x: @math.cos(a) * 3, y: 0, z: @math.sin(a) * 3, }),
          center.add({ x: @math.cos(b) * 3, y: 0, z: @math.sin(b) * 3, }),
          0.045,
          hue,
        )
      }
    }
  }
  for i in count..<effects.beams.length() {
    effects.beams[i].visible = false
  }
  let active : Set[Int32] = Set([])
  for m in game.mines {
    active.add(m.id) |> ignore
    let mesh = match effects.mines.get(m.id) {
      Some(mesh) => mesh
      None => {
        let mesh = @core.Mesh::new(
          geometry=effects.sphere,
          material=Single(effects.red),
        )
        self.scene.add(mesh) |> ignore
        effects.mines[m.id] = mesh
        mesh
      }
    }
    mesh.position.set(m.position.x, m.position.y + 0.3, m.position.z) |> ignore
    mesh.scale.set(0.6, 0.25, 0.6) |> ignore
    mesh.update_matrix_world(force=true)
  }
  let gone : Array[Int32] = []
  for id, mesh in effects.mines {
    if !active.contains(id) {
      mesh.remove_from_parent() |> ignore
      gone.push(id)
    }
  }
  for id in gone {
    effects.mines.remove(id)
  }
  fn fragments(
    origin : @sim.Vec3,
    direction : @sim.Vec3,
    sparks : Bool,
  ) -> Unit {
    for i in 0..<6 {
      let angle = i.to_double() * 2.4 + game.time * 3
      let spray = @sim.Vec3::{
        x: @math.cos(angle),
        y: 0.4 + @math.sin(angle * 1.7).abs(),
        z: @math.sin(angle),
      }
      let velocity = direction
        .scale(if sparks { 8 } else { 3 })
        .add(spray.scale(if sparks { 2.6 } else { 3.4 }))
      let mesh = @core.Mesh::new(
        geometry=effects.box,
        material=Single(if sparks { effects.bright } else { effects.grit }),
      )
      mesh.position.copy(vector(origin.add(direction.scale(0.07)))) |> ignore
      mesh.look_at(vector(origin.add(velocity)))
      let duration = 0.18 + 0.035 * i.to_double()
      self.scene.add(mesh) |> ignore
      effects.bursts.push({
        root: mesh,
        life: duration,
        duration,
        size: if sparks {
          0.10
        } else {
          0.21
        },
        velocity,
        stretch: if sparks {
          8
        } else {
          1.6
        },
      })
    }
  }
  for event in game.effects {
    match event {
      @sim.Chips(p, n) => fragments(p, n, false)
      @sim.Ricochet(p, direction) => fragments(p, direction, true)
      _ => ()
    }
    let position = match event {
      @sim.Impact(p, _) | @sim.Armored(p) => Some(p)
      @sim.Killed(i) =>
        Some(game.enemies[i].position().add({ x: 0, y: 1, z: 0, }))
      _ => None
    }
    if position is Some(p) {
      let mesh = @core.Mesh::new(
        geometry=effects.sphere,
        material=Single(effects.bright),
      )
      mesh.position.copy(vector(p)) |> ignore
      mesh.scale.set(0.1, 0.1, 0.1) |> ignore
      self.scene.add(mesh) |> ignore
      effects.bursts.push({
        root: mesh,
        velocity: { x: 0, y: 0, z: 0, },
        stretch: 1,
        life: 0.25,
        duration: 0.25,
        size: match event {
          @sim.Impact(_, true) | @sim.Killed(_) => 3
          _ => 0.7
        },
      })
    }
  }
  for b in effects.bursts {
    b.life -= dt
    let size = b.size * (b.life / b.duration)
    b.root.scale.set(size, size, size * b.stretch) |> ignore
    if b.stretch > 1 {
      b.root.position.set(
        b.root.position.x + b.velocity.x * dt,
        b.root.position.y + b.velocity.y * dt,
        b.root.position.z + b.velocity.z * dt,
      )
      |> ignore
      b.velocity = { ..b.velocity, y: b.velocity.y - 14 * dt, }
    }
    if b.life <= 0 {
      b.root.remove_from_parent() |> ignore
    }
  }
  effects.bursts.retain(fn(b) { b.life > 0 })
}

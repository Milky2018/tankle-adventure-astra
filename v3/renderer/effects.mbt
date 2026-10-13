///|
priv struct Trail {
  root : @three.Object3D
  mut life : Double
  duration : Double
  size : Double
}

///|
priv struct Effects {
  beams : Array[@three.Object3D]
  mines : Map[Int32, @three.Object3D]
  bursts : Array[Trail]
  box : @three.BufferGeometry
  sphere : @three.BufferGeometry
  bright : @three.Material
  red : @three.Material
}

///|
fn Effects::new() -> Effects {
  {
    beams: [],
    mines: {},
    bursts: [],
    box: @three.BoxGeometry::BoxGeometry(1, 1, 1).as_buffer_geometry(),
    sphere: @three.SphereGeometry::SphereGeometry(1, 10, 8).as_buffer_geometry(),
    bright: @three.MeshBasicMaterial::MeshBasicMaterial(0xffdc8b).as_material(),
    red: @three.MeshBasicMaterial::MeshBasicMaterial(0xff6846).as_material(),
  }
}

///|
pub fn View::update_effects(
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
      let mesh = @three.Mesh::Mesh(
        effects.box,
        @three.MeshBasicMaterial::MeshBasicMaterial(hue).as_material(),
      ).as_object3d()
      self.scene.as_object3d().add_child(mesh)
      effects.beams.push(mesh)
    }
    let mesh = effects.beams[count]
    count += 1
    color(mesh, hue)
    mesh.set_visible(true)
    mesh.set_position(vector(from.lerp(to, 0.5)))
    mesh.set_scale_xyz(width, width, from.distance(to))
    mesh.look_at(vector(to))
    mesh.update_matrix_world(true)
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
    effects.beams[i].set_visible(false)
  }
  let active : Set[Int32] = Set([])
  for m in game.mines {
    active.add(m.id) |> ignore
    let mesh = match effects.mines.get(m.id) {
      Some(mesh) => mesh
      None => {
        let mesh = @three.Mesh::Mesh(effects.sphere, effects.red).as_object3d()
        self.scene.as_object3d().add_child(mesh)
        effects.mines[m.id] = mesh
        mesh
      }
    }
    mesh.set_position_xyz(m.position.x, m.position.y + 0.3, m.position.z)
    mesh.set_scale_xyz(0.6, 0.25, 0.6)
    mesh.update_matrix_world(true)
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
  for event in game.effects {
    let position = match event {
      @sim.Impact(p, _) | @sim.Armored(p) => Some(p)
      @sim.Killed(i) =>
        Some(game.enemies[i].position().add({ x: 0, y: 1, z: 0, }))
      _ => None
    }
    if position is Some(p) {
      let mesh = @three.Mesh::Mesh(effects.sphere, effects.bright).as_object3d()
      mesh.set_position(vector(p))
      mesh.set_scale_xyz(0.1, 0.1, 0.1)
      self.scene.as_object3d().add_child(mesh)
      effects.bursts.push({
        root: mesh,
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
    b.root.set_scale_xyz(size, size, size)
    if b.life <= 0 {
      b.root.remove_from_parent() |> ignore
    }
  }
  effects.bursts.retain(fn(b) { b.life > 0 })
}

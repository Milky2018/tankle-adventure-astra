///|
struct Projectiles {
  meshes : Map[Int32, @three.Object3D]
  geometry : @three.BufferGeometry
  friendly : @three.Material
  hostile : @three.Material
}

///|
fn Projectiles::new() -> Projectiles {
  {
    meshes: {},
    geometry: @three.SphereGeometry::SphereGeometry(0.19, 8, 6).as_buffer_geometry(),
    friendly: @three.MeshBasicMaterial::MeshBasicMaterial(0xffedbe).as_material(),
    hostile: @three.MeshBasicMaterial::MeshBasicMaterial(0xff7948).as_material(),
  }
}

///|
fn Projectiles::update(
  self : Projectiles,
  scene : @three.Scene,
  shots : Array[@sim.Shot],
) -> Unit {
  let alive : Set[Int32] = Set([])
  for shot in shots {
    alive.add(shot.id) |> ignore
    let mesh = match self.meshes.get(shot.id) {
      Some(mesh) => mesh
      None => {
        let mesh = @three.Mesh::Mesh(
          self.geometry,
          if shot.owner is Some(_) {
            self.hostile
          } else {
            self.friendly
          },
        ).as_object3d()
        scene.as_object3d().add_child(mesh)
        self.meshes[shot.id] = mesh
        mesh
      }
    }
    mesh.set_visible(shot.delay <= 0)
    mesh.set_position_xyz(shot.position.x, shot.position.y, shot.position.z)
    mesh.set_scale_xyz(1, 1, if shot.mortar { 1 } else { 2.5 })
    mesh.look_at(vector(shot.position.add(shot.direction)))
    mesh.update_matrix_world(true)
  }
  let removed : Array[Int32] = []
  for id, mesh in self.meshes {
    if !alive.contains(id) {
      mesh.remove_from_parent() |> ignore
      removed.push(id)
    }
  }
  for id in removed {
    self.meshes.remove(id)
  }
}

///|
pub fn View::aim(
  self : View,
  game : @sim.Game,
  queries : @sim.Queries,
  pointer : @sim.Vec2,
) -> @sim.Vec3 {
  let picker = @three.Raycaster::Raycaster(
    vector({ x: 0, y: 0, z: 0, }),
    vector({ x: 0, y: 0, z: 1, }),
  )
  picker.set_from_camera(
    @three.Vector2::Vector2(
      if self.third_person {
        0
      } else {
        pointer.x
      },
      if self.third_person {
        0
      } else {
        pointer.z
      },
    ),
    self.camera(),
  )
  let source = point(picker.ray().origin())
  let direction = point(picker.ray().direction())
  let turret = self.weapon_origin()
  let horizontal = @sim.Vec2::{ x: direction.x, z: direction.z, }.length()
  let ahead = (
      (source.x - turret.x) * direction.x + (source.z - turret.z) * direction.z
    ) /
    Double::max(0.0001, horizontal)
  let origin = if self.third_person {
    source.add(
      direction.scale(
        Double::max(0, (1 - ahead) / Double::max(0.0001, horizontal)),
      ),
    )
  } else {
    source
  }
  let ray = @sim.Ray::{ origin, direction, }
  self.cutaway.update(game.player, game.world, self.camera(), self.third_person)
  let hit = game.cast(queries, ray, 300, refuge=false, visible=fn(pos) {
    self.cutaway.aim_visible(pos, false, false, self.third_person)
  })
  let mut target = match hit {
    Some(hit) =>
      if self.third_person ||
        game.player.weapon == @sim.Mortar ||
        !(hit.target is @sim.Terrain) {
        hit.point
      } else {
        ray
        .plane({ x: 0, y: hit.point.y + 2, z: 0, }, { x: 0, y: 1, z: 0, })
        .map(fn(d) { ray.point(d) })
        .unwrap_or(hit.point)
      }
    None =>
      if self.third_person {
        ray.point(150)
      } else {
        ray
        .plane(turret, { x: 0, y: 1, z: 0, })
        .map(fn(d) { ray.point(d) })
        .unwrap_or(ray.point(100))
      }
  }
  if game.player.weapon != @sim.Mortar {
    let offset = target.sub(turret)
    let yaw = @math.atan2(offset.x, offset.z)
    let pitch = @sim.clamp(
      @math.atan2(offset.y, @sim.Vec2::{ x: offset.x, z: offset.z, }.length()),
      -@math.PI * 40 / 180,
      @math.PI * 40 / 180,
    )
    target = turret.add({
      x: @math.sin(yaw) * @math.cos(pitch) * offset.length(),
      y: @math.sin(pitch) * offset.length(),
      z: @math.cos(yaw) * @math.cos(pitch) * offset.length(),
    })
  }
  target
}

///|
pub fn View::update_projectiles(self : View, game : @sim.Game) -> Unit {
  self.projectiles.update(self.scene, game.shots)
}

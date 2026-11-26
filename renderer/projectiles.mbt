///|
struct Projectiles {
  meshes : Map[Int32, @core.Object3D]
  shell : @core.BufferGeometry
  geometry : @core.BufferGeometry
  friendly : @core.Material
  bright : @core.Material
  hostile : @core.Material
}

///|
fn Projectiles::new() -> Projectiles {
  {
    meshes: {},
    shell: @geometries.LatheGeometry::new(
      points=[
        (0.0, -0.36),
        (0.14, -0.36),
        (0.15, -0.24),
        (0.20, -0.19),
        (0.20, 0.10),
        (0.16, 0.21),
        (0.065, 0.36),
        (0.0, 0.38),
      ].map(fn(pair) {
        let (radius, height) = pair
        @m3.Vector2::new(radius, height)
      }),
      segments=10,
    ).rotate_x(@math.PI / 2),
    geometry: @geometries.SphereGeometry::new(
      radius=0.19,
      width_segments=8,
      height_segments=6,
    ),
    friendly: basic_material(0xffedbe),
    bright: basic_material(0xffffee),
    hostile: basic_material(0xff7948),
  }
}

///|
fn Projectiles::update(
  self : Projectiles,
  scene : @core.Object3D,
  shots : Array[@sim.Shot],
) -> Unit {
  let alive : Set[Int32] = Set([])
  for shot in shots {
    alive.add(shot.id) |> ignore
    let mesh = match self.meshes.get(shot.id) {
      Some(mesh) => mesh
      None => {
        let mesh = @core.Mesh::new(
          geometry=if shot.mortar && shot.owner is None {
            self.shell
          } else {
            self.geometry
          },
          material=Single(
            if shot.owner is Some(_) {
              self.hostile
            } else if shot.reinforced() {
              self.bright
            } else {
              self.friendly
            },
          ),
        )
        scene.add(mesh) |> ignore
        self.meshes[shot.id] = mesh
        mesh
      }
    }
    mesh.visible = shot.delay <= 0
    mesh.position.set(shot.position.x, shot.position.y, shot.position.z)
    |> ignore
    let size = if shot.reinforced() { 1.4 } else { 1.0 }
    mesh.scale.set(size, size, size * (if shot.mortar { 1 } else { 2.5 }))
    |> ignore
    if shot.mortar {
      mesh.look_at(
        vector(
          @sim.mortar_position(
            shot.origin,
            shot.target,
            shot.age + 0.01,
            shot.duration,
            shot.arc,
          ),
        ),
      )
    } else {
      mesh.look_at(vector(shot.position.add(shot.direction)))
    }
    mesh.update_matrix_world(force=true)
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
) -> @sim.Vec3 {
  let picker = @core.Raycaster::new(
    origin=vector({ x: 0, y: 0, z: 0, }),
    direction=vector({ x: 0, y: 0, z: 1, }),
  )
  picker.set_from_camera(@m3.Vector2::new(0, 0), self.camera())
  let source = point(picker.ray.origin)
  let direction = point(picker.ray.direction)
  let turret = self.weapon_origin()
  let horizontal = @sim.Vec2::{ x: direction.x, z: direction.z, }.length()
  let ahead = (
      (source.x - turret.x) * direction.x + (source.z - turret.z) * direction.z
    ) /
    Double::max(0.0001, horizontal)
  let origin = source.add(
    direction.scale(
      Double::max(0, (1 - ahead) / Double::max(0.0001, horizontal)),
    ),
  )
  let ray = @sim.Ray::{ origin, direction, }
  let mut target = match game.cast(queries, ray, 300, refuge=false) {
    Some({ target: @sim.BlockedControl(i), point, .. }) if game.player.weapon ==
      @sim.Mortar &&
      game.commands.controls[i].top => {
      let face = game.commands.controls[i].tray_face(point)
      if point.y >= face.y - 0.5 && point.distance(face) < 0.8 {
        face
      } else {
        point
      }
    }
    Some(
      { target: @sim.Terrain | @sim.CoverTarget(_), normal: Some(n), point, .. },
    ) if game.player.weapon == @sim.Mortar && n.y.abs() < 0.5 && direction.y < 0 =>
      // A low parapet can cross the sightline while the shell clears it.
      // Select the floor behind it; the ballistic trace still tests the parapet.
      game
      .cast(queries, ray, 300, ground=true, refuge=false)
      .map(fn(hit) { hit.point })
      .unwrap_or(point)
    Some(hit) => hit.point
    None => ray.point(150)
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
fn View::update_projectiles(self : View, game : @sim.Game) -> Unit {
  self.projectiles.update(self.scene, game.shots)
}

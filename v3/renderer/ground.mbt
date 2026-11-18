///|
fn View::ground_pose(
  self : View,
  p : @sim.Player,
  world : @sim.World,
  dt : Double,
) -> Unit {
  let patches = world.ground_patches(p)
  let sx = @math.sin(p.heading)
  let cz = @math.cos(p.heading)
  let mut across = 0.0
  let mut along = 0.0
  for side in [-1.0, 1.0] {
    for end in [-1.0, 1.0] {
      let x = side * 1.5 * cz + end * 1.25 * sx
      let z = -side * 1.5 * sx + end * 1.25 * cz
      let h = @sim.ground_height(p.x + x, p.z + z, p.y, patches)
      across += side * h / 6
      along += end * h / 5
    }
  }
  let normal = if p.afloat || patches.is_empty() {
    @sim.Vec3::{ x: 0, y: 1, z: 0, }
  } else {
    @sim.Vec3::{
      x: -across * cz - along * sx,
      y: 1,
      z: across * sx - along * cz,
    }.normalized()
  }
  let target = @m3.Quaternion::new(0, 0, 0, 1).set_from_unit_vectors(
    vector({ x: 0, y: 1, z: 0, }),
    vector(normal),
  )
  self.root.quaternion.slerp(
    target,
    if dt <= 0 {
      1
    } else {
      1 - @math.exp(-dt * 18)
    },
  )
  |> ignore
  let mut clearance = 0.0
  for side in [-1.0, 1.0] {
    for end in [-1.3, -0.8, -0.4, 0, 0.4, 0.8, 1.3] {
      let q = vector({
        x: side * 1.5 * cz + end * sx,
        y: 0.085,
        z: -side * 1.5 * sx + end * cz,
      }).apply_quaternion(self.root.quaternion)
      clearance = Double::max(
        clearance,
        @sim.ground_height(p.x + q.x, p.z + q.z, p.y, patches) - p.y - q.y,
      )
    }
  }
  self.ground_clearance = if dt <= 0 {
    clearance
  } else {
    Double::max(clearance, damp(self.ground_clearance, clearance, 18, dt))
  }
  self.root.position.set(
    p.x,
    p.y + (if p.afloat { -0.12 } else { self.ground_clearance }),
    p.z,
  )
  |> ignore
}

///|
pub fn View::weapon_origin(self : View) -> @sim.Vec3 {
  point(
    vector({ x: 0, y: 2, z: 0, })
    .apply_quaternion(self.root.quaternion)
    .add(self.root.position),
  )
}

///|
pub fn View::aim_player(
  self : View,
  target : @sim.Vec3,
  weapon : @sim.Weapon,
) -> Unit {
  let direction = vector(target.sub(self.weapon_origin())).apply_quaternion(
    self.root.quaternion.clone().invert(),
  )
  let yaw = @math.atan2(direction.x, direction.z)
  let pitch = @sim.clamp(
    @math.atan2(
      direction.y,
      @sim.Vec2::{ x: direction.x, z: direction.z, }.length(),
    ),
    -@math.PI * 40 / 180,
    @math.PI * 40 / 180,
  )
  self.turret.rotation.set(0, yaw, 0) |> ignore
  self.barrel.rotation.set(
    if weapon == @sim.Mortar {
      -0.4
    } else {
      -pitch
    },
    0,
    0,
  )
  |> ignore
}

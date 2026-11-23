///|
/// Rotation of the weapon about its bearing, and the resulting world-space outlet.
pub(all) struct WeaponPose {
  yaw : Double
  tilt : Double
  pivot_height : Double
  direction : Vec3
  muzzle : Vec3
}

///|
/// Socket positions are measured at the outlet of the authored tool, in model space.
/// Paired barrels use opposite sides of the same mounting.
fn EnemyKind::socket(self : EnemyKind, side : Double) -> (Vec3, Double) {
  let (x, y, z, elevation) = match self {
    Turret => (0.0, 1.51, 1.64, 0.0)
    Guard | Bastion => (0.38, 1.5, 1.85, 0)
    Skirmisher => (side * 0.52, 1.27, 1.21, 0)
    Flanker => (side * 0.52, 1.27, 1.48, 0)
    Sniper => (0, 2.001, 2.110, 0.095)
    Artillery => (0, 2.142, 0.462, 1.098)
    Siege => (side * 0.45, 2.127, 0.409, 1.098)
    Miner => (0, 1.38, 1.42, 0.15)
    Welder => (0.44, 1.36, 1.78, 0)
    Repairer => (0, 1.22, 0.728, 0)
    Reflector => (0, 1.75, 0.43, 0)
    Prism => (0, 2.0, 0.43, 0)
    Hunter => (side * 0.55, 1.08, 1.5, 0)
    ScrapRam => (side * 0.41, 1.55, 1.95, 0)
    Overseer => (side * 0.65, 1.8, 1.46, 0)
    Keeper => (side * 0.75, 1.54, 1.40, 0)
    Guardian => (0, 1.85, 0.828, 0)
    Sorter => (0, 2.0, 1.4, 0)
    Dredger => (0, 1.25, 1.83, 0)
    Scout | Interceptor => (0, 1.16, 0.42, 0)
  }
  let scale = match self {
    Sorter | Overseer | Keeper => 1.8
    ScrapRam | Guardian => 1.35
    _ => 1.0
  }
  (Vec3::{ x, y, z, }.scale(scale), elevation)
}

///|
fn aim_weapon(
  base : Vec3,
  socket : Vec3,
  elevation : Double,
  heading : Double,
  target : Vec3?,
) -> WeaponPose {
  let pivot_height = socket.y - socket.z * @math.tan(elevation)
  let length = socket.z / @math.cos(elevation)
  let (yaw, pitch) = match target {
    None => (heading, elevation)
    Some(target) => {
      let d = target.sub(base)
      let range = Vec2::{ x: d.x, z: d.z, }.length()
      let yaw = @math.atan2(d.x, d.z) -
        @math.asin(clamp(socket.x / Double::max(0.001, range), -1, 1))
      let along = Double::sqrt(
        Double::max(0, range * range - socket.x * socket.x),
      )
      (yaw, @math.atan2(d.y - pivot_height, along))
    }
  }
  let muzzle = base.add(
    Vec3::{
      x: socket.x,
      y: pivot_height + length * @math.sin(pitch),
      z: length * @math.cos(pitch),
    }.rotate_y(yaw),
  )
  let direction = Vec3::{ x: 0, y: @math.sin(pitch), z: @math.cos(pitch), }.rotate_y(
    yaw,
  )
  { yaw, tilt: pitch - elevation, pivot_height, direction, muzzle, }
}

///|
pub fn Enemy::model_position(self : Enemy, time : Double) -> Vec3 {
  let deploy = if self.deploy_until > 0 {
    1.8 * Double::max(0, (self.deploy_until - time) / 2)
  } else {
    0.0
  }
  let bob = if self.afloat {
    @math.sin(time * 2.7 + self.x) * 0.055
  } else {
    0.0
  }
  { x: self.x, y: self.y - deploy + bob, z: self.z, }
}

///|
fn Enemy::aim_weapon(
  self : Enemy,
  time : Double,
  target : Vec3?,
  side~ : Double = 1,
  part? : Int32,
  heading~ : Double = self.aim,
) -> WeaponPose {
  if part is Some(i) {
    let p = self.parts[i]
    let pose = aim_weapon(
      p.position,
      { x: 0, y: 0, z: 1.4, },
      0,
      heading,
      target,
    )
    p.weapon_pose = Some(pose)
    pose
  } else {
    let (socket, elevation) = self.definition.kind.socket(side)
    let pose = aim_weapon(
      self.model_position(time),
      socket,
      elevation,
      heading,
      target,
    )
    self.weapon_pose = Some(pose)
    pose
  }
}

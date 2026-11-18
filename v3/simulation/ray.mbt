///|
pub fn Vec3::add(self : Vec3, other : Vec3) -> Vec3 {
  { x: self.x + other.x, y: self.y + other.y, z: self.z + other.z, }
}

///|
pub fn Vec3::sub(self : Vec3, other : Vec3) -> Vec3 {
  { x: self.x - other.x, y: self.y - other.y, z: self.z - other.z, }
}

///|
pub fn Vec3::scale(self : Vec3, factor : Double) -> Vec3 {
  { x: self.x * factor, y: self.y * factor, z: self.z * factor, }
}

///|
pub fn Vec3::dot(self : Vec3, other : Vec3) -> Double {
  self.x * other.x + self.y * other.y + self.z * other.z
}

///|
pub fn Vec3::length(self : Vec3) -> Double {
  self.dot(self).sqrt()
}

///|
pub fn Vec3::normalized(self : Vec3) -> Vec3 {
  let length = self.length()
  if length == 0 {
    self
  } else {
    self.scale(1 / length)
  }
}

///|
pub fn Vec3::rotate_y(self : Vec3, angle : Double) -> Vec3 {
  {
    x: self.x * @math.cos(angle) + self.z * @math.sin(angle),
    y: self.y,
    z: self.z * @math.cos(angle) - self.x * @math.sin(angle),
  }
}

///|
pub(all) struct Ray {
  origin : Vec3
  direction : Vec3
}

///|
pub fn Ray::point(self : Ray, distance : Double) -> Vec3 {
  self.origin.add(self.direction.scale(distance))
}

///|
pub fn Ray::sphere(self : Ray, center : Vec3, radius : Double) -> Double? {
  let delta = center.sub(self.origin)
  let along = delta.dot(self.direction)
  let side = delta.dot(delta) - along * along
  if side > radius * radius {
    return None
  }
  let half = (radius * radius - side).sqrt()
  let near = along - half
  let far = along + half
  if far < 0 {
    None
  } else {
    Some(if near < 0 { far } else { near })
  }
}

///|
pub fn Ray::plane(self : Ray, point : Vec3, normal : Vec3) -> Double? {
  let denominator = self.direction.dot(normal)
  let distance = point.sub(self.origin).dot(normal)
  if denominator.abs() < 0.0000000001 {
    return if distance.abs() < 0.0000000001 { Some(0) } else { None }
  }
  let t = distance / denominator
  if t < 0 {
    None
  } else {
    Some(t)
  }
}

///|
#derive(Eq)
pub(all) enum HitTarget {
  Terrain
  SlideTarget(Int32)
  PuzzleTarget(String)
  CoverTarget
  EnemyTarget(Int32, Int32?)
  ControlTarget(Int32)
  BlockedControl(Int32)
  MirrorTarget(Int32)
  MineTarget(Int32)
  TorpedoTarget(Int32)
  Refuge
  PlayerTarget
}

///|
pub(all) struct Hit {
  distance : Double
  point : Vec3
  normal : Vec3?
  target : HitTarget
}

///|
pub(all) struct Queries {
  geometry : (Ray, Double, Bool) -> Hit?
}

///|
pub fn Ray::box(self : Ray, min : Vec3, max : Vec3) -> (Double, Vec3)? {
  let mut near = -1.0 / 0.0
  let mut far = 1.0 / 0.0
  let mut normal : Vec3 = { x: 0, y: 0, z: 0, }
  for
    (origin, direction, low, high, axis) in [
      (
        self.origin.x,
        self.direction.x,
        min.x,
        max.x,
        Vec3::{ x: 1, y: 0, z: 0, },
      ),
      (
        self.origin.y,
        self.direction.y,
        min.y,
        max.y,
        Vec3::{ x: 0, y: 1, z: 0, },
      ),
      (
        self.origin.z,
        self.direction.z,
        min.z,
        max.z,
        Vec3::{ x: 0, y: 0, z: 1, },
      ),
    ] {
    if direction.abs() < 0.000000001 {
      if origin < low || origin > high {
        return None
      }
      continue
    }
    let a = (low - origin) / direction
    let b = (high - origin) / direction
    let entry = Double::min(a, b)
    if entry > near {
      near = entry
      normal = axis.scale(if direction > 0 { -1 } else { 1 })
    }
    far = Double::min(far, Double::max(a, b))
    if far < near {
      return None
    }
  }
  if far < 0 {
    None
  } else {
    Some((if near < 0 { far } else { near }, normal))
  }
}

///|
#deprecated
pub extend HitTarget with Eq::{equal, not_equal}

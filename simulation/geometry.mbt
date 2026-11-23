///|
#derive(Eq, @json.ToJson, @json.FromJson)
pub(all) struct Vec2 {
  x : Double
  z : Double
}

///|
#derive(Eq, @json.ToJson, @json.FromJson)
pub(all) struct Vec3 {
  x : Double
  y : Double
  z : Double
}

///|
#derive(Eq)
pub(all) struct Rect {
  x : Double
  z : Double
  w : Double
  d : Double
}

///|
pub fn clamp(value : Double, low : Double, high : Double) -> Double {
  Double::max(low, Double::min(high, value))
}

///|
pub fn approach(value : Double, target : Double, amount : Double) -> Double {
  if value < target {
    Double::min(value + amount, target)
  } else {
    Double::max(value - amount, target)
  }
}

///|
pub fn angle_delta(a : Double, b : Double) -> Double {
  @math.atan2(@math.sin(b - a), @math.cos(b - a))
}

///|
pub fn Vec2::length(self : Vec2) -> Double {
  Double::sqrt(self.x * self.x + self.z * self.z)
}

///|
pub fn Vec2::distance(self : Vec2, other : Vec2) -> Double {
  Vec2::{ x: self.x - other.x, z: self.z - other.z, }.length()
}

///|
pub fn Vec3::distance(self : Vec3, other : Vec3) -> Double {
  let x = self.x - other.x
  let y = self.y - other.y
  let z = self.z - other.z
  Double::sqrt(x * x + y * y + z * z)
}

///|
pub fn Vec3::lerp(self : Vec3, other : Vec3, t : Double) -> Vec3 {
  {
    x: self.x + (other.x - self.x) * t,
    y: self.y + (other.y - self.y) * t,
    z: self.z + (other.z - self.z) * t,
  }
}

///|
pub fn Rect::contains(
  self : Rect,
  x : Double,
  z : Double,
  margin~ : Double = 0,
) -> Bool {
  x >= self.x - margin &&
  x <= self.x + self.w + margin &&
  z >= self.z - margin &&
  z <= self.z + self.d + margin
}

///|
#deprecated
pub extend Vec2 with Eq::{equal, not_equal}

///|
#deprecated
pub extend Vec3 with Eq::{equal, not_equal}

///|
#deprecated
pub extend Rect with Eq::{equal, not_equal}

///|
#deprecated
pub extend Vec2 with @json.ToJson::{to_json}

///|
#deprecated
pub extend Vec2 with @json.FromJson::{from_json}

///|
#deprecated
pub extend Vec3 with @json.ToJson::{to_json}

///|
#deprecated
pub extend Vec3 with @json.FromJson::{from_json}

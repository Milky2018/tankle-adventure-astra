///|
pub(all) struct Hive {
  id : String
  name : String
  position : Vec3
  heading : Double
  requires : String?
}

///|
pub fn refuge_at(
  position : Vec3,
  hives : Array[Hive],
  state : Progress,
  radius~ : Double = 5,
) -> Hive? {
  hives
  .iter()
  .find_first(fn(hive) {
    (hive.requires is None || (hive.requires is Some(id) && state.has(id))) &&
    position.y >= hive.position.y - 0.75 &&
    position.y < hive.position.y + 4 &&
    Vec2::{ x: position.x - hive.position.x, z: position.z - hive.position.z, }.length() <=
    radius
  })
}

///|
pub fn refuge_ray_distance(
  origin : Vec3,
  direction : Vec3,
  range : Double,
  hives : Array[Hive],
  state : Progress,
) -> Double? {
  let mut nearest = 1.0 / 0.0
  for hive in hives {
    if hive.requires is Some(id) && !state.has(id) {
      continue
    }
    let x = origin.x - hive.position.x
    let z = origin.z - hive.position.z
    let a = direction.x * direction.x + direction.z * direction.z
    if a > 0.000000000001 {
      let b = x * direction.x + z * direction.z
      let c = x * x + z * z - 25
      let discriminant = b * b - a * c
      if discriminant >= 0 {
        for
          t in [(-b - discriminant.sqrt()) / a, (-b + discriminant.sqrt()) / a] {
          let y = origin.y + direction.y * t
          if y >= hive.position.y - 0.75 &&
            y <= hive.position.y + 4 &&
            t >= 0 &&
            t <= range {
            nearest = Double::min(nearest, t)
          }
        }
      }
    }
    if direction.y.abs() > 0.000000000001 {
      for y in [hive.position.y - 0.75, hive.position.y + 4] {
        let t = (y - origin.y) / direction.y
        if Vec2::{ x: x + direction.x * t, z: z + direction.z * t, }.length() <=
          5 &&
          t >= 0 &&
          t <= range {
          nearest = Double::min(nearest, t)
        }
      }
    }
  }
  if nearest <= range {
    Some(nearest)
  } else {
    None
  }
}

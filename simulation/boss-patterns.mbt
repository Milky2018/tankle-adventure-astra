///|
#derive(Eq)
pub(all) struct BossPattern {
  kind : BossAttack
  warn : Double
  recovery : Double
  speed : Double
  offsets : Array[Double]
  waves : Int32
  spacing : Double
  overlay : Bool
}

///|
pub fn Enemy::boss_pattern(self : Enemy, clear_sight : Bool) -> BossPattern? {
  let cycle = if self.attack_cycle == 0 { 1 } else { self.attack_cycle }
  let late = self.hp / self.max_hp < 0.4
  let parts = self.parts.any(fn(part) { part.hp > 0 })
  match self.definition.kind {
    Overseer =>
      Some({
        kind: if !clear_sight || cycle % 3 == 0 {
          Barrage
        } else if parts {
          Batteries
        } else {
          Fan
        },
        warn: if parts {
          1.05
        } else {
          0.9
        },
        recovery: 1.45,
        speed: 32,
        offsets: if parts {
          [-0.3, -0.15, 0, 0.15, 0.3]
        } else {
          [-0.45, -0.3, -0.15, 0, 0.15, 0.3, 0.45]
        },
        waves: 2,
        spacing: 0.32,
        overlay: false,
      })
    Guardian =>
      Some({
        kind: if cycle % 3 == 0 {
          Seekers
        } else {
          Fan
        },
        warn: if late {
          0.85
        } else {
          1.05
        },
        recovery: 2.2,
        speed: 36,
        offsets: [-0.36, -0.18, 0, 0.18, 0.36],
        waves: 2,
        spacing: 0.38,
        overlay: false,
      })
    Sorter =>
      Some({
        kind: if !clear_sight || cycle % 3 == 0 {
          Barrage
        } else {
          ArmSweep
        },
        warn: 1.1,
        recovery: 1.5,
        speed: 30,
        offsets: [],
        waves: 0,
        spacing: 0,
        overlay: false,
      })
    Keeper =>
      Some({
        kind: if !clear_sight || cycle % 4 == 0 {
          Barrage
        } else if cycle % 4 == 2 {
          Seekers
        } else if !parts && cycle % 4 == 3 {
          ArmSweep
        } else if parts {
          Batteries
        } else {
          Fan
        },
        warn: if late {
          0.85
        } else {
          1.1
        },
        recovery: if late {
          1.05
        } else {
          1.35
        },
        speed: if late {
          38
        } else {
          32
        },
        offsets: if late {
          [-0.45, -0.3, -0.15, 0, 0.15, 0.3, 0.45]
        } else {
          [-0.36, -0.18, 0, 0.18, 0.36]
        },
        waves: 2,
        spacing: 0.36,
        overlay: late,
      })
    _ => None
  }
}

///|
pub(all) struct BarrageTarget {
  position : Vec3
  delay : Double
}

///|
pub fn barrage_targets(
  origin : Vec3,
  target : Vec3,
  boss~ : Bool = false,
) -> Array[BarrageTarget] {
  let dx = target.x - origin.x
  let dz = target.z - origin.z
  let length = Double::max(1, Vec2::{ x: dx, z: dz, }.length())
  let width = if boss { 5.5 } else { 5.0 }
  let spacing = if boss { 0.24 } else { 0.32 }
  [
    for i in 0..<3 => {
      {
        position: {
          x: target.x + dz / length * (i - 1).to_double() * width,
          y: target.y,
          z: target.z - dx / length * (i - 1).to_double() * width,
        },
        delay: i.to_double() * spacing,
      }
    }
  ]
}

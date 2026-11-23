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
pub fn Enemy::boss_pattern(
  self : Enemy,
  clear_sight : Bool,
  distance~ : Double = 16,
  lateral_speed~ : Double = 0,
) -> BossPattern? {
  let cycle = Int32::max(1, self.attack_cycle)
  let left = self.parts.get(0) is Some(p) && p.hp > 0
  let right = self.parts.get(1) is Some(p) && p.hp > 0
  let late = self.hp < self.max_hp * 0.4
  let moves : Array[BossAttack] = match self.definition.kind {
    Sorter =>
      if !clear_sight || distance > 21 {
        [WalkingDrop, Barrage, Pincer]
      } else if distance < 9 {
        [ArmThrust, BackSweep, ArmSweep, Pincer]
      } else {
        [ArmSweep, WalkingDrop, BackSweep, Pincer, ArmThrust, Barrage]
      }
    Overseer =>
      if !clear_sight {
        [Barrage, WalkingDrop, Pincer]
      } else if left || right {
        [Batteries, Crossfire, WalkingDrop, Needle, Barrage, Pincer]
      } else {
        [Fan, Needle, Pincer, WalkingDrop]
      }
    Guardian =>
      if !clear_sight {
        [Sidestep]
      } else if distance < 9 {
        [Sidestep, Fan, Seekers]
      } else {
        [Fan, Needle, Seekers, Sidestep, Crossfire]
      }
    Keeper => {
      // Port feed powers launch tubes; starboard feed powers the gun battery.
      let moves : Array[BossAttack] = []
      if right && clear_sight {
        moves.push(Batteries)
        moves.push(Crossfire)
      }
      if left {
        moves.push(WalkingDrop)
        moves.push(Pincer)
        if clear_sight {
          moves.push(Seekers)
        }
      }
      if right {
        moves.push(Barrage)
      }
      if !left && !right {
        if !clear_sight {
          moves.push(WalkingDrop)
          moves.push(Barrage)
        } else {
          moves.push(Fan)
          moves.push(ArmSweep)
          moves.push(Needle)
          moves.push(Pincer)
        }
      }
      moves
    }
    _ => return None
  }
  let slot = (cycle - 1) % moves.length()
  // Bracket a fast crossing or cut across it. Change response on the next beat
  // so sustained strafing cannot pin the controller to one attack.
  let intercept = if self.definition.kind == Guardian {
    Crossfire
  } else {
    Pincer
  }
  let kind = if clear_sight &&
    lateral_speed.abs() > 4.5 &&
    self.last_boss_attack != Some(intercept) &&
    moves.contains(intercept) {
    intercept
  } else if moves.length() > 1 && self.last_boss_attack == Some(moves[slot]) {
    moves[(slot + 1) % moves.length()]
  } else {
    moves[slot]
  }
  let offsets = match kind {
    Crossfire => [-0.07, 0.0, 0.07]
    Needle => [0.0]
    _ =>
      if late {
        [-0.42, -0.28, -0.14, 0, 0.14, 0.28, 0.42]
      } else {
        [-0.3, -0.15, 0, 0.15, 0.3]
      }
  }
  Some({
    kind,
    warn: if kind is (ArmThrust | Needle) {
      1.25
    } else {
      1.05
    },
    recovery: match self.definition.kind {
      Guardian => 2.2
      Sorter => 1.5
      Overseer => 1.45
      _ => 1.25
    },
    speed: if kind == Needle {
      43
    } else {
      32
    },
    offsets,
    waves: if kind is (Batteries | Crossfire | Needle | Fan) {
      2
    } else {
      1
    },
    spacing: if kind == Needle {
      0.48
    } else {
      0.34
    },
    overlay: late &&
    self.definition.kind == Keeper &&
    !left &&
    !right &&
    clear_sight &&
    kind == Fan,
  })
}

///|
pub fn BossAttack::uses_arm(self : BossAttack) -> Bool {
  self is (ArmSweep | BackSweep | ArmThrust)
}

///|
fn BossAttack::indirect(self : BossAttack) -> Bool {
  self is (Barrage | Pincer | WalkingDrop)
}

///|
pub fn Enemy::arm_pose(self : Enemy) -> (Double, Double) {
  if self.jam > 0 && self.stopped_arm is Some(pose) {
    return pose
  }
  let progress = match self.phase {
    Sweep(_) => clamp(1 - self.timer / 1.8, 0, 1)
    _ => 0.0
  }
  let stroke = self.last_boss_attack.unwrap_or(ArmSweep)
  if !(self.phase is (Sweep(_) | Warn(Volley(_, _)))) || !stroke.uses_arm() {
    return (0, 0.32)
  }
  if self.phase is Warn(Volley(pattern, _)) {
    let t = clamp(1 - self.timer / pattern.warn, 0, 1)
    let eased = t * t * (3 - 2 * t)
    return match stroke {
      ArmThrust => (0, 0.32 - 0.09 * @math.sin(t * @math.PI))
      BackSweep => (0.96 * eased, 0.32 + 0.68 * eased)
      _ => (-0.96 * eased, 0.32 + 0.68 * eased)
    }
  }
  match stroke {
    ArmThrust => (0, 0.32 + 0.68 * @math.sin(progress * @math.PI))
    BackSweep => (0.96 - 1.92 * progress, 1)
    _ => (-0.96 + 1.92 * progress, 1)
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

///|
pub fn Enemy::impact_pattern(
  self : Enemy,
  kind : BossAttack,
) -> Array[BarrageTarget] {
  let forward = Vec3::{ x: @math.sin(self.aim), y: 0, z: @math.cos(self.aim), }
  let side = Vec3::{ x: forward.z, y: 0, z: -forward.x, }
  match kind {
    WalkingDrop =>
      [
        for i in 0..<3 => {
          {
            position: self.lock.add(forward.scale((i - 1).to_double() * 4.5)),
            delay: i.to_double() * 0.38,
          }
        }
      ]
    Pincer =>
      [
        { position: self.lock.add(side.scale(-4.3)), delay: 0, },
        { position: self.lock.add(side.scale(4.3)), delay: 0, },
        { position: self.lock, delay: 0.68, },
      ]
    Barrage => barrage_targets(self.position(), self.lock, boss=true)
    _ => []
  }
}

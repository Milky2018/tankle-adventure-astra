///|
#derive(Eq)
pub(all) enum DamageKind {
  CannonHit
  MortarHit
  LaserHit
  Ram
  Red
}

///|
#deprecated
pub extend DamageKind with Eq::{equal, not_equal}

///|
fn Enemy::resolve_damage(
  self : Enemy,
  initial_amount : Double,
  origin : Vec3,
  kind : DamageKind,
  part_index : Int32?,
  probe : Bool,
) -> Double {
  let red = kind == Red
  let bearing = @math.cos(
    angle_delta(@math.atan2(origin.x - self.x, origin.z - self.z), self.aim),
  )
  let rear = bearing < -0.45
  let definition = self.definition
  if definition.kind == Guardian && !rear && !red {
    return 0
  }
  let mut amount = initial_amount
  if definition.kind == ScrapRam && !self.drive_exposed() && !rear && !red {
    amount *= 0.4
  }
  if definition.kind == Sorter &&
    !red &&
    !self.drive_exposed() &&
    bearing > 0.35 {
    return 0
  }
  if definition.kind == Overseer &&
    !red &&
    part_index is Some(i) &&
    self.parts.get(i) is Some(part) &&
    part.hp > 0 &&
    !self.battery_exposed(i) {
    // The cylinder is open from the outside flank even behind its front shutter.
    if (origin.x - part.position.x) * (if i == 0 { -1.0 } else { 1.0 }) < 2.0 {
      return 0
    }
  }
  if definition.kind == Bastion &&
    !self.shield_removed &&
    !self.phase.is_venting() &&
    kind == Ram &&
    bearing > 0.55 {
    amount *= 0.25
  }
  if self.parts.any(fn(part) { part.hp > 0 }) {
    if red {
      if !probe {
        let mut remaining = amount
        for part in self.parts {
          let dealt = Double::min(part.hp, remaining)
          part.hp -= dealt
          remaining -= dealt
        }
      }
      return if probe { amount } else { Double::min(self.hp, amount) }
    }
    if part_index is Some(index) &&
      self.parts.get(index) is Some(part) &&
      part.hp > 0 {
      let dealt = if probe { amount } else { Double::min(part.hp, amount) }
      if !probe {
        part.hp -= dealt
      }
      return dealt
    }
    return 0
  }
  let projectile = !red && kind != Ram && kind != MortarHit
  if projectile && definition.kind is (Reflector | Prism) && bearing > 0.55 {
    return 0
  }
  if projectile &&
    definition.kind is (Guard | Bastion) &&
    !self.shield_removed &&
    !self.phase.is_venting() &&
    bearing > 0.55 {
    amount *= 0.4
  }
  if probe {
    amount
  } else {
    Double::min(self.hp, amount)
  }
}

///|
pub fn Enemy::damage_amount(
  self : Enemy,
  amount : Double,
  origin : Vec3,
  kind : DamageKind,
  part_index? : Int32,
) -> Double {
  self.resolve_damage(amount, origin, kind, part_index, false)
}

///|
pub fn Enemy::armor_absorbs(
  self : Enemy,
  amount : Double,
  origin : Vec3,
  kind : DamageKind,
  part_index? : Int32,
) -> Bool {
  self.resolve_damage(amount, origin, kind, part_index, true) < amount * 0.99
}

///|
pub fn Player::enemy_contact(self : Player, enemy : Enemy) -> Double {
  if self.red_contact() {
    return self.contact_damage()
  }
  let definition = enemy.definition
  if definition.kind.is_boss() {
    return 0
  }
  if self.phoenix_ready() {
    return self.contact_damage()
  }
  if !self.abilities.overdrive || self.deployed || self.speed < 1.3 {
    return 0
  }
  if definition.kind is (Guard | Bastion) &&
    !enemy.shield_removed &&
    @math.cos(
      angle_delta(@math.atan2(self.x - enemy.x, self.z - enemy.z), enemy.aim),
    ) >
    0.55 {
    return 0
  }
  if definition.kind is (Scout | Interceptor) {
    enemy.hp
  } else {
    1
  }
}

///|
fn Enemy::shot_damage(self : Enemy, heavy_projectile : Bool) -> Double {
  if self.definition.kind.is_boss() && heavy_projectile {
    return 10
  }
  match self.definition.kind {
    Artillery | Siege | Sniper => 10
    _ => 5
  }
}

///|
pub fn Enemy::contact_damage(self : Enemy) -> Double {
  if self.phase == Charge &&
    self.definition.kind is (Scout | Interceptor | ScrapRam) {
    5
  } else {
    0
  }
}

///|
fn Game::enemy_contact(self : Game, index : Int32) -> Unit {
  let e = self.enemies[index]
  let p = self.player
  if e.hp <= 0 ||
    (p.y - e.y).abs() >= 2 ||
    horizontal_distance(p.position(), e.position()) >= e.radius + 0.8 {
    return
  }
  if self.time - e.ram_at > 0.5 {
    e.ram_at = self.time
    let damage = if p.stunned(self.time) { 0.0 } else { p.enemy_contact(e) }
    if damage > 0 {
      self.hit_enemy(
        index,
        damage,
        p.position(),
        if p.red_contact() {
          Red
        } else {
          Ram
        },
      )
      |> ignore
      if !p.red_contact() && p.speed < 3.19 {
        p.speed = 1
      }
    } else if e.contact_damage() > 0 {
      self.hurt(e.contact_damage(), e.position()) |> ignore
      if e.definition.kind == ScrapRam && e.phase == Charge {
        e.jam = 1.0
        e.enter(Vent(e.timing.post_recovery), 1.6)
      }
    }
  }
  if e.hp > 0 {
    let distance = horizontal_distance(p.position(), e.position())
    let angle = if distance > 0.001 {
      @math.atan2(p.x - e.x, p.z - e.z)
    } else {
      p.heading + @math.PI
    }
    let overlap = e.radius + 0.81 - distance
    self.world.move_player(
      p,
      @math.sin(angle) * overlap,
      @math.cos(angle) * overlap,
      self.progress,
    )
    |> ignore
    p.speed = 1
  }
}

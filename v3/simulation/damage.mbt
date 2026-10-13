///|
pub(all) enum DamageKind {
  CannonHit
  MortarHit
  LaserHit
  Ram
  Red
} derive(Eq)

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
  if definition.guardian && !rear && !red {
    return 0
  }
  let mut amount = initial_amount
  if definition.id == "prototype" && self.phase != Vent && !rear && !red {
    amount *= 0.4
  }
  if (definition.id == "foundry" || definition.id == "sorter") &&
    self.phase != Vent &&
    !red {
    return 0
  }
  if definition.variant == Bastion &&
    !self.shield_removed &&
    self.phase != Vent &&
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
  if projectile && definition.kind == Reflector && bearing > 0.55 {
    return 0
  }
  if projectile &&
    definition.kind == Guard &&
    !definition.guardian &&
    !self.shield_removed &&
    self.phase != Vent &&
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
  if definition.kind == Boss ||
    definition.guardian ||
    (definition.kind == Elite && definition.persistent) {
    return 0
  }
  if self.phoenix_ready() {
    return self.contact_damage()
  }
  if !self.abilities.overdrive ||
    self.deployed ||
    self.speed < 1.3 ||
    definition.kind == Elite {
    return 0
  }
  if definition.kind == Guard &&
    !enemy.shield_removed &&
    @math.cos(
      angle_delta(@math.atan2(self.x - enemy.x, self.z - enemy.z), enemy.aim),
    ) >
    0.55 {
    return 0
  }
  if definition.kind == Scout {
    enemy.hp
  } else {
    1
  }
}

///|
pub fn Enemy::shot_damage(self : Enemy, attack : Attack?) -> Double {
  let boss = self.definition.kind == Boss ||
    self.definition.guardian ||
    self.definition.id == "sorter"
  if boss {
    match attack {
      Some(Fan | Batteries) => return 5
      Some(Seekers | Barrage | SweepAttack) => return 10
      _ => ()
    }
  }
  if self.definition.id == "keeper" ||
    self.definition.guardian ||
    self.definition.kind == Boss {
    return 5
  }
  match self.definition.kind {
    Artillery | Sniper => 10
    _ => 5
  }
}

///|
pub fn Enemy::contact_damage(self : Enemy) -> Double {
  if self.phase == Charge &&
    (
      self.definition.kind == Scout ||
      self.definition.kind == Elite ||
      self.definition.id == "prototype"
    ) {
    5
  } else {
    0
  }
}

///|
pub(all) struct EnemySpec {
  speed : Double
  reach : Double
  warn : Double
  recovery : Double
  attack : Attack
  charge_speed : Double?
  projectile_speed : Double?
  lob_duration : Double
}

///|
pub fn Enemy::spec(self : Enemy) -> EnemySpec {
  let (speed, reach, warn, recovery, attack) = match self.definition.kind {
    Hunter => (6.0, 24.0, 1.3, 2.0, Torpedoes)
    Dredger => (2.4, 11.0, 1.2, 2.4, SuctionAttack)
    Scout => (5.6, 11.0, 1.1, 1.5, ChargeAttack)
    Turret => (0.0, 27.0, 1.2, 1.5, Shot)
    Guard => (3.8, 12.0, 1.5, 1.6, ShieldShot)
    Skirmisher => (6.2, 18.0, 0.8, 1.4, BurstAttack)
    Sniper => (2.8, 86.0, 2.2, 2.2, RailAttack)
    Artillery => (2.5, 55.0, 1.4, 2.8, Lob)
    Miner => (4.6, 13.0, 0.8, 2.1, Mine)
    Welder => (6.8, 18.0, 0.9, 0.9, SweepAttack)
    Repairer => (4.5, 10.0, 1.0, 2.0, RepairAttack)
    Reflector => (3.2, 16.0, 1.6, 1.9, Reflect)
    Elite => (4.2, 20.0, 1.5, 1.6, ChargeAttack)
    Boss => (0.0, 27.0, 1.4, 2.4, Shot)
  }
  let base : EnemySpec = {
    speed,
    reach,
    warn,
    recovery,
    attack,
    charge_speed: None,
    projectile_speed: None,
    lob_duration: 1.9,
  }
  match self.definition.variant {
    Ordinary => base
    Interceptor =>
      {
        ..base,
        speed: 11.2,
        charge_speed: Some(26),
        warn: 0.75,
        recovery: 0.75,
      }
    Bastion =>
      {
        ..base,
        speed: 7.6,
        reach: 24,
        warn: 0.85,
        recovery: 0.75,
        projectile_speed: Some(36),
      }
    Siege => { ..base, speed: 5, warn: 0.95, recovery: 1.4, lob_duration: 1.1, }
    Prism =>
      {
        ..base,
        speed: 6.4,
        reach: 32,
        warn: 0.9,
        recovery: 0.85,
        projectile_speed: Some(34),
      }
    Flanker =>
      {
        ..base,
        speed: 12.4,
        reach: 36,
        warn: 0.55,
        recovery: 0.7,
        projectile_speed: Some(36),
      }
  }
}

///|
pub fn wounded_ally(index : Int32, enemies : Array[Enemy]) -> Int32? {
  let enemy = enemies[index]
  let mut best : Int32? = None
  let mut fraction = 1.0
  for i, other in enemies {
    if i != index &&
      other.hp > 0 &&
      other.hp < other.max_hp &&
      other.definition.encounter == enemy.definition.encounter &&
      (other.y - enemy.y).abs() < 2 &&
      Vec2::{ x: other.x - enemy.x, z: other.z - enemy.z, }.length() < 18 &&
      other.hp / other.max_hp < fraction {
      best = Some(i)
      fraction = other.hp / other.max_hp
    }
  }
  best
}

///|
fn heavy(kind : EnemyKind) -> Bool {
  match kind {
    Sniper | Artillery | Scout | Elite | Welder | Hunter | Dredger => true
    _ => false
  }
}

///|
pub fn can_telegraph(index : Int32, enemies : Array[Enemy]) -> Bool {
  let enemy = enemies[index]
  if !heavy(enemy.definition.kind) {
    return true
  }
  let mut active = 0
  for i, other in enemies {
    let same = match enemy.definition.battle {
      Some(id) => other.definition.battle == Some(id)
      None =>
        enemy.definition.encounter is Some(id) &&
        other.definition.encounter == Some(id)
    }
    if i == index || other.hp <= 0 || !same || !heavy(other.definition.kind) {
      continue
    }
    if other.phase != Warn && other.phase != Charge && other.phase != Flame {
      continue
    }
    active += 1
    if !enemy.definition.coordinated ||
      active >= 2 ||
      other.definition.kind == enemy.definition.kind ||
      (other.phase == Warn && other.warning_age < 0.5) {
      return false
    }
  }
  true
}

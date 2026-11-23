///|
pub(all) enum CombatStyle {
  Weapon(Attack)
  RepairAllies
  BossCycle
}

///|
pub(all) struct EnemySpec {
  speed : Double
  reach : Double
  warn : Double
  recovery : Double
  style : CombatStyle
  charge_speed : Double?
  projectile_speed : Double?
  lob_duration : Double
}

///|
fn enemy_profile(
  speed : Double,
  reach : Double,
  warn : Double,
  recovery : Double,
  style : CombatStyle,
  charge_speed? : Double,
  projectile_speed? : Double,
  lob_duration~ : Double = 1.9,
) -> EnemySpec {
  {
    speed,
    reach,
    warn,
    recovery,
    style,
    charge_speed,
    projectile_speed,
    lob_duration,
  }
}

///|
fn EnemyDef::combat_spec(self : EnemyDef) -> EnemySpec {
  match self.kind {
    Hunter => enemy_profile(6.0, 24.0, 1.3, 2.0, Weapon(Torpedoes))
    Dredger => enemy_profile(2.4, 11.0, 1.2, 2.4, Weapon(SuctionAttack))
    Scout => enemy_profile(5.6, 11.0, 1.1, 1.5, Weapon(ChargeAttack))
    Turret => enemy_profile(0.0, 27.0, 1.2, 1.5, Weapon(Shot))
    Guard => enemy_profile(3.8, 12.0, 1.5, 1.6, Weapon(ShieldShot))
    Skirmisher => enemy_profile(6.2, 18.0, 0.8, 1.4, Weapon(BurstAttack))
    Sniper => enemy_profile(2.8, 86.0, 2.2, 2.2, Weapon(RailAttack))
    Artillery => enemy_profile(2.5, 55.0, 1.4, 2.8, Weapon(Lob))
    Miner => enemy_profile(4.6, 13.0, 0.8, 2.1, Weapon(Mine))
    Welder => enemy_profile(6.8, 18.0, 0.9, 0.9, Weapon(SweepAttack))
    Repairer => enemy_profile(4.5, 10.0, 1.0, 2.0, RepairAllies)
    Reflector => enemy_profile(3.2, 16.0, 1.6, 1.9, Weapon(Reflect))
    ScrapRam =>
      enemy_profile(4.2, 20.0, 1.5, 1.6, Weapon(ChargeAttack), charge_speed=21)
    Guardian => enemy_profile(3.8, 12.0, 1.5, 1.6, BossCycle)
    Sorter | Overseer | Keeper => enemy_profile(0.0, 27.0, 1.4, 2.4, BossCycle)
    Interceptor =>
      enemy_profile(11.2, 11, 0.75, 0.75, Weapon(ChargeAttack), charge_speed=26)
    Bastion =>
      enemy_profile(
        7.6,
        24,
        0.85,
        0.75,
        Weapon(ShieldShot),
        projectile_speed=36,
      )
    Siege => enemy_profile(5, 55, 0.95, 1.4, Weapon(Lob), lob_duration=1.1)
    Prism =>
      enemy_profile(6.4, 32, 0.9, 0.85, Weapon(Reflect), projectile_speed=34)
    Flanker =>
      enemy_profile(
        12.4,
        36,
        0.55,
        0.7,
        Weapon(BurstAttack),
        projectile_speed=36,
      )
  }
}

///|
pub fn Enemy::spec(self : Enemy) -> EnemySpec {
  self.profile
}

///|
priv struct EnemyTiming {
  reset_delay : Double
  reacquire_delay : Double
  post_recovery : Double
  mortar_flinch : Double
  resume_after_flinch : Bool
}

///|
fn EnemyDef::combat_timing(self : EnemyDef) -> EnemyTiming {
  match self.kind {
    Interceptor | Bastion | Siege | Prism | Flanker =>
      {
        reset_delay: self.startup.unwrap_or(0.4),
        reacquire_delay: 0.2,
        post_recovery: 0.12,
        mortar_flinch: 0.2,
        resume_after_flinch: true,
      }
    _ =>
      {
        reset_delay: 1.5,
        reacquire_delay: 0.55,
        post_recovery: 0.25 + (self.id.length() % 3).to_double() * 0.1,
        mortar_flinch: 0.6,
        resume_after_flinch: false,
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
    Sniper
    | Artillery
    | Siege
    | Scout
    | Interceptor
    | ScrapRam
    | Welder
    | Hunter
    | Dredger => true
    _ => false
  }
}

///|
fn EnemyKind::shares_warning(self : EnemyKind, other : EnemyKind) -> Bool {
  match (self, other) {
    (Scout | Interceptor, Scout | Interceptor)
    | (Artillery | Siege, Artillery | Siege) => true
    _ => self == other
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
    if !other.phase.is_warning() &&
      other.phase != Charge &&
      other.phase != Flame {
      continue
    }
    active += 1
    if !enemy.definition.coordinated ||
      active >= 2 ||
      enemy.definition.kind.shares_warning(other.definition.kind) ||
      (other.phase.is_warning() && other.warning_age < 0.5) {
      return false
    }
  }
  true
}

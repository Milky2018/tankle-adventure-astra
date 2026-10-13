///|
pub(all) enum Weapon {
  Cannon
  Mortar
  Laser
} derive(Eq)

///|
pub(all) struct Abilities {
  mut overdrive : Bool
  mut magnet : Bool
  mut mortar : Bool
  mut flotation : Bool
  mut phoenix : Bool
  mut laser : Bool
  mut circulation : Bool
}

///|
pub fn Abilities::new() -> Abilities {
  {
    overdrive: false,
    magnet: false,
    mortar: false,
    flotation: false,
    phoenix: false,
    laser: false,
    circulation: false,
  }
}

///|
pub(all) struct Upgrades {
  mut armor_packs : Int32
  mut cooling : Bool
  mut cannon : Bool
  mut mortar : Bool
  mut laser : Bool
  mut scope : Bool
}

///|
pub fn Upgrades::new() -> Upgrades {
  {
    armor_packs: 0,
    cooling: false,
    cannon: false,
    mortar: false,
    laser: false,
    scope: false,
  }
}

///|
pub(all) struct Player {
  mut x : Double
  mut y : Double
  mut z : Double
  mut hp : Double
  mut heat : Double
  mut overheated : Bool
  mut speed : Double
  mut last_heat : Double
  mut last_shot : Double
  mut invincible_until : Double
  mut heading : Double
  mut aim : Double
  abilities : Abilities
  upgrades : Upgrades
  mut weapon : Weapon
  mut deployed : Bool
  mut afloat : Bool
  mut boost_cooling : Bool
  mut action_heat_at : Double
  mut shot_cooldown : Double
  mut hurt_at : Double
  mut hurt_until : Double
  mut knock : Vec2
  mut dock_hold : Double
  mut pump_pressure : Double
  mut ending_time : Double
}

///|
pub fn Player::new() -> Player {
  {
    x: 0,
    y: 0,
    z: 6,
    hp: 25,
    heat: 0,
    overheated: false,
    speed: 1,
    last_heat: -10,
    last_shot: -10,
    invincible_until: 0,
    heading: @math.PI,
    aim: @math.PI,
    abilities: Abilities::new(),
    upgrades: Upgrades::new(),
    weapon: Cannon,
    deployed: false,
    afloat: false,
    boost_cooling: false,
    action_heat_at: -1.0 / 0.0,
    shot_cooldown: 0.5,
    hurt_at: -10,
    hurt_until: 0,
    knock: { x: 0, z: 0, },
    dock_hold: 0,
    pump_pressure: 0,
    ending_time: 0,
  }
}

///|
pub fn Player::position(self : Player) -> Vec3 {
  { x: self.x, y: self.y, z: self.z, }
}

///|
pub fn Player::max_hp(self : Player) -> Double {
  25 + 5 * self.upgrades.armor_packs.to_double()
}

///|
pub fn Player::phoenix_ready(self : Player) -> Bool {
  self.abilities.phoenix && !self.deployed && self.speed >= 3.2 - 0.01
}

///|
pub fn Player::red_contact(self : Player) -> Bool {
  self.abilities.circulation && self.overheated
}

///|
pub fn Player::contact_damage(self : Player) -> Double {
  if self.red_contact() {
    2 *
    (if self.phoenix_ready() {
      12.0
    } else if self.speed >= 1.3 {
      2.0
    } else {
      1.0
    })
  } else if self.phoenix_ready() {
    12
  } else {
    0
  }
}

///|
pub fn Player::shoot_heat(
  self : Player,
  time : Double,
  cost~ : Double = 20,
  cooldown~ : Double = 0.5,
) -> Bool {
  if self.overheated ||
    self.hp <= 0 ||
    time - self.last_shot < Double::max(cooldown, self.shot_cooldown) {
    return false
  }
  self.last_shot = time
  self.last_heat = time
  self.boost_cooling = false
  self.action_heat_at = time
  self.shot_cooldown = cooldown
  self.heat = Double::min(100, self.heat + cost)
  if self.heat >= 100 {
    self.overheated = true
  }
  true
}

///|
pub fn Player::update_heat(
  self : Player,
  dt : Double,
  time : Double,
  boost : Bool,
  moving : Bool,
) -> Unit {
  let active = boost &&
    moving &&
    self.abilities.overdrive &&
    (!self.overheated || self.abilities.circulation) &&
    !self.deployed
  let target = if active {
    if self.abilities.phoenix {
      drive_tuning.phoenix
    } else {
      drive_tuning.overdrive
    }
  } else {
    1.0
  }
  self.speed = approach(
    self.speed,
    target,
    dt *
    (drive_tuning.overdrive - 1) /
    (if active {
      drive_tuning.acceleration_time
    } else {
      drive_tuning.deceleration_time
    }),
  )
  if active {
    self.boost_cooling = true
    self.heat = Double::min(
      100,
      self.heat + drive_tuning.boost_heat_per_second * dt,
    )
    self.last_heat = time
  } else if (!boost && self.boost_cooling && time - self.action_heat_at >= 0.75) ||
    time - self.last_heat >= 0.75 {
    self.heat = Double::max(
      0,
      self.heat - 50 * (if self.upgrades.cooling { 1.25 } else { 1.0 }) * dt,
    )
    if self.heat <= 30 {
      self.overheated = false
    }
  }
  if self.heat >= 100 {
    self.overheated = true
  }
}

///|
pub fn Player::damage(
  self : Player,
  amount : Double,
  time : Double,
  hazard~ : Bool = false,
) -> Bool {
  if self.hp <= 0 || (!hazard && time < self.invincible_until) {
    return false
  }
  self.hp = Double::max(0, self.hp - amount)
  if !hazard {
    self.invincible_until = time + 0.6
  }
  true
}

///|
pub fn Player::stunned(self : Player, time : Double) -> Bool {
  self.hp > 0 && time < self.hurt_until
}

///|
pub fn Player::begin_hit(self : Player, time : Double, source : Vec2?) -> Unit {
  let delta = match source {
    Some(s) => Vec2::{ x: self.x - s.x, z: self.z - s.z, }
    None => Vec2::{ x: 0, z: 0, }
  }
  let length = delta.length()
  self.hurt_at = time
  self.hurt_until = self.invincible_until
  self.knock = if length > 0.001 {
    { x: delta.x / length, z: delta.z / length, }
  } else {
    { x: -@math.sin(self.heading), z: -@math.cos(self.heading), }
  }
}

///|
pub fn Player::hit_displacement(
  self : Player,
  time : Double,
  dt : Double,
) -> Vec2 {
  fn progress(t : Double) -> Double {
    let u = clamp((t - self.hurt_at) / 0.18, 0, 1)
    1 - (1 - u) * (1 - u)
  }
  let distance = if self.hp > 0 {
    1.2 * (progress(time) - progress(time - dt))
  } else {
    0.0
  }
  { x: self.knock.x * distance, z: self.knock.z * distance, }
}

///|
pub fn Player::hit_opacity(self : Player, time : Double) -> Double {
  if self.stunned(time) &&
    @math.floor((time - self.hurt_at) / 0.075).to_int() % 2 == 0 {
    0.3
  } else {
    1
  }
}

///|
pub fn Player::weapon_damage(
  self : Player,
  weapon : Weapon,
  base : Double,
) -> Double {
  let upgraded = match weapon {
    Cannon => self.upgrades.cannon
    Mortar => self.upgrades.mortar
    Laser => self.upgrades.laser
  }
  base * (if upgraded { 1.5 } else { 1.0 })
}

///|
pub fn Player::scope_range(self : Player, base : Double) -> Double {
  base * (if self.upgrades.scope { 1.5 } else { 1.0 })
}

///|
pub fn supported_hull(
  available : (Double, Double) -> Bool,
  x : Double,
  z : Double,
  radius~ : Double = 0.88,
) -> Bool {
  let r = radius
  for
    offset in [
      Vec2::{ x: r, z: 0, },
      { x: -r, z: 0, },
      { x: 0, z: r, },
      { x: 0, z: -r, },
      { x: r * 0.7, z: r * 0.7, },
      { x: -r * 0.7, z: -r * 0.7, },
      { x: r * 0.7, z: -r * 0.7, },
      { x: -r * 0.7, z: r * 0.7, },
    ] {
    if !available(x + offset.x, z + offset.z) {
      return false
    }
  }
  true
}

///|
pub fn Player::toggle_flotation(
  self : Player,
  available : (Double, Double) -> Bool,
) -> Bool {
  if !self.abilities.flotation || self.hp <= 0 {
    return false
  }
  if self.deployed && !supported_hull(available, self.x, self.z) {
    return false
  }
  self.deployed = !self.deployed
  self.speed = 1
  true
}

///|
#deprecated
pub extend Weapon with Eq::{equal, not_equal}

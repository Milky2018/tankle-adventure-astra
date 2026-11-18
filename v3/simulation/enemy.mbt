///|
#derive(Eq)
pub(all) enum EnemyKind {
  Hunter
  Dredger
  Scout
  Turret
  Guard
  Skirmisher
  Sniper
  Artillery
  Miner
  Welder
  Repairer
  Reflector
  Elite
  Boss
}

///|
#deprecated
pub extend EnemyKind with Eq::{equal, not_equal}

///|
#derive(Eq)
pub(all) enum Variant {
  Ordinary
  Interceptor
  Bastion
  Siege
  Prism
  Flanker
}

///|
#deprecated
pub extend Variant with Eq::{equal, not_equal}

///|
#derive(Eq)
pub(all) enum Phase {
  Idle
  Warn
  Charge
  Burst
  RailShot
  Flame
  Sweep
  Repair
  Suction
  Bite
  Vent
  Stunned
}

///|
#deprecated
pub extend Phase with Eq::{equal, not_equal}

///|
#derive(Eq)
pub(all) enum Attack {
  Torpedoes
  SuctionAttack
  ChargeAttack
  Shot
  ShieldShot
  BurstAttack
  RailAttack
  Lob
  Mine
  SweepAttack
  RepairAttack
  Reflect
  CannonAttack
  Barrage
  Batteries
  Seekers
  Fan
}

///|
#deprecated
pub extend Attack with Eq::{equal, not_equal}

///|
pub(all) struct Activation {
  position : Vec3
  radius : Double
}

///|
pub(all) struct EnemyDef {
  id : String
  kind : EnemyKind
  variant : Variant
  spawn : Vec3
  hp : Double
  guardian : Bool
  persistent : Bool
  emplacement : Bool
  magnetic_shield : Bool
  coordinated : Bool
  encounter : String?
  battle : String?
  wave : Int32
  startup : Double?
  spotter_height : Double?
  detection_range : Double?
  patrol : Rect?
  activation : Activation?
  swim_patrol : Array[Vec2]
  part_hp : Array[Double]
  core : Double?
  mirror : Bool
  reserve_for : String?
  reserve_at : Double
}

///|
pub(all) struct EnemyPart {
  mut position : Vec3
  mut hp : Double
  max_hp : Double
  radius : Double
}

///|
pub(all) struct Enemy {
  definition : EnemyDef
  mut x : Double
  mut y : Double
  mut z : Double
  mut hp : Double
  max_hp : Double
  radius : Double
  parts : Array[EnemyPart]
  mut phase : Phase
  mut timer : Double
  mut aim : Double
  mut flash : Double
  mut armor : Double
  mut ram_at : Double
  mut shield_pull : Double
  mut shield_removed : Bool
  mut awake : Bool
  mut deploy : Double
  mut deploy_until : Double
  mut attack_cycle : Int32
  mut attack : Attack?
  mut pattern : BossPattern?
  mut source : Int32?
  mut volley_sources : Array[Int32?]
  mut chain : Bool
  mut warning_age : Double
  mut volley_cycle : Int32
  mut lock : Vec3
  mut second_lock : Vec3?
  mut sweep_sign : Double
  mut sweep_right : Bool
  mut alert_until : Double
  mut last_seen : Vec3?
  mut dead_at : Double?
  mut stunned_until : Double
  mut resume_phase : Phase?
  mut resume_timer : Double
  mut swim_waypoint : Int32
  mut bite_at : Double
  mut travel_heading : Double?
  mut deployed : Bool
  mut afloat : Bool
  mut readable : Bool
  mut patient : Int32?
  mut burst_left : Int32
  mut rail_end : Vec3
  mut flame_at : Double
  mut pump_sound_at : Double
}

///|
pub fn Enemy::new(definition : EnemyDef, progress : Progress) -> Enemy {
  let p = definition.spawn
  let parts : Array[EnemyPart] = []
  for i, hp in definition.part_hp {
    parts.push({
      position: {
        x: p.x + (if i == 0 { -4 } else { 4 }),
        y: p.y + 1.7,
        z: p.z,
      },
      hp,
      max_hp: hp,
      radius: 1.45,
    })
  }
  {
    definition,
    x: p.x,
    y: p.y,
    z: p.z,
    hp: if definition.reserve_for is Some(_) ||
      (definition.persistent && progress.has(definition.id)) {
      0.0
    } else {
      definition.hp
    },
    max_hp: definition.hp,
    radius: match definition.kind {
      Boss => 3.2
      _ if definition.guardian => 2.4
      Dredger => 2.0
      Guard => 1.75
      _ => 1.35
    },
    parts,
    phase: Idle,
    timer: definition.startup.unwrap_or(1),
    aim: @math.PI / 2,
    flash: 0,
    armor: 0,
    ram_at: -10,
    shield_pull: 0,
    shield_removed: false,
    awake: definition.wave == 0 && definition.activation is None,
    deploy: 0,
    deploy_until: 0,
    attack_cycle: 0,
    attack: None,
    pattern: None,
    source: None,
    volley_sources: [],
    chain: false,
    warning_age: 0,
    volley_cycle: 0,
    lock: p,
    second_lock: None,
    sweep_sign: 1,
    sweep_right: false,
    alert_until: 0,
    last_seen: None,
    dead_at: None,
    stunned_until: 0,
    resume_phase: None,
    resume_timer: 0,
    swim_waypoint: 0,
    bite_at: -10,
    travel_heading: None,
    deployed: false,
    afloat: false,
    readable: false,
    patient: None,
    burst_left: 0,
    rail_end: p,
    flame_at: 0,
    pump_sound_at: 0,
  }
}

///|
pub fn Enemy::position(self : Enemy) -> Vec3 {
  { x: self.x, y: self.y, z: self.z, }
}

///|
pub fn Enemy::swims(self : Enemy) -> Bool {
  self.definition.kind == Hunter || self.definition.kind == Dredger
}

///|
pub fn Enemy::magnet_pullable(self : Enemy) -> Bool {
  match self.definition.kind {
    Scout | Skirmisher | Miner | Repairer => true
    _ => false
  }
}

///|
pub fn Enemy::in_suction(
  self : Enemy,
  body : Vec3,
  reach~ : Double = 11,
) -> Bool {
  let dx = body.x - self.x
  let dz = body.z - self.z
  let distance = Vec2::{ x: dx, z: dz, }.length()
  (body.y - self.y).abs() < 0.6 &&
  distance > 0.01 &&
  distance < reach &&
  (dx * @math.sin(self.aim) + dz * @math.cos(self.aim)) / distance >
  @math.cos(0.65)
}

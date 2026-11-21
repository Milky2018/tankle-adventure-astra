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
  Interceptor
  Bastion
  Siege
  Prism
  Flanker
  Prototype
  Sorter
  Overseer
  Guardian
  Keeper
}

///|
#deprecated
pub extend EnemyKind with Eq::{equal, not_equal}

///|
pub fn EnemyKind::is_boss(self : EnemyKind) -> Bool {
  self is (Prototype | Sorter | Overseer | Guardian | Keeper)
}

///|
fn EnemyKind::firing_height(self : EnemyKind) -> Double {
  match self {
    Sorter | Overseer | Keeper => 4
    Guardian => 2.8
    _ => 1.5
  }
}

///|
#derive(Eq)
pub(all) enum Phase {
  Idle
  Warn(WarningPlan)
  Charge
  Burst(Int32)
  RailShot(Vec3)
  Flame
  Sweep(Double)
  Repair(Int32)
  Suction
  Bite
  Vent(Double)
  Stunned((Phase, Double)?)
}

///|
#deprecated
pub extend Phase with Eq::{equal, not_equal}

///|
#derive(Eq)
pub(all) enum WarningPlan {
  Fire(Attack)
  Aid(Int32)
  Volley(BossPattern, Array[Int32?])
}

///|
pub fn Phase::is_warning(self : Phase) -> Bool {
  self is Warn(_)
}

///|
pub fn Phase::is_venting(self : Phase) -> Bool {
  self is Vent(_)
}

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
  Reflect
  CannonAttack
}

///|
#derive(Eq)
pub(all) enum BossAttack {
  Barrage
  Batteries
  Seekers
  Fan
  ArmSweep
}

///|
fn Enemy::enter(self : Enemy, phase : Phase, seconds : Double) -> Unit {
  self.phase = phase
  self.timer = seconds
  if phase.is_warning() {
    self.warning_age = 0
  }
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
  spawn : Vec3
  hp : Double
  persistent : Bool
  emplacement : Bool
  magnetic_shield : Bool
  coordinated : Bool
  encounter : String?
  battle : String?
  wave : Int32
  opening_crossing : Double
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
  mut weapon_pose : WeaponPose?
  mut position : Vec3
  mut hp : Double
  max_hp : Double
  radius : Double
}

///|
pub(all) struct Enemy {
  definition : EnemyDef
  priv profile : EnemySpec
  priv timing : EnemyTiming
  mut x : Double
  mut y : Double
  mut z : Double
  mut hp : Double
  max_hp : Double
  radius : Double
  parts : Array[EnemyPart]
  mut phase : Phase
  mut timer : Double
  mut weapon_pose : WeaponPose?
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
  mut crossing_left : Double
  mut swim_waypoint : Int32
  mut bite_at : Double
  mut travel_heading : Double?
  mut deployed : Bool
  mut afloat : Bool
  mut readable : Bool
  mut flame_at : Double
  mut pump_sound_at : Double
}

///|
pub fn Enemy::new(definition : EnemyDef, progress : Progress) -> Enemy {
  let p = definition.spawn
  let parts : Array[EnemyPart] = []
  for i, hp in definition.part_hp {
    parts.push({
      weapon_pose: None,
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
    profile: definition.combat_spec(),
    timing: definition.combat_timing(),
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
      Sorter | Overseer | Keeper => 3.2
      Guardian => 2.4
      Dredger => 2.0
      Guard | Bastion => 1.75
      _ => 1.35
    },
    parts,
    phase: Idle,
    timer: definition.startup.unwrap_or(1),
    weapon_pose: None,
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
    crossing_left: definition.opening_crossing,
    swim_waypoint: 0,
    bite_at: -10,
    travel_heading: None,
    deployed: false,
    afloat: false,
    readable: false,
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
pub fn Enemy::on_field(self : Enemy) -> Bool {
  self.hp > 0 && (self.definition.wave == 0 || self.awake)
}

///|
pub fn Enemy::magnet_pullable(self : Enemy) -> Bool {
  match self.definition.kind {
    Scout | Interceptor | Skirmisher | Flanker | Miner | Repairer => true
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

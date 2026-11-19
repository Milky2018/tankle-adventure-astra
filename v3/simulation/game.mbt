///|
pub(all) struct Game {
  mut aim_point : Vec3
  mut last_hit : String
  puzzles : Puzzles
  player : Player
  world : World
  progress : Progress
  commands : Commands
  enemies : Array[Enemy]
  encounters : Encounters
  hives : Array[Hive]
  pickups : Array[Pickup]
  mirrors : Array[Mirror]
  belts : Array[Belt]
  floor_heat : Array[Belt]
  currents : Array[Current]
  mut velocity : Vec2
  priv start : Vec3
  mut previous_player : Vec3
  mut held_cover : (Int32, Double)?
  beams : Array[Beam]
  shots : Array[Shot]
  mines : Array[Mine]
  effects : Array[Effect]
  mut next_projectile : Int32
  laser_path : Array[LaserSegment]
  mut magnet_end : Vec3?
  mut magnet_lock : HitTarget?
  mut death_at : Double?
  mut ending_at : Double?
  mut time : Double
}

///|
pub fn Game::new(start? : Vec3) -> Game {
  let progress = Progress::new()
  let player = Player::new()
  let hives = authored_hives()
  let hive = hives[0]
  let start = start.unwrap_or(hive.position)
  player.x = start.x
  player.y = start.y
  player.z = start.z
  player.heading = hive.heading
  player.aim = hive.heading
  {
    aim_point: { x: 0, y: 0, z: 0, },
    last_hit: "",
    puzzles: Puzzles::new(),
    player,
    start,
    progress,
    world: authored_world(),
    commands: Commands::new(authored_controls(), authored_circuits()),
    enemies: authored_enemies().map(fn(def) { Enemy::new(def, progress) }),
    encounters: Encounters::new(),
    hives,
    pickups: authored_pickups(),
    mirrors: authored_mirrors(),
    belts: authored_belts(),
    floor_heat: authored_heat(),
    currents: authored_currents(),
    velocity: { x: 0, z: 0, },
    previous_player: player.position(),
    held_cover: None,
    beams: [],
    shots: [],
    mines: [],
    effects: [],
    next_projectile: 0,
    laser_path: [],
    magnet_end: None,
    magnet_lock: None,
    death_at: None,
    ending_at: None,
    time: 0,
  }
}

///|
pub fn Game::cast(
  self : Game,
  queries : Queries,
  ray : Ray,
  range : Double,
  targets~ : Bool = true,
  refuge~ : Bool = true,
  ground~ : Bool = false,
  visible~ : (Vec3) -> Bool = fn(_) { true },
) -> Hit? {
  let mut hit = (queries.geometry)(ray, range, ground)
  let mut limit = hit.map(fn(h) { h.distance }).unwrap_or(range)
  fn accept(distance : Double?, target : HitTarget, normal : Vec3?) -> Unit {
    if distance is Some(d) && d <= limit && visible(ray.point(d)) {
      hit = Some({ distance: d, point: ray.point(d), normal, target, })
      limit = d
    }
  }
  if targets && !ground {
    for i, enemy in self.enemies {
      if enemy.hp <= 0 {
        continue
      }
      accept(
        ray.sphere(enemy.position().add({ x: 0, y: 1.5, z: 0, }), enemy.radius),
        EnemyTarget(i, None),
        None,
      )
      for j, part in enemy.parts {
        if part.hp > 0 {
          accept(
            ray.sphere(part.position, part.radius),
            EnemyTarget(i, Some(j)),
            None,
          )
        }
      }
    }
    for (id, position) in self.puzzles.targets() {
      if id == "gutter-plug" && self.puzzles.gutter.unplugged {
        continue
      }
      accept(ray.sphere(position, 0.7), PuzzleTarget(id), None)
    }
    for i, mine in self.mines {
      if !mine.disarmed {
        accept(ray.sphere(mine.position, 0.7), MineTarget(i), None)
      }
    }
    for i, shot in self.shots {
      if shot.torpedo && shot.delay <= 0 && !shot.captured {
        accept(ray.sphere(shot.position, 0.85), TorpedoTarget(i), None)
      }
    }
    for i, control in self.commands.controls {
      if control.actions.contains(Use) ||
        control.actions.contains(Dock) ||
        self.commands.active(self.progress, control.id) {
        continue
      }
      let center = control.position.add(
        control.facing.unwrap_or({ x: 0, y: 0, z: 0, }).scale(0.5),
      )
      let normal = match control.optical_normal {
        Some(n) => Some(n)
        None => control.facing
      }
      let distance = match normal {
        Some(n) => ray.plane(center, n)
        None =>
          if control.top {
            ray.plane(center, { x: 0, y: 1, z: 0, })
          } else {
            ray.sphere(center, 0.95)
          }
      }
      if (normal is Some(_) || control.top) &&
        distance is Some(d) &&
        ray.point(d).distance(center) > 0.95 {
        continue
      }
      let target = if control.mount is Some(_) &&
        normal is Some(n) &&
        ray.direction.dot(n) >= 0 {
        BlockedControl(i)
      } else {
        ControlTarget(i)
      }
      accept(distance, target, normal)
    }
  }
  if refuge && !ground {
    accept(
      refuge_ray_distance(
        ray.origin,
        ray.direction,
        limit,
        self.hives,
        self.progress,
      ),
      Refuge,
      None,
    )
  }
  hit
}

///|
pub fn Game::hurt(self : Game, amount : Double, source : Vec3) -> Bool {
  if refuge_at(self.player.position(), self.hives, self.progress) is Some(_) {
    return false
  }
  if !self.player.damage(amount, self.time) {
    return false
  }
  self.player.begin_hit(self.time, Some({ x: source.x, z: source.z, }))
  self.effects.push(Hurt)
  true
}

///|
pub fn Game::hit_enemy(
  self : Game,
  index : Int32,
  amount : Double,
  origin : Vec3,
  kind : DamageKind,
  part? : Int32,
) -> Double {
  let enemy = self.enemies[index]
  if enemy.hp <= 0 {
    return 0
  }
  let id = enemy.definition.id
  let arena = self.encounters.for_boss(enemy)
  if arena is Some(a) && self.progress.combat_arena != Some(a.id) {
    enemy.armor = 0.2
    return 0
  }
  if refuge_at(origin, self.hives, self.progress) is Some(_) ||
    refuge_at(enemy.position(), self.hives, self.progress) is Some(_) {
    return 0
  }
  self.encounters.index_roster(self.enemies)
  self.alert_squad(index, origin)
  if enemy.armor_absorbs(amount, origin, kind, part_index?=part) {
    enemy.armor = 0.2
  }
  let dealt = enemy.damage_amount(amount, origin, kind, part_index?=part)
  enemy.hp = Double::max(0, enemy.hp - dealt)
  enemy.flash = 0.14
  if dealt > 0 && kind == MortarHit && !enemy.definition.kind.is_boss() {
    enemy.stunned_until = self.time + enemy.timing.mortar_flinch
  }
  if enemy.hp == 0 {
    enemy.dead_at = Some(self.time)
    self.effects.push(Killed(index))
    if enemy.definition.persistent || arena is Some(_) {
      self.commands.complete(
        self.progress,
        id,
        self.time,
        effects=arena.map(fn(a) { a.victory_effects }).unwrap_or([]),
      )
      |> ignore
      if arena is Some(a) && a.id != id {
        self.progress.complete(a.id) |> ignore
      }
    }
  }
  dealt
}

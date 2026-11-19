///|
fn Game::begin_warning(self : Game, index : Int32, clear : Bool) -> Unit {
  let e = self.enemies[index]
  let kind = e.definition.kind
  let sighting = if self.progress.combat_arena == Some(e.definition.id) || clear {
    self.player.position()
  } else {
    e.last_seen.unwrap_or(self.player.position())
  }
  if e.definition.id == "prototype" {
    e.attack_cycle += 1
    e.attack = Some(
      if e.attack_cycle % 2 == 1 {
        CannonAttack
      } else {
        ChargeAttack
      },
    )
  }
  e.phase = Warn
  e.warning_age = 0
  e.volley_cycle += 1
  e.timer = if e.definition.id == "prototype" {
    if e.hp / e.max_hp < 0.55 {
      0.85
    } else {
      1.05
    }
  } else {
    e.spec().warn
  }
  e.lock = {
    ..sighting,
    y: sighting.y +
    (if kind == Artillery || kind == Miner { 0.05 } else { 1.2 }),
  }
  if e.definition.variant == Siege {
    let next = if clear {
      self.predict(e.spec().lob_duration + 0.45)
    } else {
      sighting
    }
    e.second_lock = Some({ ..next, y: next.y + 0.05, })
  }
  if kind == Miner {
    let fraction = Double::min(
      1,
      8 / Double::max(0.001, horizontal_distance(e.lock, e.position())),
    )
    e.lock = {
      ..e.lock,
      x: e.x + (e.lock.x - e.x) * fraction,
      z: e.z + (e.lock.z - e.z) * fraction,
    }
  }
}

///|
fn Game::release_warning(
  self : Game,
  queries : Queries,
  index : Int32,
  clear : Bool,
) -> Unit {
  let e = self.enemies[index]
  let kind = e.definition.kind
  let spec = e.spec()
  let variant = e.definition.variant
  if e.definition.id == "prototype" && e.attack == Some(CannonAttack) {
    for offset in [-0.18, 0.0, 0.18] {
      self.shoot_enemy(queries, index, offset~, speed=23)
    }
    e.phase = Vent
    e.timer = spec.recovery
    return
  }
  match spec.attack {
    Torpedoes => {
      let origin = e
        .position()
        .add({ x: 0, y: if e.afloat { 0.55 } else { 1.5 }, z: 0, })
      let target = if e.afloat { { ..e.lock, y: origin.y, } } else { e.lock }
      for delay in [0.0, 0.65] {
        self.shoot_enemy(
          queries,
          index,
          origin~,
          target~,
          delay~,
          torpedo=e.afloat,
          speed=if e.afloat { 12 } else { 18 },
          range=30,
        )
      }
      e.phase = Vent
      e.timer = spec.recovery
    }
    SuctionAttack => {
      e.phase = Suction
      e.timer = 2.8
    }
    ChargeAttack => {
      e.phase = Charge
      e.timer = if kind == Elite { 1.2 } else { 0.75 }
    }
    SweepAttack => {
      e.phase = Flame
      e.timer = 1.8
    }
    RepairAttack => {
      e.phase = Repair
      e.timer = 1.6
    }
    RailAttack => {
      let origin = e.position().add({ x: 0, y: 1.5, z: 0, })
      let direction = e.lock.sub(origin).normalized()
      e.rail_end = origin.add(
        direction.scale(
          self
          .cast(
            queries,
            { origin, direction, },
            86,
            targets=false,
            refuge=false,
          )
          .map(fn(hit) { hit.distance })
          .unwrap_or(86),
        ),
      )
      self.shoot_enemy(queries, index)
      e.phase = RailShot
      e.timer = 0.18
    }
    Lob => {
      let origin = e.position().add({ x: 0, y: 1.5, z: 0, })
      for target in barrage_targets(origin, e.lock) {
        self.shoot_enemy(
          queries,
          index,
          target=target.position,
          delay=target.delay,
        )
      }
      if variant == Siege && e.second_lock is Some(second) {
        for target in barrage_targets(origin, second) {
          self.shoot_enemy(
            queries,
            index,
            target=target.position,
            delay=0.5 + target.delay,
          )
        }
      }
      e.phase = Vent
      e.timer = spec.recovery
    }
    BurstAttack => {
      if clear {
        let next = self.predict(0.3, limit=6)
        e.lock = { ..next, y: self.player.y + 1.2, }
      }
      self.shoot_enemy(queries, index, offset=-0.08)
      e.phase = Burst
      e.timer = 0.18
      e.burst_left = if variant == Flanker { 5 } else { 2 }
    }
    _ => {
      self.shoot_enemy(
        queries,
        index,
        offset=if spec.attack == Reflect { -0.1 } else { 0 },
      )
      if spec.attack == Reflect {
        self.shoot_enemy(queries, index, offset=0.1)
      }
      if variant == Prism {
        for offset in [-0.3, 0.3] {
          self.shoot_enemy(queries, index, offset~)
        }
      }
      if variant == Bastion {
        for offset in [-0.18, 0.18] {
          self.shoot_enemy(queries, index, offset~)
        }
      }
      e.phase = Vent
      e.timer = if e.definition.guardian { 2.2 } else { spec.recovery }
    }
  }
}

///|
fn Game::idle_enemy(
  self : Game,
  index : Int32,
  distance : Double,
  clear : Bool,
  dt : Double,
) -> Unit {
  let e = self.enemies[index]
  let kind = e.definition.kind
  let spec = e.spec()
  let p = self.player
  e.aim = @math.atan2(p.x - e.x, p.z - e.z)
  match kind {
    Repairer => {
      let ally = wounded_ally(index, self.enemies)
      if ally is Some(i) &&
        horizontal_distance(self.enemies[i].position(), e.position()) > 8 {
        self.approach_enemy(index, self.enemies[i].position(), dt)
      }
      if ally is None ||
        (
          ally is Some(i) &&
          horizontal_distance(self.enemies[i].position(), e.position()) > 10
        ) {
        e.timer = Double::max(e.timer, 0.2)
      } else {
        e.patient = ally
      }
    }
    Hunter if e.afloat && !p.afloat => {
      self.approach_enemy(index, p.position(), dt)
      e.timer = Double::max(e.timer, 0.2)
    }
    Sniper | Artillery | Miner if distance <
      (if kind == Sniper { 11 } else if kind == Artillery { 9 } else { 8 }) &&
      horizontal_distance(e.position(), e.definition.spawn) < 28 =>
      self.move_enemy(index, e.aim + @math.PI, spec.speed, dt)
    Hunter if distance < spec.reach =>
      self.move_enemy(
        index,
        e.aim +
        (if e.definition.id.length() % 2 == 1 { 1.0 } else { -1.0 }) *
        @math.PI /
        2,
        spec.speed * (if e.afloat { 1.0 } else { 0.55 }),
        dt,
      )
    _ =>
      if spec.speed > 0 &&
        !e.definition.guardian &&
        distance > (if kind == Guard { 5 } else { spec.reach }) {
        self.approach_enemy(index, p.position(), dt)
        if distance > spec.reach {
          e.timer = Double::max(e.timer, 0.2)
        }
      }
  }
  if kind == Dredger && (!p.afloat || distance > spec.reach) {
    e.timer = Double::max(e.timer, 0.2)
  }
  if e.timer <= 0 && can_telegraph(index, self.enemies) {
    self.begin_warning(index, clear)
  }
}

///|
fn Game::warning_enemy(
  self : Game,
  queries : Queries,
  index : Int32,
  distance : Double,
  clear : Bool,
  dt : Double,
) -> Unit {
  let e = self.enemies[index]
  let p = self.player
  let kind = e.definition.kind
  if kind == Welder && e.timer > 0.35 && clear {
    if distance > 6 {
      self.approach_enemy(index, p.position(), dt)
    }
    e.aim = @math.atan2(p.x - e.x, p.z - e.z)
    e.lock = p.position().add({ x: 0, y: 1.2, z: 0, })
  }
  if kind == Sniper && e.timer > 0.8 && clear {
    e.lock = p.position().add({ x: 0, y: 1.2, z: 0, })
    e.aim = @math.atan2(p.x - e.x, p.z - e.z)
  }
  if clear && kind == Artillery && e.timer > 0.45 {
    let next = if e.definition.variant == Siege || e.volley_cycle % 2 == 1 {
      p.position()
    } else {
      self.predict(2.35)
    }
    e.lock = { ..next, y: p.y + 0.05, }
    if e.definition.variant == Siege {
      let ahead = self.predict(e.spec().lob_duration + 0.45)
      e.second_lock = Some({ ..ahead, y: p.y + 0.05, })
    }
  }
  if clear && e.definition.variant == Interceptor && e.timer > 0.35 {
    let next = self.predict(0.55, limit=10)
    e.lock = { ..next, y: p.y + 1.2, }
    e.aim = @math.atan2(next.x - e.x, next.z - e.z)
  }
  if e.timer <= 0 {
    self.release_warning(queries, index, clear)
  }
}

///|
fn Game::charge_enemy(self : Game, index : Int32, dt : Double) -> Unit {
  let e = self.enemies[index]
  let before = e.position()
  let body = enemy_hull(e, false)
  let speed = e.spec().charge_speed.unwrap_or(
    if e.definition.id == "prototype" {
      21
    } else if e.definition.kind == Elite {
      19
    } else {
      13
    },
  )
  self.world.move_hull(
    body,
    @math.sin(e.aim) * speed * dt,
    @math.cos(e.aim) * speed * dt,
    self.progress,
  )
  |> ignore
  let next = Vec3::{ x: body.x, y: body.y, z: body.z, }
  let allowed = e.definition.patrol is None ||
    (e.definition.patrol is Some(rect) && rect.contains(body.x, body.z))
  if allowed &&
    refuge_at(next, self.hives, self.progress, radius=18 + e.radius) is None {
    e.x = body.x
    e.y = body.y
    e.z = body.z
  }
  let blocked = horizontal_distance(e.position(), before) < 0.001
  if e.timer <= 0 || blocked {
    if e.definition.id == "prototype" && blocked {
      self.effects.push(Armored(e.position()))
    }
    if e.definition.id == "prototype" &&
      !blocked &&
      e.hp / e.max_hp < 0.55 &&
      !e.chain {
      e.chain = true
      e.phase = Warn
      e.timer = 0.85
      e.aim = @math.atan2(self.player.x - e.x, self.player.z - e.z)
      e.lock = self.player.position().add({ x: 0, y: 1.2, z: 0, })
    } else {
      e.chain = false
      e.phase = Vent
      e.timer = e.spec().recovery
    }
  }
}

///|
fn Game::active_enemy(
  self : Game,
  queries : Queries,
  index : Int32,
  distance : Double,
  clear : Bool,
  dt : Double,
) -> Unit {
  let e = self.enemies[index]
  let spec = e.spec()
  e.timer -= dt
  if e.definition.id == "keeper" ||
    e.definition.id == "foundry" ||
    e.definition.guardian {
    self.update_boss(queries, index, clear)
    return
  }
  if e.definition.id == "sorter" {
    self.update_sorter(queries, index, dt, clear)
    return
  }
  match e.phase {
    Idle => self.idle_enemy(index, distance, clear, dt)
    Warn => self.warning_enemy(queries, index, distance, clear, dt)
    Charge => self.charge_enemy(index, dt)
    Burst =>
      if e.timer <= 0 {
        if clear {
          let next = self.predict(0.3, limit=6)
          e.lock = { ..next, y: self.player.y + 1.2, }
        }
        let offset = if e.definition.variant == Flanker {
          if e.burst_left % 2 == 1 {
            0.08
          } else {
            -0.08
          }
        } else if e.burst_left == 2 {
          0.0
        } else {
          0.08
        }
        self.shoot_enemy(queries, index, offset~)
        e.burst_left -= 1
        e.timer = 0.18
        if e.burst_left == 0 {
          e.phase = Vent
          e.timer = spec.recovery
        }
      }
    RailShot => {
      let origin = e.position().add({ x: 0, y: 1.5, z: 0, })
      self.beams.push({
        enemy: index,
        origin,
        direction: e.rail_end.sub(origin).normalized(),
        length: e.rail_end.distance(origin),
        width: 0.08,
      })
      if e.timer <= 0 {
        e.phase = Vent
        e.timer = spec.recovery
      }
    }
    Flame => {
      if horizontal_distance(e.position(), e.definition.spawn) < 32 {
        self.move_enemy(index, e.aim, spec.speed * 0.55, dt)
      }
      self.beam(
        queries,
        index,
        e.aim - 0.7 + (1.8 - e.timer) / 1.8 * 1.4,
        spec.reach,
        1,
        5,
      )
      |> ignore
      if e.timer <= 0 {
        e.phase = Vent
        e.timer = spec.recovery
      }
    }
    Suction | Bite => self.suction_enemy(queries, index, dt)
    Repair => {
      if e.patient is Some(i) && self.enemies[i].hp > 0 {
        let ally = self.enemies[i]
        let origin = e.position().add({ x: 0, y: 1.5, z: 0, })
        let end = ally.position().add({ x: 0, y: 1.5, z: 0, })
        if origin.distance(end) < 11 &&
          self.clear_sight(queries, origin, end, clearance=0.8) {
          ally.hp = Double::min(ally.max_hp, ally.hp + dt * 0.8)
          self.beams.push({
            enemy: index,
            origin,
            direction: end.sub(origin).normalized(),
            length: end.distance(origin),
            width: 0.06,
          })
        }
      }
      if e.timer <= 0 {
        e.phase = Vent
        e.timer = spec.recovery
      }
    }
    _ =>
      if e.timer <= 0 {
        e.phase = Idle
        e.timer = if e.definition.variant != Ordinary {
          0.12
        } else {
          0.25 + (e.definition.id.length() % 3).to_double() * 0.1
        }
      }
  }
}

///|
fn Game::suction_enemy(
  self : Game,
  queries : Queries,
  index : Int32,
  dt : Double,
) -> Unit {
  let e = self.enemies[index]
  fn exposed(position : Vec3) -> Bool {
    e.in_suction(position) &&
    (
      self.world.support(position.x, position.z, position.y, true)
      is Some(support) &&
      support.deck.water
    ) &&
    self.clear_sight(
      queries,
      e.position().add({ x: 0, y: 0.6, z: 0, }),
      position.add({ x: 0, y: 0.6, z: 0, }),
      clearance=0.3,
    )
  }
  let p = self.player
  if e.phase == Suction {
    for i, wreck in self.enemies {
      if i != index &&
        wreck.hp <= 0 &&
        wreck.swims() &&
        exposed(wreck.position()) {
        self.move_enemy(i, @math.atan2(e.x - wreck.x, e.z - wreck.z), 1.2, dt)
      }
    }
    if p.afloat &&
      exposed(p.position()) &&
      !self.enemies.any(fn(other) {
        other.definition.id < e.definition.id &&
        other.hp > 0 &&
        other.definition.kind == Dredger &&
        other.phase == Suction &&
        other.in_suction(p.position())
      }) {
      let angle = @math.atan2(e.x - p.x, e.z - p.z)
      self.world.move_player(
        p,
        @math.sin(angle) * 2.4 * dt,
        @math.cos(angle) * 2.4 * dt,
        self.progress,
      )
      |> ignore
    }
    if e.timer <= 0 {
      e.phase = Bite
      e.timer = 0.8
    }
  } else if e.timer <= 0 {
    if p.afloat &&
      e.in_suction(p.position(), reach=3.5) &&
      exposed(p.position()) {
      self.hurt(5, e.position()) |> ignore
    }
    e.bite_at = self.time
    e.phase = Vent
    e.timer = e.spec().recovery
  }
}

///|
pub fn Game::update_enemies(
  self : Game,
  queries : Queries,
  dt : Double,
) -> Unit {
  let p = self.player
  let displacement = p.position().sub(self.previous_player)
  let valid = dt > 0 &&
    Vec2::{ x: displacement.x, z: displacement.z, }.length() <= 48 * dt
  self.velocity = if valid {
    { x: displacement.x / dt, z: displacement.z / dt, }
  } else {
    { x: 0, z: 0, }
  }
  self.previous_player = p.position()
  self.beams.clear()
  let resting = refuge_at(p.position(), self.hives, self.progress) is Some(_)
  for
    event in self.encounters.update_arenas(
      self.enemies,
      self.progress,
      p,
      self.time,
    ) {
    if event is Released(id) {
      fn owned(owner : String) -> Bool {
        owner == id ||
        self.enemies.any(fn(e) {
          e.definition.id == owner && e.definition.reserve_for == Some(id)
        })
      }
      for shot in self.shots {
        if shot.owner is Some(owner) && owned(owner) {
          shot.captured = true
        }
      }
      for mine in self.mines {
        if owned(mine.owner) {
          mine.disarmed = true
        }
      }
    }
  }
  self.encounters.update_waves(self.enemies, p, resting, dt, self.time)
  if !self.commands.active(self.progress, "cargo-battery") &&
    self.enemies
    .filter(fn(e) { e.definition.battle == Some("cargo-battery") })
    .all(fn(e) { e.hp <= 0 }) {
    self.commands.complete(
      self.progress,
      "cargo-battery",
      self.time,
      delayed=true,
    )
    |> ignore
  }
  for index, e in self.enemies {
    let kind = e.definition.kind
    e.deployed = e.swims()
    if !e.definition.emplacement {
      let drift = self.drift(e.position(), e.deployed)
      let body = enemy_hull(e, e.deployed)
      self.world.move_hull(body, drift.x * dt, drift.z * dt, self.progress)
      |> ignore
      let next = Vec3::{ x: body.x, y: body.y, z: body.z, }
      if refuge_at(next, self.hives, self.progress, radius=18 + e.radius)
        is None &&
        (kind != Dredger || body.afloat) {
        e.x = body.x
        e.y = body.y
        e.z = body.z
        e.afloat = body.afloat
      }
    }
    if e.hp <= 0 {
      continue
    }
    e.warning_age = if e.phase == Warn { e.warning_age + dt } else { 0 }
    if self.encounters.arenas.any(fn(a) { a.id == e.definition.id }) &&
      self.progress.combat_arena != Some(e.definition.id) {
      e.readable = false
      continue
    }
    if e.definition.guardian && e.phase == Idle {
      e.aim = @math.atan2(p.x - e.x, p.z - e.z)
    }
    e.flash = Double::max(0, e.flash - dt)
    e.armor = Double::max(0, e.armor - dt)
    let spec = e.spec()
    let origin = e
      .position()
      .add({
        x: 0,
        y: if kind == Boss {
          4
        } else if e.definition.guardian {
          2.8
        } else {
          1.5
        },
        z: 0,
      })
    let target = p.position().add({ x: 0, y: 1.2, z: 0, })
    let distance = origin.distance(target)
    let retaliating = self.progress.combat_arena == Some(e.definition.id) &&
      (e.y - p.y).abs() < 4
    let range = if retaliating { 94.0 } else { Double::max(30, spec.reach) }
    if distance > Double::max(45, range + 8) {
      e.phase = Idle
      e.timer = if e.definition.variant == Ordinary { 0.55 } else { 0.2 }
      e.readable = false
      continue
    }
    if e.crossing_left > 0 && e.stunned_until <= self.time {
      if !resting && p.hp > 0 && (distance < 19 || e.awake) {
        e.aim = @math.PI / 2
        self.move_enemy(index, e.aim, 3.6, dt)
        e.crossing_left -= dt
      }
      continue
    }
    let observation = e.definition.spotter_height
      .map(fn(y) { e.position().add({ x: 0, y, z: 0, }) })
      .unwrap_or(origin)
    let clear = self.clear_sight(queries, observation, target)
    if !e.awake &&
      e.definition.wave == 0 &&
      e.definition.reserve_for is None &&
      p.hp > 0 &&
      !resting &&
      clear &&
      distance <= e.definition.detection_range.unwrap_or(spec.reach * 0.8) {
      wake_squad(e, self.enemies)
    }
    if !e.awake {
      e.readable = false
      continue
    }
    e.readable = true
    let supported = (kind == Artillery && e.alert_until > self.time) ||
      (kind == Repairer && wounded_ally(index, self.enemies) is Some(_))
    let committed = match e.phase {
      Idle | Stunned => false
      _ => true
    }
    let active = distance < range &&
      p.hp > 0 &&
      !resting &&
      (
        clear ||
        ((supported || committed || retaliating) && (e.y - p.y).abs() < 4)
      )
    if active && clear {
      self.alert_squad(index)
    }
    if e.stunned_until > self.time {
      if e.definition.variant != Ordinary && e.phase != Stunned {
        e.resume_phase = Some(e.phase)
        e.resume_timer = e.timer
      }
      e.phase = Stunned
      e.timer = 0.5
    } else if e.phase == Stunned && e.resume_phase is Some(phase) {
      e.phase = phase
      e.timer = e.resume_timer
      e.resume_phase = None
    } else if !active {
      if resting {
        e.alert_until = 0
        e.last_seen = None
        if spec.speed > 0 &&
          horizontal_distance(e.position(), e.definition.spawn) > 1 {
          self.move_enemy(
            index,
            @math.atan2(e.definition.spawn.x - e.x, e.definition.spawn.z - e.z),
            spec.speed,
            dt,
          )
        }
      }
      if !resting &&
        p.hp > 0 &&
        spec.speed > 0 &&
        !e.definition.guardian &&
        self.time < e.alert_until &&
        e.last_seen is Some(last) &&
        horizontal_distance(e.position(), last) > 3 {
        self.approach_enemy(index, last, dt)
      }
      if !resting &&
        !e.definition.swim_patrol.is_empty() &&
        e.alert_until <= self.time {
        let point = e.definition.swim_patrol[e.swim_waypoint]
        if point.distance({ x: e.x, z: e.z, }) < 1.5 {
          e.swim_waypoint = (e.swim_waypoint + 1) %
            e.definition.swim_patrol.length()
        } else {
          self.move_enemy(
            index,
            @math.atan2(point.x - e.x, point.z - e.z),
            spec.speed * 0.45,
            dt,
          )
        }
      }
      e.phase = Idle
      e.timer = if e.definition.variant == Ordinary { 0.55 } else { 0.2 }
    } else {
      self.active_enemy(queries, index, distance, clear, dt)
    }
    if active {
      self.reposition_enemy(queries, index, distance, dt)
    }
    self.enemy_contact(index)
  }
}

///|
fn Game::reposition_enemy(
  self : Game,
  queries : Queries,
  index : Int32,
  distance : Double,
  dt : Double,
) -> Unit {
  let e = self.enemies[index]
  let kind = e.definition.kind
  let spec = e.spec()
  let parity = if e.definition.id.length() % 2 == 1 { 1.0 } else { -1.0 }
  if kind == Skirmisher &&
    e.phase != Stunned &&
    horizontal_distance(e.position(), e.definition.spawn) < 28 {
    let origin = e.position().add({ x: 0, y: 1.5, z: 0, })
    let incoming = self.shots
      .iter()
      .find_first(fn(s) {
        s.mortar &&
        s.owner is None &&
        s.age > 0.2 &&
        (s.target.y - e.y).abs() < 4 &&
        horizontal_distance(s.target, e.position()) < 5 &&
        self.clear_sight(queries, origin, s.position, clearance=0.3)
      })
    if incoming is Some(shot) {
      self.move_enemy(
        index,
        @math.atan2(e.x - shot.target.x, e.z - shot.target.z),
        spec.speed,
        dt,
      )
    } else if (
        e.phase == Idle ||
        e.phase == Warn ||
        e.phase == Burst ||
        e.phase == Vent
      ) &&
      (e.phase != Idle || distance < 20) {
      self.move_enemy(
        index,
        @math.atan2(self.player.x - e.x, self.player.z - e.z) +
        parity * @math.PI / 2,
        spec.speed,
        dt,
      )
    }
  }
  if e.phase == Vent &&
    spec.speed > 0 &&
    !e.definition.guardian &&
    kind != Scout &&
    kind != Elite &&
    kind != Skirmisher &&
    kind != Hunter &&
    kind != Dredger {
    if kind == Repairer {
      if wounded_ally(index, self.enemies) is Some(i) {
        self.approach_enemy(index, self.enemies[i].position(), dt)
      }
    } else if (kind == Guard || kind == Welder) && distance > 5 {
      self.approach_enemy(index, self.player.position(), dt)
    } else if horizontal_distance(e.position(), e.definition.spawn) < 28 {
      self.move_enemy(
        index,
        @math.atan2(self.player.x - e.x, self.player.z - e.z) +
        (if distance < 10 { @math.PI } else { parity * @math.PI / 2 }),
        spec.speed,
        dt,
      )
    }
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
      if e.definition.id == "prototype" && e.phase == Charge {
        e.phase = Vent
        e.timer = 1.6
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

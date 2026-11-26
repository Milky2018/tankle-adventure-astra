///|
fn Game::idle_enemy(
  self : Game,
  index : Int32,
  distance : Double,
  observation : Observation,
  dt : Double,
) -> Unit {
  let e = self.enemies[index]
  let kind = e.definition.kind
  let spec = e.spec()
  let p = self.player
  if spec.style is RepairAllies {
    if observation is Visible(seen) {
      e.aim = @math.atan2(seen.position.x - e.x, seen.position.z - e.z)
    }
    guard wounded_ally(index, self.enemies) is Some(i) else {
      e.timer = Double::max(e.timer, 0.2)
      return
    }
    let patient = self.enemies[i].position()
    if horizontal_distance(patient, e.position()) > 8 {
      self.approach_enemy(index, patient, dt)
    }
    if horizontal_distance(patient, e.position()) > spec.reach {
      e.timer = Double::max(e.timer, 0.2)
      return
    }
    e.aim = @math.atan2(patient.x - e.x, patient.z - e.z)
    if e.timer <= 0 {
      e.enter(Warn(Aid(i)), spec.warn)
    }
    return
  }
  guard observation.position() is Some(target) else { return }
  let attack = match spec.style {
    Weapon(attack) => attack
    BossCycle => {
      if kind == Guardian {
        e.aim = @math.atan2(target.x - e.x, target.z - e.z)
      }
      if e.timer <= 0 {
        e.begin_boss_attack(target, observation)
      }
      return
    }
    RepairAllies => return
  }
  e.aim = @math.atan2(target.x - e.x, target.z - e.z)
  match kind {
    Hunter if e.afloat && !p.afloat => {
      self.approach_enemy(index, target, dt)
      e.timer = Double::max(e.timer, 0.2)
    }
    Sniper | Artillery | Siege | Miner if distance <
      (if kind == Sniper {
        11
      } else if kind is (Artillery | Siege) {
        9
      } else {
        8
      }) &&
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
        kind != Guardian &&
        distance > (if kind is (Guard | Bastion) { 5 } else { spec.reach }) {
        self.approach_enemy(index, target, dt)
        if distance > spec.reach {
          e.timer = Double::max(e.timer, 0.2)
        }
      }
  }
  if kind == Dredger && (!p.afloat || distance > spec.reach) {
    e.timer = Double::max(e.timer, 0.2)
  }
  if e.position().distance(target) <= spec.reach &&
    e.timer <= 0 &&
    can_telegraph(index, self.enemies) {
    self.begin_warning(index, attack, target, observation)
  }
}

///|
fn Game::active_enemy(
  self : Game,
  queries : Queries,
  index : Int32,
  distance : Double,
  observation : Observation,
  dt : Double,
) -> Unit {
  let e = self.enemies[index]
  let spec = e.spec()
  e.timer -= dt
  match e.phase {
    Idle => self.idle_enemy(index, distance, observation, dt)
    Warn(Fire(attack)) =>
      self.warning_enemy(queries, index, distance, observation, attack, dt)
    Warn(Aid(i)) => if e.timer <= 0 { e.enter(Repair(i), 1.6) }
    Warn(Volley(pattern, sources)) =>
      if e.timer <= 0 {
        if pattern.kind == Sidestep {
          // Keep the rear intake in reach of the court's fixed flank mirrors.
          let home = e.definition.spawn
          let heading = if horizontal_distance(e.position(), home) > 3.6 {
            @math.atan2(home.x - e.x, home.z - e.z)
          } else {
            e.aim + e.sweep_sign * @math.PI / 2
          }
          e.enter(Traverse(heading, 4.0), 0.95)
        } else if pattern.kind.uses_arm() {
          e.enter(Sweep(pattern.recovery), 1.8)
        } else {
          self.launch_boss(queries, index, pattern, sources)
          e.enter(Vent(0.18), pattern.recovery)
        }
      }
    Sweep(recovery) => self.sweep_boss(queries, index, recovery)
    Traverse(direction, speed) => {
      self.move_enemy(index, direction, speed, dt)
      if e.timer <= 0 {
        e.enter(Idle, 0.36)
      }
    }
    Charge => self.charge_enemy(index, observation, dt)
    Burst(left) =>
      if e.timer <= 0 {
        if observation is Visible(seen) {
          let next = seen.predict(0.3, limit=6)
          e.lock = { ..next, y: next.y + 1.2, }
        }
        let offset = if e.definition.kind == Flanker {
          if left % 2 == 1 {
            0.08
          } else {
            -0.08
          }
        } else if left == 2 {
          0.0
        } else {
          0.08
        }
        self.shoot_enemy(
          queries,
          index,
          offset~,
          side=if left % 2 == 0 { 1 } else { -1 },
        )
        if left > 1 {
          e.enter(Burst(left - 1), 0.18)
        } else {
          e.enter(Vent(e.timing.post_recovery), spec.recovery)
        }
      }
    RailShot(end) => {
      let origin = e.aim_weapon(self.time, Some(e.lock)).muzzle
      self.beams.push({
        enemy: index,
        origin,
        direction: end.sub(origin).normalized(),
        length: end.distance(origin),
        kind: RailTracer,
      })
      if e.timer <= 0 {
        e.enter(Vent(e.timing.post_recovery), spec.recovery)
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
        emission=CuttingTorch,
      )
      |> ignore
      if e.timer <= 0 {
        e.enter(Vent(e.timing.post_recovery), spec.recovery)
      }
    }
    Suction | Bite => self.suction_enemy(queries, index, dt)
    Repair(i) => {
      if self.enemies[i].hp > 0 {
        let ally = self.enemies[i]
        let end = ally.position().add({ x: 0, y: 1.5, z: 0, })
        let origin = e.aim_weapon(self.time, Some(end)).muzzle
        if origin.distance(end) < 11 &&
          self.clear_sight(queries, origin, end, clearance=0.8) {
          ally.hp = Double::min(ally.max_hp, ally.hp + dt * 0.8)
          self.beams.push({
            enemy: index,
            origin,
            direction: end.sub(origin).normalized(),
            length: end.distance(origin),
            kind: RepairArc,
          })
        }
      }
      if e.timer <= 0 {
        e.enter(Vent(e.timing.post_recovery), spec.recovery)
      }
    }
    Vent(delay) => if e.timer <= 0 { e.enter(Idle, delay) }
    Stunned(_) => if e.timer <= 0 { e.enter(Idle, e.timing.post_recovery) }
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
  self.encounters.index_roster(self.enemies)
  self.advance_encounters(resting, dt)
  for index, e in self.enemies {
    self.update_enemy(queries, index, e, resting, dt)
  }
}

///|
fn Game::update_enemy(
  self : Game,
  queries : Queries,
  index : Int32,
  e : Enemy,
  resting : Bool,
  dt : Double,
) -> Unit {
  let p = self.player
  let kind = e.definition.kind
  if e.definition.wave > 0 && !e.awake {
    return
  }
  self.drift_enemy(e, dt)
  if e.hp <= 0 {
    return
  }
  e.warning_age = if e.phase.is_warning() { e.warning_age + dt } else { 0 }
  let arena = self.encounters.for_boss(e)
  if arena is Some(a) && self.progress.combat_arena != Some(a.id) {
    e.readable = false
    return
  }
  e.jam = Double::max(0, e.jam - dt)
  for part in e.parts {
    part.recoil = Double::max(0, part.recoil - dt)
  }
  e.flash = Double::max(0, e.flash - dt)
  e.armor = Double::max(0, e.armor - dt)
  let spec = e.spec()
  let origin = e.position().add({ x: 0, y: kind.firing_height(), z: 0, })
  let target = p.position().add({ x: 0, y: 1.2, z: 0, })
  let distance = origin.distance(target)
  let retaliating = arena is Some(_) && (e.y - p.y).abs() < 4
  let range = if retaliating { 94.0 } else { Double::max(30, spec.reach) }
  if distance > Double::max(45, range + 8) {
    e.enter(Idle, e.timing.reacquire_delay)
    e.readable = false
    return
  }
  if e.crossing_left > 0 && e.stunned_until <= self.time {
    if !resting && p.hp > 0 && (distance < 19 || e.awake) {
      e.aim = @math.PI / 2
      self.move_enemy(index, e.aim, 3.6, dt)
      e.crossing_left -= dt
    }
    return
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
    self.encounters.wake_squad(e)
  }
  if !e.awake {
    e.readable = false
    return
  }
  e.readable = true
  let sighting : Observation = if clear {
    Visible({ position: p.position(), velocity: self.velocity, })
  } else if e.alert_until > self.time && e.last_seen is Some(last) {
    Remembered(last)
  } else {
    Unseen
  }
  let supported = (kind is (Artillery | Siege) && e.alert_until > self.time) ||
    (kind == Repairer && wounded_ally(index, self.enemies) is Some(_))
  let committed = match e.phase {
    Idle | Stunned(_) => false
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
    self.alert_squad(index, p.position())
  }
  let shots_before = self.next_projectile
  if e.stunned_until > self.time {
    if !(e.phase is Stunned(_)) {
      let interrupted = if e.timing.resume_after_flinch {
        Some((e.phase, e.timer))
      } else {
        None
      }
      e.phase = Stunned(interrupted)
    }
    e.timer = 0.5
  } else if e.phase is Stunned(Some((phase, timer))) {
    e.enter(phase, timer)
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
      kind != Guardian &&
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
    e.enter(Idle, e.timing.reacquire_delay)
  } else {
    self.active_enemy(queries, index, distance, sighting, dt)
  }
  if active && self.next_projectile == shots_before {
    self.reposition_enemy(queries, index, distance, sighting, dt)
  }
  match e.phase {
    Warn(Fire(SweepAttack)) =>
      e.aim_weapon(self.time, None, heading=e.aim - 0.7) |> ignore
    Warn(Fire(ChargeAttack | SuctionAttack)) | Idle | Charge | Bite | Suction =>
      e.weapon_pose = None
    Warn(Aid(i)) =>
      e.aim_weapon(
        self.time,
        Some(self.enemies[i].position().add({ x: 0, y: 1.5, z: 0, })),
      )
      |> ignore
    Warn(Volley({ kind: ArmSweep | BackSweep | ArmThrust, .. }, _)) =>
      e.weapon_pose = None
    Warn(Volley(pattern, sources)) if sources.any(fn(p) { p is Some(_) }) =>
      for part in sources {
        if part is Some(i) {
          let at = if pattern.kind.indirect() {
            { ..e.lock, y: e.lock.y + 40, }
          } else {
            e.lock
          }
          e.aim_weapon(self.time, Some(at), part=i) |> ignore
        }
      }
    Warn(Fire(Lob | Mine))
    | Warn(Volley({ kind: Barrage | WalkingDrop | Pincer, .. }, _)) => {
      let arc = if kind.is_boss() { 10.0 } else { 9.0 }
      e.aim_weapon(self.time, Some({ ..e.lock, y: e.lock.y + 4 * arc, }))
      |> ignore
    }
    Warn(_) => e.aim_weapon(self.time, Some(e.lock)) |> ignore
    _ => ()
  }
  self.enemy_contact(index)
}

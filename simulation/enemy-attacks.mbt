///|
fn Game::begin_warning(
  self : Game,
  index : Int32,
  weapon : Attack,
  sighting : Vec3,
  observation : Observation,
) -> Unit {
  let e = self.enemies[index]
  let kind = e.definition.kind
  let attack = if kind == ScrapRam {
    e.attack_cycle += 1
    let distance = horizontal_distance(sighting, e.position())
    if distance >= 8 && e.attack_cycle % 5 == 0 {
      e.sweep_sign = -e.sweep_sign
      e.enter(Traverse(e.aim + e.sweep_sign * @math.PI / 2, 4.8), 0.75)
      return
    }
    if distance < 8 && e.attack_cycle % 3 == 0 {
      e.enter(Traverse(e.aim + @math.PI, 5.2), 0.85)
      return
    }
    if e.attack_cycle % 4 == 3 {
      BurstAttack
    } else if e.attack_cycle % 2 == 1 {
      CannonAttack
    } else {
      ChargeAttack
    }
  } else {
    weapon
  }
  e.volley_cycle += 1
  let warn = if kind == ScrapRam {
    if e.hp / e.max_hp < 0.55 {
      0.85
    } else {
      1.05
    }
  } else {
    e.spec().warn
  }
  e.enter(Warn(Fire(attack)), warn)
  e.lock = {
    ..sighting,
    y: sighting.y +
    (if kind is (Artillery | Siege | Miner) { 0.05 } else { 1.2 }),
  }
  if kind == Siege {
    let next = if observation is Visible(seen) {
      seen.predict(e.spec().lob_duration + 0.45)
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
  observation : Observation,
  attack : Attack,
) -> Unit {
  let e = self.enemies[index]
  let kind = e.definition.kind
  let spec = e.spec()
  match attack {
    CannonAttack => {
      for offset in [-0.18, 0.0, 0.18] {
        self.shoot_enemy(
          queries,
          index,
          offset~,
          side=if e.attack_cycle % 4 == 1 { -1 } else { 1 },
          speed=23,
        )
      }
      e.enter(Vent(e.timing.post_recovery), spec.recovery)
    }
    Torpedoes => {
      for delay in [0.0, 0.65] {
        self.shoot_enemy(
          queries,
          index,
          side=if delay == 0 { -1 } else { 1 },
          delay~,
          torpedo=e.afloat,
          speed=if e.afloat { 12 } else { 18 },
          range=30,
        )
      }
      e.enter(Vent(e.timing.post_recovery), spec.recovery)
    }
    SuctionAttack => e.enter(Suction, 2.8)
    ChargeAttack => e.enter(Charge, if kind == ScrapRam { 1.2 } else { 0.75 })
    SweepAttack => e.enter(Flame, 1.8)
    RailAttack => {
      let origin = e.aim_weapon(self.time, Some(e.lock)).muzzle
      let direction = e.lock.sub(origin).normalized()
      let end = origin.add(
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
      e.enter(RailShot(end), 0.18)
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
      if kind == Siege && e.second_lock is Some(second) {
        for target in barrage_targets(origin, second) {
          self.shoot_enemy(
            queries,
            index,
            target=target.position,
            delay=0.5 + target.delay,
          )
        }
      }
      e.enter(Vent(e.timing.post_recovery), spec.recovery)
    }
    BurstAttack => {
      if observation is Visible(seen) {
        let next = seen.predict(0.3, limit=6)
        e.lock = { ..next, y: next.y + 1.2, }
      }
      self.shoot_enemy(queries, index, offset=-0.08, side=-1)
      e.enter(Burst(if kind == Flanker { 5 } else { 2 }), 0.18)
    }
    Shot | ShieldShot | Reflect | Mine => {
      self.shoot_enemy(
        queries,
        index,
        offset=if attack == Reflect { -0.1 } else { 0 },
      )
      if attack == Reflect {
        self.shoot_enemy(queries, index, offset=0.1)
      }
      if kind == Prism {
        for offset in [-0.3, 0.3] {
          self.shoot_enemy(queries, index, offset~)
        }
      }
      if kind == Bastion {
        for offset in [-0.18, 0.18] {
          self.shoot_enemy(queries, index, offset~)
        }
      }
      e.enter(Vent(e.timing.post_recovery), spec.recovery)
    }
  }
}

///|
fn Game::warning_enemy(
  self : Game,
  queries : Queries,
  index : Int32,
  distance : Double,
  observation : Observation,
  attack : Attack,
  dt : Double,
) -> Unit {
  let e = self.enemies[index]
  if observation is Visible(seen) {
    let p = seen.position
    let kind = e.definition.kind
    if kind == Welder && e.timer > 0.35 {
      if distance > 6 {
        self.approach_enemy(index, p, dt)
      }
      e.aim = @math.atan2(p.x - e.x, p.z - e.z)
      e.lock = p.add({ x: 0, y: 1.2, z: 0, })
    }
    if kind == Sniper && e.timer > 0.8 {
      e.lock = p.add({ x: 0, y: 1.2, z: 0, })
      e.aim = @math.atan2(p.x - e.x, p.z - e.z)
    }
    if kind is (Artillery | Siege) && e.timer > 0.45 {
      let next = if kind == Siege || e.volley_cycle % 2 == 1 {
        p
      } else {
        seen.predict(2.35)
      }
      e.lock = { ..next, y: p.y + 0.05, }
      if kind == Siege {
        let ahead = seen.predict(e.spec().lob_duration + 0.45)
        e.second_lock = Some({ ..ahead, y: p.y + 0.05, })
      }
    }
    if kind == Interceptor && e.timer > 0.35 {
      let next = seen.predict(0.55, limit=10)
      e.lock = { ..next, y: p.y + 1.2, }
      e.aim = @math.atan2(next.x - e.x, next.z - e.z)
    }
  }
  if e.timer <= 0 {
    self.release_warning(queries, index, observation, attack)
  }
}

///|
fn Game::charge_enemy(
  self : Game,
  index : Int32,
  observation : Observation,
  dt : Double,
) -> Unit {
  let e = self.enemies[index]
  let before = e.position()
  let body = enemy_hull(e, false)
  let speed = e.spec().charge_speed.unwrap_or(13)
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
    if e.definition.kind == ScrapRam && blocked {
      e.jam = 2.1
      self.effects.push(Armored(e.position()))
    }
    if e.definition.kind == ScrapRam &&
      !blocked &&
      e.hp / e.max_hp < 0.55 &&
      !e.chain &&
      observation.position() is Some(target) {
      e.chain = true
      e.enter(Warn(Fire(ChargeAttack)), 0.85)
      e.aim = @math.atan2(target.x - e.x, target.z - e.z)
      e.lock = target.add({ x: 0, y: 1.2, z: 0, })
    } else {
      e.chain = false
      if e.definition.kind == ScrapRam && !blocked {
        e.jam = 1.05
      }
      e.enter(
        Vent(e.timing.post_recovery),
        Double::max(e.jam, e.spec().recovery),
      )
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
      e.enter(Bite, 0.8)
    }
  } else if e.timer <= 0 {
    if p.afloat &&
      e.in_suction(p.position(), reach=3.5) &&
      exposed(p.position()) {
      self.hurt(5, e.position()) |> ignore
    }
    e.bite_at = self.time
    e.enter(Vent(e.timing.post_recovery), e.spec().recovery)
  }
}

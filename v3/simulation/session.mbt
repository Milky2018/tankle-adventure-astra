///|
pub fn Game::drift(self : Game, position : Vec3, deployed : Bool) -> Vec2 {
  let belt = conveyor_velocity(
    position,
    self.belts,
    self.enemies,
    self.progress,
  )
  if deployed &&
    self.world.support(position.x, position.z, position.y, true)
    is Some(support) &&
    support.deck.water {
    for current in self.currents {
      if current.rect.contains(position.x, position.z) &&
        (current.y - position.y).abs() < 0.5 {
        let velocity = if current.sluice is Some(id) && self.progress.has(id) {
          current.diverted
        } else {
          current.velocity
        }
        return { x: belt.x + velocity.x, z: belt.z + velocity.z, }
      }
    }
  }
  belt
}

///|
pub fn Game::move_player(
  self : Game,
  movement : Vec2,
  boost : Bool,
  dt : Double,
) -> Unit {
  let p = self.player
  if p.hp <= 0 || self.ending_at is Some(_) {
    return
  }
  let moving = movement.length() > 0
  p.update_heat(dt, self.time, boost, moving)
  let knock = p.hit_displacement(self.time, dt)
  let speed = 10.0 *
    p.speed *
    (if p.deployed { if p.afloat { 1.15 } else { 0.75 } } else { 1.0 })
  if moving {
    p.heading += angle_delta(p.heading, @math.atan2(movement.x, movement.z)) *
      Double::min(1, 12 * dt)
  }
  let drift = self.drift(p.position(), p.deployed)
  self.world.move_player(
    p,
    movement.x * speed * dt + knock.x + drift.x * dt,
    movement.z * speed * dt + knock.z + drift.z * dt,
    self.progress,
  )
  |> ignore
  if refuge_at(p.position(), self.hives, self.progress) is None {
    apply_floor_heat(p, self.floor_heat, dt, self.time, self.progress)
  }
}

///|
pub fn Game::interactable(self : Game) -> String? {
  let p = self.player
  for pickup in self.pickups {
    if !self.progress.has(pickup.id) &&
      (
        pickup.requires is None ||
        (pickup.requires is Some(id) && self.progress.has(id))
      ) &&
      Vec2::{ x: pickup.position.x - p.x, z: pickup.position.z - p.z, }.length() <
      3.5 &&
      (pickup.position.y - p.y).abs() < 0.5 {
      return Some(pickup.id)
    }
  }
  for hive in self.hives {
    if (
        hive.requires is None ||
        (hive.requires is Some(id) && self.progress.has(id))
      ) &&
      Vec2::{ x: hive.position.x - p.x, z: hive.position.z - p.z, }.length() <
      3.5 &&
      (hive.position.y - p.y).abs() < 0.5 {
      return Some(hive.id)
    }
  }
  for c in self.commands.controls {
    if c.actions.contains(Dock) &&
      self.progress.has("keeper") &&
      (c.position.y - 1.3 - p.y).abs() < 0.6 &&
      Vec2::{ x: c.position.x - p.x, z: c.position.z - p.z, }.length() < 3 {
      return Some(c.id)
    }
  }
  None
}

///|
pub fn Game::interact(self : Game) -> Bool {
  if self.player.hp <= 0 {
    return false
  }
  guard self.interactable() is Some(id) else { return false }
  for pickup in self.pickups {
    if pickup.id == id {
      let acquired = self.player.acquire(pickup, self.progress)
      if acquired {
        self.effects.push(Acquired(id))
      }
      return acquired
    }
  }
  if id == "dock" {
    return false
  }
  self.progress.anchor = id
  self.effects.push(Repaired(id))
  self.player.hp = self.player.max_hp()
  self.player.heat = 0
  self.player.overheated = false
  self.player.speed = 1
  self.player.invincible_until = self.time + 1.5
  self.reset_enemies()
  true
}

///|
pub fn Game::reset_enemies(self : Game) -> Unit {
  for i, enemy in self.enemies {
    self.enemies[i] = Enemy::new(enemy.definition, self.progress)
    self.enemies[i].timer = if enemy.definition.variant == Ordinary {
      1.5
    } else {
      enemy.definition.startup.unwrap_or(0.4)
    }
    if enemy.definition.battle == Some("cargo-battery") &&
      self.commands.active(self.progress, "cargo-battery") {
      self.enemies[i].hp = 0
    }
  }
  self.encounters.reset(self.enemies, self.progress)
  self.shots.clear()
  self.mines.clear()
  self.beams.clear()
  self.laser_path.clear()
  self.magnet_end = None
  self.magnet_lock = None
}

///|
pub fn Game::advance_world(self : Game, dt : Double) -> Unit {
  if self.player.hp <= 0 && self.death_at is None {
    self.death_at = Some(self.time)
    self.laser_path.clear()
    self.magnet_end = None
    self.beams.clear()
  }
  if self.death_at is Some(at) && self.time - at >= 2.5 {
    self.respawn()
  }
  if self.player.hp <= 0 || self.ending_at is Some(_) {
    return
  }
  self.commands.advance(self.progress, dt, self.time) |> ignore
  self.update_puzzles(dt)
  let p = self.player
  for deck in self.world.decks {
    let x = clamp(p.x, deck.rect.x, deck.rect.x + deck.rect.w)
    let z = clamp(p.z, deck.rect.z, deck.rect.z + deck.rect.d)
    if (deck.height(z) - p.y).abs() < 3 &&
      Vec2::{ x: x - p.x, z: z - p.z, }.length() < 12 &&
      !self.progress.discovered.contains(deck.id) {
      self.progress.discovered.push(deck.id)
    }
  }
  if self.interactable() is Some(id) &&
    self.pickups.iter().find_first(fn(q) { q.id == id }) is Some(q) &&
    Vec2::{ x: q.position.x - p.x, z: q.position.z - p.z, }.length() < 2.6 {
    self.interact() |> ignore
  }
  let actors = [PlayerActor(self.player)]
  for enemy in self.enemies {
    if enemy.hp > 0 {
      actors.push(EnemyActor(enemy))
    }
  }
  step_transport(self.world.solids, dt, actors)
  self.world.step_lifts(self.progress, self.player, dt, self.enemies)
  for mirror in self.mirrors {
    let target = -self.progress.mirror_turns
      .get(mirror.id)
      .unwrap_or(0)
      .to_double() *
      @math.PI /
      2
    mirror.angle = approach(mirror.angle, target, @math.PI * 2 * dt)
    mirror.flash = Double::max(0, mirror.flash - dt)
  }
  for pickup in self.pickups {
    if pickup.lift is Some(id) &&
      self.world.lifts.iter().find_first(fn(l) { l.id == id }) is Some(lift) {
      pickup.position = { ..pickup.position, y: lift.y, }
    }
  }
  for body in self.world.solids {
    if body.rail is Some(rail) &&
      rail.release is Some(id) &&
      self.progress.circuit_ready(id, body.circuit_key, body.id) &&
      body.coordinate(rail.axis) < rail.max {
      self.pull_slide(
        body,
        {
          x: if rail.axis == X {
            rail.max + 100
          } else {
            body.rect.x
          },
          y: body.y,
          z: if rail.axis == Z {
            rail.max + 100
          } else {
            body.rect.z
          },
        },
        dt,
      )
      |> ignore
    }
  }
}

///|
pub fn Game::respawn(self : Game) -> Unit {
  let hive = self.hives
    .iter()
    .find_first(fn(h) { h.id == self.progress.anchor })
    .unwrap_or(self.hives[0])
  let p = self.player
  p.x = hive.position.x
  p.y = hive.position.y
  p.z = hive.position.z
  p.heading = hive.heading
  p.aim = hive.heading
  p.hp = p.max_hp()
  p.heat = 0
  p.overheated = false
  p.speed = 1
  p.deployed = false
  p.afloat = false
  p.last_heat = -10
  p.boost_cooling = false
  p.action_heat_at = -10
  p.last_shot = -10
  p.hurt_until = 0
  p.hurt_at = -10
  p.knock = { x: 0, z: 0, }
  p.dock_hold = 0
  p.ending_time = 0
  self.ending_at = None
  self.previous_player = p.position()
  self.velocity = { x: 0, z: 0, }
  for lift in self.world.lifts {
    lift.y = if lift.settle && !self.progress.has(lift.lock) {
      lift.stops[lift.stops.length() - 1]
    } else {
      lift.stops[0]
    }
    lift.destination = lift.stops[0]
    lift.wait = 0
  }
  p.invincible_until = self.time + 1.5
  self.death_at = None
  self.effects.push(Repaired(hive.id))
  self.reset_enemies()
}

///|
pub fn Game::dock(self : Game, held : Bool, moving : Bool, dt : Double) -> Unit {
  let p = self.player
  if self.ending_at is Some(at) {
    p.ending_time = Double::min(26, self.time - at)
    return
  }
  p.dock_hold = if held &&
    !moving &&
    p.hp > 0 &&
    self.interactable() == Some("dock") {
    p.dock_hold + dt
  } else {
    0
  }
  if p.dock_hold > 0 {
    p.x *= @math.exp(-dt * 2.5)
    p.z *= @math.exp(-dt * 2.5)
    p.heading += angle_delta(p.heading, @math.PI) * Double::min(1, dt * 4)
  }
  if p.dock_hold >= 2 {
    self.ending_at = Some(self.time - 0.001)
    p.ending_time = 0.001
    p.speed = 1
    self.commands.complete(self.progress, "endingSeen", self.time) |> ignore
    self.progress.anchor = "last-refuge"
    self.shots.clear()
    self.mines.clear()
    self.beams.clear()
    self.laser_path.clear()
    self.magnet_end = None
  }
}

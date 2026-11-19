///|
pub(all) struct Arena {
  id : String
  boss : String
  cover : String?
  music : String
  victory_effects : Array[String]
  rect : Rect
  y : Double
}

///|
pub fn Arena::contains(
  self : Arena,
  position : Vec3,
  margin~ : Double = 0,
) -> Bool {
  (position.y - self.y).abs() < 2 &&
  position.x > self.rect.x + margin &&
  position.x < self.rect.x + self.rect.w - margin &&
  position.z > self.rect.z + margin &&
  position.z < self.rect.z + self.rect.d - margin
}

///|
pub(all) enum ArenaEvent {
  Sealed(String)
  Released(String, String)
  Reserve(String)
}

///|
pub(all) struct Encounters {
  priv roster : Array[Enemy]
  priv battles : Map[String, Array[Enemy]]
  priv squads : Map[String, Array[Enemy]]
  priv battle_signals : Map[String, String]
  wave_timers : Map[String, Double]
  used_reserves : Set[String]
  arenas : Array[Arena]
}

///|
pub fn Encounters::new() -> Encounters {
  {
    roster: [],
    battles: {},
    squads: {},
    battle_signals: authored_battle_signals(),
    wave_timers: {},
    used_reserves: Set([]),
    arenas: authored_arenas(),
  }
}

///|
fn Encounters::for_boss(self : Encounters, enemy : Enemy) -> Arena? {
  if !enemy.definition.kind.is_boss() {
    return None
  }
  self.arenas.iter().find_first(fn(a) { a.boss == enemy.definition.id })
}

///|
fn Arena::boss_in(self : Arena, enemies : Array[Enemy]) -> Enemy? {
  enemies
  .iter()
  .find_first(fn(e) {
    e.definition.id == self.boss && e.definition.kind.is_boss()
  })
}

///|
pub fn Game::active_arena(self : Game) -> Arena? {
  guard self.progress.combat_arena is Some(id) else { return None }
  self.encounters.arenas.iter().find_first(fn(a) { a.id == id })
}

///|
pub fn Game::active_boss(self : Game) -> Enemy? {
  guard self.active_arena() is Some(arena) else { return None }
  arena.boss_in(self.enemies)
}

///|
pub fn Encounters::reset(
  self : Encounters,
  enemies : Array[Enemy],
  state : Progress,
) -> Unit {
  self.wave_timers.clear()
  self.used_reserves.clear()
  state.combat_arena = None
  for enemy in enemies {
    enemy.awake = enemy.definition.wave == 0 &&
      enemy.definition.activation is None
    if enemy.definition.reserve_for is Some(_) {
      enemy.hp = 0
      enemy.awake = false
      enemy.deploy_until = 0
      enemy.deploy = 0
    }
  }
}

///|
fn Encounters::index_roster(self : Encounters, enemies : Array[Enemy]) -> Unit {
  // Respawn replaces enemy objects, even when all placement IDs and counts match.
  if self.roster.length() == enemies.length() {
    let unchanged = for i, enemy in enemies {
      if !physical_equal(self.roster[i], enemy) {
        break false
      }
    } nobreak {
      true
    }
    if unchanged {
      return
    }
  }
  self.roster.clear()
  self.battles.clear()
  self.squads.clear()
  fn add(groups : Map[String, Array[Enemy]], id : String?, e : Enemy) {
    if id is Some(id) {
      match groups.get(id) {
        Some(group) => group.push(e)
        None => groups[id] = [e]
      }
    }
  }
  for e in enemies {
    self.roster.push(e)
    add(self.battles, e.definition.battle, e)
    add(self.squads, e.definition.encounter, e)
  }
}

///|
fn Encounters::wake_squad(self : Encounters, enemy : Enemy) -> Unit {
  enemy.awake = true
  if enemy.definition.battle is Some(battle) &&
    self.battles.get(battle) is Some(group) {
    for other in group {
      if other.definition.wave == enemy.definition.wave {
        other.awake = true
      }
    }
  }
}

///|
fn Encounters::update_waves(
  self : Encounters,
  player : Player,
  resting : Bool,
  dt : Double,
) -> Unit {
  for id, group in self.battles {
    guard group.iter().find_first(fn(enemy) { enemy.definition.wave == 0 })
      is Some(first) else {
      continue
    }
    if first.definition.activation is Some(activation) &&
      (player.y - activation.position.y).abs() < 2 &&
      Vec2::{
        x: player.x - activation.position.x,
        z: player.z - activation.position.z,
      }.length() <
      activation.radius {
      for enemy in group {
        if enemy.definition.wave == 0 {
          enemy.awake = true
        }
      }
    }
    fn pending(enemy : Enemy) -> Bool {
      enemy.definition.wave != 0 && enemy.hp > 0 && !enemy.awake
    }
    if !group.any(pending) {
      continue
    }
    let near = (player.y - first.y).abs() < 3 &&
      Vec2::{
        x: player.x - first.definition.spawn.x,
        z: player.z - first.definition.spawn.z,
      }.length() <
      55
    if resting || !near {
      self.wave_timers.remove(id)
      for enemy in group {
        if !pending(enemy) {
          continue
        }
        enemy.deploy = 0
      }
      continue
    }
    if group.any(fn(enemy) { enemy.definition.wave == 0 && enemy.hp > 0 }) {
      continue
    }
    let elapsed = self.wave_timers.get(id).unwrap_or(0) + dt
    self.wave_timers[id] = elapsed
    for enemy in group {
      if !pending(enemy) {
        continue
      }
      enemy.deploy = Double::min(1, elapsed / 4)
      if elapsed >= 4 {
        enemy.awake = true
        enemy.timer = 0.8
      }
    }
  }
}

///|
pub fn Encounters::update_arenas(
  self : Encounters,
  enemies : Array[Enemy],
  state : Progress,
  player : Player,
  time : Double,
) -> Array[ArenaEvent] {
  let events : Array[ArenaEvent] = []
  if player.hp <= 0 {
    self.reset(enemies, state)
    return events
  }
  if state.combat_arena is Some(id) {
    let arena = self.arenas.iter().find_first(fn(a) { a.id == id })
    let boss = arena.bind(fn(a) { a.boss_in(enemies) })
    if boss is None || (boss is Some(enemy) && (enemy.hp <= 0 || state.has(id))) {
      events.push(Released(id, arena.map(fn(a) { a.boss }).unwrap_or(id)))
      for enemy in enemies {
        if enemy.definition.reserve_for == Some(id) {
          enemy.hp = 0
          enemy.awake = false
          enemy.deploy = 0
          enemy.deploy_until = 0
        }
      }
      state.combat_arena = None
    }
  }
  if state.combat_arena is None {
    for arena in self.arenas {
      if state.has(arena.id) || !arena.contains(player.position(), margin=2.3) {
        continue
      }
      if arena.boss_in(enemies) is Some(boss) && boss.hp > 0 {
        state.combat_arena = Some(arena.id)
        boss.timer = Double::max(boss.timer, 1.2)
        events.push(Sealed(arena.id))
        break
      }
    }
  }
  if state.combat_arena is Some(id) &&
    self.arenas.iter().find_first(fn(a) { a.id == id }) is Some(arena) &&
    arena.boss_in(enemies) is Some(boss) {
    let mut active = enemies
      .filter(fn(enemy) {
        enemy.definition.reserve_for == Some(id) && enemy.hp > 0
      })
      .length()
    for enemy in enemies {
      if enemy.definition.reserve_for != Some(id) {
        continue
      }
      if active < 2 &&
        !self.used_reserves.contains(enemy.definition.id) &&
        boss.hp / boss.max_hp <= enemy.definition.reserve_at {
        active += 1
        self.used_reserves.add(enemy.definition.id) |> ignore
        enemy.x = enemy.definition.spawn.x
        enemy.y = enemy.definition.spawn.y
        enemy.z = enemy.definition.spawn.z
        enemy.hp = enemy.max_hp
        enemy.awake = false
        enemy.deploy_until = time + 2
        enemy.deploy = 0.001
        enemy.enter(Idle, 0.8)
        events.push(Reserve(enemy.definition.id))
      }
      if enemy.deploy_until != 0 && time >= enemy.deploy_until {
        enemy.awake = true
        enemy.deploy = 0
        enemy.deploy_until = 0
      }
    }
  }
  events
}

///|
fn Game::advance_encounters(self : Game, resting : Bool, dt : Double) -> Unit {
  for
    event in self.encounters.update_arenas(
      self.enemies,
      self.progress,
      self.player,
      self.time,
    ) {
    if event is Released(id, boss) {
      fn owned(owner : String) -> Bool {
        owner == boss ||
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
  self.encounters.update_waves(self.player, resting, dt)
  for battle, signal in self.encounters.battle_signals {
    if !self.commands.active(self.progress, signal) &&
      self.encounters.battles.get(battle) is Some(group) &&
      group.all(fn(e) { e.hp <= 0 }) {
      self.commands.complete(self.progress, signal, self.time, delayed=true)
      |> ignore
    }
  }
}

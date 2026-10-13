///|
pub(all) struct Arena {
  id : String
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
  Released(String)
  Reserve(String)
}

///|
pub(all) struct Encounters {
  wave_timers : Map[String, Double]
  used_reserves : Set[String]
  arenas : Array[Arena]
}

///|
pub fn Encounters::new() -> Encounters {
  {
    wave_timers: {},
    used_reserves: Set([]),
    arenas: [
      { id: "prototype", rect: { x: -50, z: 116, w: 36, d: 24, }, y: -16, },
      { id: "foundry", rect: { x: 202, z: -164, w: 42, d: 40, }, y: 16, },
      { id: "guardian", rect: { x: 180, z: 44, w: 48, d: 46, }, y: 16, },
      { id: "sorter", rect: { x: 24, z: -164, w: 40, d: 36, }, y: -8, },
      { id: "keeper", rect: { x: -28, z: 12, w: 56, d: 48, }, y: -56, },
    ],
  }
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
pub fn wake_squad(enemy : Enemy, enemies : Array[Enemy]) -> Unit {
  if enemy.definition.battle is Some(battle) {
    for other in enemies {
      if other.definition.battle == Some(battle) &&
        other.definition.wave == enemy.definition.wave {
        other.awake = true
      }
    }
  }
}

///|
pub fn Encounters::update_waves(
  self : Encounters,
  enemies : Array[Enemy],
  player : Player,
  resting : Bool,
  dt : Double,
  time : Double,
) -> Unit {
  let battles : Map[String, Array[Enemy]] = Map([])
  for enemy in enemies {
    if enemy.definition.battle is Some(id) {
      match battles.get(id) {
        Some(group) => group.push(enemy)
        None => battles[id] = [enemy]
      }
    }
  }
  for id, group in battles {
    if group[0].definition.activation is Some(activation) &&
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
    let reserves = group.filter(fn(enemy) {
      enemy.definition.wave != 0 && enemy.hp > 0 && !enemy.awake
    })
    if reserves.is_empty() {
      continue
    }
    guard group.iter().find_first(fn(enemy) { enemy.definition.wave == 0 })
      is Some(first) else {
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
      for enemy in reserves {
        enemy.deploy = 0
      }
      continue
    }
    if group.any(fn(enemy) { enemy.definition.wave == 0 && enemy.hp > 0 }) {
      continue
    }
    let elapsed = self.wave_timers.get(id).unwrap_or(0) + dt
    self.wave_timers[id] = elapsed
    for enemy in reserves {
      enemy.deploy = Double::min(1, elapsed / 4)
      if elapsed >= 4 {
        enemy.awake = true
        enemy.timer = 0.8
        enemy.last_seen = Some(player.position())
        enemy.alert_until = time + 12
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
    let boss = enemies
      .iter()
      .find_first(fn(enemy) { enemy.definition.id == id })
    if boss is None || (boss is Some(enemy) && (enemy.hp <= 0 || state.has(id))) {
      events.push(Released(id))
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
      if enemies
        .iter()
        .find_first(fn(enemy) {
          enemy.definition.id == arena.id && enemy.hp > 0
        })
        is Some(boss) {
        state.combat_arena = Some(arena.id)
        boss.timer = Double::max(boss.timer, 1.2)
        events.push(Sealed(arena.id))
        break
      }
    }
  }
  if state.combat_arena is Some(id) &&
    enemies.iter().find_first(fn(enemy) { enemy.definition.id == id })
    is Some(boss) {
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
        enemy.phase = Idle
        enemy.timer = 0.8
        events.push(Reserve(enemy.definition.id))
      }
      if enemy.deploy_until != 0 && time >= enemy.deploy_until {
        enemy.awake = true
        enemy.deploy = 0
        enemy.deploy_until = 0
        enemy.alert_until = time + 12
        enemy.last_seen = Some(player.position())
      }
    }
  }
  events
}

///|
pub(all) struct Beam {
  enemy : Int32
  origin : Vec3
  direction : Vec3
  length : Double
  width : Double
}

///|
fn Game::begin_boss_attack(self : Game, index : Int32, clear : Bool) -> Unit {
  let enemy = self.enemies[index]
  let sighting = if self.progress.combat_arena == Some(enemy.definition.id) ||
    clear {
    self.player.position()
  } else {
    enemy.last_seen.unwrap_or(self.player.position())
  }
  enemy.attack_cycle += 1
  let pattern = enemy.boss_pattern(clear)
  enemy.pattern = Some(pattern)
  enemy.attack = Some(pattern.kind)
  enemy.lock = {
    ..sighting,
    y: sighting.y + (if pattern.kind == Barrage { 0.05 } else { 1.2 }),
  }
  enemy.aim = @math.atan2(sighting.x - enemy.x, sighting.z - enemy.z)
  enemy.phase = Warn
  enemy.timer = pattern.warn
  let parts : Array[Int32] = []
  for i, part in enemy.parts {
    if part.hp > 0 {
      parts.push(i)
    }
  }
  enemy.source = if parts.is_empty() {
    None
  } else {
    Some(parts[(enemy.attack_cycle - 1) % parts.length()])
  }
  enemy.volley_sources = Array::makei(pattern.waves, fn(wave) {
    if pattern.kind != Batteries || parts.is_empty() {
      None
    } else {
      Some(parts[(enemy.attack_cycle - 1 + wave) % parts.length()])
    }
  })
  enemy.sweep_sign = -enemy.sweep_sign
}

///|
fn Game::launch_boss(self : Game, queries : Queries, index : Int32) -> Unit {
  let enemy = self.enemies[index]
  guard enemy.pattern is Some(pattern) else { return }
  match pattern.kind {
    Barrage =>
      for target in barrage_targets(enemy.position(), enemy.lock, boss=true) {
        self.shoot_enemy(
          queries,
          index,
          target=target.position,
          delay=target.delay,
          lob=true,
          duration=1.35,
        )
      }
    Seekers =>
      for side in [-1.0, 1.0] {
        let origin = Vec3::{
          x: enemy.x + @math.cos(enemy.aim) * side * 2,
          y: enemy.y + 1.2,
          z: enemy.z - @math.sin(enemy.aim) * side * 2,
        }
        self.shoot_enemy(
          queries,
          index,
          offset=side * 0.24,
          origin~,
          target={ ..enemy.lock, y: enemy.y + 1.2, },
          homing=true,
          speed=22,
        )
      }
    _ =>
      for wave in 0..<pattern.waves {
        let source = enemy.volley_sources[wave]
        if source is Some(i) && enemy.parts[i].hp <= 0 {
          continue
        }
        for offset in pattern.offsets {
          self.shoot_enemy(
            queries,
            index,
            offset=offset + (if wave > 0 { 0.075 } else { 0.0 }),
            source?,
            delay=wave.to_double() * pattern.spacing,
            speed=pattern.speed,
          )
        }
      }
  }
  if pattern.overlay && pattern.kind != Barrage {
    self.shoot_enemy(
      queries,
      index,
      target={ ..enemy.lock, y: enemy.y + 0.05, },
      delay=0.65,
      lob=true,
      duration=1.35,
    )
  }
}

///|
fn Game::beam(
  self : Game,
  queries : Queries,
  index : Int32,
  angle : Double,
  reach : Double,
  width : Double,
  damage : Double,
  minimum~ : Double = 0,
) -> Hit? {
  let enemy = self.enemies[index]
  let origin = enemy.position().add({ x: 0, y: 1.8, z: 0, })
  let direction = Vec3::{ x: @math.sin(angle), y: 0, z: @math.cos(angle), }
  let hit = self.cast(
    queries,
    { origin, direction, },
    reach,
    targets=false,
    refuge=false,
  )
  let length = hit.map(fn(h) { h.distance }).unwrap_or(reach)
  self.beams.push({ enemy: index, origin, direction, length, width, })
  let dx = self.player.x - enemy.x
  let dz = self.player.z - enemy.z
  let along = dx * direction.x + dz * direction.z
  let side = (dx * direction.z - dz * direction.x).abs()
  if (self.player.y - enemy.y).abs() < 2 &&
    along > minimum &&
    along < length &&
    side < width {
    self.hurt(damage, enemy.position()) |> ignore
  }
  hit
}

///|
fn Game::update_boss(
  self : Game,
  queries : Queries,
  index : Int32,
  clear : Bool,
) -> Unit {
  let enemy = self.enemies[index]
  if enemy.phase == Idle && enemy.timer <= 0 {
    self.begin_boss_attack(index, clear)
  }
  if enemy.phase == Warn {
    if enemy.timer <= 0 {
      if enemy.attack == Some(SweepAttack) {
        enemy.phase = Sweep
        enemy.timer = 1.8
      } else {
        self.launch_boss(queries, index)
        enemy.phase = Vent
        enemy.timer = enemy.pattern.unwrap().recovery
      }
    }
  } else if enemy.phase == Sweep {
    let angle = enemy.aim +
      enemy.sweep_sign * (-0.8 + 1.6 * (1 - enemy.timer / 1.8))
    self.beam(queries, index, angle, 38, 1.2, 10) |> ignore
    if enemy.timer <= 0 {
      enemy.phase = Vent
      enemy.timer = enemy.pattern.unwrap().recovery
    }
  } else if enemy.phase != Idle && enemy.timer <= 0 {
    enemy.phase = Idle
    enemy.timer = 0.18
  }
}

///|
fn Game::update_sorter(
  self : Game,
  queries : Queries,
  index : Int32,
  dt : Double,
  clear : Bool,
) -> Unit {
  let enemy = self.enemies[index]
  if enemy.phase == Idle && enemy.timer <= 0 {
    self.begin_boss_attack(index, clear)
  }
  if enemy.attack == Some(Barrage) {
    if enemy.phase == Warn && enemy.timer <= 0 {
      self.launch_boss(queries, index)
      enemy.phase = Vent
      enemy.timer = enemy.pattern.unwrap().recovery
    } else if enemy.phase != Warn && enemy.timer <= 0 {
      enemy.phase = Idle
      enemy.timer = 0.18
    }
    return
  }
  if enemy.phase == Sweep {
    let angle = enemy.aim - 0.9 + 1.8 * (1 - enemy.timer / 1.8)
    let hit = self.beam(queries, index, angle, 18, 1.1, 10, minimum=2)
    let cover = self.world.obstacles
      .iter()
      .find_first(fn(s) { s.id == "sorter-cover" })
    if cover is Some(cover) {
      if hit is Some(hit) &&
        cover.rect.contains(hit.point.x, hit.point.z, margin=0.05) {
        enemy.phase = Vent
        enemy.timer = 1.5
        enemy.sweep_right = !enemy.sweep_right
        self.effects.push(Armored(hit.point))
        return
      }
      let next = cover.rect.x + dt * (if enemy.sweep_right { -5 } else { 5 })
      let rect = { ..cover.rect, x: next, }
      if self.time > self.cover_held_until &&
        next >= 28 &&
        next <= 50 &&
        !((self.player.y - cover.y).abs() < 3 &&
        rect.contains(self.player.x, self.player.z, margin=1)) {
        cover.rect = rect
      }
    }
  }
  if enemy.timer <= 0 {
    match enemy.phase {
      Warn => {
        enemy.phase = Sweep
        enemy.timer = 1.8
      }
      Sweep => {
        enemy.phase = Vent
        enemy.timer = 1.5
        enemy.sweep_right = !enemy.sweep_right
      }
      Vent => {
        enemy.phase = Idle
        enemy.timer = 0.4
      }
      _ => ()
    }
  }
}

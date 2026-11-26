///|
pub(all) enum BeamKind {
  CuttingTorch
  FurnaceSweep
  RailTracer
  RepairArc
}

///|
pub(all) struct Beam {
  enemy : Int32
  origin : Vec3
  direction : Vec3
  length : Double
  kind : BeamKind
}

///|
fn Enemy::begin_boss_attack(
  enemy : Enemy,
  sighting : Vec3,
  observation : Observation,
) -> Unit {
  enemy.stopped_arm = None
  enemy.attack_cycle += 1
  let bearing = @math.atan2(sighting.x - enemy.x, sighting.z - enemy.z)
  let lateral = match observation {
    Visible(seen) =>
      seen.velocity.x * @math.cos(bearing) -
      seen.velocity.z * @math.sin(bearing)
    _ => 0.0
  }
  guard enemy.boss_pattern(
      observation is Visible(_),
      lateral_speed=lateral,
      distance=horizontal_distance(enemy.position(), sighting),
    )
    is Some(pattern) else {
    return
  }
  enemy.last_boss_attack = Some(pattern.kind)
  let sighting = if pattern.kind is (WalkingDrop | Crossfire | Needle) &&
    observation is Visible(seen) {
    seen.predict(if pattern.kind == WalkingDrop { 0.9 } else { 0.3 }, limit=4)
  } else {
    sighting
  }
  enemy.lock = {
    ..sighting,
    y: sighting.y + (if pattern.kind.indirect() { 0.05 } else { 1.2 }),
  }
  enemy.aim = @math.atan2(sighting.x - enemy.x, sighting.z - enemy.z)
  let parts : Array[Int32] = []
  for i, part in enemy.parts {
    if part.hp > 0 {
      parts.push(i)
    }
  }
  let sources = Array::makei(pattern.waves, fn(wave) {
    if parts.is_empty() {
      None
    } else if enemy.definition.kind == Keeper {
      let port = pattern.kind is (WalkingDrop | Seekers | Pincer)
      Some(if port { 0 } else { 1 })
    } else if pattern.kind == Crossfire {
      Some(parts[wave % parts.length()])
    } else {
      Some(parts[(enemy.attack_cycle - 1) % parts.length()])
    }
  })
  enemy.enter(Warn(Volley(pattern, sources)), pattern.warn)
  enemy.sweep_sign = -enemy.sweep_sign
}

///|
fn Game::launch_boss(
  self : Game,
  queries : Queries,
  index : Int32,
  pattern : BossPattern,
  sources : Array[Int32?],
) -> Unit {
  let enemy = self.enemies[index]
  match pattern.kind {
    Barrage | Pincer | WalkingDrop =>
      for target in enemy.impact_pattern(pattern.kind) {
        self.shoot_enemy(
          queries,
          index,
          target=target.position,
          source?=sources[0],
          delay=target.delay,
          lob=true,
          duration=1.35,
        )
      }
    Seekers =>
      for side in [-1.0, 1.0] {
        self.shoot_enemy(
          queries,
          index,
          offset=side * 0.24,
          side~,
          target={ ..enemy.lock, y: enemy.y + 1.2, },
          homing=true,
          source?=sources[0],
          speed=22,
        )
      }
    ArmSweep | BackSweep | ArmThrust | Sidestep => return
    Fan | Batteries | Needle | Crossfire =>
      for wave in 0..<pattern.waves {
        let source = sources[wave]
        if source is Some(i) && enemy.parts[i].hp <= 0 {
          continue
        }
        for offset in pattern.offsets {
          self.shoot_enemy(
            queries,
            index,
            target=if pattern.kind == Crossfire {
              enemy.lock.add(
                Vec3::{
                  x: @math.cos(enemy.aim),
                  y: 0,
                  z: -@math.sin(enemy.aim),
                }.scale(if wave == 0 { -3.6 } else { 3.6 }),
              )
            } else {
              enemy.lock
            },
            offset=offset +
              (if wave > 0 && pattern.kind != Needle { 0.075 } else { 0.0 }),
            side=if wave % 2 == 0 { -1 } else { 1 },
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
  emission? : BeamKind,
  minimum~ : Double = 0,
) -> Hit? {
  let enemy = self.enemies[index]
  let origin = if enemy.definition.kind == Sorter {
    enemy.position().add({ x: 0, y: 1.8, z: 0, })
  } else {
    enemy.aim_weapon(self.time, None, heading=angle).muzzle
  }
  let direction = Vec3::{ x: @math.sin(angle), y: 0, z: @math.cos(angle), }
  let hit = self.cast(
    queries,
    { origin, direction, },
    reach,
    targets=false,
    refuge=false,
  )
  let length = hit.map(fn(h) { h.distance }).unwrap_or(reach)
  if emission is Some(kind) {
    self.beams.push({ enemy: index, origin, direction, length, kind, })
  }
  let dx = self.player.x - origin.x
  let dz = self.player.z - origin.z
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
fn Game::sweep_boss(
  self : Game,
  queries : Queries,
  index : Int32,
  recovery : Double,
) -> Unit {
  let enemy = self.enemies[index]
  if enemy.definition.kind == Sorter {
    let (turn, extension) = enemy.arm_pose()
    let angle = enemy.aim + turn
    let hit = self.beam(
      queries,
      index,
      angle,
      18 * extension,
      1.1,
      10,
      minimum=2,
    )
    let cover_id = self.encounters.for_boss(enemy).bind(fn(a) { a.cover })
    if cover_id is Some(id) &&
      self.world.obstacles.search_by(fn(s) { s.id == id }) is Some(i) &&
      self.world.obstacles[i].rail is Some(rail) {
      let cover = self.world.obstacles[i]
      if hit is Some(hit) && hit.target == CoverTarget(i) {
        // The rail stop arrests the actual tool. Preserve its contact pose.
        enemy.stopped_arm = Some(
          (turn, Double::min(extension, hit.distance / 18.0)),
        )
        enemy.jam = 2.0
        if !(self.held_cover is Some((held, until)) &&
          held == i &&
          until >= self.time) {
          let shift = if rail.axis == X {
            @math.sin(angle)
          } else {
            @math.cos(angle)
          }
          let next = clamp(
            cover.coordinate(rail.axis) + shift * 0.3,
            rail.min,
            rail.max,
          )
          let rect = if rail.axis == X {
            { ..cover.rect, x: next, }
          } else {
            { ..cover.rect, z: next, }
          }
          if (self.player.y - cover.y).abs() > 3 ||
            !rect.contains(self.player.x, self.player.z, margin=1) {
            cover.rect = rect
          }
        }
        enemy.enter(Vent(0.4), 2.0)
        self.effects.push(Armored(hit.point))
        return
      }
    }
  } else {
    let angle = enemy.aim +
      enemy.sweep_sign * (-0.8 + 1.6 * (1 - enemy.timer / 1.8))
    self.beam(queries, index, angle, 38, 1.2, 10, emission=FurnaceSweep)
    |> ignore
  }
  if enemy.timer <= 0 {
    enemy.enter(
      Vent(if enemy.definition.kind == Sorter { 0.4 } else { 0.18 }),
      recovery,
    )
  }
}

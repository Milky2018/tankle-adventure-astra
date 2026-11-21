///|
pub(all) struct LaserSegment {
  from : Vec3
  to : Vec3
  live : Bool
  contact : Bool
}

///|
pub fn Game::laser(
  self : Game,
  queries : Queries,
  origin : Vec3,
  aim : Vec3,
  firing : Bool,
  dt : Double,
) -> Unit {
  self.laser_path.clear()
  let p = self.player
  if p.weapon != Laser || !p.abilities.laser || p.hp <= 0 {
    return
  }
  let live = firing && !p.overheated && !p.stunned(self.time)
  if live {
    p.continuous_heat(laser_tuning.heat_per_second * dt, self.time)
  }
  let mut ray = Ray::{ origin, direction: aim.sub(origin).normalized(), }
  let mut remaining = laser_tuning.range
  for _ in 0..<laser_tuning.segments {
    let hit = self.cast(queries, ray, remaining, optical=true)
    let end = hit.map(fn(h) { h.point }).unwrap_or(ray.point(remaining))
    self.laser_path.push({
      from: ray.origin,
      to: end,
      live,
      contact: hit is Some(_),
    })
    guard hit is Some(hit) else { break }
    let normal = match hit.target {
      MirrorTarget(i) => {
        if live {
          self.mirrors[i].flash = 0.15
        }
        Some(self.mirrors[i].normal())
      }
      EnemyTarget(i, _) => {
        let e = self.enemies[i]
        if e.definition.mirror &&
          @math.cos(@math.atan2(ray.origin.x - e.x, ray.origin.z - e.z) - e.aim) >
          0.55 {
          Some({ x: @math.sin(e.aim), y: 0, z: @math.cos(e.aim), })
        } else {
          None
        }
      }
      _ => None
    }
    if live {
      match hit.target {
        EnemyTarget(i, part) =>
          if normal is None {
            self.hit_enemy(
              i,
              p.weapon_damage(Laser, laser_tuning.damage_per_second) * dt,
              ray.origin,
              LaserHit,
              part?,
            )
            |> ignore
          }
        ControlTarget(i) => {
          if self.commands.controls[i].actions.contains(LaserAction) {
            self.commands.controls[i].flash = 0.13
          }
          self.commands.activate(
            self.progress,
            self.commands.controls[i].id,
            LaserAction,
            p,
            self.time,
          )
          |> ignore
        }
        MineTarget(i) => self.detonate_mine(i)
        TorpedoTarget(i) => self.shots[i].captured = true
        _ => ()
      }
    }
    guard normal is Some(n) else { break }
    let direction = ray.direction
      .sub(n.scale(2 * ray.direction.dot(n)))
      .normalized()
    remaining -= hit.distance + 0.03
    ray = { origin: end.add(direction.scale(0.03)), direction, }
    if remaining <= 0 {
      break
    }
  }
}

///|
pub fn Player::continuous_heat(
  self : Player,
  amount : Double,
  time : Double,
) -> Unit {
  self.heat = Double::min(100, self.heat + amount)
  self.last_heat = time
  self.action_heat_at = time
  self.boost_cooling = false
  if self.heat >= 100 {
    self.overheated = true
  }
}

///|
pub fn Game::magnet(
  self : Game,
  queries : Queries,
  origin : Vec3,
  aim : Vec3,
  held : Bool,
  dt : Double,
) -> Unit {
  let p = self.player
  self.magnet_end = None
  if !held || !p.abilities.magnet || p.hp <= 0 || p.stunned(self.time) {
    self.magnet_lock = None
    for c in self.commands.controls {
      c.pull = Double::max(0, c.pull - dt * 2)
    }
    return
  }
  let direction = aim.sub(origin).normalized()
  let mut best : (HitTarget, Vec3, Double)? = None
  fn consider(target : HitTarget, position : Vec3, radius : Double) -> Unit {
    let offset = position.sub(origin)
    let distance = offset.length()
    let locked = self.magnet_lock == Some(target)
    let body = target is SlideTarget(_) || target is CoverTarget(_)
    if distance >=
      (if locked && body {
        magnet_tuning.locked_range
      } else {
        magnet_tuning.range
      }) ||
      distance < 0.01 {
      return
    }
    let alignment = offset.normalized().dot(direction)
    let pointed = Ray::{ origin, direction, }.sphere(position, radius)
      is Some(_)
    if !(locked && body) &&
      alignment < (if locked { 0.75 } else { 0.95 }) &&
      !pointed {
      return
    }
    let ray = Ray::{ origin, direction: offset.normalized(), }
    let obstruction = (queries.geometry)(ray, distance, false)
    if obstruction is Some(h) && h.distance < distance - radius - 0.1 {
      return
    }
    let score = alignment +
      (if pointed { 2.0 } else { 0.0 }) +
      (if locked { 5.0 } else { 0.0 })
    if best is None || (best is Some((_, _, old)) && score > old) {
      best = Some((target, position, score))
    }
  }
  for i, c in self.commands.controls {
    if c.mount is Some(id) &&
      self.world.solids.any(fn(b) { b.id == id && b.rail is Some(_) }) {
      continue
    }
    if c.mount is Some(_) &&
      c.facing is Some(facing) &&
      c.position.sub(origin).dot(facing) >= 0 {
      continue
    }
    if c.actions.contains(MagnetAction) &&
      !self.commands.active(self.progress, c.id) {
      consider(ControlTarget(i), c.position, 0.75)
    }
  }
  if refuge_at(p.position(), self.hives, self.progress) is None {
    for i, e in self.enemies {
      if e.on_field() &&
        (
          (e.definition.magnetic_shield && !e.shield_removed) ||
          e.magnet_pullable()
        ) {
        consider(
          EnemyTarget(i, None),
          e.position().add({ x: 0, y: 1.5, z: 0, }),
          e.radius,
        )
      }
    }
  }
  for i, m in self.mines {
    if !m.disarmed {
      consider(MineTarget(i), m.position, 0.75)
    }
  }
  for i, s in self.shots {
    if s.owner is Some(_) &&
      (s.mortar || s.torpedo) &&
      s.delay <= 0 &&
      !s.captured {
      consider(TorpedoTarget(i), s.position, 0.85)
    }
  }
  // Rail bodies have a broad face; aim at the nearest accessible point, not their centre.
  for i, body in self.world.solids {
    if body.rail is Some(_) {
      consider(
        SlideTarget(i),
        {
          x: clamp(p.x, body.rect.x - 0.15, body.rect.x + body.rect.w + 0.15),
          y: body.y + Double::min(1.6, body.h / 2),
          z: clamp(p.z, body.rect.z - 0.15, body.rect.z + body.rect.d + 0.15),
        },
        1,
      )
    }
  }
  for i, body in self.world.obstacles {
    if body.rail is None {
      continue
    }
    consider(
      CoverTarget(i),
      {
        x: clamp(p.x, body.rect.x - 0.15, body.rect.x + body.rect.w + 0.15),
        y: body.y + 1.4,
        z: clamp(p.z, body.rect.z - 0.15, body.rect.z + body.rect.d + 0.15),
      },
      1,
    )
  }
  for i, c in self.commands.controls {
    if best is None ||
      (best is Some((target, _, _)) && target != ControlTarget(i)) {
      c.pull = Double::max(0, c.pull - dt * 2)
    }
  }
  if p.overheated {
    self.magnet_lock = None
    self.magnet_end = Some(origin.add(direction.scale(2)))
    return
  }
  self.magnet_end = Some(
    best.map(fn(c) { c.1 }).unwrap_or(origin.add(direction.scale(13))),
  )
  if best is Some((target, _, _)) {
    let moved = match target {
      SlideTarget(i) => self.pull_slide(self.world.solids[i], p.position(), dt)
      CoverTarget(i) => {
        self.held_cover = Some((i, self.time + 0.2))
        self.pull_slide(self.world.obstacles[i], p.position(), dt)
      }
      _ => true
    }
    self.magnet_lock = Some(target)
    if !moved {
      self.magnet_end = None
      return
    }
  }
  p.continuous_heat(
    (if best is Some(_) {
      magnet_tuning.pull_heat_per_second
    } else {
      magnet_tuning.idle_heat_per_second
    }) *
    dt,
    self.time,
  )
  guard best is Some((target, _, _)) else {
    self.magnet_lock = None
    return
  }
  self.magnet_lock = Some(target)
  match target {
    ControlTarget(i) => {
      let c = self.commands.controls[i]
      c.pull += dt
      if c.pull >= 0.6 {
        self.commands.activate(self.progress, c.id, MagnetAction, p, self.time)
        |> ignore
      }
    }
    EnemyTarget(i, _) => {
      let e = self.enemies[i]
      if e.magnet_pullable() {
        let delta = Vec2::{ x: p.x - e.x, z: p.z - e.z, }
        let distance = delta.length()
        if distance > e.radius + 1.4 {
          let movement = Double::min(5 * dt, distance - e.radius - 1.4) /
            distance
          let hull = enemy_hull(e, false)
          self.world.move_hull(
            hull,
            delta.x * movement,
            delta.z * movement,
            self.progress,
          )
          |> ignore
          if refuge_at(
              { x: hull.x, y: hull.y, z: hull.z, },
              self.hives,
              self.progress,
              radius=18 + e.radius,
            )
            is None {
            e.x = hull.x
            e.y = hull.y
            e.z = hull.z
          }
        }
        e.stunned_until = self.time + 0.2
        e.awake = true
        e.alert_until = self.time + 8
      } else {
        e.stunned_until = self.time + 0.2
        e.shield_pull += dt / 0.7
        if e.shield_pull >= 1 {
          e.shield_removed = true
          e.stunned_until = self.time + 2.2
        }
      }
    }
    MineTarget(i) => {
      let m = self.mines[i]
      m.pull += dt
      m.position = m.position.add(
        p.position().sub(m.position).normalized().scale(5 * dt),
      )
      if m.pull > 0.4 {
        m.disarmed = true
      }
    }
    TorpedoTarget(i) => self.shots[i].captured = true
    _ => ()
  }
}

///|
pub fn Game::update_mines(self : Game, dt : Double) -> Unit {
  for i, m in self.mines {
    m.age += dt
    let drift = self.drift(m.position, false)
    m.position = m.position.add({ x: drift.x * dt, y: 0, z: drift.z * dt, })
    if refuge_at(m.position, self.hives, self.progress, radius=18) is Some(_) {
      m.disarmed = true
    }
    if m.age > 1 &&
      (m.position.y - self.player.y).abs() < 2 &&
      Vec2::{
        x: m.position.x - self.player.x,
        z: m.position.z - self.player.z,
      }.length() <
      2.8 {
      m.trigger = Double::max(0.001, m.trigger)
    }
    if m.trigger > 0 {
      m.trigger += dt
    }
    if !m.disarmed && m.trigger > 0.9 {
      self.detonate_mine(i)
    }
  }
  self.mines.retain(fn(m) { !m.disarmed && m.age <= 14 && m.trigger <= 0.9 })
}

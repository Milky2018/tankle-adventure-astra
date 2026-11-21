///|
pub(all) enum Effect {
  Fired(Vec3, Weapon)
  EnemyFired(Vec3, Weapon)
  Impact(Vec3, Bool)
  Chips(Vec3, Vec3)
  Ricochet(Vec3, Vec3)
  Armored(Vec3)
  Killed(Int32)
  Hurt
  Acquired(String)
  Activated(String)
  Repaired(String)
}

///|
pub(all) struct EnemyShotSource {
  enemy : Int32
  part : Int32?
  side : Double
  spread : Double
}

///|
pub(all) struct Shot {
  id : Int32
  owner : String?
  mut origin : Vec3
  mut position : Vec3
  mut direction : Vec3
  target : Vec3
  damage : Double
  speed : Double
  range : Double
  mortar : Bool
  duration : Double
  arc : Double
  mine_owner : String?
  source : EnemyShotSource?
  torpedo : Bool
  mut homing : Bool
  mut captured : Bool
  mut delay : Double
  mut age : Double
  mut distance : Double
}

///|
pub(all) struct Mine {
  id : Int32
  owner : String
  mut position : Vec3
  mut age : Double
  mut trigger : Double
  mut pull : Double
  mut disarmed : Bool
}

///|
pub fn mortar_position(
  origin : Vec3,
  target : Vec3,
  age : Double,
  duration : Double,
  height : Double,
) -> Vec3 {
  let t = Double::max(0, age / duration)
  let point = origin.lerp(target, t)
  { ..point, y: point.y + 4 * height * t * (1 - t), }
}

///|
pub fn Game::ground_target(
  self : Game,
  queries : Queries,
  target : Vec3,
) -> Vec3 {
  self
  .cast(
    queries,
    {
      origin: target.add({ x: 0, y: 0.45, z: 0, }),
      direction: { x: 0, y: -1, z: 0, },
    },
    320,
    ground=true,
  )
  .map(fn(hit) { hit.point })
  .unwrap_or(target)
}

///|
pub fn Game::fire(
  self : Game,
  queries : Queries,
  origin : Vec3,
  aim : Vec3,
) -> Bool {
  let p = self.player
  if p.stunned(self.time) || p.weapon == Laser {
    return false
  }
  let mortar = p.weapon == Mortar
  let tuning = if mortar { mortar_tuning } else { cannon_tuning }
  if !p.shoot_heat(self.time, cost=tuning.heat, cooldown=tuning.cooldown) {
    return false
  }
  let range = p.scope_range(tuning.range)
  let target = if mortar {
    self.mortar_target(queries, origin, aim)
  } else {
    aim
  }
  self.next_projectile += 1
  self.shots.push({
    id: self.next_projectile,
    owner: None,
    origin,
    position: origin,
    direction: aim.sub(origin).normalized(),
    target,
    damage: p.weapon_damage(p.weapon, tuning.damage),
    speed: tuning.speed,
    range,
    mortar,
    duration: tuning.duration,
    arc: tuning.arc,
    mine_owner: None,
    source: None,
    torpedo: false,
    homing: false,
    captured: false,
    delay: 0,
    age: 0,
    distance: 0,
  })
  self.effects.push(Fired(origin, p.weapon))
  true
}

///|
fn Game::shoot_enemy(
  self : Game,
  queries : Queries,
  index : Int32,
  offset~ : Double = 0,
  source? : Int32,
  target? : Vec3,
  delay~ : Double = 0,
  lob~ : Bool = false,
  speed? : Double,
  torpedo~ : Bool = false,
  homing~ : Bool = false,
  side~ : Double = 1,
  duration? : Double,
  range? : Double,
) -> Unit {
  let enemy = self.enemies[index]
  let spec = enemy.spec()
  let origin = enemy.position()
  let aim = target.unwrap_or(enemy.lock)
  let mortar = lob || enemy.definition.kind is (Artillery | Siege | Miner)
  let burst = enemy.definition.kind is (Skirmisher | Flanker)
  let aim = if burst {
    origin.add(aim.sub(origin).rotate_y(offset))
  } else if torpedo {
    { ..aim, y: origin.y + 1.08, }
  } else {
    aim
  }
  let speed = if enemy.definition.kind == Keeper {
    Double::max(15, origin.distance(aim) / 2.5)
  } else {
    speed.unwrap_or(
      spec.projectile_speed.unwrap_or(
        if enemy.definition.kind == Sniper {
          120
        } else {
          15
        },
      ),
    )
  }
  self.next_projectile += 1
  let shot : Shot = {
    id: self.next_projectile,
    owner: Some(enemy.definition.id),
    origin,
    position: origin,
    direction: aim.sub(origin).normalized(),
    target: if mortar {
      self.ground_target(queries, aim)
    } else {
      aim
    },
    damage: enemy.shot_damage(lob || homing),
    speed,
    range: range.unwrap_or(
      if enemy.definition.kind == Keeper {
        94
      } else if enemy.definition.kind == Sniper {
        86
      } else {
        55
      },
    ),
    mortar,
    duration: duration.unwrap_or(spec.lob_duration),
    arc: if enemy.definition.kind is (Overseer | Sorter | Keeper) {
      10
    } else {
      9
    },
    mine_owner: if enemy.definition.kind == Miner {
      Some(enemy.definition.id)
    } else {
      None
    },
    source: Some({
      enemy: index,
      part: source,
      side,
      spread: if burst {
        0
      } else {
        offset
      },
    }),
    torpedo,
    homing,
    captured: false,
    delay,
    age: 0,
    distance: 0,
  }
  self.shots.push(shot)
  if delay <= 0 {
    self.launch_enemy_shot(queries, shot)
  }
}

///|
fn Game::launch_enemy_shot(self : Game, queries : Queries, shot : Shot) -> Unit {
  guard shot.source is Some(source) else { return }
  let e = self.enemies[source.enemy]
  if !e.on_field() || (source.part is Some(i) && e.parts[i].hp <= 0) {
    shot.captured = true
    return
  }
  // The tangent at the start of the parabolic arc points four arc heights above impact.
  let axis = if shot.mortar {
    { ..shot.target, y: shot.target.y + 4 * shot.arc, }
  } else {
    shot.target
  }
  let pose = e.aim_weapon(
    self.time,
    Some(axis),
    side=source.side,
    part?=source.part,
  )
  shot.origin = pose.muzzle
  shot.position = pose.muzzle
  shot.direction = pose.direction.rotate_y(source.spread)
  let bearing = match source.part {
    Some(i) => e.parts[i].position
    None =>
      e.model_position(self.time).add({ x: 0, y: pose.pivot_height, z: 0, })
  }
  let barrel = pose.muzzle.sub(bearing)
  if self.cast(
      queries,
      { origin: bearing, direction: barrel.normalized(), },
      barrel.length(),
      targets=false,
    )
    is Some(hit) {
    self.impact(queries, hit, shot)
    shot.captured = true
    return
  }
  self.effects.push(
    EnemyFired(pose.muzzle, if shot.mortar { Mortar } else { Cannon }),
  )
}

///|
pub fn Game::update_shots(self : Game, queries : Queries, dt : Double) -> Unit {
  for i = self.shots.length() - 1; i >= 0; i = i - 1 {
    let shot = self.shots[i]
    let flight_dt = Double::max(0, dt - Double::max(0, shot.delay))
    if shot.delay > 0 {
      shot.delay -= dt
      if shot.delay > 0 {
        continue
      }
      self.launch_enemy_shot(queries, shot)
    }
    if shot.captured {
      self.shots.remove(i) |> ignore
      continue
    }
    shot.age += flight_dt
    if shot.homing {
      let offset = self.player
        .position()
        .add({ x: 0, y: 1.2, z: 0, })
        .sub(shot.position)
      if shot.age > 1.65 || offset.length() < 5 {
        shot.homing = false
      } else {
        let heading = @math.atan2(shot.direction.x, shot.direction.z)
        let delta = clamp(
          angle_delta(heading, @math.atan2(offset.x, offset.z)),
          -0.9 * flight_dt,
          0.9 * flight_dt,
        )
        shot.direction = shot.direction.rotate_y(delta)
      }
    }
    let next = if shot.mortar {
      mortar_position(
        shot.origin,
        shot.target,
        shot.age,
        shot.duration,
        shot.arc,
      )
    } else {
      shot.position.add(shot.direction.scale(flight_dt * shot.speed))
    }
    let path = next.sub(shot.position)
    let distance = path.length()
    let ray = Ray::{ origin: shot.position, direction: path.normalized(), }
    let hostile = shot.owner is Some(_)
    let mut hit = self.cast(queries, ray, distance, targets=!hostile)
    if shot.torpedo && hit is None {
      let support = self.world.support(next.x, next.z, next.y - 1.08, true)
      if support is None || (support is Some(s) && !s.deck.water) {
        hit = Some({ point: next, distance, normal: None, target: Terrain, })
      }
    }
    if hostile && shot.mine_owner is None {
      let mut limit = hit.map(fn(h) { h.distance }).unwrap_or(distance)
      for j, enemy in self.enemies {
        if !enemy.on_field() || shot.owner == Some(enemy.definition.id) {
          continue
        }
        if ray.sphere(
            enemy.position().add({ x: 0, y: 1.5, z: 0, }),
            enemy.radius,
          )
          is Some(d) &&
          d < limit {
          limit = d
          hit = Some({
            distance: d,
            point: ray.point(d),
            normal: None,
            target: EnemyTarget(j, None),
          })
        }
        for k, part in enemy.parts {
          if part.hp > 0 &&
            ray.sphere(part.position, part.radius) is Some(d) &&
            d < limit {
            limit = d
            hit = Some({
              distance: d,
              point: ray.point(d),
              normal: None,
              target: EnemyTarget(j, Some(k)),
            })
          }
        }
      }
      if ray.sphere(self.player.position().add({ x: 0, y: 1.2, z: 0, }), 0.8)
        is Some(d) &&
        d < limit {
        self.hurt(shot.damage, shot.position) |> ignore
        hit = Some({
          distance: d,
          point: ray.point(d),
          normal: None,
          target: PlayerTarget,
        })
      }
    }
    shot.distance += distance
    if hit is Some(impact) {
      self.impact(queries, impact, shot)
    }
    if hit is Some(_) ||
      (!shot.mortar && shot.distance > shot.range) ||
      shot.age >= 4 {
      self.shots.remove(i) |> ignore
    } else {
      shot.position = next
    }
  }
}

///|
fn Game::blast_visible(
  self : Game,
  queries : Queries,
  origin : Vec3,
  target : Vec3,
) -> Bool {
  let delta = target.sub(origin)
  delta.length() < 0.0001 ||
  self.cast(
    queries,
    { origin, direction: delta.normalized(), },
    Double::max(0, delta.length() - 0.2),
    targets=false,
    refuge=false,
  )
  is None
}

///|
pub fn Game::impact(
  self : Game,
  queries : Queries,
  hit : Hit,
  shot : Shot,
) -> Unit {
  self.last_hit = match hit.target {
    EnemyTarget(i, _) => "enemy:" + self.enemies[i].definition.id
    ControlTarget(i) => "control:" + self.commands.controls[i].id
    BlockedControl(i) => "housing:" + self.commands.controls[i].id
    Terrain => "terrain"
    _ => "other"
  }

  let normal = match hit.target {
    EnemyTarget(index, part) => {
      let enemy = self.enemies[index]
      let center = part
        .map(fn(i) { enemy.parts[i].position })
        .unwrap_or(enemy.position().add({ x: 0, y: 1.5, z: 0, }))
      hit.point.sub(center).normalized()
    }
    _ => hit.normal.unwrap_or(shot.direction.scale(-1))
  }
  let reflected = shot.direction.sub(
    normal.scale(2 * shot.direction.dot(normal)),
  )
  if hit.target is Refuge {
    self.effects.push(Ricochet(hit.point, reflected))
    return
  }
  if hit.target is BlockedControl(_) && !shot.mortar {
    self.effects.push(Ricochet(hit.point, reflected))
    return
  }
  let blast = hit.point.add(
    hit.normal
    .unwrap_or({ x: 0, y: 0, z: 0, })
    .scale(if shot.mortar { 0.05 } else { 0 }),
  )
  let hostile = shot.owner is Some(_)
  if !shot.mortar && hit.target is Terrain {
    self.effects.push(Chips(hit.point, normal))
  } else if shot.mortar || hostile || !(hit.target is EnemyTarget(_, _)) {
    self.effects.push(Impact(hit.point, shot.mortar))
  }
  if hostile && shot.mine_owner is Some(owner) {
    if self.world.support(hit.point.x, hit.point.z, hit.point.y, false)
      is Some(support) {
      self.lay_mine(owner, { ..hit.point, y: support.height, })
    }
    return
  }
  if hostile && !shot.mortar {
    if hit.target is EnemyTarget(index, part) {
      self.hit_enemy(index, 1, shot.origin, CannonHit, part?) |> ignore
    }
    return
  }
  if !hostile && !shot.mortar && hit.target is PuzzleTarget(id) {
    self.puzzles.activate(id) |> ignore
  }
  if !hostile &&
    hit.target is MirrorTarget(index) &&
    self.mirrors[index].turnable {
    self.progress.turn_mirror(self.mirrors[index].id) |> ignore
  }
  if !hostile && hit.target is TorpedoTarget(index) {
    self.shots[index].captured = true
  }
  if shot.mortar {
    let radius = if hostile { 4.0 } else { 3.0 }
    if hostile &&
      self.player.position().add({ x: 0, y: 1, z: 0, }).distance(blast) < radius &&
      self.blast_visible(
        queries,
        blast,
        self.player.position().add({ x: 0, y: 1, z: 0, }),
      ) {
      self.hurt(10, blast) |> ignore
    }
    for index, enemy in self.enemies {
      if !enemy.on_field() ||
        (hostile && shot.owner == Some(enemy.definition.id)) {
        continue
      }
      let center = enemy.position().add({ x: 0, y: 1.5, z: 0, })
      if center.distance(hit.point) < radius + enemy.radius &&
        self.blast_visible(queries, blast, center) {
        self.hit_enemy(
          index,
          if hostile {
            3
          } else {
            shot.damage
          },
          shot.origin,
          MortarHit,
        )
        |> ignore
      }
      for part, body in enemy.parts {
        if body.hp > 0 &&
          body.position.distance(hit.point) < radius &&
          self.blast_visible(queries, blast, body.position) {
          self.hit_enemy(
            index,
            if hostile {
              3
            } else {
              shot.damage
            },
            shot.origin,
            MortarHit,
            part~,
          )
          |> ignore
        }
      }
    }
    if !hostile {
      for control in self.commands.controls {
        if control.position.distance(hit.point) < 2 &&
          (!control.top || blast.y >= control.position.y - 0.01) &&
          self.blast_visible(queries, blast, control.position) {
          control.flash = 0.2
          self.commands.activate(
            self.progress,
            control.id,
            MortarAction,
            self.player,
            self.time,
          )
          |> ignore
        }
      }
      for index, mirror in self.mirrors {
        if !mirror.turnable || (hit.target is MirrorTarget(j) && j == index) {
          continue
        }
        if mirror.position.distance(blast) < radius &&
          self.blast_visible(queries, blast, mirror.position) {
          self.progress.turn_mirror(mirror.id) |> ignore
          mirror.flash = 0.25
        }
      }
    }
  } else {
    match hit.target {
      EnemyTarget(index, part) => {
        let damage = self.hit_enemy(
          index,
          shot.damage,
          shot.origin,
          CannonHit,
          part?,
        )
        if self.enemies[index].armor > 0 && damage < shot.damage {
          self.effects.push(Ricochet(hit.point, reflected))
        } else if damage > 0 {
          self.effects.push(Impact(hit.point, false))
        }
      }
      ControlTarget(index) => {
        let c = self.commands.controls[index]
        c.flash = 0.2
        self.commands.activate(
          self.progress,
          c.id,
          CannonAction,
          self.player,
          self.time,
        )
        |> ignore
      }
      MineTarget(index) => self.detonate_mine(index)
      _ => ()
    }
  }
}

///|
pub fn Game::lay_mine(self : Game, owner : String, position : Vec3) -> Unit {
  self.next_projectile += 1
  self.mines.push({
    id: self.next_projectile,
    owner,
    position,
    age: 0,
    trigger: 0,
    pull: 0,
    disarmed: false,
  })
}

///|
pub fn Game::detonate_mine(self : Game, index : Int32) -> Unit {
  let mine = self.mines[index]
  if mine.disarmed {
    return
  }
  mine.disarmed = true
  self.effects.push(Impact(mine.position, true))
  if (mine.position.y - self.player.y).abs() < 2 &&
    Vec2::{
      x: mine.position.x - self.player.x,
      z: mine.position.z - self.player.z,
    }.length() <
    3.4 {
    self.hurt(5, mine.position) |> ignore
  }
  for i, enemy in self.enemies {
    if enemy.on_field() &&
      (enemy.y - mine.position.y).abs() < 2 &&
      Vec2::{ x: enemy.x - mine.position.x, z: enemy.z - mine.position.z, }.length() <
      3 {
      self.hit_enemy(i, 2, mine.position, MortarHit) |> ignore
    }
  }
}

///|
pub fn Game::mortar_target(
  self : Game,
  queries : Queries,
  origin : Vec3,
  aim : Vec3,
) -> Vec3 {
  let offset = Vec2::{ x: aim.x - origin.x, z: aim.z - origin.z, }
  let factor = Double::min(
    1,
    self.player.scope_range(mortar_tuning.range) /
    Double::max(0.001, offset.length()),
  )
  let target = Vec3::{
    x: origin.x + offset.x * factor,
    y: aim.y,
    z: origin.z + offset.z * factor,
  }
  if self.commands.controls.any(fn(c) {
      c.top && c.position.distance(target) < 1.2
    }) {
    target
  } else {
    self.ground_target(queries, target)
  }
}

///|
pub fn Game::predict_mortar(
  self : Game,
  queries : Queries,
  origin : Vec3,
  aim : Vec3,
) -> (Array[Vec3], Hit?, Bool) {
  let target = self.mortar_target(queries, origin, aim)
  let points = [origin]
  for i in 1..<=120 {
    let age = i.to_double() / 30
    let point = mortar_position(
      origin,
      target,
      age,
      mortar_tuning.duration,
      mortar_tuning.arc,
    )
    let from = points[points.length() - 1]
    let delta = point.sub(from)
    let hit = self.cast(
      queries,
      { origin: from, direction: delta.normalized(), },
      delta.length(),
    )
    points.push(hit.map(fn(h) { h.point }).unwrap_or(point))
    if hit is Some(_) {
      return (points, hit, age < mortar_tuning.duration - 1.0 / 30)
    }
  }
  (points, None, false)
}

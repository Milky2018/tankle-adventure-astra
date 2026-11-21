///|
fn horizontal_distance(a : Vec3, b : Vec3) -> Double {
  Vec2::{ x: a.x - b.x, z: a.z - b.z, }.length()
}

///|
fn enemy_hull(enemy : Enemy, swimming : Bool) -> Hull {
  {
    x: enemy.x,
    y: enemy.y,
    z: enemy.z,
    speed: 1,
    deployed: swimming,
    afloat: enemy.afloat,
    red: false,
    phoenix: false,
  }
}

///|
pub fn Game::move_enemy(
  self : Game,
  index : Int32,
  bearing : Double,
  speed : Double,
  dt : Double,
) -> Unit {
  let enemy = self.enemies[index]
  if enemy.definition.emplacement {
    return
  }
  let angle = if enemy.definition.kind == Hunter &&
    !enemy.afloat &&
    enemy.travel_heading is Some(previous) {
    previous + clamp(angle_delta(previous, bearing), -1.8 * dt, 1.8 * dt)
  } else {
    bearing
  }
  for turn in [0.0, 0.75, -0.75, 1.4, -1.4] {
    let body = enemy_hull(enemy, enemy.swims())
    self.world.move_hull(
      body,
      @math.sin(angle + turn) * speed * dt,
      @math.cos(angle + turn) * speed * dt,
      self.progress,
    )
    |> ignore
    let position = Vec3::{ x: body.x, y: body.y, z: body.z, }
    if enemy.definition.kind == Dredger && !body.afloat {
      continue
    }
    if enemy.swims() &&
      horizontal_distance(position, enemy.definition.spawn) >
      Double::max(
        32,
        horizontal_distance(enemy.position(), enemy.definition.spawn),
      ) {
      continue
    }
    if enemy.definition.patrol is Some(patrol) &&
      !patrol.contains(body.x, body.z) {
      continue
    }
    if refuge_at(position, self.hives, self.progress, radius=18 + enemy.radius)
      is Some(_) {
      continue
    }
    if horizontal_distance(position, enemy.position()) <
      (speed * dt).abs() * 0.3 {
      continue
    }
    let blocked = self.enemies.any(fn(other) {
      other.definition.id != enemy.definition.id &&
      other.on_field() &&
      (other.y - body.y).abs() < 2 &&
      horizontal_distance(other.position(), position) <
      enemy.radius + other.radius + 0.15
    })
    if blocked {
      continue
    }
    enemy.x = body.x
    enemy.y = body.y
    enemy.z = body.z
    enemy.afloat = body.afloat
    enemy.travel_heading = Some(angle + turn)
    break
  }
}

///|
fn Game::approach_enemy(
  self : Game,
  index : Int32,
  goal : Vec3,
  dt : Double,
) -> Unit {
  let enemy = self.enemies[index]
  if (goal.y - enemy.y).abs() >
    (if enemy.definition.kind == Hunter { 8 } else { 3 }) ||
    horizontal_distance(enemy.position(), enemy.definition.spawn) > 32 {
    return
  }
  self.move_enemy(
    index,
    @math.atan2(goal.x - enemy.x, goal.z - enemy.z),
    enemy.spec().speed *
    (if enemy.definition.kind == Hunter && !enemy.afloat { 0.55 } else { 1.0 }),
    dt,
  )
}

///|
fn Game::drift_enemy(self : Game, e : Enemy, dt : Double) -> Unit {
  let kind = e.definition.kind
  e.deployed = e.swims()
  if !e.definition.emplacement {
    let drift = self.drift(e.position(), e.deployed)
    let body = enemy_hull(e, e.deployed)
    self.world.move_hull(body, drift.x * dt, drift.z * dt, self.progress)
    |> ignore
    let next = Vec3::{ x: body.x, y: body.y, z: body.z, }
    if refuge_at(next, self.hives, self.progress, radius=18 + e.radius) is None &&
      (kind != Dredger || body.afloat) {
      e.x = body.x
      e.y = body.y
      e.z = body.z
      e.afloat = body.afloat
    }
  }
}

///|
fn Game::reposition_enemy(
  self : Game,
  queries : Queries,
  index : Int32,
  distance : Double,
  observation : Observation,
  dt : Double,
) -> Unit {
  let e = self.enemies[index]
  let kind = e.definition.kind
  let spec = e.spec()
  if spec.style is RepairAllies {
    if e.phase.is_venting() && wounded_ally(index, self.enemies) is Some(i) {
      self.approach_enemy(index, self.enemies[i].position(), dt)
    }
    return
  }
  guard observation.position() is Some(target) else { return }
  let parity = if e.definition.id.length() % 2 == 1 { 1.0 } else { -1.0 }
  if kind is (Skirmisher | Flanker) &&
    !(e.phase is Stunned(_)) &&
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
        e.phase.is_warning() ||
        e.phase is Burst(_) ||
        e.phase.is_venting()
      ) &&
      (e.phase != Idle || distance < 20) {
      self.move_enemy(
        index,
        @math.atan2(target.x - e.x, target.z - e.z) + parity * @math.PI / 2,
        spec.speed,
        dt,
      )
    }
  }
  if !e.phase.is_venting() || spec.speed <= 0 || kind == Guardian {
    return
  }
  match spec.style {
    Weapon(ChargeAttack | BurstAttack | Torpedoes | SuctionAttack)
    | BossCycle
    | RepairAllies => ()
    Weapon(ShieldShot | SweepAttack) if distance > 5 =>
      self.approach_enemy(index, target, dt)
    _ =>
      if horizontal_distance(e.position(), e.definition.spawn) < 28 {
        self.move_enemy(
          index,
          @math.atan2(target.x - e.x, target.z - e.z) +
          (if distance < 10 { @math.PI } else { parity * @math.PI / 2 }),
          spec.speed,
          dt,
        )
      }
  }
}

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
      other.hp > 0 &&
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
fn Game::predict(self : Game, seconds : Double, limit~ : Double = 24) -> Vec3 {
  let x = self.velocity.x * seconds
  let z = self.velocity.z * seconds
  let factor = Double::min(
    1,
    limit / Double::max(0.001, Vec2::{ x, z, }.length()),
  )
  {
    x: self.player.x + x * factor,
    y: self.player.y,
    z: self.player.z + z * factor,
  }
}

///|
fn Game::clear_sight(
  self : Game,
  queries : Queries,
  origin : Vec3,
  target : Vec3,
  clearance~ : Double = 1,
) -> Bool {
  let direction = target.sub(origin)
  self.cast(
    queries,
    { origin, direction: direction.normalized(), },
    Double::max(0, direction.length() - clearance),
    targets=false,
    refuge=false,
  )
  is None
}

///|
fn Game::alert_squad(self : Game, index : Int32) -> Unit {
  let enemy = self.enemies[index]
  wake_squad(enemy, self.enemies)
  for i, other in self.enemies {
    if other.hp > 0 &&
      (
        i == index ||
        (
          enemy.definition.encounter is Some(id) &&
          other.definition.encounter == Some(id)
        )
      ) {
      other.alert_until = self.time + 8
      other.last_seen = Some(self.player.position())
    }
  }
}

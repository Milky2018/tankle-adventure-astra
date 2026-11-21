///|
priv trait MachineryBody {
  fn position(Self) -> Vec3
  fn set_y(Self, Double) -> Unit
}

///|
impl MachineryBody for Player with fn position(self) {
  self.position()
}

///|
impl MachineryBody for Enemy with fn position(self) {
  self.position()
}

///|
impl MachineryBody for Player with fn set_y(self, y) {
  self.y = y
}

///|
impl MachineryBody for Enemy with fn set_y(self, y) {
  self.y = y
}

///|
pub fn World::step_machinery(
  self : World,
  state : Progress,
  player : Player,
  dt : Double,
  enemies : Array[Enemy],
) -> Unit {
  let bodies : Array[&MachineryBody] = []
  if player.hp > 0 {
    bodies.push(player)
  }
  for enemy in enemies {
    if enemy.on_field() {
      bodies.push(enemy)
    }
  }
  step_transport(self.solids, dt, bodies)
  self.step_lifts(state, dt, bodies)
}

///|
fn World::step_lifts(
  self : World,
  state : Progress,
  dt : Double,
  bodies : Array[&MachineryBody],
) -> Unit {
  for lift in self.lifts {
    fn aboard(body : &MachineryBody) -> Bool {
      let p = body.position()
      (p.y - lift.y).abs() < 0.2 && lift.rect.contains(p.x, p.z, margin=-0.85)
    }
    if !state.circuit_ready(lift.lock, lift.circuit_key, lift.id) ||
      !lift.locks.all(fn(id) {
        state.circuit_ready(id, lift.circuit_key, lift.id)
      }) {
      continue
    }
    if lift.settle {
      let next = Double::max(lift.stops[0], lift.y - dt * 3)
      if bodies.any(fn(body) {
          let p = body.position()
          !aboard(body) &&
          lift.rect.contains(p.x, p.z, margin=0.9) &&
          p.y + 2.7 > next &&
          p.y < lift.y
        }) {
        continue
      }
      for body in bodies {
        if !aboard(body) {
          continue
        }
        body.set_y(body.position().y + next - lift.y)
      }
      lift.y = next
      lift.destination = lift.stops[0]
      continue
    }
    if lift.y == lift.destination {
      lift.destination = if lift.y == lift.stops[0] {
        lift.stops[lift.stops.length() - 1]
      } else {
        lift.stops[0]
      }
      lift.wait = 3
    }
    let dwell = Double::min(lift.wait, dt)
    let travel = dt - dwell
    lift.wait -= dwell
    if travel < 0.000000001 {
      continue
    }
    let next = lift.y +
      clamp(lift.destination - lift.y, -travel * 5, travel * 5)
    if bodies.any(fn(body) {
        let p = body.position()
        !aboard(body) &&
        lift.rect.contains(p.x, p.z, margin=0.9) &&
        Double::min(lift.y, next) <= p.y + 2.7 &&
        Double::max(lift.y, next) >= p.y
      }) {
      continue
    }
    for body in bodies {
      if !aboard(body) {
        continue
      }
      body.set_y(body.position().y + next - lift.y)
    }
    let elapsed = (next - lift.y).abs() / 5
    lift.y = next
    if lift.y == lift.destination {
      lift.destination = if lift.y == lift.stops[0] {
        lift.stops[lift.stops.length() - 1]
      } else {
        lift.stops[0]
      }
      lift.wait = Double::max(0, 3 - (travel - elapsed))
    }
  }
}

///|
pub(all) struct Transport {
  axis : Axis
  min : Double
  max : Double
  speed : Double
}

///|
pub fn Solid::coordinate(self : Solid, axis : Axis) -> Double {
  if axis == X {
    self.rect.x
  } else {
    self.rect.z
  }
}

///|
pub fn Solid::set_coordinate(self : Solid, axis : Axis, value : Double) -> Unit {
  self.rect = if axis == X {
    { ..self.rect, x: value, }
  } else {
    { ..self.rect, z: value, }
  }
}

///|
fn step_transport(
  solids : Array[Solid],
  dt : Double,
  bodies : Array[&MachineryBody],
) -> Unit {
  for solid in solids {
    guard solid.motion is Some(motion) else { continue }
    let other = if motion.axis == X { Z } else { X }
    let size = if motion.axis == X { solid.rect.w } else { solid.rect.d }
    let other_size = if motion.axis == X { solid.rect.d } else { solid.rect.w }
    let mut remaining = dt
    while remaining > 0 {
      let delta = Double::min(remaining, 0.05)
      remaining -= delta
      let current = solid.coordinate(motion.axis)
      let next = clamp(
        current + solid.direction * motion.speed * delta,
        motion.min,
        motion.max,
      )
      if bodies.any(fn(body) {
          let p = body.position()
          let along = if motion.axis == X { p.x } else { p.z }
          let across = if other == X { p.x } else { p.z }
          (p.y - solid.y).abs() < 3 &&
          along + 0.9 > Double::min(next, current) &&
          along - 0.9 < Double::max(next, current) + size &&
          across + 0.9 > solid.coordinate(other) &&
          across - 0.9 < solid.coordinate(other) + other_size
        }) {
        break
      }
      solid.set_coordinate(motion.axis, next)
      if next == motion.min || next == motion.max {
        solid.direction = -solid.direction
      }
    }
  }
}

///|
pub(all) struct BeltDrive {
  enemy : String
  part : Int32
}

///|
pub(all) struct Belt {
  deck : Deck
  velocity : Vec2
  heat : Double
  release : String?
  stop : String?
  drive : BeltDrive?
}

///|
pub(all) struct Current {
  rect : Rect
  y : Double
  velocity : Vec2
  sluice : String?
  diverted : Vec2
}

///|
pub(all) enum BeltMotion {
  Powered(Vec2)
  Reversed
  Stopped
}

///|
pub fn BeltMotion::velocity(self : BeltMotion) -> Vec2 {
  match self {
    Powered(v) => v
    Reversed => { x: 0, z: -4, }
    Stopped => { x: 0, z: 0, }
  }
}

///|
pub fn Belt::motion(
  self : Belt,
  enemies : Array[Enemy],
  state : Progress,
) -> BeltMotion {
  if self.stop is Some(id) && state.has(id) {
    return Stopped
  }
  if self.drive is Some(drive) &&
    enemies.iter().find_first(fn(e) { e.definition.id == drive.enemy })
    is Some(owner) &&
    (
      owner.hp <= 0 ||
      (owner.parts.get(drive.part) is Some(part) && part.hp <= 0)
    ) {
    return Stopped
  }
  if self.release is Some(id) && state.has(id) {
    Reversed
  } else {
    Powered(self.velocity)
  }
}

///|
pub fn conveyor_velocity(
  position : Vec3,
  belts : Array[Belt],
  enemies : Array[Enemy],
  state : Progress,
) -> Vec2 {
  for belt in belts {
    if !belt.deck.rect.contains(position.x, position.z) ||
      (belt.deck.height(position.z) - position.y).abs() >= 0.5 {
      continue
    }
    return belt.motion(enemies, state).velocity()
  }
  { x: 0, z: 0, }
}

///|
pub fn Belt::heating(self : Belt, state : Progress) -> Bool {
  self.heat > 0 &&
  !(self.release is Some(id) && state.has(id)) &&
  !(self.stop is Some(id) && state.has(id))
}

///|
pub fn apply_floor_heat(
  player : Player,
  floors : Array[Belt],
  dt : Double,
  time : Double,
  state : Progress,
) -> Unit {
  for floor in floors {
    if !floor.heating(state) ||
      !floor.deck.rect.contains(player.x, player.z) ||
      (floor.deck.height(player.z) - player.y).abs() >= 0.5 {
      continue
    }
    player.heat = Double::min(100, player.heat + floor.heat * dt)
    player.last_heat = time
    player.boost_cooling = false
    player.action_heat_at = time
    if player.heat >= 100 {
      player.overheated = true
    }
    return
  }
}

///|
pub fn Game::press_cycle(self : Game) -> Double {
  let turns = self.time / 2.8
  turns - turns.floor()
}

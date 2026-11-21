///|
priv struct Sighting {
  position : Vec3
  velocity : Vec2
}

///|
priv enum Observation {
  Visible(Sighting)
  Remembered(Vec3)
  Unseen
}

///|
fn Observation::position(self : Observation) -> Vec3? {
  match self {
    Visible(s) => Some(s.position)
    Remembered(p) => Some(p)
    Unseen => None
  }
}

///|
fn Sighting::predict(
  self : Sighting,
  seconds : Double,
  limit~ : Double = 24,
) -> Vec3 {
  let x = self.velocity.x * seconds
  let z = self.velocity.z * seconds
  let factor = Double::min(
    1,
    limit / Double::max(0.001, Vec2::{ x, z, }.length()),
  )
  {
    x: self.position.x + x * factor,
    y: self.position.y,
    z: self.position.z + z * factor,
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
fn Game::alert_squad(self : Game, index : Int32, sighting : Vec3) -> Unit {
  let enemy = self.enemies[index]
  self.encounters.wake_squad(enemy)
  enemy.alert_until = self.time + 8
  enemy.last_seen = Some(sighting)
  if enemy.definition.encounter is Some(id) &&
    self.encounters.squads.get(id) is Some(squad) {
    for other in squad {
      if other.hp > 0 {
        other.alert_until = enemy.alert_until
        other.last_seen = Some(sighting)
      }
    }
  }
}

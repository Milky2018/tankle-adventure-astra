///|
/// Local reconstruction follows the entrance actually used, including alternate
/// routes. Keep recent wheel positions, never a point projected through a wall.
priv struct RecoveryTrail {
  recent : Array[Vec3]
  approach : Array[Vec3]
  mut owner : String?
  mut heading : Double
  mut last_engaged : Double
  mut sheltered : Bool
}

///|
fn RecoveryTrail::new() -> RecoveryTrail {
  {
    recent: [],
    approach: [],
    owner: None,
    heading: 0,
    last_engaged: -100,
    sheltered: false,
  }
}

///|
fn RecoveryTrail::record(self : RecoveryTrail, position : Vec3) -> Unit {
  if self.recent.last() is Some(previous) {
    let distance = previous.distance(position)
    if distance < 2 {
      return
    }
    if distance > 6 {
      self.recent.clear()
    }
  }
  self.recent.push(position)
  if self.recent.length() > 16 {
    self.recent.remove(0) |> ignore
  }
}

///|
fn Game::engage_recovery(self : Game, owner : String, arena : Arena?) -> Unit {
  if !self.player.abilities.overdrive &&
    self.hives.get(0) is Some(home) &&
    self.progress.anchor == home.id {
    return
  }
  let trail = self.recovery
  let nearby = trail.approach
    .get(0)
    .map(fn(point) { self.player.position().distance(point) < 48 })
    .unwrap_or(true)
  if (nearby || arena is Some(_)) &&
    trail.owner == Some(owner) &&
    (self.time - trail.last_engaged < 5 || arena is Some(_)) {
    trail.last_engaged = self.time
    return
  }
  if nearby &&
    arena is None &&
    trail.owner is Some(_) &&
    self.time - trail.last_engaged < 5 {
    trail.last_engaged = self.time
    return
  }
  trail.owner = Some(owner)
  trail.last_engaged = self.time
  trail.heading = self.player.heading
  trail.approach.clear()
  for point in trail.recent {
    if !(arena is Some(a) && a.contains(point)) {
      trail.approach.push(point)
    }
  }
}

///|
fn Game::recovery_point(self : Game) -> Vec3? {
  if self.death_at is None || self.time - self.recovery.last_engaged > 9 {
    return None
  }
  for point in self.recovery.approach {
    if self.world.support(
        point.x,
        point.z,
        point.y,
        self.player.abilities.flotation,
      )
      is Some(support) &&
      !self.floor_heat.any(fn(b) {
        b.heating(self.progress) &&
        b.deck.rect.contains(point.x, point.z) &&
        (b.deck.height(point.z) - point.y).abs() < 0.5
      }) &&
      conveyor_velocity(point, self.belts, self.enemies, self.progress).length() ==
      0 &&
      !self.world.lifts.any(fn(l) { l.id == support.deck.id }) &&
      self.world.blocked(point.x, point.y, point.z, self.progress) is None &&
      !self.enemies.any(fn(e) {
        !e.definition.kind.is_boss() &&
        e.definition.spawn.distance(point) < e.radius + 2.5
      }) {
      return Some(point)
    }
  }
  None
}

///|
fn Game::leave_recovery(self : Game) -> Unit {
  self.recovery.sheltered = false
}

///|
pub fn Game::field_recovered(self : Game) -> Bool {
  self.recovery.sheltered
}

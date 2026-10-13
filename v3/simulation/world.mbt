///|
pub(all) struct Deck {
  id : String
  rect : Rect
  y : Double
  rise : Double
  water : Bool
}

///|
pub fn Deck::height(self : Deck, z : Double) -> Double {
  self.y + self.rise * clamp((z - self.rect.z) / self.rect.d, 0, 1)
}

///|
pub(all) enum Axis {
  X
  Z
} derive(Eq)

///|
#deprecated
pub extend Axis with Eq::{equal, not_equal}

///|
pub(all) struct Rail {
  axis : Axis
  min : Double
  max : Double
  release : String?
  latch : String?
}

///|
pub(all) struct Solid {
  id : String
  mut rect : Rect
  mut y : Double
  h : Double
  permanent : Bool
  motion : Transport?
  mut direction : Double
  red : Bool
  phoenix : Bool
  rail : Rail?
  arena : String?
  local_control : String?
  circuit_key : String
}

///|
pub fn Solid::active(self : Solid, state : Progress) -> Bool {
  if self.arena is Some(arena) {
    return state.combat_arena == Some(arena)
  }
  if self.permanent || self.rail is Some(_) {
    return true
  }
  if self.red || self.phoenix {
    return !state.has(self.id)
  }
  let id = self.local_control.unwrap_or(self.id)
  !state.circuit_ready(
    id,
    self.circuit_key,
    self.id,
    is_local=self.local_control == Some(id),
  )
}

///|
pub(all) struct Lift {
  id : String
  rect : Rect
  stops : Array[Double]
  lock : String
  locks : Array[String]
  circuit_key : String
  settle : Bool
  mut y : Double
  mut destination : Double
  mut wait : Double
}

///|
pub(all) struct Support {
  deck : Deck
  height : Double
}

///|
pub(all) enum Collision {
  Barrier(Solid)
  Ceiling
}

///|
pub(all) struct World {
  decks : Array[Deck]
  solids : Array[Solid]
  obstacles : Array[Solid]
  architecture : Array[Solid]
  architecture_grid : Map[(Int32, Int32), Array[Solid]]
  lifts : Array[Lift]
}

///|
pub fn World::support(
  self : World,
  x : Double,
  z : Double,
  y : Double,
  deployed : Bool,
) -> Support? {
  let mut best : Support? = None
  for deck in self.decks {
    if (deck.water && !deployed) || !deck.rect.contains(x, z) {
      continue
    }
    let height = deck.height(z)
    let mut shaft = false
    for lift in self.lifts {
      if lift.rect.contains(x, z) && (height - lift.stops[0]).abs() < 0.01 {
        shaft = true
        break
      }
    }
    if shaft || (height - y).abs() > 0.45 {
      continue
    }
    let better = match best {
      None => true
      Some(previous) =>
        height > previous.height ||
        (height == previous.height && previous.deck.water && !deck.water)
    }
    if better {
      best = Some({ deck, height, })
    }
  }
  for lift in self.lifts {
    if !lift.rect.contains(x, z) || (lift.y - y).abs() > 0.45 {
      continue
    }
    let better = match best {
      None => true
      Some(previous) =>
        lift.y > previous.height ||
        (lift.y == previous.height && previous.deck.water)
    }
    if better {
      best = Some({
        deck: {
          id: lift.id,
          rect: lift.rect,
          y: lift.y,
          rise: 0,
          water: false,
        },
        height: lift.y,
      })
    }
  }
  best
}

///|
pub fn World::blocked(
  self : World,
  x : Double,
  y : Double,
  z : Double,
  state : Progress,
  radius~ : Double = 0.9,
) -> Collision? {
  for bodies in [self.obstacles, self.solids] {
    for solid in bodies {
      if solid.active(state) &&
        y + 2 > solid.y + 0.12 &&
        y < solid.y + solid.h - 0.1 &&
        solid.rect.contains(x, z, margin=radius) {
        return Some(Barrier(solid))
      }
    }
  }
  let x0 = @math.floor((x - radius) / 16).to_int()
  let x1 = @math.floor((x + radius) / 16).to_int()
  let z0 = @math.floor((z - radius) / 16).to_int()
  let z1 = @math.floor((z + radius) / 16).to_int()
  for gx in x0..<=x1 {
    for gz in z0..<=z1 {
      if self.architecture_grid.get((gx, gz)) is Some(solids) {
        for solid in solids {
          if y + 2 > solid.y + 0.12 &&
            y < solid.y + solid.h - 0.1 &&
            solid.rect.contains(x, z, margin=radius) {
            return Some(Barrier(solid))
          }
        }
      }
    }
  }
  for deck in self.decks {
    if !deck.water &&
      deck.rect.contains(x, z, margin=-0.01) &&
      deck.height(z) > y + 0.45 &&
      deck.height(z) < y + 3.25 {
      return Some(Ceiling)
    }
  }
  None
}

///|
pub fn World::move_hull(
  self : World,
  player : Hull,
  dx : Double,
  dz : Double,
  state : Progress,
) -> Unit {
  if dx == 0 && dz == 0 && !player.deployed {
    player.afloat = false
    return
  }
  let steps = Int32::max(
    1,
    @math.ceil(Vec2::{ x: dx, z: dz, }.length() / 0.2).to_int(),
  )
  let offsets : Array[Vec2] = [
    { x: 0.9, z: 0, },
    { x: -0.9, z: 0, },
    { x: 0, z: 0.9, },
    { x: 0, z: -0.9, },
    { x: 0.64, z: 0.64, },
    { x: 0.64, z: -0.64, },
    { x: -0.64, z: 0.64, },
    { x: -0.64, z: -0.64, },
  ]
  for _ in 0..<steps {
    for axis in [X, Z] {
      let ax = if axis == X { dx / steps.to_double() } else { 0.0 }
      let az = if axis == Z { dz / steps.to_double() } else { 0.0 }
      if ax == 0 && az == 0 {
        continue
      }
      let x = player.x + ax
      let z = player.z + az
      guard self.support(x, z, player.y, player.deployed) is Some(floor) else {
        player.speed = 1
        continue
      }
      match self.blocked(x, floor.height, z, state) {
        Some(Barrier(wall)) if wall.red && player.red && player.speed > 1 =>
          ignore(state.complete(wall.id))
        Some(Barrier(wall)) if wall.phoenix && player.phoenix =>
          ignore(state.complete(wall.id))
        Some(_) => {
          player.speed = 1
          continue
        }
        None => ()
      }
      let mut supported = true
      for offset in offsets {
        if self.support(
            x + offset.x,
            z + offset.z,
            floor.deck.height(z + offset.z),
            player.deployed,
          )
          is None {
          supported = false
          break
        }
      }
      if !supported {
        player.speed = 1
        continue
      }
      player.x = x
      player.y = floor.height
      player.z = z
    }
  }
  player.afloat = match
    self.support(player.x, player.z, player.y, player.deployed) {
    Some(floor) => floor.deck.water
    None => false
  }
}

///|
pub fn architecture_grid(
  solids : Array[Solid],
) -> Map[(Int32, Int32), Array[Solid]] {
  let bins : Map[(Int32, Int32), Array[Solid]] = Map([])
  for solid in solids {
    let x0 = @math.floor(solid.rect.x / 16).to_int()
    let x1 = @math.floor((solid.rect.x + solid.rect.w) / 16).to_int()
    let z0 = @math.floor(solid.rect.z / 16).to_int()
    let z1 = @math.floor((solid.rect.z + solid.rect.d) / 16).to_int()
    for x in x0..<=x1 {
      for z in z0..<=z1 {
        match bins.get((x, z)) {
          Some(items) => items.push(solid)
          None => bins[(x, z)] = [solid]
        }
      }
    }
  }
  bins
}

///|
pub(all) struct Hull {
  mut x : Double
  mut y : Double
  mut z : Double
  mut speed : Double
  deployed : Bool
  mut afloat : Bool
  red : Bool
  phoenix : Bool
}

///|
pub fn World::move_player(
  self : World,
  player : Player,
  dx : Double,
  dz : Double,
  state : Progress,
) -> Unit {
  let hull : Hull = {
    x: player.x,
    y: player.y,
    z: player.z,
    speed: player.speed,
    deployed: player.deployed,
    afloat: player.afloat,
    red: player.red_contact(),
    phoenix: player.phoenix_ready(),
  }
  self.move_hull(hull, dx, dz, state)
  player.x = hull.x
  player.y = hull.y
  player.z = hull.z
  player.speed = hull.speed
  player.afloat = hull.afloat
}

///|
#derive(@json.ToJson, @json.FromJson)
pub(all) struct RailPuzzle {
  switches : Array[Bool]
  mut solved : Bool
  mut moving : Bool
  mut distance : Double
  mut direction : Double
  route : Array[Vec2]
  mut heading : Double
}

///|
pub fn RailPuzzle::position(self : RailPuzzle, distance? : Double) -> Vec3 {
  if self.solved {
    return { x: -162, y: 8, z: -66, }
  }
  let mut distance = distance.unwrap_or(self.distance)
  for i in 1..<self.route.length() {
    let a = self.route[i - 1]
    let b = self.route[i]
    let length = Vec2::{ x: b.x - a.x, z: b.z - a.z, }.length()
    if distance <= length {
      return {
        x: a.x + (b.x - a.x) * distance / length - 138,
        y: 8,
        z: a.z + (b.z - a.z) * distance / length + 28,
      }
    }
    distance -= length
  }
  { x: -176, y: 8, z: -76, }
}

///|
#derive(@json.ToJson, @json.FromJson)
pub(all) struct GutterPuzzle {
  angles : Array[Int32]
  rotations : Array[Double]
  mut fill : Double
  mut unplugged : Bool
  mut grown : Bool
}

///|
#derive(@json.ToJson, @json.FromJson)
pub(all) struct Delivery {
  mut position : Vec3
  mut leg : Int32
  mut heading : Double
}

///|
pub(all) struct Puzzles {
  mut rail : RailPuzzle
  mut gutter : GutterPuzzle
  mut delivery : Delivery
  pending : Map[String, Double]
}

///|
pub fn Puzzles::new() -> Puzzles {
  {
    rail: {
      switches: [false, false],
      solved: false,
      moving: false,
      distance: 0,
      direction: 1,
      route: [],
      heading: 0,
    },
    gutter: {
      angles: [0, 0],
      rotations: [0, 0],
      fill: 0,
      unplugged: false,
      grown: false,
    },
    delivery: { position: { x: 110, y: -24, z: 30, }, leg: 1, heading: 0, },
    pending: {},
  }
}

///|
pub fn Puzzles::targets(self : Puzzles) -> Array[(String, Vec3)] {
  [
    ("rail-a", { x: -166, y: 9.3, z: -80, }),
    ("rail-b", { x: -158, y: 9.3, z: -76, }),
    ("rail-signal", { x: -176, y: 9.3, z: -71, }),
    ("rail-carrier", self.rail.position().add({ x: 0, y: 1.9, z: 0, })),
    ("gutter-a", { x: 37, y: -6.7, z: 35, }),
    ("gutter-b", { x: 49, y: -6.7, z: 39, }),
    ("gutter-plug", { x: 36, y: -6.7, z: 44, }),
  ]
}

///|
fn Puzzles::operate(self : Puzzles, id : String) -> Bool {
  let r = self.rail
  match id {
    "rail-a" | "rail-b" => {
      if r.solved || r.moving {
        return false
      }
      let i = if id == "rail-a" { 0 } else { 1 }
      r.switches[i] = !r.switches[i]
    }
    "rail-signal" => {
      if !r.moving || r.solved {
        return false
      }
      r.direction = -1
    }
    "rail-carrier" => {
      if r.solved || r.moving {
        return false
      }
      r.route.clear()
      let points : Array[(Double, Double)] = if !r.switches[0] {
        [(-38, -104), (-32, -104), (-32, -112), (-38, -112), (-38, -104)]
      } else if !r.switches[1] {
        [
          (-38, -104),
          (-32, -104),
          (-24, -104),
          (-24, -112),
          (-38, -112),
          (-38, -104),
        ]
      } else {
        [(-38, -104), (-32, -104), (-24, -104), (-24, -94)]
      }
      for (x, z) in points {
        r.route.push({ x, z, })
      }
      r.distance = 0
      r.direction = 1
      r.moving = true
    }
    "gutter-a" | "gutter-b" => {
      if self.gutter.grown {
        return false
      }
      let i = if id == "gutter-a" { 0 } else { 1 }
      self.gutter.angles[i] = (self.gutter.angles[i] + 1) % 3
    }
    "gutter-plug" => {
      if self.gutter.unplugged {
        return false
      }
      self.gutter.unplugged = true
    }
    _ => return false
  }
  true
}

///|
pub fn Puzzles::activate(self : Puzzles, id : String) -> Bool {
  if self.pending.contains(id) {
    return false
  }
  if id == "rail-carrier" {
    return self.operate(id)
  }
  if id.has_prefix("rail-") &&
    (
      self.rail.solved ||
      (if id == "rail-signal" { !self.rail.moving } else { self.rail.moving })
    ) {
    return false
  }
  if id.has_prefix("gutter-") && self.gutter.grown {
    return false
  }
  if id == "gutter-plug" && self.gutter.unplugged {
    return false
  }
  // Orthogonal cable lengths, in world units, with the same propagation speed as other circuits.
  let length = match id {
    "rail-a" => 8.2
    "rail-b" => 4.8
    "rail-signal" => 7.7
    "gutter-a" => 9.8
    "gutter-b" => 9.8
    "gutter-plug" => 12.55
    _ => return false
  }
  self.pending[id] = Double::max(0.35, length / 18)
  true
}

///|
fn Game::puzzle_occupied(
  self : Game,
  position : Vec3,
  previous? : Vec3,
) -> Bool {
  fn near(p : Vec3) -> Bool {
    let distance = Vec2::{ x: p.x - position.x, z: p.z - position.z, }.length()
    (p.y - position.y).abs() < 2 &&
    distance < 2.3 &&
    (
      previous is None ||
      (
        previous is Some(prev) &&
        distance < Vec2::{ x: p.x - prev.x, z: p.z - prev.z, }.length()
      )
    )
  }
  near(self.player.position()) ||
  self.enemies.any(fn(e) { e.hp > 0 && near(e.position()) })
}

///|
pub fn Game::update_puzzles(self : Game, dt : Double) -> Unit {
  let puzzles = self.puzzles
  let delivered : Array[String] = []
  for id, left in puzzles.pending {
    puzzles.pending[id] = left - dt
    if left <= dt {
      delivered.push(id)
    }
  }
  for id in delivered {
    puzzles.pending.remove(id)
    puzzles.operate(id) |> ignore
  }
  let rail = puzzles.rail
  if rail.moving {
    let mut length = 0.0
    for i in 1..<rail.route.length() {
      length += Vec2::{
        x: rail.route[i].x - rail.route[i - 1].x,
        z: rail.route[i].z - rail.route[i - 1].z,
      }.length()
    }
    let next = clamp(rail.distance + 4 * dt * rail.direction, 0, length)
    let before = rail.position()
    let after = rail.position(distance=next)
    if !self.puzzle_occupied(after, previous=before) {
      rail.distance = next
      if after.distance(before) > 0.0001 {
        rail.heading = @math.atan2(after.x - before.x, after.z - before.z)
      }
      if next == 0 && rail.direction < 0 {
        rail.moving = false
        rail.route.clear()
      }
      if next >= length {
        rail.moving = false
        rail.solved = rail.switches.all(fn(s) { s })
        if !rail.solved {
          rail.route.clear()
          rail.distance = 0
        }
      }
    }
  }
  if rail.solved {
    self.progress.complete("rail-crossing") |> ignore
  }
  let position = rail.position()
  let bounds = self.world.obstacles[0]
  bounds.rect = { ..bounds.rect, x: position.x - 1.1, z: position.z - 1.1, }
  let gutter = puzzles.gutter
  let connected = (gutter.rotations[0] -
    gutter.angles[0].to_double() * @math.PI / 2).abs() <
    0.02 &&
    (gutter.rotations[1] - gutter.angles[1].to_double() * @math.PI / 2).abs() <
    0.02
  if !gutter.grown {
    gutter.fill = approach(
      gutter.fill,
      if gutter.unplugged &&
        connected &&
        gutter.angles[0] == 1 &&
        gutter.angles[1] == 2 {
        1
      } else {
        0
      },
      dt / 2,
    )
    if gutter.fill == 1 {
      gutter.grown = true
      self.progress.complete("garden-bloom") |> ignore
    }
  }
  for i in 0..<2 {
    gutter.rotations[i] += (
        gutter.angles[i].to_double() * @math.PI / 2 - gutter.rotations[i]
      ) *
      (1 - @math.exp(-8 * dt))
  }
  let delivery = puzzles.delivery
  let route : Array[Vec3] = [
    { x: 110, y: -24, z: 30, },
    { x: 122, y: -24, z: 30, },
    { x: 122, y: -24, z: 24, },
    { x: 122, y: -16, z: 0, },
    { x: 130, y: -16, z: 0, },
    { x: 130, y: -16, z: 18, },
  ]
  if self.progress.has("maintenance-started") {
    let mut remaining = dt * 3
    while remaining > 0 && delivery.leg < route.length() {
      let delta = route[delivery.leg].sub(delivery.position)
      let distance = delta.length()
      let step = Double::min(0.2, Double::min(remaining, distance))
      let next = delivery.position.add(delta.normalized().scale(step))
      if self.puzzle_occupied(next) {
        break
      }
      delivery.position = next
      delivery.heading = @math.atan2(delta.x, delta.z)
      remaining -= step
      if distance <= step + 0.00000001 {
        delivery.leg += 1
      }
    }
    if delivery.leg == route.length() {
      self.progress.complete("maintenance") |> ignore
    }
  }
  if self.world.obstacles
    .iter()
    .find_first(fn(b) { b.id == "maintenance-cart" })
    is Some(body) {
    body.rect = {
      ..body.rect,
      x: delivery.position.x - 1,
      z: delivery.position.z - 1,
    }
    body.y = delivery.position.y
  }
}

///|
#deprecated
pub extend RailPuzzle with @json.ToJson::{to_json}

///|
#deprecated
pub extend RailPuzzle with @json.FromJson::{from_json}

///|
#deprecated
pub extend GutterPuzzle with @json.ToJson::{to_json}

///|
#deprecated
pub extend GutterPuzzle with @json.FromJson::{from_json}

///|
#deprecated
pub extend Delivery with @json.ToJson::{to_json}

///|
#deprecated
pub extend Delivery with @json.FromJson::{from_json}

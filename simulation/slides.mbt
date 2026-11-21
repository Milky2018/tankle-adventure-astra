///|
fn overlap_area(a : Rect, b : Rect) -> Double {
  Double::max(0, Double::min(a.x + a.w, b.x + b.w) - Double::max(a.x, b.x)) *
  Double::max(0, Double::min(a.z + a.d, b.z + b.d) - Double::max(a.z, b.z))
}

///|
pub fn Game::pull_slide(
  self : Game,
  body : Solid,
  driver : Vec3,
  dt : Double,
) -> Bool {
  guard body.rail is Some(rail) else { return false }
  let before = body.coordinate(rail.axis)
  let size = if rail.axis == X { body.rect.w } else { body.rect.d }
  let toward = (if rail.axis == X { driver.x } else { driver.z }) -
    before -
    size / 2
  if toward.abs() < size / 2 + 1.2 {
    return false
  }
  let destination = clamp(
    before +
    (if toward > 0 { 1.0 } else { -1.0 }) *
    Double::min(
      (if rail.release is Some(_) { 3.0 } else { 12.0 }) * dt,
      toward.abs() - size / 2 - 1.2,
    ),
    rail.min,
    rail.max,
  )
  let steps = Int32::max(
    1,
    ((destination - before).abs() / 0.15).ceil().to_int(),
  )
  for step in 1..<=steps {
    let coordinate = before +
      (destination - before) * step.to_double() / steps.to_double()
    let candidate = if rail.axis == X {
      { ..body.rect, x: coordinate, }
    } else {
      { ..body.rect, z: coordinate, }
    }
    if overlap_area(candidate, {
        x: self.player.x - 0.9,
        z: self.player.z - 0.9,
        w: 1.8,
        d: 1.8,
      }) >
      0 &&
      (self.player.y - body.y).abs() < 2.5 {
      break
    }
    let mut blocked = false
    for
      blockers in [
        self.world.solids,
        self.world.obstacles,
        self.world.architecture,
      ] {
      if blockers.any(fn(b) {
          b.id != body.id &&
          b.active(self.progress) &&
          (b.y - body.y).abs() < 2.5 &&
          overlap_area(candidate, b.rect) > 0 &&
          overlap_area(candidate, b.rect) >= overlap_area(body.rect, b.rect)
        }) {
        blocked = true
        break
      }
    }
    if blocked {
      break
    }
    if ![
        (0.1, 0.1),
        (body.rect.w - 0.1, 0.1),
        (0.1, body.rect.d - 0.1),
        (body.rect.w - 0.1, body.rect.d - 0.1),
      ].all(fn(c) {
        self.world.support(candidate.x + c.0, candidate.z + c.1, body.y, false)
        is Some(_)
      }) {
      break
    }
    let pushed : Array[(Enemy, Hull)] = []
    for e in self.enemies {
      if e.hp <= 0 || (e.y - body.y).abs() >= 2.5 {
        continue
      }
      let rect = Rect::{
        x: e.x - e.radius,
        z: e.z - e.radius,
        w: e.radius * 2,
        d: e.radius * 2,
      }
      if overlap_area(candidate, rect) <= 0 ||
        overlap_area(candidate, rect) < overlap_area(body.rect, rect) {
        continue
      }
      let position = if destination > before {
        coordinate + size + e.radius + 0.02
      } else {
        coordinate - e.radius - 0.02
      }
      let hull = enemy_hull(e, false)
      self.world.move_hull(
        hull,
        if rail.axis == X {
          position - e.x
        } else {
          0
        },
        if rail.axis == Z {
          position - e.z
        } else {
          0
        },
        self.progress,
      )
      |> ignore
      if ((if rail.axis == X { hull.x } else { hull.z }) - position).abs() >
        0.01 ||
        self.enemies.any(fn(other) {
          other.definition.id != e.definition.id &&
          other.hp > 0 &&
          (other.y - hull.y).abs() < 2.5 &&
          Vec2::{ x: other.x - hull.x, z: other.z - hull.z, }.length() <
          other.radius + e.radius
        }) {
        blocked = true
        break
      }
      pushed.push((e, hull))
    }
    if blocked {
      break
    }
    for (enemy, hull) in pushed {
      enemy.x = hull.x
      enemy.y = hull.y
      enemy.z = hull.z
    }
    body.set_coordinate(rail.axis, coordinate)
  }
  self.progress.slide_positions[body.id] = body.coordinate(rail.axis)
  if rail.latch is Some(id) && body.coordinate(rail.axis) >= rail.max - 0.01 {
    self.commands.complete(self.progress, id, self.time, delayed=true) |> ignore
  }
  body.coordinate(rail.axis) != before
}

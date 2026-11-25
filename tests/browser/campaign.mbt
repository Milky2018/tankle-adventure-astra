///|
fn Player::flag(self : Player, id : String) -> Bool {
  self.flags.get(id).unwrap_or(false)
}

///|
async fn Browser::move_to(self : Browser, x : Double, z : Double) -> Unit {
  let mut previous = (1000000.0, 1000000.0)
  let mut stuck = 0
  for _ in 0..<220 {
    let p = self.player()
    let dx = x - p.x
    let dz = z - p.z
    if @math.hypot(dx, dz) < 0.45 {
      self.fire(false)
      return
    }
    stuck = if @math.hypot(p.x - previous.0, p.z - previous.1) < 0.01 {
      stuck + 1
    } else {
      0
    }
    ensure(
      p.hp > 0 && stuck < 13,
      "Stuck moving to (\{x},\{z}) at (\{p.x},\{p.y},\{p.z}), HP \{p.hp}",
    )
    previous = (p.x, p.z)
    if p.threat(23, 2.5) is Some(e) {
      self.aim(p, e.x, e.y + 1.5, e.z)
      self.fire(true)
    } else {
      self.fire(false)
    }
    self.walk(
      dx,
      dz,
      (dx.abs().max(dz.abs()) * 100).clamp(min=18, max=160).to_int(),
    )
  }
  raise Failure("Timed out moving to (\{x},\{z})")
}

///|
async fn Browser::trigger(
  self : Browser,
  id : String,
  x : Double,
  y : Double,
  z : Double,
) -> Unit {
  for _ in 0..<150 {
    let p = self.player()
    if p.flag(id) || p.pending.contains(id) {
      break
    }
    if p.threat(if id == "relay-west" { 10 } else { 8 }, 2) is Some(e) {
      self.aim(p, e.x, e.y + 1.5, e.z)
    } else {
      self.aim(p, x, y, z)
    }
    self.fire(true)
    @async.sleep(100)
  }
  self.fire(false)
  @async.sleep(1600)
  ensure(self.player().flag(id), "Cannon did not activate " + id)
}

///|
async fn Browser::battle(self : Browser, boss : Bool) -> Unit {
  let orbit : Array[(Double, Double)] = if boss {
    [(-39, 136), (-23, 136), (-23, 123), (-39, 123)]
  } else {
    [(-59, 98), (-59, 113), (-53, 113), (-53, 98)]
  }
  let mut corner = 0
  for _ in 0..<(if boss { 1800 } else { 500 }) {
    let p = self.player()
    let mut target = None
    for e in p.enemies {
      if e.hp <= 0 {
        continue
      }
      if (boss && e.id == "prototype") || (!boss && e.id == "reclaim-scout") {
        target = Some(e)
        break
      }
      if !boss && e.id == "reclaim-guard" {
        target = Some(e)
      }
    }
    guard target is Some(e) else {
      self.fire(false)
      if !boss {
        self.move_to(p.x, 104)
        self.move_to(-66, 104)
        self.move_to(-57, 104)
      }
      return
    }
    ensure(
      p.hp > 0 && (boss || p.y == -16),
      "Lost encounter at (\{p.x},\{p.y},\{p.z})",
    )
    if @math.hypot(p.x - orbit[corner].0, p.z - orbit[corner].1) < 0.8 {
      corner = (corner + 1) % orbit.length()
    }
    self.aim(p, e.x, e.y + 1.5, e.z)
    self.fire(e.id == "reclaim-scout" || e.vent)
    self.walk(orbit[corner].0 - p.x, orbit[corner].1 - p.z, 90)
  }
  raise Failure("Encounter timed out")
}

///|
async fn Browser::boost(self : Browser, x : Double, z : Double) -> Unit {
  let p = self.player()
  let dx = x - p.x
  let dz = z - p.z
  let length = @math.hypot(dx, dz)
  self.look(true)
  self.face(dx, dz)
  self.look(false)
  self.key("ShiftLeft", true)
  self.key("KeyW", true)
  let since = now_ms()
  while now_ms() - since < 18000 {
    let q = self.player()
    if (x - q.x) * dx + (z - q.z) * dz < 0.45 * length {
      break
    }
    @async.sleep(15)
  }
  self.key("KeyW", false)
  self.key("ShiftLeft", false)
  let q = self.player()
  ensure(
    @math.hypot(x - q.x, z - q.z) < 2,
    "Boost missed exit (\{x},\{z}) at (\{q.x},\{q.z})",
  )
}

///|
async fn Browser::campaign(self : Browser) -> Unit {
  self.goto("?chapter=folded&test")
  self.press("Escape")
  self.click("#new-game")
  self.until(
    "!!window.__typedRead && !document.body.classList.contains('starting') && document.querySelector('#settings').hidden",
  )
  ensure(self.player().flags.is_empty(), "Opening already has progress")
  self.move_to(-40, 86)
  self.move_to(-40, 49)
  self.trigger("relay-west", -46.28, -14, 49)
  self.shot("opening-relay")
  self.move_to(-51, 50)
  let p = self.player()
  ensure(p.x < -48 && p.hp > 0, "Tank did not clear the west door")
  println("West relay and door passed")
  self.move_to(-57, 52)
  self.move_to(-57, 76)
  self.press("KeyE")
  self.move_to(-57, 95)
  self.battle(false)
  self.move_to(-57, 118)
  self.trigger("relay-east", -50.72, -13.8, 125)
  self.move_to(-57, 128)
  self.move_to(-43, 132)
  self.shot("first-boss-entry")
  self.battle(true)
  ensure(self.player().flag("prototype"), "First boss survived")
  self.move_to(-28, 124)
  self.press("KeyE")
  ensure(self.player().flag("overdrive"), "Overdrive was not acquired")
  self.until("document.querySelector('#acquired').getClientRects().length>0")
  ensure(
    self.evaluate(element("#acquired-title") + ".textContent") == "Overdrive",
    "Wrong acquired module",
  )
  self.shot("overdrive")
  self.boost(-28, 100)
  self.move_to(-28, 66)
  self.trigger("prototype-shortcut", -28, -12.75, 59.1)
  self.move_to(-28, 52)
  self.move_to(-40, 52)
  self.boost(-40, 86)
  self.move_to(0, 86)
  self.press("KeyE")
  let hp : Double = @json.from_json(
    self.evaluate(
      "Number(document.querySelector('#hp').getAttribute('aria-valuemax'))",
    ),
  )
  ensure(self.player().hp == hp, "Repair station did not restore hull")
  self.shot("repair-return")
  self.interface_check()
}

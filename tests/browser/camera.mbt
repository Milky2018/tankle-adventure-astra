///|
async fn Browser::pitches(self : Browser) -> Array[Double] {
  let values = []
  self.look(true)
  for _ in 0..<4 {
    for dy in [0.0, -36, -36, -36, 36, 36, 36] {
      self.drag(0, dy)
      ignore(self.frame())
      ignore(self.frame())
      let p = self.player()
      let a = self.project(p.x + 1000000.0, p.y, p.z)
      let b = self.project(p.x, p.y, p.z + 1000000.0)
      let cx = self.width.to_double() / 2
      let cy = self.height.to_double() / 2
      let horizon = if (a.0 - cx).abs() < (b.0 - cx).abs() { a.1 } else { b.1 }
      let vertical = self.project(p.x, p.y + 1000000.0, p.z).1
      let focal = ((horizon - cy) * (vertical - cy)).abs().sqrt()
      values.push(@math.atan2(cy - horizon, focal))
    }
    self.drag(209, 0)
  }
  self.look(false)
  values
}

///|
async fn Browser::camera(self : Browser) -> Unit {
  self.resize(960, 540)
  let url = "?chapter=circulation&test&view=third"
  self.goto(url)
  let lane = self.pitches()
  ensure(
    lane[1] < lane[0] && lane[6] > lane[3],
    "Mouse drag did not tilt in both directions",
  )
  self.goto(url)
  self.key("KeyS", true)
  self.until("__typedRead().x>=300", timeout=12000)
  self.key("KeyS", false)
  let wall = self.pitches()
  for i, p in lane {
    ensure(
      (p - wall[i]).abs() < 0.005,
      "Wall changed pitch at sample \{i}: \{p} vs \{wall[i]}",
    )
  }
  self.resize(1280, 720)
}

///|
#derive(@json.FromJson)
priv struct Enemy {
  id : String
  x : Double
  y : Double
  z : Double
  hp : Double
  vent : Bool
}

///|
#derive(@json.FromJson)
priv struct Player {
  x : Double
  y : Double
  z : Double
  hp : Double
  heat : Double
  time : Double
  flags : Map[String, Bool]
  pending : Array[String]
  enemies : Array[Enemy]
}

///|
async fn Browser::player(self : Browser) -> Player {
  @json.from_json(self.evaluate("__typedRead()"))
}

///|
async fn Browser::key(self : Browser, code : String, down : Bool) -> Unit {
  let (key, vk) = match code {
    "Escape" => ("Escape", 27)
    "Tab" => ("Tab", 9)
    "ShiftLeft" => ("Shift", 16)
    _ => {
      let letter = code.strip_prefix("Key").unwrap().to_owned()
      (letter.to_lower(), letter[0].to_int())
    }
  }
  let kind = if down { "keyDown" } else { "keyUp" }
  ignore(
    self.command("Input.dispatchKeyEvent", params={
      "type": kind,
      "key": key,
      "code": code,
      "windowsVirtualKeyCode": vk,
    }),
  )
}

///|
async fn Browser::press(self : Browser, key : String) -> Unit {
  self.key(key, true)
  self.key(key, false)
}

///|
async fn Browser::mouse(
  self : Browser,
  kind : String,
  x : Double,
  y : Double,
  buttons : Int32,
) -> Unit {
  ignore(
    self.command("Input.dispatchMouseEvent", params={
      "type": kind,
      "x": x,
      "y": y,
      "button": "left",
      "buttons": buttons,
      "clickCount": 1,
    }),
  )
}

///|
async fn Browser::fire(self : Browser, down : Bool) -> Unit {
  if down == self.firing {
    return
  }
  self.firing = down
  self.mouse(
    if down {
      "mousePressed"
    } else {
      "mouseReleased"
    },
    self.width.to_double() / 2,
    self.height.to_double() / 2,
    if down {
      1
    } else {
      0
    },
  )
}

///|
fn element(selector : String) -> String {
  "document.querySelector(" + Json::string(selector).stringify() + ")"
}

///|
async fn Browser::visible(self : Browser, selector : String) -> Bool {
  self.evaluate("!!" + element(selector) + "?.getClientRects().length") is True
}

///|
async fn Browser::click(self : Browser, selector : String) -> Unit {
  let el = element(selector)
  self.until("!!" + el + "?.getClientRects().length")
  let r = self.evaluate(el + ".getBoundingClientRect().toJSON()")
  let x : Double = @json.from_json(prop(r, "x"))
  let w : Double = @json.from_json(prop(r, "width"))
  let y : Double = @json.from_json(prop(r, "y"))
  let h : Double = @json.from_json(prop(r, "height"))
  self.mouse("mousePressed", x + w / 2, y + h / 2, 1)
  self.mouse("mouseReleased", x + w / 2, y + h / 2, 0)
}

///|
async fn Browser::drag(self : Browser, x : Double, y : Double) -> Unit {
  let dx = @math.round(x).to_int()
  let dy = @math.round(y).to_int()
  ignore(
    self.evaluate(
      "document.querySelector('#game').dispatchEvent(new MouseEvent('mousemove',{movementX:\{dx},movementY:\{dy}}))",
    ),
  )
  self.yaw -= dx.to_double() * 0.0075
}

///|
async fn Browser::look(self : Browser, down : Bool) -> Unit {
  let expr = if down {
    "document.querySelector('#game').dispatchEvent(new MouseEvent('mousedown',{button:1}))"
  } else {
    "window.dispatchEvent(new MouseEvent('mouseup',{button:1}))"
  }
  ignore(self.evaluate(expr))
}

///|
async fn Browser::frame(self : Browser) -> Double {
  @json.from_json(self.evaluate("new Promise(requestAnimationFrame)"))
}

///|
async fn Browser::project(
  self : Browser,
  x : Double,
  y : Double,
  z : Double,
) -> (Double, Double) {
  @json.from_json(self.evaluate("__typedProject(\{x},\{y},\{z})"))
}

///|
async fn Browser::face(self : Browser, dx : Double, dz : Double) -> Unit {
  let angle = @math.atan2(dx, dz) - self.yaw
  self.drag(-@math.atan2(@math.sin(angle), @math.cos(angle)) / 0.0075, 0)
}

///|
async fn Browser::aim(
  self : Browser,
  p : Player,
  x : Double,
  y : Double,
  z : Double,
) -> Unit {
  self.look(true)
  self.face(x - p.x, z - p.z)
  let focal = self.height.to_double() / (2 * @math.tan(@math.PI / 6))
  for _ in 0..<8 {
    ignore(self.frame())
    let (sx, sy) = self.project(x, y, z)
    let dx = sx - self.width.to_double() / 2
    let dy = sy - self.height.to_double() / 2
    if @math.hypot(dx, dy) < 4 {
      break
    }
    self.drag(@math.atan2(dx, focal) / 0.0075, @math.atan2(dy, focal) / 0.006)
  }
  self.look(false)
}

///|
async fn Browser::walk(
  self : Browser,
  dx : Double,
  dz : Double,
  ms : Int32,
) -> Unit {
  let forward = dx * @math.sin(self.yaw) + dz * @math.cos(self.yaw)
  let right = -dx * @math.cos(self.yaw) + dz * @math.sin(self.yaw)
  let limit = forward.abs().max(right.abs()) * @math.tan(@math.PI / 8)
  let keys = []
  if forward.abs() > limit {
    keys.push(if forward > 0 { "KeyW" } else { "KeyS" })
  }
  if right.abs() > limit {
    keys.push(if right > 0 { "KeyD" } else { "KeyA" })
  }
  for k in keys {
    self.key(k, true)
  }
  @async.sleep(ms)
  for k in keys {
    self.key(k, false)
  }
}

///|
fn Player::threat(self : Player, range : Double, height : Double) -> Enemy? {
  let mut nearest = None
  let mut distance = range
  for e in self.enemies {
    let d = @math.hypot(self.x - e.x, self.z - e.z)
    if e.hp > 0 && (e.y - self.y).abs() < height && d < distance {
      distance = d
      nearest = Some(e)
    }
  }
  nearest
}

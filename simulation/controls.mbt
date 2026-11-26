///|
pub using @interaction {type Action, type Acquisition}

///|
pub(all) struct Control {
  id : String
  mut position : Vec3
  ground : Double
  actions : Array[Action]
  requires : String?
  effects : Array[String]
  circuit_key : String
  mount : String?
  facing : Vec3?
  optical_normal : Vec3?
  relay_mirror : String?
  top : Bool
  rotor : Bool
  counterweight : Bool
  mut flash : Double
  mut pull : Double
}

///|
/// Radius of the exposed face, measured in the authored instrument model.
fn Control::strike_radius(self : Control) -> Double {
  if self.top {
    2.56
  } else if self.mount is Some(_) && self.actions.contains(CannonAction) {
    1.71
  } else if self.mount is Some(_) {
    1.43
  } else {
    1.6
  }
}

///|
/// Closest point on the circular working surface of an open mortar tray.
pub fn Control::tray_face(self : Control, p : Vec3) -> Vec3 {
  let offset = Vec2::{ x: p.x - self.position.x, z: p.z - self.position.z, }
  let scale = Double::min(
    1,
    self.strike_radius() / Double::max(0.001, offset.length()),
  )
  {
    x: self.position.x + offset.x * scale,
    y: self.position.y,
    z: self.position.z + offset.z * scale,
  }
}

///|
pub(all) struct Circuit {
  id : String
  duration : Double
  branches : Array[SignalBranch]
}

///|
pub(all) struct Commands {
  controls : Array[Control]
  circuits : Map[String, Circuit]
  starts : Map[String, Double]
}

///|
pub fn Commands::new(
  controls : Array[Control],
  circuits : Array[Circuit],
) -> Commands {
  let by_id : Map[String, Circuit] = Map([])
  for circuit in circuits {
    by_id[circuit.id] = circuit
  }
  { controls, circuits: by_id, starts: {}, }
}

///|
pub fn Commands::active(self : Commands, state : Progress, id : String) -> Bool {
  if state.has(id) || state.pending.contains(id) {
    return true
  }
  self.controls.iter().find_first(fn(c) { c.id == id }) is Some(control) &&
  control.effects.all(fn(effect) { state.has(effect) })
}

///|
fn Commands::trigger(
  self : Commands,
  state : Progress,
  id : String,
  changes : Map[String, Bool],
  external~ : Bool = false,
) -> Bool {
  let circuit = self.circuits.get(id)
  state.trigger(
    id,
    circuit.map(fn(c) { c.duration }).unwrap_or(0),
    changes,
    circuit.map(fn(c) { c.branches }).unwrap_or([]),
    external~,
  )
}

///|
pub fn Commands::activate(
  self : Commands,
  state : Progress,
  id : String,
  action : Action,
  player : Player,
  time : Double,
  reflected_by? : String,
) -> Bool {
  if self.active(state, id) {
    return false
  }
  guard self.controls.iter().find_first(fn(c) { c.id == id }) is Some(control) else {
    return false
  }
  if control.requires is Some(required) &&
    !state.circuit_ready(required, control.circuit_key, control.id) {
    return false
  }
  if control.relay_mirror is Some(_) && control.relay_mirror != reflected_by {
    return false
  }
  if !control.actions.contains(action) ||
    (action == MagnetAction && !player.abilities.magnet) {
    return false
  }
  if control.effects.all(fn(effect) { state.has(effect) }) {
    return false
  }
  let changes : Map[String, Bool] = Map([])
  for effect in control.effects {
    changes[effect] = true
  }
  self.starts[id] = time
  self.trigger(state, id, changes)
}

///|
fn Commands::flush(self : Commands, state : Progress, time : Double) -> Unit {
  for event in state.events {
    if self.controls.any(fn(c) { c.id == event }) ||
      !self.circuits.contains(event) {
      continue
    }
    self.starts[event] = time
    self.trigger(state, event, {}, external=true) |> ignore
  }
  state.events.clear()
}

///|
pub fn Commands::complete(
  self : Commands,
  state : Progress,
  id : String,
  time : Double,
  delayed~ : Bool = false,
  effects~ : Array[String] = [],
) -> Bool {
  if self.active(state, id) {
    return false
  }
  self.starts[id] = time
  if delayed {
    let changes : Map[String, Bool] = Map([(id, true)])
    for effect in effects {
      changes[effect] = true
    }
    return self.trigger(state, id, changes)
  }
  state.complete(id) |> ignore
  for effect in effects {
    state.complete(effect) |> ignore
  }
  self.flush(state, time)
  true
}

///|
pub fn Commands::advance(
  self : Commands,
  state : Progress,
  dt : Double,
  time : Double,
) -> Bool {
  self.flush(state, time)
  let delivered = state.advance_signals(dt)
  for id in delivered {
    self.starts[id] = time -
      self.circuits.get(id).map(fn(c) { c.duration }).unwrap_or(0)
  }
  !delivered.is_empty()
}

///|
pub(all) struct Pickup {
  id : String
  mut position : Vec3
  acquisition : Acquisition
  requires : String?
  lift : String?
  hidden : Bool
  preview : Bool
}

///|
pub fn Player::acquire(
  self : Player,
  pickup : Pickup,
  state : Progress,
) -> Bool {
  if state.has(pickup.id) || (pickup.requires is Some(id) && !state.has(id)) {
    return false
  }
  let old_max = self.max_hp()
  self.install(pickup.acquisition)
  state.complete(pickup.id) |> ignore
  self.hp = Double::min(self.max_hp(), self.hp + self.max_hp() - old_max)
  true
}

///|
pub(all) struct Mirror {
  id : String
  mut position : Vec3
  base_normal : Vec3
  size : Double
  turnable : Bool
  mut flash : Double
  mut angle : Double
}

///|
pub fn Mirror::normal(self : Mirror) -> Vec3 {
  self.base_normal.rotate_y(self.angle).normalized()
}

///|
fn Player::install(self : Player, acquisition : Acquisition) -> Unit {
  match acquisition {
    Overdrive => self.abilities.overdrive = true
    Magnet => self.abilities.magnet = true
    MortarModule => self.abilities.mortar = true
    Flotation => self.abilities.flotation = true
    Phoenix => self.abilities.phoenix = true
    LaserModule => self.abilities.laser = true
    Circulation => self.abilities.circulation = true
    _ => self.upgrades.install(acquisition)
  }
}

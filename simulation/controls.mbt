///|
#derive(Eq)
pub(all) enum Action {
  CannonAction
  MortarAction
  LaserAction
  MagnetAction
  Use
  Dock
}

///|
#deprecated
pub extend Action with Eq::{equal, not_equal}

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
  top : Bool
  rotor : Bool
  counterweight : Bool
  mut flash : Double
  mut pull : Double
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
pub(all) enum Acquisition {
  Overdrive
  Magnet
  MortarModule
  Flotation
  Phoenix
  LaserModule
  Circulation
  Armor
  Cooling
  CannonCoil
  MortarCharge
  LaserFocus
  Scope
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

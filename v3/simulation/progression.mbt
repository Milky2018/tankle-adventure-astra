///|
pub(all) struct SignalBranch {
  key : String
  target : String
  duration : Double
} derive(@json.ToJson, @json.FromJson)

///|
pub(all) struct Signal {
  duration : Double
  mut remaining : Double
  changes : Map[String, Bool]
  branches : Array[SignalBranch]
} derive(@json.ToJson, @json.FromJson)

///|
pub(all) struct Progress {
  flags : Map[String, Bool]
  events : Array[String]
  pending : Map[String, Signal]
  mirror_turns : Map[String, Int32]
  slide_positions : Map[String, Double]
  discovered : Array[String]
  mut anchor : String
  mut combat_arena : String?
}

///|
pub fn Progress::new() -> Progress {
  {
    flags: {},
    events: [],
    pending: {},
    mirror_turns: {},
    slide_positions: {},
    discovered: [],
    anchor: "awakening",
    combat_arena: None,
  }
}

///|
pub fn Progress::has(self : Progress, id : String) -> Bool {
  self.flags.get(id).unwrap_or(false)
}

///|
pub fn Progress::complete(self : Progress, id : String) -> Bool {
  if self.has(id) {
    return false
  }
  self.flags[id] = true
  self.events.push(id)
  true
}

///|
pub fn Progress::turn_mirror(self : Progress, id : String) -> Int32 {
  let turns = self.mirror_turns.get(id).unwrap_or(0) + 1
  self.mirror_turns[id] = turns
  turns
}

///|
pub fn Progress::circuit_ready(
  self : Progress,
  id : String,
  key : String,
  target : String,
  is_local~ : Bool = false,
) -> Bool {
  for source, signal in self.pending {
    if source != id && !signal.changes.contains(id) {
      continue
    }
    let mut duration = if is_local { 0.18 } else { signal.duration }
    for branch in signal.branches {
      if (key != "" && branch.key == key) ||
        (key == "" && branch.target == target) {
        duration = branch.duration
        break
      }
    }
    return signal.duration - signal.remaining >= duration - 0.00000001
  }
  self.has(id)
}

///|
pub fn Progress::trigger(
  self : Progress,
  id : String,
  duration : Double,
  changes : Map[String, Bool],
  branches : Array[SignalBranch],
  external~ : Bool = false,
) -> Bool {
  if (!external && self.has(id)) || self.pending.contains(id) {
    return false
  }
  if duration == 0 {
    for key, value in changes {
      self.flags[key] = value
    }
  } else {
    self.pending[id] = {
      duration,
      remaining: duration,
      changes: changes.copy(),
      branches: branches.copy(),
    }
  }
  true
}

///|
pub fn Progress::advance_signals(self : Progress, dt : Double) -> Array[String] {
  let delivered : Array[String] = []
  for id, signal in self.pending {
    signal.remaining = Double::max(0, signal.remaining - dt)
    if signal.remaining > 0.00000001 {
      continue
    }
    for key, value in signal.changes {
      self.flags[key] = value
    }
    delivered.push(id)
  }
  for id in delivered {
    self.pending.remove(id)
  }
  delivered
}

///|
pub fn Player::apply_upgrades(self : Player, state : Progress) -> Unit {
  let mut armor = 0
  for
    id in [
      "armor-foundry", "armor-reservoir", "armor-proving", "armor-lens", "armor-hearth",
    ] {
    if state.has(id) {
      armor += 1
    }
  }
  self.upgrades.armor_packs = armor
  self.upgrades.cooling = state.has("cooling-filter")
  self.upgrades.cannon = state.has("cannon-coil")
  self.upgrades.mortar = state.has("mortar-charge")
  self.upgrades.laser = state.has("laser-focus")
  self.upgrades.scope = state.has("cannon-scope")
}

///|
#deprecated
pub extend Signal with @json.ToJson::{to_json}

///|
#deprecated
pub extend Signal with @json.FromJson::{from_json}

///|
#deprecated
pub extend SignalBranch with @json.ToJson::{to_json}

///|
#deprecated
pub extend SignalBranch with @json.FromJson::{from_json}

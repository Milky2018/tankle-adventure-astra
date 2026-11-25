///|
extern "js" fn coord(n : Double) -> String = "(n) => n.toFixed(4)"

///|
fn location_key(
  target : String?,
  circuit : String?,
  id : String,
  x : Double,
  y : Double,
  z : Double,
) -> String {
  for key in [target, circuit] {
    if key is Some(s) && !s.is_empty() {
      return s
    }
  }
  [id, coord(x), coord(y), coord(z)].join(":")
}

///|
fn deck_title(id : String) -> String {
  let result = StringBuilder()
  let mut boundary = true
  for c in id {
    let word = (c.is_ascii_alphabetic() || c.is_ascii_digit()) || c == '_'
    if c == '-' {
      result.write_char(' ')
    } else if boundary && c.is_ascii_lowercase() {
      result.write_char(c.to_ascii_uppercase())
    } else {
      result.write_char(c)
    }
    boundary = !word
  }
  result.to_string()
}

///|
fn deck(r : @catalog.Deck) -> String {
  let label = match r.region {
    Some("foundry") => "Recycling Foundry"
    Some("transit") => "Freight Exchange"
    Some("garden") => "Sunken Gardens"
    Some("testworks") => "Proving Grounds"
    Some("optics") => "Silent Observatory"
    Some("circulation") => "Circulation Works"
    Some("furnace") => "Central Furnace"
    _ => {
      let id = r.id
      let title = match id.strip_prefix("prototype-") {
        Some(tail) => "scrap-ram-" + tail.to_owned()
        None => id
      }
      deck_title(title)
    }
  }
  let area = rect_source(r.x, r.z, r.w, r.d)
  "{ id: \{source(r.id)}, map_label: \{literal(Json::string(label))}, rect: \{area}, y: \{source(r.y)}, rise: \{source(r.rise.unwrap_or(0))}, water: \{r.water.unwrap_or(false)} }"
}

///|
fn solid(r : @catalog.Solid) -> String {
  let id = r.id.unwrap_or("")
  let motion = match r.motion {
    Some(m) =>
      "Some({ axis: \{@debug.to_string(m.axis)}, min: \{source(m.min)}, max: \{source(m.max)}, speed: \{source(m.speed)} })"
    None => "None"
  }
  let rail = match r.rail {
    Some(m) =>
      "Some({axis: \{@debug.to_string(m.axis)}, min: \{source(m.min)}, max: \{source(m.max)}, release: \{option_source(m.release)}, latch: \{option_source(m.latch)}})"
    None => "None"
  }
  let (x, z) = match r.rail {
    Some({ axis: X, min, .. }) => (min, r.z)
    Some({ axis: Z, min, .. }) => (r.x, min)
    _ => (r.x, r.z)
  }
  // Keys from older placements use the rest height relative to the ground.
  let y = match (r.ground, r.kind) {
    (Some(ground), _) => ground
    (None, Some(_)) => r.rest_y.unwrap_or(r.y) - 1.3
    _ => r.y
  }
  let key = location_key(r.target_key, r.circuit_key, id, x, y, z)
  "{ id: \{source(id)}, rect: \{rect_source(r.x,r.z,r.w,r.d)}, y: \{source(r.y)}, h: \{source(r.h)}, shutter_height: None, permanent: \{r.permanent.unwrap_or(false)}, motion: \{motion}, direction: 1, red: \{r.red.unwrap_or(false)}, phoenix: \{r.phoenix.unwrap_or(false)}, rail: \{rail}, arena: \{option_source(r.arena)}, local_control: \{option_source(r.local_control)}, circuit_key: \{source(key)} }"
}

///|
fn arena(a : @catalog.Arena) -> String {
  let effects = a.victory_effects.unwrap_or([]).map(s => source(s)).join(",")
  "{id:\{source(a.id)},boss:\{source(a.boss)},rect:\{rect_source(a.x,a.z,a.w,a.d)},y:\{source(a.y)},cover:\{option_source(a.cover)},music:\{source(a.music)},victory_effects:[\{effects}]}"
}

///|
fn lift(r : @catalog.Lift) -> String {
  let settle = r.settle.unwrap_or(false)
  let first = r.stops[0]
  let y = if settle { r.stops[r.stops.length() - 1] } else { first }
  let key = location_key(r.target_key, r.circuit_key, r.id, r.x, first, r.z)
  let stops = r.stops.map(n => source(n)).join(",")
  let locks = r.locks.unwrap_or([]).map(s => source(s)).join(",")
  "{ id: \{source(r.id)}, rect: \{rect_source(r.x,r.z,r.w,r.d)}, stops: [\{stops}], lock: \{source(r.lock.unwrap_or(r.id))}, locks: [\{locks}], circuit_key: \{source(key)}, settle: \{settle}, y: \{source(y)}, destination: \{source(first)}, wait: 0 }"
}

///|
fn belt(b : @catalog.Belt) -> String {
  let m = b.motion
  let drive = match m.drive {
    Some(d) => "Some({enemy:\{source(d.enemy)},part:\{source(d.part)}})"
    None => "None"
  }
  "{deck:\{deck(b.deck)},velocity:{x:\{source(m.vx.unwrap_or(0))},z:\{source(m.vz.unwrap_or(0))}},heat:\{source(m.heat.unwrap_or(0))},release:\{option_source(m.release)},stop:\{option_source(m.stop)},drive:\{drive}}"
}

///|
fn current(r : @catalog.Current) -> String {
  let (dx, dz) = match r.diverted {
    Some(d) => (d.x.unwrap_or(0), d.z.unwrap_or(0))
    None => (0.0, 0.0)
  }
  "{rect:\{rect_source(r.x,r.z,r.w,r.d)},y:\{source(r.y)},velocity:{x:\{source(r.current.x)},z:\{source(r.current.z)}},sluice:\{option_source(r.sluice)},diverted:{x:\{source(dx)},z:\{source(dz)}}}"
}

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
fn circuit_key(r : Record) -> String raise {
  for k in ["targetKey", "circuitKey"] {
    if field(r, k) is String(s) && !s.is_empty() {
      return s
    }
  }
  let rail = match field(r, "rail") {
    Object(v) => v
    _ => {}
  }
  let stops = list(field(r, "stops"))
  let y = if stops.length() > 0 {
    num(stops[0])
  } else if field(r, "ground") is Number(n, ..) {
    n
  } else if field(r, "kind") is String(_) {
    num(field(r, "restY", default=required(r, "y"))) - 1.3
  } else {
    num(required(r, "y"))
  }
  let x = if field(rail, "axis") == Json::string("x") {
    required(rail, "min")
  } else {
    required(r, "x")
  }
  let z = if field(rail, "axis") == Json::string("z") {
    required(rail, "min")
  } else {
    required(r, "z")
  }
  location_key(None, None, text(field(r, "id", default="")), num(x), y, num(z))
}

///|
fn deck_title(id : String) -> String {
  let result = StringBuilder()
  let mut boundary = true
  for c in id {
    let word = (c >= 'a' && c <= 'z') ||
      (c >= 'A' && c <= 'Z') ||
      (c >= '0' && c <= '9') ||
      c == '_'
    if c == '-' {
      result.write_char(' ')
    } else if boundary && c >= 'a' && c <= 'z' {
      result.write_string(c.to_string().to_upper())
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
fn solid(r : Record) -> String raise {
  let motion = match field(r, "motion") {
    Object(m) =>
      "Some({ axis: \{text(required(m,"axis")).to_upper()}, min: \{literal(required(m,"min"))}, max: \{literal(required(m,"max"))}, speed: \{literal(required(m,"speed"))} })"
    _ => "None"
  }
  let rail = match field(r, "rail") {
    Object(m) =>
      "Some({axis: \{text(required(m,"axis")).to_upper()}, min: \{literal(required(m,"min"))}, max: \{literal(required(m,"max"))}, release: \{optional(m,"release")}, latch: \{optional(m,"latch")}})"
    _ => "None"
  }
  "{ id: \{literal(field(r,"id",default=""))}, rect: \{rect(r)}, y: \{literal(required(r,"y"))}, h: \{literal(required(r,"h"))}, shutter_height: None, permanent: \{field(r,"permanent") is True}, motion: \{motion}, direction: 1, red: \{field(r,"red") is True}, phoenix: \{field(r,"phoenix") is True}, rail: \{rail}, arena: \{optional(r,"arena")}, local_control: \{optional(r,"localControl")}, circuit_key: \{literal(Json::string(circuit_key(r)))} }"
}

///|
fn arena(a : @catalog.Arena) -> String {
  let effects = a.victory_effects.unwrap_or([]).map(s => source(s)).join(",")
  "{id:\{source(a.id)},boss:\{source(a.boss)},rect:\{rect_source(a.x,a.z,a.w,a.d)},y:\{source(a.y)},cover:\{option_source(a.cover)},music:\{source(a.music)},victory_effects:[\{effects}]}"
}

///|
fn lift(r : Record) -> String raise {
  let stops = list(required(r, "stops"))
  let settle = field(r, "settle") is True
  let y = if settle { stops[stops.length() - 1] } else { stops[0] }
  "{ id: \{literal(required(r,"id"))}, rect: \{rect(r)}, stops: [\{sequence(required(r,"stops"))}], lock: \{literal(field(r,"lock",default=required(r,"id")))}, locks: [\{sequence(field(r,"locks"))}], circuit_key: \{literal(Json::string(circuit_key(r)))}, settle: \{settle}, y: \{literal(y)}, destination: \{literal(stops[0])}, wait: 0 }"
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
fn current(r : Record) -> String raise {
  let flow = object(required(r, "current"))
  let diverted = match field(r, "diverted") {
    Object(d) => d
    _ => {}
  }
  "{rect:\{rect(r)},y:\{literal(required(r,"y"))},velocity:{x:\{literal(required(flow,"x"))},z:\{literal(required(flow,"z"))}},sluice:\{optional(r,"sluice")},diverted:{x:\{literal(field(diverted,"x",default=0))},z:\{literal(field(diverted,"z",default=0))}}}"
}

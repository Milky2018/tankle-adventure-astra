///|
extern "js" fn coord(n : Double) -> String = "(n) => n.toFixed(4)"

///|
fn circuit_key(r : Record) -> String {
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
    num(field(r, "restY", default=r["y"])) - 1.3
  } else {
    num(r["y"])
  }
  let x = if field(rail, "axis") == Json::string("x") {
    rail["min"]
  } else {
    r["x"]
  }
  let z = if field(rail, "axis") == Json::string("z") {
    rail["min"]
  } else {
    r["z"]
  }
  [text(field(r, "id", default="")), coord(num(x)), coord(y), coord(num(z))].join(
    ":",
  )
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
fn deck(r : Record) -> String {
  let label = match field(r, "region") {
    String("foundry") => "Recycling Foundry"
    String("transit") => "Freight Exchange"
    String("garden") => "Sunken Gardens"
    String("testworks") => "Proving Grounds"
    String("optics") => "Silent Observatory"
    String("circulation") => "Circulation Works"
    String("furnace") => "Central Furnace"
    _ => {
      let id = text(r["id"])
      let title = match id.strip_prefix("prototype-") {
        Some(tail) => "scrap-ram-" + tail.to_owned()
        None => id
      }
      deck_title(title)
    }
  }
  let area = rect(r)
  "{ id: \{literal(r["id"])}, map_label: \{literal(Json::string(label))}, rect: \{area}, y: \{literal(r["y"])}, rise: \{literal(field(r,"rise",default=0))}, water: \{field(r,"water") is True} }"
}

///|
fn solid(r : Record) -> String {
  let motion = match field(r, "motion") {
    Object(m) =>
      "Some({ axis: \{text(m["axis"]).to_upper()}, min: \{literal(m["min"])}, max: \{literal(m["max"])}, speed: \{literal(m["speed"])} })"
    _ => "None"
  }
  let rail = match field(r, "rail") {
    Object(m) =>
      "Some({axis: \{text(m["axis"]).to_upper()}, min: \{literal(m["min"])}, max: \{literal(m["max"])}, release: \{optional(m,"release")}, latch: \{optional(m,"latch")}})"
    _ => "None"
  }
  "{ id: \{literal(field(r,"id",default=""))}, rect: \{rect(r)}, y: \{literal(r["y"])}, h: \{literal(r["h"])}, shutter_height: None, permanent: \{field(r,"permanent") is True}, motion: \{motion}, direction: 1, red: \{field(r,"red") is True}, phoenix: \{field(r,"phoenix") is True}, rail: \{rail}, arena: \{optional(r,"arena")}, local_control: \{optional(r,"localControl")}, circuit_key: \{literal(Json::string(circuit_key(r)))} }"
}

///|
fn arena(r : Record) -> String {
  "{id:\{literal(r["id"])},boss:\{literal(r["boss"])},rect:\{rect(r)},y:\{literal(r["y"])},cover:\{optional(r,"cover")},music:\{literal(r["music"])},victory_effects:[\{sequence(field(r,"victoryEffects"))}]}"
}

///|
fn lift(r : Record) -> String {
  let stops = list(r["stops"])
  let settle = field(r, "settle") is True
  let y = if settle { stops[stops.length() - 1] } else { stops[0] }
  "{ id: \{literal(r["id"])}, rect: \{rect(r)}, stops: [\{sequence(r["stops"])}], lock: \{literal(field(r,"lock",default=r["id"]))}, locks: [\{sequence(field(r,"locks"))}], circuit_key: \{literal(Json::string(circuit_key(r)))}, settle: \{settle}, y: \{literal(y)}, destination: \{literal(stops[0])}, wait: 0 }"
}

///|
fn belt(r : Record) -> String {
  let drive = match field(r, "drive") {
    Object(d) =>
      "Some({enemy:\{literal(d["enemy"])},part:\{literal(d["part"])}})"
    _ => "None"
  }
  "{deck:\{deck(r)},velocity:{x:\{literal(field(r,"vx",default=0))},z:\{literal(field(r,"vz",default=0))}},heat:\{literal(field(r,"heat",default=0))},release:\{optional(r,"release")},stop:\{optional(r,"stop")},drive:\{drive}}"
}

///|
fn current(r : Record) -> String {
  let flow = object(r["current"])
  let diverted = match field(r, "diverted") {
    Object(d) => d
    _ => {}
  }
  "{rect:\{rect(r)},y:\{literal(r["y"])},velocity:{x:\{literal(flow["x"])},z:\{literal(flow["z"])}},sluice:\{optional(r,"sluice")},diverted:{x:\{literal(field(diverted,"x",default=0))},z:\{literal(field(diverted,"z",default=0))}}}"
}

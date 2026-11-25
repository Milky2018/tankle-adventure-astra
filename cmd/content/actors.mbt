///|
fn enemy(r : Record) -> String {
  let kind = match text(r["type"]) {
    "prototype" => "ScrapRam"
    other => capitalized(other)
  }
  let patrol = match field(r, "patrol") {
    Object(p) => "Some(" + rect(p) + ")"
    _ => "None"
  }
  let activation = match field(r, "activation") {
    Object(p) =>
      "Some({ position: " +
      vec3(p) +
      ", radius: " +
      literal(p["radius"]) +
      " })"
    _ => "None"
  }
  let swim = list(field(r, "swimPatrol"))
    .map(v => {
      let p = list(v)
      "{x:" + literal(p[0]) + ",z:" + literal(p[1]) + "}"
    })
    .join(",")
  let result =
    $|{
    $|  id: \{literal(r["id"])}, kind: \{kind}, spawn: \{vec3(r)}, hp: \{literal(r["hp"])},
    $|  persistent: \{field(r,"persistent") is True}, emplacement: \{field(r,"emplacement") is True}, magnetic_shield: \{field(r,"magneticShield") is True}, coordinated: \{field(r,"coordinated") is True},
    $|  encounter: \{optional(r,"encounter")}, battle: \{optional(r,"battle")}, wave: \{literal(field(r,"wave",default=0))}, startup: \{optional(r,"startup")}, opening_crossing: \{literal(field(r,"openingCrossing",default=0))},
    $|  spotter_height: \{optional(r,"spotterHeight")}, detection_range: \{optional(r,"detectionRange")}, patrol: \{patrol},
    $|  activation: \{activation},
    $|  swim_patrol: [\{swim}], part_hp: [\{sequence(field(r,"parts"))}], core: \{optional(r,"core")}, mirror: \{field(r,"mirror") is True}, reserve_for: \{optional(r,"reserveFor")}, reserve_at: \{literal(field(r,"reserveAt",default=0))}
    $|}
  result
}

///|
fn optional_vec(v : Json) -> String {
  match v {
    Array([x, y, z]) =>
      "Some({x:" + literal(x) + ",y:" + literal(y) + ",z:" + literal(z) + "})"
    Null => "None"
    _ => abort("Expected XYZ vector")
  }
}

///|
fn control(r : Record) -> String {
  let actions = match field(r, "weapons") {
    Null =>
      if r["kind"] == "shot" {
        ["cannon", "mortar", "laser"]
      } else {
        [text(r["kind"])]
      }
    weapons => list(weapons).map(text)
  }
  let action_names = actions
    .map(a => {
      match a {
        "cannon" => "CannonAction"
        "mortar" => "MortarAction"
        "laser" => "LaserAction"
        "magnet" => "MagnetAction"
        "use" => "Use"
        "dock" => "Dock"
        _ => abort("Unknown action " + a)
      }
    })
    .join(",")
  let ground = match field(r, "ground") {
    Null => Json::number(num(r["y"]) - 1.3)
    g => g
  }
  let effects = match field(r, "effects") {
    Null => literal(r["id"])
    v => sequence(v)
  }
  "{id:\{literal(r["id"])},position:\{vec3(r)},ground:\{literal(ground)},actions:[\{action_names}],requires:\{optional(r,"requires")},effects:[\{effects}],circuit_key:\{literal(Json::string(circuit_key(r)))},mount:\{optional(r,"mount")},facing:\{optional_vec(field(r,"facing"))},optical_normal:\{optional_vec(field(r,"normal"))},top:\{field(r,"surface") == "top"},rotor:\{field(r,"rotor") is True},counterweight:\{field(r,"counterweight") is True},flash:0,pull:0}"
}

///|
fn hive(r : Record) -> String {
  "{id:\{literal(r["id"])},name:\{literal(r["name"])},position:\{vec3(r)},heading:\{literal(field(r,"heading",default=3.141592653589793))},requires:\{optional(r,"requires")}}"
}

///|
fn pickup(r : Record) -> String {
  let acquisition = match field(r, "ability") {
    String("mortar") => "MortarModule"
    String("laser") => "LaserModule"
    String(a) => capitalized(a)
    _ =>
      match text(r["upgrade"]) {
        "cannon" => "CannonCoil"
        "mortar" => "MortarCharge"
        "laser" => "LaserFocus"
        other => capitalized(other)
      }
  }
  "{id:\{literal(r["id"])},position:\{vec3(r)},acquisition:\{acquisition},requires:\{optional(r,"requires")},lift:\{optional(r,"lift")},hidden:\{field(r,"hidden") is True},preview:\{field(r,"preview") is True}}"
}

///|
fn mirror(r : Record) -> String {
  let n = list(r["n"])
  "{id:\{literal(r["id"])},position:\{vec3(r)},base_normal:{x:\{literal(n[0])},y:\{literal(n[1])},z:\{literal(n[2])}},size:\{literal(r["size"])},turnable:\{field(r,"turnable") is True},flash:0,angle:0}"
}

///|
fn circuit(r : Record) -> String {
  let branches = list(r["branches"])
    .map(v => {
      let b = object(v)
      "{key:\{literal(b["key"])},target:\{literal(b["target"])},duration:\{literal(b["duration"])}}"
    })
    .join(",")
  "{id:\{literal(r["id"])},duration:\{literal(r["duration"])},branches:[\{branches}]}"
}

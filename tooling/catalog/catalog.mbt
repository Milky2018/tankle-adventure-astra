///|
pub type Record = Map[String, Json]

///|
pub fn field(r : Record, key : String, default~ : Json = @json.null) -> Json {
  match r.get(key) {
    Some(Null) | None => default
    Some(v) => v
  }
}

///|
pub fn object(v : Json) -> Record {
  guard v is Object(fields) else {
    abort("Expected authored object, got " + v.stringify())
  }
  fields
}

///|
pub fn list(v : Json) -> Array[Json] {
  match v {
    Null => []
    Array(items) => items
    _ => abort("Expected authored array, got " + v.stringify())
  }
}

///|
pub fn text(v : Json) -> String {
  guard v is String(s) else {
    abort("Expected authored string, got " + v.stringify())
  }
  s
}

///|
pub fn num(v : Json) -> Double {
  guard v is Number(n, ..) else {
    abort("Expected authored number, got " + v.stringify())
  }
  n
}

///|
fn finite(v : Json, path : String) -> Double raise {
  guard v is Number(n, ..) && n.is_finite() else {
    raise Failure(path + " must be a finite number")
  }
  n
}

///|
fn one_of(v : Json, choices : Array[String]) -> Bool {
  v is String(s) && choices.contains(s)
}

///|
fn present(v : Json) -> Bool {
  v is String(s) && !s.is_empty()
}

///|
fn boss(v : Json) -> Bool {
  one_of(v, ["prototype", "overseer", "sorter", "guardian", "keeper"])
}

///|
fn records(catalog : Record, k : String) -> Array[Record] raise {
  guard field(catalog, k) is Array(rows) else {
    raise Failure(k + " must be an array")
  }
  rows.map(v => {
    guard v is Object(r) else { raise Failure(k + " needs object records") }
    r
  })
}

///|
pub fn validate(catalog : Record) -> Unit raise {
  let enemies = records(catalog, "enemies")
  let obstacles = records(catalog, "obstacles")
  let lifts = records(catalog, "lifts")
  for
    k in [
      "decks", "barriers", "obstacles", "architecture", "lifts", "enemies", "arenas",
      "controls", "hives", "pickups", "mirrors", "belts", "heat", "currents", "circuits",
    ] {
    let ids = Set([])
    for i, r in records(catalog, k) {
      let id = field(r, "id")
      let label = match id {
        String(s) => s
        _ => i.to_string()
      }
      let path = "\{k}[\{label}]"
      if !(id is Null) {
        guard present(id) else {
          raise Failure(path + ".id must be a nonempty string")
        }
        let key = match k {
          "barriers" => field(r, "circuitKey").stringify()
          "decks" =>
            [id, field(r, "x"), field(r, "y"), field(r, "z")]
            .map(x => x.stringify())
            .join(":")
          _ => label
        }
        guard !ids.contains(key) else {
          raise Failure(path + " has a duplicate identity")
        }
        ids.add(key)
      }
      if k != "circuits" {
        for axis in ["x", "y", "z"] {
          let v = if axis == "y" && k == "lifts" {
            match field(r, "stops") {
              Array([first, ..]) => first
              _ => @json.null
            }
          } else {
            field(r, axis)
          }
          ignore(finite(v, path + "." + axis))
        }
      }
      for axis in ["w", "d", "h"] {
        let v = field(r, axis)
        if !(v is Null) && finite(v, path + "." + axis) <= 0 {
          raise Failure(path + "." + axis + " must be positive")
        }
      }
      match k {
        "enemies" => {
          let ty = field(r, "type")
          guard boss(ty) ||
            one_of(ty, [
              "hunter", "dredger", "scout", "turret", "guard", "skirmisher", "sniper",
              "artillery", "miner", "welder", "repairer", "reflector", "interceptor",
              "bastion", "siege", "prism", "flanker",
            ]) else {
            raise Failure(path + ".type is unknown: " + ty.stringify())
          }
          guard !r.contains("variant") && !r.contains("guardian") else {
            raise Failure(path + " must identify its machine with type alone")
          }
          if !(field(r, "openingCrossing") is Null) &&
            finite(r["openingCrossing"], path + ".openingCrossing") < 0 {
            raise Failure(path + ".openingCrossing cannot be negative")
          }
          guard finite(field(r, "hp"), path + ".hp") > 0 else {
            raise Failure(path + ".hp must be positive")
          }
        }
        "pickups" => {
          guard one_of(field(r, "ability"), [
              "overdrive", "magnet", "mortar", "flotation", "phoenix", "laser", "circulation",
            ]) ||
            one_of(field(r, "upgrade"), [
              "armor", "cooling", "cannon", "mortar", "laser", "scope",
            ]) else {
            raise Failure(path + " needs a supported ability or upgrade")
          }
        }
        "lifts" => {
          guard field(r, "stops") is Array(stops) && stops.length() >= 2 else {
            raise Failure(path + " needs at least two stops")
          }
          for v in stops {
            ignore(finite(v, path + ".stops"))
          }
        }
        "controls" => {
          guard one_of(field(r, "kind"), [
            "shot", "magnet", "laser", "use", "dock",
          ]) else {
            raise Failure(path + ".kind is unknown")
          }
          match field(r, "effects") {
            Null => ()
            Array(a) if a.length() > 0 &&
              a.every(v => v is String(s) && !s.trim().is_empty()) => ()
            _ =>
              raise Failure(path + ".effects must contain at least one signal")
          }
          match field(r, "weapons") {
            Null => ()
            Array(a) if a.every(v => {
                one_of(v, ["cannon", "mortar", "laser", "magnet", "use", "dock"])
              }) => ()
            _ => raise Failure(path + ".weapons contains an unsupported action")
          }
        }
        "circuits" => {
          guard finite(field(r, "duration"), path + ".duration") >= 0 else {
            raise Failure(path + ".duration cannot be negative")
          }
        }
        _ => ()
      }
    }
  }
  let cleared = Set([])
  for r in records(catalog, "circuits") {
    let battle = field(r, "clearedBattle")
    if battle is Null {
      continue
    }
    guard enemies.any(e => field(e, "battle") == battle) else {
      raise Failure(
        "Circuit " +
        text(r["id"]) +
        " refers to unknown battle " +
        battle.stringify(),
      )
    }
    let key = text(battle)
    guard !cleared.contains(key) else {
      raise Failure("Battle " + key + " has multiple clear signals")
    }
    cleared.add(key)
  }
  let assigned = Set([])
  for a in records(catalog, "arenas") {
    guard present(field(a, "id")) else { raise Failure("Arena needs an id") }
    let id = text(a["id"])
    let owner = field(a, "boss")
    guard enemies.any(e => field(e, "id") == owner && boss(field(e, "type"))) else {
      raise Failure(
        "Arena " + id + " needs a placed boss: " + owner.stringify(),
      )
    }
    guard !assigned.contains(text(owner)) else {
      raise Failure("Boss " + text(owner) + " has multiple arenas")
    }
    assigned.add(text(owner))
    guard present(field(a, "music")) else {
      raise Failure("Arena " + id + " needs music")
    }
    guard finite(field(a, "w"), id + ".w") > 0 &&
      finite(field(a, "d"), id + ".d") > 0 else {
      raise Failure("Arena " + id + " needs a footprint")
    }
    match field(a, "victoryEffects") {
      Null => ()
      Array(v) if v.every(present) => ()
      _ => raise Failure("Arena " + id + " needs valid victory signals")
    }
    let cover = field(a, "cover")
    if !(cover is Null) &&
      !obstacles.any(o => {
        field(o, "id") == cover && field(o, "rail") is Object(_)
      }) {
      raise Failure(
        "Arena " + id + " needs a rail-mounted cover: " + cover.stringify(),
      )
    }
  }
  for b in records(catalog, "belts") {
    if field(b, "drive") is Object(d) {
      let part = field(d, "part")
      let owner = field(d, "enemy")
      guard part is Number(n, ..) &&
        n >= 0 &&
        n.trunc() == n &&
        enemies.any(e => {
          field(e, "id") == owner &&
          field(e, "parts") is Array(parts) &&
          n < parts.length().to_double()
        }) else {
        raise Failure("Belt " + text(b["id"]) + " needs an existing drive part")
      }
    }
    guard field(catalog, "belt-segments") is Object(s) &&
      field(s, text(b["id"])) is Array(_) else {
      raise Failure("Missing conveyor geometry metadata: " + text(b["id"]))
    }
  }
  for p in records(catalog, "pickups") {
    let lift = field(p, "lift")
    if present(lift) && !lifts.any(l => field(l, "id") == lift) {
      raise Failure(
        "Unknown lift " + text(lift) + " for pickup " + text(p["id"]),
      )
    }
  }
  guard records(catalog, "hives").length() > 0 else {
    raise Failure("At least one repair hive is required for spawning")
  }
}

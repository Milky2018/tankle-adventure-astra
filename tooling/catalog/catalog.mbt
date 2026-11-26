///|
pub type Record = Map[String, Json]

///|
fn field(r : Record, key : String) -> Json {
  r.get_or_default(key, @json.null)
}

///|
pub fn object(v : Json) -> Record raise {
  guard v is Object(fields) else {
    raise Failure("Expected authored object, got " + v.stringify())
  }
  fields
}

///|
pub fn list(v : Json) -> Array[Json] raise {
  match v {
    Null => []
    Array(items) => items
    _ => raise Failure("Expected authored array, got " + v.stringify())
  }
}

///|
/// Read in stable filename order so editor reference lists are reproducible.
pub fn read_directory(path : String) -> Record raise {
  let files = @fs.read_dir(path).to_owned()
  files.sort_by(String::lexical_compare)
  let catalog = Map([])
  for file in files {
    if file.strip_suffix(".json") is Some(name) {
      catalog[name.to_owned()] = @json.parse(
        @fs.read_file_to_string(path + "/" + file),
      )
    }
  }
  catalog
}

///|
fn finite(v : Json, path : String) -> Double raise {
  guard v is Number(n, ..) && n.is_finite() else {
    raise Failure(path + " must be a finite number")
  }
  n
}

///|
fn present(v : Json) -> Bool {
  v is String(s) && !s.is_empty()
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
pub fn decode(catalog : Record) -> Level raise {
  // Historically an explicit null in an optional object field means it was omitted.
  // Array entries retain their index and are still checked by the field's decoder.
  let input = Json::object(catalog).transform(
    @json.Replacer((_, v) => if v is Null { None } else { Some(v) }),
  )
  let level : Level = @json.from_json(input)
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
          guard !r.contains("variant") && !r.contains("guardian") else {
            raise Failure(path + " must identify its machine with type alone")
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
        _ => ()
      }
    }
  }
  let by_enemy = Map([])
  let battles = Set([])
  for enemy in level.enemies {
    by_enemy[enemy.id] = enemy
    if enemy.battle is Some(battle) {
      battles.add(battle)
    }
    guard enemy.hp.is_finite() && enemy.hp > 0 else {
      raise Failure("Enemy " + enemy.id + ".hp must be positive")
    }
    if enemy.opening_crossing is Some(crossing) &&
      (!crossing.is_finite() || crossing < 0) {
      raise Failure(
        "Enemy " + enemy.id + ".openingCrossing must be finite and nonnegative",
      )
    }
  }
  let cleared = Set([])
  for circuit in level.circuits {
    guard circuit.duration.is_finite() && circuit.duration >= 0 else {
      raise Failure(
        "Circuit " + circuit.id + ".duration must be finite and nonnegative",
      )
    }
    guard circuit.cleared_battle is Some(battle) else { continue }
    guard battles.contains(battle) else {
      raise Failure(
        "Circuit " + circuit.id + " refers to unknown battle " + battle,
      )
    }
    guard !cleared.contains(battle) else {
      raise Failure("Battle " + battle + " has multiple clear signals")
    }
    cleared.add(battle)
  }
  let covers = Set([])
  for obstacle in level.obstacles {
    if obstacle.rail is Some(_) && obstacle.id is Some(id) {
      covers.add(id)
    }
  }
  let assigned = Set([])
  for arena in level.arenas {
    guard by_enemy.get(arena.boss) is Some(enemy) && enemy.kind.is_boss() else {
      raise Failure("Arena " + arena.id + " needs a placed boss: " + arena.boss)
    }
    guard !assigned.contains(arena.boss) else {
      raise Failure("Boss " + arena.boss + " has multiple arenas")
    }
    assigned.add(arena.boss)
    guard !arena.music.is_empty() else {
      raise Failure("Arena " + arena.id + " needs music")
    }
    if arena.victory_effects is Some(effects) && effects.any(s => s.is_empty()) {
      raise Failure("Arena " + arena.id + " needs valid victory signals")
    }
    if arena.cover is Some(cover) && !covers.contains(cover) {
      raise Failure(
        "Arena " + arena.id + " needs a rail-mounted cover: " + cover,
      )
    }
  }
  for belt in level.belts {
    if belt.motion.drive is Some(drive) {
      guard by_enemy.get(drive.enemy) is Some(enemy) &&
        enemy.parts is Some(parts) &&
        drive.part >= 0 &&
        drive.part < parts.length() else {
        raise Failure("Belt " + belt.deck.id + " needs an existing drive part")
      }
    }
    guard level.segments.contains(belt.deck.id) else {
      raise Failure("Missing conveyor geometry metadata: " + belt.deck.id)
    }
  }
  for control in level.controls {
    if control.relay_mirror is Some(id) &&
      (
        !level.mirrors.any(m => m.id == id) ||
        control.normal is None ||
        control.actions() != [LaserAction]
      ) {
      raise Failure(
        "Optical relay " +
        control.id +
        " needs a mirror, a collecting face and a laser trigger",
      )
    }
    if control.effects is Some(effects) &&
      (effects.is_empty() || effects.any(s => s.trim().is_empty())) {
      raise Failure(
        "Control " + control.id + ".effects must contain at least one signal",
      )
    }
  }
  let lift_ids = Set::from_iter(level.lifts.iter().map(lift => lift.id))
  for pickup in level.pickups {
    let p = pickup.placement
    if p.lift is Some(lift) && !lift.is_empty() && !lift_ids.contains(lift) {
      raise Failure("Unknown lift " + lift + " for pickup " + p.id)
    }
  }
  guard !level.hives.is_empty() else {
    raise Failure("At least one repair hive is required for spawning")
  }
  level
}

///|
pub fn validate(catalog : Record) -> Unit raise {
  ignore(decode(catalog))
}

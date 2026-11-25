///|
fn generate_levels(data : Record, level : @catalog.Level) -> Unit raise {
  fn records(
    collection : String,
    ty : String,
    encode : (Record) -> String raise,
  ) -> String raise {
    array_def(
      "authored_" + collection,
      ty,
      list(required(data, collection)).map(object),
      encode,
    )
  }
  let world =
    #|///|
    #|pub fn authored_world() -> World {
    #|let architecture = authored_architecture()
    #|{ decks: authored_decks(), solids: authored_solids(), obstacles: authored_obstacles(), architecture, architecture_grid: architecture_grid(architecture), lifts: authored_lifts() }
    #|}
    #|
  write_text(
    "simulation/level-world.generated.mbt",
    "// Generated from content/levels/city. Run moon run cmd/content; do not edit.\n\n" +
    [
      array_def("authored_decks", "Deck", level.decks, deck),
      array_def("authored_arenas", "Arena", level.arenas, arena),
      array_def(
        "authored_solids",
        "Solid",
        list(required(data, "barriers")).map(object),
        solid,
      ),
      records("obstacles", "Solid", solid),
      records("architecture", "Solid", solid),
      records("lifts", "Lift", lift),
      world,
    ].join("\n"),
  )
  write_text(
    "simulation/level-enemies.generated.mbt",
    "// Authored enemy definitions. Runtime state is constructed by Enemy::new.\n\n" +
    array_def("authored_enemies", "EnemyDef", level.enemies, enemy),
  )
  write_text(
    "simulation/level-controls.generated.mbt",
    [
      array_def("authored_controls", "Control", level.controls, control),
      array_def("authored_hives", "Hive", level.hives, hive),
      array_def("authored_pickups", "Pickup", level.pickups, pickup),
      array_def("authored_mirrors", "Mirror", level.mirrors, mirror),
    ].join("\n"),
  )
  let signals = []
  for c in level.circuits {
    if c.cleared_battle is Some(battle) {
      signals.push(source(battle) + ":" + source(c.id))
    }
  }
  write_text(
    "simulation/level-circuits.generated.mbt",
    array_def("authored_circuits", "Circuit", level.circuits, circuit) +
    "\n///|\nfn authored_battle_signals() -> Map[String, String] {\n{" +
    signals.join(",") +
    "}\n}\n",
  )
  write_text(
    "simulation/level-motion.generated.mbt",
    [
      array_def("authored_belts", "Belt", level.belts, belt),
      array_def("authored_heat", "Belt", level.heat, belt),
      records("currents", "Current", current),
    ].join("\n"),
  )
  let segments = []
  for id, rows in level.segments {
    let pairs = rows.map(p => "(" + source(p.0) + "," + source(p.1) + ")")
    segments.push(source(id) + ":[" + pairs.join(",") + "]")
  }
  write_text(
    "renderer/belt-data.generated.mbt",
    "///|\nfn belt_segments() -> Map[String, Array[(Double, Int32)]] {\n{" +
    segments.join(",\n") +
    "}\n}\n",
  )
}

///|
fn generate_audio() -> Unit raise {
  let voices = []
  for name, rows in object(read_json("content/sounds.json")) {
    let layers = list(rows).map(v => {
      let r = object(v)
      let duration = num(required(r, "duration"))
      let attack = Json::number(
        num(field(r, "attack", default=0.003)).min(duration * 0.3),
      )
      let hold = Json::number(
        num(field(r, "hold", default=0)).min(duration * 0.5),
      )
      "{noise:\{field(r,"noise") is True},frequency:\{literal(field(r,"frequency",default=0))},end:\{literal(field(r,"end",default=0))},duration:\{literal(required(r,"duration"))},gain:\{literal(required(r,"gain"))},delay:\{literal(field(r,"delay",default=0))},attack:\{literal(attack)},hold:\{literal(hold)},wave:\{literal(field(r,"type",default="sine"))},cutoff:\{literal(field(r,"cutoff",default=0))},filter:\{literal(field(r,"filter",default="lowpass"))}}"
    })
    voices.push(literal(Json::string(name)) + ": [" + layers.join(",") + "]")
  }
  let tracks = list(
    required(object(read_json("public/music/manifest.json")), "tracks"),
  ).map(v => {
    let r = object(v)
    let mix = Json::string(
      "/music/" + text(required(object(required(r, "assets")), "mix")),
    )
    literal(required(r, "id")) +
    ": (" +
    literal(mix) +
    "," +
    literal(field(r, "gain", default=1)) +
    ")"
  })
  write_text(
    "cmd/play/sound-data.generated.mbt",
    "// Authored sound parameters.\n///|\nlet sound_layers : Map[String,Array[Voice]] = {" +
    voices.join(",\n") +
    "}\n///|\nlet music_tracks : Map[String,(String,Double)] = {" +
    tracks.join(",\n") +
    "}\n",
  )
}

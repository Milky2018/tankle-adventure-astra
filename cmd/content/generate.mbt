///|
fn generate_levels(data : Record) -> Unit {
  fn records(
    collection : String,
    ty : String,
    encode : (Record) -> String,
  ) -> String {
    array_def("authored_" + collection, ty, list(data[collection]), encode)
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
      records("decks", "Deck", deck),
      records("arenas", "Arena", arena),
      array_def("authored_solids", "Solid", list(data["barriers"]), solid),
      records("obstacles", "Solid", solid),
      records("architecture", "Solid", solid),
      records("lifts", "Lift", lift),
      world,
    ].join("\n"),
  )
  write_text(
    "simulation/level-enemies.generated.mbt",
    "// Authored enemy definitions. Runtime state is constructed by Enemy::new.\n\n" +
    records("enemies", "EnemyDef", enemy),
  )
  write_text(
    "simulation/level-controls.generated.mbt",
    [
      records("controls", "Control", control),
      records("hives", "Hive", hive),
      records("pickups", "Pickup", pickup),
      records("mirrors", "Mirror", mirror),
    ].join("\n"),
  )
  let circuits = list(data["circuits"])
  let signals = []
  for row in circuits {
    let r = object(row)
    if field(r, "clearedBattle") is String(_) {
      signals.push(literal(r["clearedBattle"]) + ":" + literal(r["id"]))
    }
  }
  write_text(
    "simulation/level-circuits.generated.mbt",
    array_def("authored_circuits", "Circuit", circuits, circuit) +
    "\n///|\nfn authored_battle_signals() -> Map[String, String] {\n{" +
    signals.join(",") +
    "}\n}\n",
  )
  write_text(
    "simulation/level-motion.generated.mbt",
    [
      records("belts", "Belt", belt),
      records("heat", "Belt", belt),
      records("currents", "Current", current),
    ].join("\n"),
  )
  let segments = []
  for id, rows in object(data["belt-segments"]) {
    let pairs = list(rows).map(v => {
      let p = list(v)
      "(" + literal(p[0]) + "," + literal(p[1]) + ")"
    })
    segments.push(literal(Json::string(id)) + ":[" + pairs.join(",") + "]")
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
      let duration = num(r["duration"])
      let attack = Json::number(
        num(field(r, "attack", default=0.003)).min(duration * 0.3),
      )
      let hold = Json::number(
        num(field(r, "hold", default=0)).min(duration * 0.5),
      )
      "{noise:\{field(r,"noise") is True},frequency:\{literal(field(r,"frequency",default=0))},end:\{literal(field(r,"end",default=0))},duration:\{literal(r["duration"])},gain:\{literal(r["gain"])},delay:\{literal(field(r,"delay",default=0))},attack:\{literal(attack)},hold:\{literal(hold)},wave:\{literal(field(r,"type",default="sine"))},cutoff:\{literal(field(r,"cutoff",default=0))},filter:\{literal(field(r,"filter",default="lowpass"))}}"
    })
    voices.push(literal(Json::string(name)) + ": [" + layers.join(",") + "]")
  }
  let tracks = list(object(read_json("public/music/manifest.json"))["tracks"]).map(v => {
      let r = object(v)
      let mix = Json::string("/music/" + text(object(r["assets"])["mix"]))
      literal(r["id"]) +
      ": (" +
      literal(mix) +
      "," +
      literal(field(r, "gain", default=1)) +
      ")"
    },
  )
  write_text(
    "cmd/play/sound-data.generated.mbt",
    "// Authored sound parameters.\n///|\nlet sound_layers : Map[String,Array[Voice]] = {" +
    voices.join(",\n") +
    "}\n///|\nlet music_tracks : Map[String,(String,Double)] = {" +
    tracks.join(",\n") +
    "}\n",
  )
}

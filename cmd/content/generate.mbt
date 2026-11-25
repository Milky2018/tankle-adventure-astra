///|
fn generate_levels(level : @catalog.Level) -> Unit raise {
  let world =
    #|///|
    #|pub fn authored_world() -> World {
    #|let architecture = authored_architecture()
    #|{ decks: authored_decks(), solids: authored_solids(), obstacles: authored_obstacles(), architecture, architecture_grid: architecture_grid(architecture), lifts: authored_lifts() }
    #|}
    #|
  @fs.write_string_to_file(
    "simulation/level-world.generated.mbt",
    "// Generated from content/levels/city. Run moon run cmd/content; do not edit.\n\n" +
    [
      array_def("authored_decks", "Deck", level.decks, deck),
      array_def("authored_arenas", "Arena", level.arenas, arena),
      array_def("authored_solids", "Solid", level.barriers, solid),
      array_def("authored_obstacles", "Solid", level.obstacles, solid),
      array_def("authored_architecture", "Solid", level.architecture, solid),
      array_def("authored_lifts", "Lift", level.lifts, lift),
      world,
    ].join("\n"),
  )
  @fs.write_string_to_file(
    "simulation/level-enemies.generated.mbt",
    "// Authored enemy definitions. Runtime state is constructed by Enemy::new.\n\n" +
    array_def("authored_enemies", "EnemyDef", level.enemies, enemy),
  )
  @fs.write_string_to_file(
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
  @fs.write_string_to_file(
    "simulation/level-circuits.generated.mbt",
    array_def("authored_circuits", "Circuit", level.circuits, circuit) +
    "\n///|\nfn authored_battle_signals() -> Map[String, String] {\n{" +
    signals.join(",") +
    "}\n}\n",
  )
  @fs.write_string_to_file(
    "simulation/level-motion.generated.mbt",
    [
      array_def("authored_belts", "Belt", level.belts, belt),
      array_def("authored_heat", "Belt", level.heat, belt),
      array_def("authored_currents", "Current", level.currents, current),
    ].join("\n"),
  )
  let segments = []
  for id, rows in level.segments {
    let pairs = rows.map(p => "(" + source(p.0) + "," + source(p.1) + ")")
    segments.push(source(id) + ":[" + pairs.join(",") + "]")
  }
  @fs.write_string_to_file(
    "renderer/belt-data.generated.mbt",
    "///|\nfn belt_segments() -> Map[String, Array[(Double, Int32)]] {\n{" +
    segments.join(",\n") +
    "}\n}\n",
  )
}

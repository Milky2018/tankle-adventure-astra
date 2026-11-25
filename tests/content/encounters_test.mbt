///|
test "arena bindings accept distinct instance IDs and reject missing bosses or covers" {
  let data = read_catalog()
  let arenas = @catalog.list(data["arenas"]).map(@catalog.object)
  let arena = arenas.iter().filter(a => a["id"] == "sorter").nth(0).unwrap()
  arena["id"] = "freight-test"
  @catalog.validate(data)
  arena["cover"] = "absent"
  raises_like("rail-mounted cover", () => @catalog.validate(data))
  arena.remove("cover")
  let enemies = @catalog.list(data["enemies"]).map(@catalog.object)
  arena["boss"] = enemies
    .iter()
    .filter(e => e["type"] == "turret")
    .nth(0)
    .unwrap()["id"]
  raises_like("placed boss", () => @catalog.validate(data))
}

///|
test "machinery rejects references to missing boss parts and encounter groups" {
  let data = read_catalog()
  let belts = @catalog.list(data["belts"]).map(@catalog.object)
  let drive = @catalog.object(
    belts.iter().filter(b => b.contains("drive")).nth(0).unwrap()["drive"],
  )
  let original = drive["part"]
  drive["part"] = 200
  raises_like("existing drive part", () => @catalog.validate(data))
  drive["part"] = original
  let circuits = @catalog.list(data["circuits"]).map(@catalog.object)
  circuits.iter().filter(c => c.contains("clearedBattle")).nth(0).unwrap()["clearedBattle"] = "absent"
  raises_like("unknown battle", () => @catalog.validate(data))
}

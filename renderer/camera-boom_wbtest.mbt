///|
test "camera retreats at a wall and clears an adjacent doorway" {
  let world : @sim.World = {
    decks: [],
    solids: [],
    architecture: [],
    architecture_grid: Map([]),
    obstacles: [],
    lifts: [],
  }
  let space = CameraSpace::new(@core.Scene::new(), world)
  space.faces[(0, 0)] = [({ x: 5, y: 0, z: 0, }, { x: 5, y: 12, z: 5, })]
  let state = @sim.Progress::new()
  let travel : @sim.Vec3 = { x: 12, y: 0, z: 0, }
  assert_eq(space.boom_limit({ x: 2, y: 4, z: 4, }, travel, world, state), 2.55)
  assert_eq(space.boom_limit({ x: 2, y: 4, z: 7, }, travel, world, state), 12)
}

///|
test "aim stops at nearby cover ahead of the turret and ignores a blocker behind it" {
  let cut = Cutaway::new(@core.Scene::new())
  cut.player.set(0, 0, 0) |> ignore
  cut.direction.set(0, 0, 1) |> ignore
  cut.sight_length.value = Number(8)
  assert_true(cut.aim_visible({ x: 0, y: 1.3, z: -1, }, false, true, true))
  assert_false(cut.aim_visible({ x: 0, y: 1.3, z: 4, }, false, true, true))
  assert_true(cut.aim_visible({ x: 3, y: 1.3, z: 4, }, false, true, true))
}

///|
test "an opened gate stops constraining the boom and an overhanging ramp still does" {
  let gate : @sim.Solid = {
    id: "gate",
    rect: { x: 5, z: 0, w: 1, d: 8, },
    y: 0,
    h: 6,
    permanent: false,
    shutter_height: None,
    motion: None,
    direction: 0,
    red: true,
    phoenix: false,
    rail: None,
    arena: None,
    local_control: None,
    circuit_key: "gate",
  }
  let deck : @sim.Deck = {
    id: "ramp",
    rect: { x: 0, z: 0, w: 10, d: 10, },
    y: 6,
    rise: 4,
    map_label: "Ramp",
    water: false,
  }
  let world : @sim.World = {
    decks: [deck],
    solids: [gate],
    architecture: [],
    architecture_grid: Map([]),
    obstacles: [],
    lifts: [],
  }
  let space = CameraSpace::new(@core.Scene::new(), world)
  let origin : @sim.Vec3 = { x: 2, y: 2, z: 5, }
  let state = @sim.Progress::new()
  assert_eq(
    space.boom_limit(origin, { x: 10, y: 0, z: 0, }, world, state),
    2.55,
  )
  state.complete("gate") |> ignore
  assert_eq(space.boom_limit(origin, { x: 10, y: 0, z: 0, }, world, state), 10)
  assert_eq(
    space.boom_limit(origin, { x: 0, y: 10, z: 0, }, world, state),
    5.55,
  )
}

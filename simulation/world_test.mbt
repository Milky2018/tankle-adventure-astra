///|
test "authored opening supports normal movement and blocks ledge escape" {
  let world = @simulation.authored_world()
  let state = @simulation.Progress::new()
  let player = @simulation.Player::new()
  player.y = -8
  player.z = 86
  assert_true(world.support(player.x, player.z, player.y, false) is Some(_))
  world.move_player(player, -10, 0, state)
  assert_true(player.x < -5)
  assert_eq(player.y, -8)
  for _ in 0..<30 {
    world.move_player(player, 0, 10, state)
  }
  assert_true(world.support(player.x, player.z, player.y, false) is Some(_))
  assert_true(player.z < 150)
}

///|
test "pending circuit branches unlock independently and survive observation" {
  let progress = @simulation.Progress::new()
  assert_true(
    progress.trigger("switch", 5, { "door": true, "lift": true }, [
      { key: "door-key", target: "door", duration: 0.18, },
      { key: "lift-key", target: "lift", duration: 5, },
    ]),
  )
  assert_false(progress.circuit_ready("door", "door-key", "door"))
  ignore(progress.advance_signals(0.2))
  assert_true(progress.circuit_ready("door", "door-key", "door"))
  assert_false(progress.circuit_ready("lift", "lift-key", "lift"))
  assert_false(progress.has("door"))
  assert_eq(progress.advance_signals(4.8), ["switch"])
  assert_true(progress.has("door"))
  assert_true(progress.has("lift"))
}

///|
test "each lift carries its centre and leaves an open shaft at both landings" {
  let world = @simulation.authored_world()
  for lift in world.lifts {
    let x = lift.rect.x + lift.rect.w / 2
    let z = lift.rect.z + lift.rect.d / 2
    let bottom = lift.stops[0]
    let top = lift.stops[lift.stops.length() - 1]
    for (landing, away) in [(bottom, top), (top, bottom)] {
      lift.y = landing
      assert_true(
        world.support(x, z, landing, false) is Some(s) && s.deck.id == lift.id,
      )
      lift.y = away
      assert_true(world.support(x, z, landing, false) is None)
    }
  }
}

///|
test "industrial approaches leave room for the hull in both directions" {
  let world = @simulation.authored_world()
  let state = @simulation.Progress::new()
  for
    (x, y, z, dx, dz) in [
      (280.0, -24.0, 121.0, -10.0, 0.0), // Coolant intake doorway
      (65.055, 16.0, -166.5, 0.0, 10.0), // Recoil bench to the inspection belt
      (-145.0, 8.0, 0.96, 14.0, 0.0), // Dispatch crane approach
      (29.0, -8.0, -46.0, -11.0, 0.0), // Board the loading return lift
      (40.0, 0.0, -96.0, 0.0, -10.0), // Enter the sorting return junction
      (40.0, 0.0, -106.0, -12.0, 0.0), // Turn onto its west branch
    ] {
    let player = @simulation.Player::new()
    player.x = x
    player.y = y
    player.z = z
    world.move_player(player, dx, dz, state)
    assert_true((player.x - x - dx).abs() < 0.001)
    assert_true((player.z - z - dz).abs() < 0.001)
    world.move_player(player, -dx, -dz, state)
    assert_true((player.x - x).abs() < 0.001)
    assert_true((player.z - z).abs() < 0.001)
  }
}

///|
test "the sluice bank allows a deployed hull to launch and land" {
  let game = @simulation.Game::new(start={ x: 61, y: -8, z: 19, })
  let p = game.player
  p.abilities.flotation = true
  p.deployed = true
  game.world.move_player(p, 9, 0, game.progress)
  assert_true(p.afloat && (p.x - 70).abs() < 0.001)
  game.world.move_player(p, -9, 0, game.progress)
  assert_true(!p.afloat && (p.x - 61).abs() < 0.001)
}

///|
test "the recoil workbench still stops the hull beside the clear lane" {
  let world = @simulation.authored_world()
  let player = @simulation.Player::new()
  player.x = 65.0
  player.y = 16.0
  player.z = -160.0
  world.move_player(player, 3.0, 0.0, @simulation.Progress::new())
  assert_true(player.x < 66.0)
}

///|
test "repair stations have a clear drive-through lane between solid tool cabinets" {
  let game = @simulation.Game::new()
  for hive in game.hives {
    let p = game.player
    let x = hive.position.x
    let z = hive.position.z
    let dx = @math.sin(hive.heading)
    let dz = @math.cos(hive.heading)
    for sign in [-1.0, 1.0] {
      p.x = x - sign * 4 * dx
      p.y = hive.position.y
      p.z = z - sign * 4 * dz
      game.world.move_player(p, sign * 8 * dx, sign * 8 * dz, game.progress)
      assert_true((p.x - x - sign * 4 * dx).abs() < 0.001)
      assert_true((p.z - z - sign * 4 * dz).abs() < 0.001)
      p.x = x
      p.z = z
      game.world.move_player(
        p,
        sign * 4.35 * dz,
        -sign * 4.35 * dx,
        game.progress,
      )
      let lateral = ((p.x - x) * dz - (p.z - z) * dx).abs()
      assert_true(lateral > 1 && lateral < 3.5)
    }
  }
}

///|
test "a shutter blocks only its exposed section and waits for a hull in the opening" {
  let gate = @simulation.authored_world().solids
    .iter()
    .find_first(fn(b) { b.id == "arena-prototype-entry" })
    .unwrap()
  let world : @simulation.World = {
    decks: [],
    solids: [gate],
    obstacles: [],
    architecture: [],
    architecture_grid: Map([]),
    lifts: [],
  }
  let state = @simulation.Progress::new()
  let player = @simulation.Player::new()
  let x = gate.rect.x + gate.rect.w / 2
  let z = gate.rect.z + gate.rect.d / 2
  fn step(dt : Double) -> Unit {
    world.step_machinery(state, player, dt, [])
  }
  step(0)
  state.combat_arena = gate.arena
  player.x = x
  player.y = gate.y
  player.z = z
  step(1)
  assert_true(world.blocked(x, gate.y, z, state) is None)
  player.x = x - 20
  step(1)
  state.combat_arena = None
  step(0.125)
  assert_eq(gate.exposed_height(state), gate.h / 2)
  assert_true(world.blocked(x, gate.y, z, state) is Some(_))
  assert_true(world.blocked(x, gate.y + gate.h / 2, z, state) is None)
  step(0.125)
  assert_true(world.blocked(x, gate.y, z, state) is None)
}

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

///|
test "overheating blocks further shots until the player has cooled down" {
  let player = @simulation.Player::new()
  assert_true(player.shoot_heat(1, cost=60))
  assert_true(player.shoot_heat(2, cost=60))
  assert_true(player.overheated)
  assert_false(player.shoot_heat(3))
  player.update_heat(0.1, 4, false, false)
  assert_true(player.overheated)
  player.update_heat(10, 14, false, false)
  assert_false(player.overheated)
  assert_true(player.shoot_heat(14))
}

///|
test "overdrive cooling cannot erase the delay from a cannon shot" {
  let player = @simulation.Player::new()
  player.abilities.overdrive = true
  assert_true(player.shoot_heat(1))
  player.update_heat(0.1, 1.1, true, true)
  let heat = player.heat
  player.update_heat(0.1, 1.2, false, true)
  assert_eq(player.heat, heat)
  player.update_heat(0.1, 2, false, true)
  assert_true(player.heat < heat)
}

///|
test "circulation allows red Phoenix contact during overheat" {
  let player = @simulation.Player::new()
  player.abilities.overdrive = true
  player.abilities.phoenix = true
  player.abilities.circulation = true
  player.heat = 100
  player.overheated = true
  for i in 0..<200 {
    player.update_heat(0.02, i.to_double() * 0.02, true, true)
  }
  assert_true(player.phoenix_ready())
  let hot_damage = player.contact_damage()
  player.overheated = false
  assert_true(hot_damage > player.contact_damage())
  player.deployed = true
  assert_false(player.phoenix_ready())
}

///|
test "flotation cannot fold over an unsupported diagonal hull corner" {
  let player = @simulation.Player::new()
  player.abilities.flotation = true
  player.x = 0
  player.z = 0
  assert_true(player.toggle_flotation(fn(_, _) { false }))
  assert_false(player.toggle_flotation(fn(x, z) { x == 0 || z == 0 }))
  assert_true(player.deployed)
  assert_true(player.toggle_flotation(fn(_, _) { true }))
  assert_false(player.deployed)
}

///|
test "hit displacement is independent of frame subdivision" {
  let player = @simulation.Player::new()
  player.x = 0
  player.z = 0
  assert_true(player.damage(5, 1))
  player.begin_hit(1, Some({ x: -1, z: 0, }))
  let total = player.hit_displacement(1.18, 0.18)
  let mut x = 0.0
  for i in 1..<=18 {
    x += player.hit_displacement(1 + i.to_double() * 0.01, 0.01).x
  }
  assert_true(total.x > 0)
  assert_true((x - total.x).abs() < 0.000001)
  let hp = player.hp
  assert_false(player.damage(5, 1.2))
  assert_eq(player.hp, hp)
}

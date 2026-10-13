///|
test "cannon sweeps between frames and damages a target exactly once" {
  let game = @simulation.Game::new()
  game.enemies.clear()
  let source = @simulation.authored_enemies()[0]
  let definition = {
    ..source,
    id: "test-turret",
    kind: @simulation.Turret,
    spawn: @simulation.Vec3::{ x: 500, y: 0, z: 510, },
    hp: 3,
    persistent: false,
    guardian: false,
    part_hp: [],
    reserve_for: None,
    activation: None,
    battle: None,
  }
  game.enemies.push(@simulation.Enemy::new(definition, game.progress))
  game.player.x = 500
  game.player.y = 0
  game.player.z = 500
  let queries = @simulation.Queries::{ geometry: fn(_, _, _) { None }, }
  assert_true(
    game.fire(queries, { x: 500, y: 1.5, z: 500, }, { x: 500, y: 1.5, z: 510, }),
  )
  game.update_shots(queries, 0.5)
  assert_eq(game.enemies[0].hp, 2)
  assert_eq(game.shots.length(), 0)
  game.update_shots(queries, 0.5)
  assert_eq(game.enemies[0].hp, 2)
}

///|
test "refuge cylinder stops outgoing fire without damaging the enemy" {
  let game = @simulation.Game::new()
  game.enemies.clear()
  let source = @simulation.authored_enemies()[0]
  game.enemies.push(
    @simulation.Enemy::new(
      {
        ..source,
        id: "test-turret",
        kind: @simulation.Turret,
        spawn: { x: 0, y: -8, z: 98, },
        hp: 3,
        persistent: false,
        part_hp: [],
        reserve_for: None,
      },
      game.progress,
    ),
  )
  let queries = @simulation.Queries::{ geometry: fn(_, _, _) { None }, }
  assert_true(
    game.fire(queries, { x: 0, y: -6.5, z: 86, }, { x: 0, y: -6.5, z: 98, }),
  )
  game.update_shots(queries, 0.5)
  assert_eq(game.enemies[0].hp, 3)
  assert_eq(game.shots.length(), 0)
}

///|
test "prototype front armor and vent opening preserve their different damage" {
  let game = @simulation.Game::new()
  let index = game.enemies
    .search_by(fn(e) { e.definition.id == "prototype" })
    .unwrap()
  let enemy = game.enemies[index]
  enemy.aim = 0
  let front = enemy.position().add({ x: 0, y: 0, z: 5, })
  assert_eq(game.hit_enemy(index, 1, front, @simulation.CannonHit), 0)
  game.progress.combat_arena = Some("prototype")
  assert_eq(game.hit_enemy(index, 1, front, @simulation.CannonHit), 0.4)
  enemy.phase = @simulation.Vent
  assert_eq(game.hit_enemy(index, 1, front, @simulation.CannonHit), 1)
}

///|
test "armor pickup increases capacity without repairing unrelated damage" {
  let game = @simulation.Game::new()
  let pickup = game.pickups
    .iter()
    .find_first(fn(p) { p.id == "armor-reservoir" })
    .unwrap()
  game.player.hp = 7
  assert_true(game.player.acquire(pickup, game.progress))
  assert_eq(game.player.hp, 12)
  assert_eq(game.player.max_hp(), 30)
  assert_false(game.player.acquire(pickup, game.progress))
  assert_eq(game.player.hp, 12)
}

///|
test "wrong weapon cannot activate the optical receiver" {
  let game = @simulation.Game::new()
  assert_false(
    game.commands.activate(
      game.progress,
      "gallery",
      @simulation.CannonAction,
      game.player,
      0,
    ),
  )
  assert_true(
    game.commands.activate(
      game.progress,
      "gallery",
      @simulation.LaserAction,
      game.player,
      0,
    ),
  )
  assert_false(game.progress.has("gallery"))
  assert_true(game.commands.advance(game.progress, 100, 100))
  assert_true(game.progress.has("gallery"))
}

///|
test "boss firing patterns enter a real warning before emitting projectiles" {
  let game = @simulation.Game::new()
  let queries = @simulation.Queries::{ geometry: fn(_, _, _) { None }, }
  let index = game.enemies
    .search_by(fn(e) { e.definition.id == "prototype" })
    .unwrap()
  let enemy = game.enemies[index]
  game.player.x = enemy.x
  game.player.y = enemy.y
  game.player.z = enemy.z - 8
  game.progress.combat_arena = Some("prototype")
  enemy.timer = 0
  game.time = 1
  game.update_enemies(queries, 1.0 / 60)
  assert_true(enemy.phase == @simulation.Warn)
  assert_eq(game.shots.length(), 0)
  for _ in 0..<70 {
    game.time += 1.0 / 60
    game.update_enemies(queries, 1.0 / 60)
  }
  assert_true(game.shots.length() >= 3)
  assert_true(enemy.phase == @simulation.Vent)
}

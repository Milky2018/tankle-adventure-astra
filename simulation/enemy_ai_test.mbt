///|
test "Keeper uses the last observation behind cover and waits when it expires" {
  let game = @simulation.Game::new()
  let boss = game.enemies
    .iter()
    .find_first(fn(e) { e.definition.kind == Keeper })
    .unwrap()
  game.player.x = boss.x + 7
  game.player.y = boss.y
  game.player.z = boss.z + 4
  game.progress.combat_arena = Some("keeper")
  let known = @simulation.Vec3::{ x: boss.x - 6, y: boss.y, z: boss.z - 1, }
  boss.last_seen = Some(known)
  boss.alert_until = 3
  boss.timer = 0
  let blocked = @simulation.Queries::{
    geometry: fn(ray, _, _) {
      Some({ distance: 0.1, point: ray.origin, normal: None, target: Terrain, })
    },
  }
  game.update_enemies(blocked, 0.016)
  assert_true(boss.phase is Warn(Volley({ kind: Barrage, .. }, _)))
  assert_eq(boss.lock.x, known.x)
  assert_eq(boss.lock.z, known.z)
  game.time = 4
  boss.phase = Idle
  boss.timer = 0
  game.update_enemies(blocked, 0.016)
  assert_true(boss.phase is Idle)
}

///|
test "an alert turret waits until its target enters weapon range before warning and firing" {
  let game = @simulation.Game::new()
  let def = game.enemies
    .iter()
    .find_first(fn(e) { e.definition.kind == Turret })
    .unwrap().definition
  let turret = @simulation.Enemy::new(
    {
      ..def,
      id: "test-turret",
      spawn: { x: 500, y: 0, z: 500, },
      emplacement: true,
      activation: None,
    },
    game.progress,
  )
  game.enemies.clear()
  game.enemies.push(turret)
  game.player.x = 500
  game.player.y = 0
  game.player.z = 529
  turret.timer = 0
  let queries = @simulation.Queries::{ geometry: fn(_, _, _) { None }, }
  for _ in 0..<90 {
    game.time += 1.0 / 60
    game.update_enemies(queries, 1.0 / 60)
  }
  assert_true(turret.phase is Idle)
  assert_true(game.shots.is_empty())
  game.player.z = 526
  game.update_enemies(queries, 1.0 / 60)
  assert_true(turret.phase is Warn(Fire(Shot)))
  for _ in 0..<80 {
    game.update_enemies(queries, 1.0 / 60)
  }
  assert_eq(game.shots.length(), 1)
}

///|
test "a copied Sorter only drives the rail cover assigned to its arena" {
  let game = @simulation.Game::new()
  let source = game.enemies
    .iter()
    .find_first(fn(e) { e.definition.kind == Sorter })
    .unwrap()
  let copy = @simulation.Enemy::new(
    {
      ..source.definition,
      id: "sorter-copy",
      spawn: { x: 500, y: 0, z: 500, },
      emplacement: true,
    },
    game.progress,
  )
  game.enemies.clear()
  game.enemies.push(copy)
  game.player.x = 510
  game.player.y = 0
  game.player.z = 500
  let cover = game.world.obstacles
    .iter()
    .find_first(fn(o) { o.id == "sorter-cover" })
    .unwrap()
  let before = cover.rect.x
  let queries = @simulation.Queries::{ geometry: fn(_, _, _) { None }, }
  fn sweep() {
    copy.phase = Sweep(1.5)
    copy.timer = 1.5
    game.update_enemies(queries, 0.02)
  }
  sweep()
  assert_eq(cover.rect.x, before)
  let template = game.encounters.arenas
    .iter()
    .find_first(fn(a) { a.id == "sorter" })
    .unwrap()
  game.encounters.arenas.clear()
  game.encounters.arenas.push({
    ..template,
    id: "freight-test",
    boss: "sorter-copy",
    rect: { x: 495, z: 495, w: 30, d: 30, },
    y: 0,
  })
  sweep()
  assert_eq(game.progress.combat_arena, Some("freight-test"))
  assert_eq(game.active_boss().unwrap().definition.id, "sorter-copy")
  assert_true(cover.rect.x > before)
  copy.phase = Vent(0.4)
  assert_true(game.hit_enemy(0, 100, game.player.position(), CannonHit) > 0)
  game.update_enemies(queries, 0.02)
  assert_true(game.progress.combat_arena is None)
  assert_true(
    game.progress.has("sorter-copy") && game.progress.has("freight-test"),
  )
}

///|
test "mortar interrupts a committed burst and restores its remaining shots and countdown" {
  let game = @simulation.Game::new()
  let source = game.enemies
    .iter()
    .find_first(fn(e) { e.definition.kind == Flanker })
    .unwrap()
  let e = @simulation.Enemy::new(
    {
      ..source.definition,
      id: "burst-test",
      spawn: { x: 500, y: 0, z: 500, },
      activation: None,
      emplacement: true,
    },
    game.progress,
  )
  game.enemies.clear()
  game.enemies.push(e)
  game.player.x = 510
  game.player.y = 0
  game.player.z = 500
  e.phase = Burst(2)
  e.timer = 0.09
  let q = @simulation.Queries::{ geometry: fn(_, _, _) { None }, }
  assert_true(game.hit_enemy(0, 1, game.player.position(), MortarHit) > 0)
  game.update_enemies(q, 0.01)
  assert_true(e.phase is Stunned(Some((Burst(2), _))))
  game.time = 0.21
  game.update_enemies(q, 0.01)
  assert_true(e.phase is Burst(2))
  assert_eq(e.timer, 0.09)
  game.update_enemies(q, 0.1)
  assert_true(e.phase is Burst(1))
  assert_eq(game.shots.length(), 1)
}

///|
test "repair locks a wounded ally through warning and does not resurrect a dead patient" {
  let game = @simulation.Game::new()
  let source = game.enemies
    .iter()
    .find_first(fn(e) { e.definition.kind == Repairer })
    .unwrap().definition
  let repairer = @simulation.Enemy::new(
    {
      ..source,
      id: "repair",
      spawn: { x: 500, y: 0, z: 500, },
      activation: None,
      emplacement: true,
    },
    game.progress,
  )
  let patient = @simulation.Enemy::new(
    {
      ..repairer.definition,
      kind: Turret,
      id: "patient",
      spawn: { x: 505, y: 0, z: 500, },
    },
    game.progress,
  )
  game.enemies.clear()
  game.enemies.push(repairer)
  game.enemies.push(patient)
  game.player.x = 510
  game.player.y = 0
  game.player.z = 500
  repairer.timer = 0
  patient.hp = 1
  let q = @simulation.Queries::{ geometry: fn(_, _, _) { None }, }
  game.update_enemies(q, 0.01)
  assert_true(repairer.phase is Warn(Aid(1)))
  for _ in 0..<110 {
    game.update_enemies(q, 0.01)
  }
  assert_true(repairer.phase is Repair(1))
  assert_true(patient.hp > 1)
  patient.hp = 0
  game.update_enemies(q, 0.02)
  assert_eq(patient.hp, 0)
}

///|
test "reset rebuilds squad membership even when placement ids and counts stay the same" {
  let game = @simulation.Game::new()
  let source = game.enemies[0].definition
  let def = {
    ..source,
    kind: @simulation.Turret,
    spawn: { x: 500, y: 0, z: 500, },
    encounter: Some("pair"),
  }
  game.enemies.clear()
  game.enemies.push(
    @simulation.Enemy::new({ ..def, id: "first", }, game.progress),
  )
  game.enemies.push(
    @simulation.Enemy::new({ ..def, id: "second", }, game.progress),
  )
  let old = game.enemies[1]
  let first = @simulation.Vec3::{ x: 510, y: 0, z: 500, }
  assert_true(game.hit_enemy(0, 0.1, first, CannonHit) > 0)
  assert_true(old.last_seen == Some(first))
  game.reset_enemies()
  let second = @simulation.Vec3::{ x: 490, y: 0, z: 500, }
  assert_true(game.hit_enemy(0, 0.1, second, CannonHit) > 0)
  assert_true(game.enemies[1].last_seen == Some(second))
  assert_true(old.last_seen == Some(first))
}

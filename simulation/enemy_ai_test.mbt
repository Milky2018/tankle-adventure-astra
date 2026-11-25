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
  assert_true(
    boss.phase is Warn(Volley({ kind: WalkingDrop | Pincer | Barrage, .. }, _)),
  )
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
  game.player.z = turret.z + turret.spec().reach + 2
  turret.timer = 0
  let queries = @simulation.Queries::{ geometry: fn(_, _, _) { None }, }
  for _ in 0..<90 {
    game.time += 1.0 / 60
    game.update_enemies(queries, 1.0 / 60)
  }
  assert_true(turret.phase is Idle)
  assert_true(game.shots.is_empty())
  game.player.z = turret.z + turret.spec().reach - 2
  game.update_enemies(queries, 1.0 / 60)
  assert_true(turret.phase is Warn(Fire(Shot)))
  for _ in 0..<80 {
    game.update_enemies(queries, 1.0 / 60)
  }
  assert_eq(game.shots.length(), 1)
  let shot = game.shots[0]
  assert_true(shot.origin.z > turret.z && shot.origin.y > turret.y)
  assert_true(
    shot.direction.dot(turret.lock.sub(shot.origin).normalized()) > 0.99999,
  )
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
  assert_eq(cover.rect.x, before)
  assert_eq(copy.jam, 0)
  assert_true(game.beams.is_empty())
  let assigned = game.world.obstacles
    .search_by(fn(o) { o.id == "sorter-cover" })
    .unwrap()
  let contact = @simulation.Queries::{
    geometry: fn(ray, range, _) {
      if range > 6 && (ray.origin.y - 1.8).abs() < 0.01 {
        Some({
          distance: 6,
          point: ray.point(6),
          normal: None,
          target: CoverTarget(assigned),
        })
      } else {
        None
      }
    },
  }
  copy.aim = 1.57
  copy.phase = Sweep(1.5)
  copy.timer = 0.9
  game.update_enemies(contact, 0.02)
  assert_true(copy.jam > 0 && copy.stopped_arm is Some(_))
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
    kind: Turret,
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

///|
test "welder sweeps the beam from the off-centre nozzle as the tool turns" {
  let game = @simulation.Game::new()
  let enemy = @simulation.Enemy::new(
    {
      ..game.enemies[0].definition,
      kind: Welder,
      spawn: { x: 500, y: 0, z: 500, },
      emplacement: true,
      encounter: None,
    },
    game.progress,
  )
  game.enemies.clear()
  game.enemies.push(enemy)
  enemy.awake = true
  enemy.aim = 0
  enemy.phase = Flame
  enemy.timer = 1.8
  game.player.x = 500
  game.player.y = 0
  game.player.z = 512
  let q = @simulation.Queries::{ geometry: fn(_, _, _) { None }, }
  let headings = []
  for _ in 0..<2 {
    game.update_enemies(q, 0.5)
    let beam = game.beams[game.beams.length() - 1]
    headings.push(beam.direction.x)
    let pose = enemy.weapon_pose.unwrap()
    assert_true(beam.origin.distance(pose.muzzle) < 0.00001)
    assert_true(beam.origin.sub(enemy.position()).rotate_y(-pose.yaw).x > 0)
    assert_true(beam.direction.dot(pose.direction) > 0.99999)
  }
  assert_true(headings[0] < 0 && headings[1] > 0)
}

///|
test "delayed hunter round leaves the other tube at its current position" {
  let game = @simulation.Game::new()
  let e = @simulation.Enemy::new(
    {
      ..game.enemies[0].definition,
      kind: Hunter,
      spawn: { x: 500, y: 0, z: 500, },
      emplacement: true,
      encounter: None,
    },
    game.progress,
  )
  game.enemies.clear()
  game.enemies.push(e)
  game.player.x = 500
  game.player.y = 0
  game.player.z = 520
  e.awake = true
  e.phase = Warn(Fire(Torpedoes))
  e.lock = game.player.position().add({ x: 0, y: 1.2, z: 0, })
  e.timer = 0
  let q = @simulation.Queries::{ geometry: fn(_, _, _) { None }, }
  game.update_enemies(q, 0.01)
  let first = game.shots[0]
  let second = game.shots[1]
  assert_true(first.origin.x < 500)
  assert_true(second.delay > 0)
  e.x += 2
  game.update_shots(q, 0.66)
  assert_true(second.origin.x > e.x)
  assert_true(second.origin.distance(e.weapon_pose.unwrap().muzzle) < 0.00001)
  assert_true(second.distance < 0.3)
}

///|
test "boss controllers vary attacks and react to movement, cover and severed feeds" {
  let game = @simulation.Game::new()
  for kind in [@simulation.EnemyKind::Sorter, Overseer, Guardian, Keeper] {
    let boss = game.enemies
      .iter()
      .find_first(fn(e) { e.definition.kind == kind })
      .unwrap()
    let moves : Array[@simulation.BossAttack] = []
    for i in 1..<=12 {
      boss.attack_cycle = i
      let pattern = boss.boss_pattern(true).unwrap()
      if !moves.contains(pattern.kind) {
        moves.push(pattern.kind)
      }
      assert_true(pattern.warn > 0)
      boss.last_boss_attack = Some(pattern.kind)
    }
    assert_true(moves.length() >= 5)
    boss.last_boss_attack = None
    let crossing = boss.boss_pattern(true, lateral_speed=8).unwrap().kind
    assert_true(
      if kind == Guardian {
        crossing == Crossfire
      } else {
        crossing == Pincer
      },
    )
    if kind == Guardian {
      assert_true(boss.boss_pattern(false).unwrap().kind == Sidestep)
    }
    if kind == Keeper {
      for dead in 0..<2 {
        boss.parts[dead].hp = 0
        for i in 1..<=12 {
          boss.attack_cycle = i
          let attack = boss.boss_pattern(true).unwrap().kind
          assert_true(
            if dead == 0 {
              attack is (Batteries | Crossfire | Barrage)
            } else {
              attack is (WalkingDrop | Pincer | Seekers)
            },
          )
        }
        boss.parts[dead].hp = 1
      }
    }
  }
}

///|
test "Overseer has independent firing shutters, outer flanks and a permanently exposed stripped core" {
  let game = @simulation.Game::new()
  let boss = game.enemies
    .iter()
    .find_first(fn(e) { e.definition.kind == Overseer })
    .unwrap()
  let left = boss.parts[0]
  let inside = left.position.add({ x: 3, y: 0, z: 8, })
  let outside = left.position.add({ x: -3, y: 0, z: 8, })
  assert_eq(boss.damage_amount(1, inside, CannonHit), 0)
  assert_eq(boss.damage_amount(1, inside, CannonHit, part_index=0), 0)
  assert_eq(boss.damage_amount(1, outside, CannonHit, part_index=0), 1)
  left.recoil = 1.35
  assert_true(boss.battery_exposed(0) && !boss.battery_exposed(1))
  assert_eq(boss.damage_amount(1, inside, CannonHit, part_index=0), 1)
  for part in boss.parts {
    part.hp = 0
  }
  boss.phase = Idle
  assert_eq(boss.damage_amount(1, inside, CannonHit), 1)
  boss.phase = Sweep(1.5)
  assert_eq(boss.damage_amount(1, inside, CannonHit), 1)
}

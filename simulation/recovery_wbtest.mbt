///|
test "a deployed Tank can retry a water encounter afloat on its approach" {
  let start = Vec3::{ x: -36, y: -16, z: 10, }
  let game = Game::new(start~)
  game.player.abilities.overdrive = true
  game.player.abilities.flotation = true
  game.player.deployed = true
  game.player.afloat = true
  game.recovery.record(start)
  game.engage_recovery("canal", None)
  game.player.hp = 0
  game.advance_world(0.02)
  game.time += 2.6
  game.advance_world(0.02)
  assert_true(game.field_recovered())
  assert_true(game.player.deployed && game.player.afloat)
  assert_true(game.player.position() == start)
}

///|
test "every authored dense squad can retry on its local approach" {
  let groups : Map[String, Array[EnemyDef]] = Map([])
  for def in authored_enemies() {
    if def.kind.is_boss() || def.reserve_for is Some(_) {
      continue
    }
    for name in [def.encounter, def.battle] {
      if name is Some(id) {
        let squad = groups.get_or_init(id, fn() { [] })
        if !squad.any(fn(e) { e.id == def.id }) {
          squad.push(def)
        }
      }
    }
  }
  let queries = Queries::{ geometry: fn(_, _, _) { None }, }
  for id, group in groups {
    if group.length() < 2 {
      continue
    }
    let mut retried = false
    for def in group {
      if def.wave != 0 {
        continue
      }
      for
        (dx, dz) in [
          (0.0, 1.0),
          (1, 0),
          (0, -1),
          (-1, 0),
          (0.707, 0.707),
          (-0.707, 0.707),
        ] {
        let game = Game::new()
        let start = def.spawn.add({ x: dx * 10, y: 0, z: dz * 10, })
        guard game.world.support(start.x, start.z, start.y, true) is Some(floor) else {
          continue
        }
        if game.world.blocked(start.x, start.y, start.z, game.progress)
          is Some(_) {
          continue
        }
        game.enemies.clear()
        for unit in group {
          game.enemies.push(Enemy::new(unit, game.progress))
        }
        let p = game.player
        p.x = start.x
        p.y = floor.height
        p.z = start.z
        p.abilities.overdrive = true
        p.abilities.flotation = true
        p.deployed = floor.deck.water
        for _ in 0..<30 {
          game.time += 0.02
          game.advance_world(0.02)
          game.move_player({ x: -dx, z: -dz, }, false, 0.02)
          game.update_enemies(queries, 0.02)
        }
        if game.recovery.owner is None {
          continue
        }
        p.hp = 0
        game.advance_world(0.02)
        game.time += 2.6
        game.advance_world(0.02)
        if game.field_recovered() && game.player.position().distance(start) < 12 {
          retried = true
          break
        }
      }
      if retried {
        break
      }
    }
    assert_true(retried, msg="No local retry for " + id)
  }
}

///|
test "loading a saved journey during the death iris uses its saved hive" {
  let game = Game::new()
  let saved = game.save()
  game.player.abilities.overdrive = true
  game.player.abilities.flotation = true
  game.recovery.record({ x: -36, y: -16, z: 10, })
  game.engage_recovery("test-benches", None)
  game.death_at = Some(game.time)
  assert_true(game.restore(saved))
  assert_false(game.field_recovered())
  assert_true(game.player.position() == game.hives[0].position)
}

///|
test "field reconstruction resets its squad and leaves the previous firefight cleared" {
  let game = Game::new()
  let current = game.enemies
    .search_by(fn(e) { e.definition.id == "bench-scout" })
    .unwrap()
  let previous = game.enemies
    .search_by(fn(e) { e.definition.id == "press-gunner" })
    .unwrap()
  game.enemies[current].hp = 0
  game.enemies[previous].hp = 0
  game.player.abilities.overdrive = true
  game.player.abilities.flotation = true
  game.recovery.record({ x: -36, y: -16, z: 10, })
  game.engage_recovery("test-benches", None)
  game.death_at = Some(game.time)
  game.respawn()
  assert_true(game.field_recovered())
  assert_true(game.enemies[current].hp > 0)
  assert_eq(game.enemies[previous].hp, 0)
}

///|
test "before Overdrive the original Foundry reconstructs the Tank at the repair hive" {
  let game = Game::new()
  game.player.x = -28
  game.player.y = -16
  game.player.z = 124
  game.recovery.record(game.player.position())
  game.engage_recovery(
    "prototype",
    game.encounters.arenas.iter().find_first(fn(a) { a.boss == "prototype" }),
  )
  game.player.hp = 0
  game.advance_world(0.02)
  game.time += 2.6
  game.advance_world(0.02)
  assert_false(game.field_recovered())
  assert_true(game.player.position() == game.hives[0].position)
}

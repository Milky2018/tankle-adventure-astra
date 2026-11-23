///|
test "hit recovery preserves driving and combines it with knockback" {
  let game = @simulation.Game::new()
  game.hives.clear()
  game.player.x = 0
  game.player.y = -8
  game.player.z = 86
  game.time = 1
  assert_true(game.hurt(5, { x: -5, y: -8, z: 86, }))
  game.time = 1.1
  game.move_player({ x: 0, z: -1, }, false, 0.1)
  assert_true(game.player.z < 86)
  assert_true(game.player.x > 0)
  let queries = @simulation.Queries::{ geometry: fn(_, _, _) { None }, }
  assert_false(
    game.fire(queries, { x: 0, y: -6, z: 85, }, { x: 0, y: -6, z: 60, }),
  )
}

///|
test "a stalled magnetic rail keeps its lock without generating heat" {
  let game = @simulation.Game::new()
  let body = game.world.solids
    .iter()
    .find_first(fn(b) { b.rail is Some(_) })
    .unwrap()
  let rail = body.rail.unwrap()
  game.world.solids.clear()
  game.world.solids.push(body)
  game.world.obstacles.clear()
  game.commands.controls.clear()
  game.enemies.clear()
  game.hives.clear()
  body.set_coordinate(rail.axis, rail.min)
  game.player.abilities.magnet = true
  game.player.x = body.rect.x + body.rect.w / 2
  game.player.z = body.rect.z + body.rect.d / 2
  if rail.axis is X {
    game.player.x = body.rect.x - 5
  } else {
    game.player.z = body.rect.z - 5
  }
  game.player.y = body.y
  let origin = game.player.position().add({ x: 0, y: 1.6, z: 0, })
  let target = @simulation.Vec3::{
    x: body.rect.x + body.rect.w / 2,
    y: body.y + 1.6,
    z: body.rect.z + body.rect.d / 2,
  }
  game.magnet({ geometry: fn(_, _, _) { None }, }, origin, target, true, 0.1)
  assert_eq(game.player.heat, 0)
  assert_true(game.magnet_lock is Some(SlideTarget(0)))
  assert_true(game.magnet_end is None)
}

///|
test "a released lift carries the player after its dwell and blocks before release" {
  let world = @simulation.authored_world()
  let state = @simulation.Progress::new()
  let player = @simulation.Player::new()
  let lift = world.lifts.iter().find_first(fn(l) { !l.settle }).unwrap()
  world.lifts.clear()
  world.lifts.push(lift)
  lift.y = lift.stops[0]
  lift.destination = lift.y
  player.x = lift.rect.x + lift.rect.w / 2
  player.z = lift.rect.z + lift.rect.d / 2
  player.y = lift.y
  let rider = @simulation.Enemy::new(
    { ..@simulation.authored_enemies()[0], spawn: player.position(), },
    state,
  )
  world.step_machinery(state, player, 4, [rider])
  assert_eq(player.y, lift.stops[0])
  state.complete(lift.lock) |> ignore
  for lock in lift.locks {
    state.complete(lock) |> ignore
  }
  world.step_machinery(state, player, 3.5, [rider])
  assert_true(lift.y > lift.stops[0])
  assert_eq(player.y, lift.y)
  assert_eq(rider.y, lift.y)
}

///|
test "the rail route waits for switches and locks them during travel" {
  let game = @simulation.Game::new()
  game.enemies.clear()
  assert_true(game.puzzles.activate("rail-a"))
  assert_false(game.puzzles.activate("rail-a"))
  assert_false(game.puzzles.rail.switches[0])
  game.update_puzzles(1)
  assert_true(game.puzzles.rail.switches[0])
  assert_true(game.puzzles.activate("rail-b"))
  game.update_puzzles(1)
  assert_true(game.puzzles.activate("rail-carrier"))
  let rail = game.puzzles.rail
  let origin = rail.position()
  assert_false(game.puzzles.activate("rail-a"))
  for _ in 0..<400 {
    game.update_puzzles(0.02)
  }
  assert_true(game.puzzles.rail.solved)
  assert_true(game.progress.has("rail-crossing"))
  let end = rail.route[rail.route.length() - 1]
  assert_eq(rail.position().x - origin.x, end.x - rail.route[0].x)
  assert_eq(rail.position().z - origin.z, end.z - rail.route[0].z)
}

///|
test "aligned gutters fill only after the inlet opens" {
  let game = @simulation.Game::new()
  assert_true(game.puzzles.activate("gutter-a"))
  assert_true(game.puzzles.activate("gutter-b"))
  for _ in 0..<50 {
    game.update_puzzles(0.02)
  }
  assert_true(game.puzzles.activate("gutter-b"))
  for _ in 0..<200 {
    game.update_puzzles(0.02)
  }
  assert_false(game.progress.has("garden-bloom"))
  assert_true(game.puzzles.activate("gutter-plug"))
  for _ in 0..<200 {
    game.update_puzzles(0.02)
  }
  assert_true(game.progress.has("garden-bloom"))
  assert_false(game.puzzles.activate("gutter-a"))
}

///|
test "death reconstructs at the anchor and retains acquired progression" {
  let game = @simulation.Game::new()
  game.progress.complete("prototype") |> ignore
  game.player.x = -28
  game.player.y = -16
  game.player.z = 124
  assert_true(game.interact())
  game.player.hp = 0
  game.advance_world(0.02)
  assert_true(game.death_at is Some(_))
  game.time += 0.1
  game.advance_world(0.02)
  assert_eq(game.player.hp, 0)
  game.time += 10
  game.advance_world(0.02)
  assert_eq(game.player.hp, game.player.max_hp())
  assert_true(game.player.abilities.overdrive)
  assert_true(game.progress.has("prototype"))
  assert_true(game.player.position() == game.hives[0].position)
}

///|
test "mortar preserves an elevated tray and forecasts an intercepting ceiling" {
  let game = @simulation.Game::new()
  game.enemies.clear()
  game.hives.clear()
  game.player.weapon = Mortar
  game.player.abilities.mortar = true
  let tray = game.commands.controls.iter().find_first(fn(c) { c.top }).unwrap()
  let origin = tray.position.add({ x: 0, y: -4, z: 12, })
  let ground = @simulation.Queries::{
    geometry: fn(ray, range, _) {
      if ray.direction.y < 0 {
        let d = (tray.position.y - 6 - ray.origin.y) / ray.direction.y
        if d >= 0 && d <= range {
          Some({
            distance: d,
            point: ray.point(d),
            normal: Some({ x: 0, y: 1, z: 0, }),
            target: Terrain,
          })
        } else {
          None
        }
      } else {
        None
      }
    },
  }
  assert_true(
    game.mortar_target(ground, origin, tray.position) == tray.position,
  )
  let edge = tray.position.add({ x: 1.55, y: 0, z: 0, })
  assert_true(game.mortar_target(ground, origin, edge) == edge)
  let descent : @simulation.Ray = {
    origin: edge.add({ x: 0, y: 3, z: 0, }),
    direction: { x: 0, y: -1, z: 0, },
  }
  assert_true(
    game.cast(ground, descent, 4, refuge=false)
    is Some({ target: ControlTarget(_), .. }),
  )
  let ceiling = @simulation.Queries::{
    geometry: fn(ray, range, _) {
      if ray.direction.y > 0 {
        let d = (origin.y + 2 - ray.origin.y) / ray.direction.y
        if d >= 0 && d <= range {
          Some({
            distance: d,
            point: ray.point(d),
            normal: Some({ x: 0, y: -1, z: 0, }),
            target: Terrain,
          })
        } else {
          None
        }
      } else {
        None
      }
    },
  }
  let (_, hit, early) = game.predict_mortar(ceiling, origin, tray.position)
  assert_true(early)
  assert_true(hit is Some(_))
  assert_true(game.fire(ceiling, origin, tray.position))
  for _ in 0..<12 {
    game.update_shots(ceiling, 1.0 / 60)
  }
  assert_eq(game.shots.length(), 0)
}

///|
test "a custom starting position does not replace the repair anchor" {
  let start : @simulation.Vec3 = { x: 290, y: -24, z: 120, }
  let game = @simulation.Game::new(start~)
  assert_true(game.player.position() == start)
  game.player.x += 12
  game.respawn()
  assert_true(game.player.position() == game.hives[0].position)
  game.progress.anchor = game.hives[1].id
  game.respawn()
  assert_true(game.player.position() == game.hives[1].position)
}

///|
test "thermal grates go cold when their shutdown or release circuit is completed" {
  let game = @simulation.Game::new()
  for grate in game.floor_heat {
    assert_true(grate.heating(game.progress))
    match (grate.stop, grate.release) {
      (Some(id), _) | (_, Some(id)) => {
        game.progress.complete(id) |> ignore
        assert_false(grate.heating(game.progress))
      }
      _ => ()
    }
  }
}

///|
test "death in each remote boss arena returns to the last activated repair hive" {
  let probes = [
    ("foundry", 218, 16, -176, 1),
    ("guardian", 202, 16, 32, 1),
    ("sorter", 53, -8, -110, -1),
    ("keeper", 0, -56, 74, -1),
  ]
  let queries = @simulation.Queries::{ geometry: fn(_, _, _) { None }, }
  for (id, x, y, z, sign) in probes {
    let game = @simulation.Game::new(start={
      x: x.to_double(),
      y: y.to_double(),
      z: z.to_double(),
    })
    let hive = game.hives[1]
    let p = game.player
    let start = p.position()
    p.x = hive.position.x
    p.y = hive.position.y
    p.z = hive.position.z
    assert_true(game.interact())
    assert_eq(game.progress.anchor, hive.id)
    p.x = start.x
    p.y = start.y
    p.z = start.z
    game.player.abilities.overdrive = true
    // The returning Tank has already earned the machinery on its approach.
    for b in game.world.solids {
      if b.arena is None &&
        !b.permanent &&
        !game.encounters.arenas.any(fn(a) { a.id == b.id }) {
        game.progress.complete(b.id) |> ignore
      }
    }
    let step = @simulation.Vec2::{ x: 0, z: sign.to_double(), }
    for _ in 0..<200 {
      game.time += 0.02
      game.advance_world(0.02)
      game.move_player(step, false, 0.02)
      game.update_enemies(queries, 0.02)
      if game.progress.combat_arena == Some(id) {
        break
      }
    }
    assert_eq(game.progress.combat_arena, Some(id))
    game.player.hp = 0
    game.advance_world(0.02)
    // Check the destination once reconstruction has had time to finish.
    game.time += 10
    game.advance_world(0.02)
    assert_true(game.player.position() == hive.position)
    assert_eq(game.player.hp, game.player.max_hp())
    assert_true(game.progress.combat_arena is None)
  }
}

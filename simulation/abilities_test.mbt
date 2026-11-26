///|
test "laser reflection follows the outgoing face without spending heat on its guide" {
  let game = @simulation.Game::new()
  game.enemies.clear()
  game.commands.controls.clear()
  game.hives.clear()
  game.mirrors.clear()
  game.player.x = 0
  game.player.y = 0
  game.player.z = 0
  game.player.abilities.laser = true
  game.player.weapon = Laser
  game.mirrors.push({
    id: "test-mirror",
    position: { x: 5, y: 2, z: 0, },
    base_normal: { x: -1, y: 0, z: 1, },
    size: 2,
    turnable: true,
    flash: 0,
    angle: 0,
  })
  let queries = @simulation.Queries::{
    geometry: fn(ray, _, _) {
      if ray.origin.x < 4.99 && ray.direction.x > 0.9 {
        let distance = (5.0 - ray.origin.x) / ray.direction.x
        Some({
          distance,
          point: ray.point(distance),
          normal: None,
          target: MirrorTarget(0),
        })
      } else {
        None
      }
    },
  }
  game.laser(queries, { x: 0, y: 2, z: 0, }, { x: 10, y: 2, z: 0, }, false, 0.1)
  assert_eq(game.laser_path.length(), 2)
  assert_true(game.laser_path[0].contact)
  assert_false(game.laser_path[1].contact)
  assert_true(game.laser_path[1].to.z > game.laser_path[0].to.z)
  assert_true((game.laser_path[1].to.x - 5).abs() < 0.0001)
  assert_eq(game.player.heat, 0)
  game.laser(queries, { x: 0, y: 2, z: 0, }, { x: 10, y: 2, z: 0, }, true, 0.1)
  assert_true(game.player.heat > 0)
  game.progress.turn_mirror("test-mirror") |> ignore
  game.advance_world(0.25)
  assert_true(game.mirrors[0].normal().x < -0.7)
  assert_true(game.mirrors[0].normal().z < -0.7)
}

///|
test "a shield can be stripped beyond Bastion range but not through a wall" {
  let game = @simulation.Game::new()
  let enemy = game.enemies
    .iter()
    .find_first(fn(e) {
      e.definition.magnetic_shield && e.definition.kind == Bastion
    })
    .unwrap()
  game.enemies.clear()
  game.enemies.push(enemy)
  game.commands.controls.clear()
  game.world.solids.clear()
  game.world.obstacles.clear()
  game.hives.clear()
  game.player.x = 0
  game.player.y = 0
  game.player.z = 0
  game.player.abilities.magnet = true
  enemy.x = 0
  enemy.y = 0
  enemy.z = enemy.spec().reach + 2
  enemy.hp = 5
  let queries = @simulation.Queries::{ geometry: fn(_, _, _) { None }, }
  let origin = @simulation.Vec3::{ x: 0, y: 2, z: 0, }
  let shield = enemy.position().add({ x: 0, y: 1.5, z: 0, })
  let blocked = @simulation.Queries::{
    geometry: fn(ray, _, _) {
      Some({ distance: 2, point: ray.point(2), normal: None, target: Terrain, })
    },
  }
  game.magnet(blocked, origin, shield, true, 0.8)
  assert_false(enemy.shield_removed)
  for _ in 0..<36 {
    game.time += 0.02
    game.magnet(queries, { x: 0, y: 2, z: 0, }, shield, true, 0.02)
  }
  assert_true(enemy.shield_removed)
  assert_true(enemy.stunned_until > game.time)
}

///|
test "save restores abilities and pending signals but reconstructs the player at a repair hive" {
  let game = @simulation.Game::new()
  let pickup = game.pickups
    .iter()
    .find_first(fn(p) { p.acquisition is Overdrive })
    .unwrap()
  if pickup.requires is Some(id) {
    game.progress.complete(id) |> ignore
  }
  assert_true(game.player.acquire(pickup, game.progress))
  game.commands.activate(game.progress, "load", MortarAction, game.player, 0)
  |> ignore
  game.advance_world(0.2)
  game.player.hp = 5
  game.player.x = -40
  let restored = @simulation.Game::new()
  assert_true(restored.restore(game.save()))
  assert_true(restored.player.abilities.overdrive)
  assert_eq(restored.player.hp, restored.player.max_hp())
  assert_true(restored.player.position() == restored.hives[0].position)
  assert_true(restored.progress.pending.contains("load"))
  restored.advance_world(20)
  assert_true(restored.progress.has("load"))
  assert_false(restored.restore("broken save"))
}

///|
test "final docking requires the defeated Keeper and a continuous stationary hold" {
  let game = @simulation.Game::new()
  game.player.x = 0
  game.player.z = 0
  let dock = game.commands.controls
    .iter()
    .find_first(fn(c) { c.actions.contains(Dock) })
    .unwrap()
  game.player.y = dock.ground
  game.dock(true, false, 3)
  assert_true(game.ending_at is None)
  game.progress.complete("keeper") |> ignore
  game.dock(true, false, 1.5)
  game.dock(true, true, 0.1)
  assert_eq(game.player.dock_hold, 0)
  game.dock(true, false, 2)
  assert_true(game.ending_at is Some(_))
  assert_true(game.progress.has("endingSeen"))
  game.continue_after_ending()
  assert_true(game.ending_at is None)
  assert_true(game.progress.has("keeper"))
  assert_true(game.player.position() == game.hives[3].position)
  assert_eq(game.progress.anchor, game.hives[0].id)
  game.respawn()
  assert_true(game.player.position() == game.hives[0].position)
}

///|
test "a relay rejects direct light and keeps the reflected beam on its latched face" {
  let game = @simulation.Game::new()
  game.player.abilities.laser = true
  game.player.weapon = Laser
  let receiver = game.commands.controls
    .iter()
    .find_first(c => c.id == "lens-return")
    .unwrap()
  let index = game.mirrors
    .search_by(m => m.id == receiver.relay_mirror.unwrap())
    .unwrap()
  let mirror = game.mirrors[index].position
  let queries = @simulation.Queries::{
    geometry: fn(ray, _, _) {
      if ray.direction.z > 0.99 && ray.origin.z < mirror.z {
        Some({
          distance: mirror.z - ray.origin.z,
          point: mirror,
          normal: None,
          target: MirrorTarget(index),
        })
      } else {
        None
      }
    },
  }
  let direct = receiver.position.add({ x: 4, y: 0, z: 0, })
  game.laser(queries, direct, receiver.position, true, 0.02)
  assert_false(game.commands.active(game.progress, receiver.id))
  let emitter = mirror.add({ x: 0, y: 0, z: -8, })
  game.laser(queries, emitter, mirror, false, 0.02)
  assert_false(game.commands.active(game.progress, receiver.id))
  game.laser(queries, emitter, mirror, true, 0.02)
  assert_true(game.commands.active(game.progress, receiver.id))
  let impact = game.laser_path[1].to
  game.laser(queries, emitter, mirror, true, 0.02)
  assert_true(game.laser_path[1].contact)
  assert_eq(game.laser_path[1].to.distance(impact), 0)
}

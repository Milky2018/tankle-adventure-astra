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
  enemy.phase = @simulation.Vent(0.25)
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
  assert_true(enemy.phase.is_warning())
  assert_eq(game.shots.length(), 0)
  for _ in 0..<70 {
    game.time += 1.0 / 60
    game.update_enemies(queries, 1.0 / 60)
  }
  assert_true(game.shots.length() >= 3)
  assert_true(enemy.phase.is_venting())
}

///|
test "authored pickup IDs grant upgrades once and survive saving" {
  let game = @simulation.Game::new()
  let source = game.pickups[0]
  let armor = {
    ..source,
    id: "editor-armor",
    acquisition: @simulation.Armor,
    requires: None,
  }
  let cannon = {
    ..source,
    id: "editor-cannon",
    acquisition: @simulation.CannonCoil,
    requires: None,
  }
  game.pickups.push(armor)
  game.pickups.push(cannon)
  game.player.hp = 7
  assert_true(game.player.acquire(armor, game.progress))
  assert_eq(game.player.max_hp(), 30)
  assert_eq(game.player.hp, 12)
  assert_false(game.player.acquire(armor, game.progress))
  assert_eq(game.player.max_hp(), 30)
  assert_true(game.player.acquire(cannon, game.progress))
  assert_true(game.player.upgrades.cannon)
  let restored = @simulation.Game::new()
  restored.pickups.push(armor)
  restored.pickups.push(cannon)
  assert_true(restored.restore(game.save()))
  assert_eq(restored.player.max_hp(), 30)
  assert_true(restored.player.upgrades.cannon)
}

///|
test "authored use controls respect proximity, prerequisites and emit their signals" {
  let game = @simulation.Game::new()
  let source = game.commands.controls[0]
  let control = {
    ..source,
    id: "editor-switch",
    position: { x: 500, y: 1.3, z: 500, },
    ground: 0,
    actions: [@simulation.Use],
    requires: Some("editor-key"),
    effects: ["editor-gate"],
    circuit_key: "editor-switch",
  }
  game.commands.controls.push(control)
  game.player.x = 500
  game.player.y = 0
  game.player.z = 500
  let anchor = game.progress.anchor
  game.player.hp = 7
  assert_eq(game.interactable(), None)
  assert_false(game.interact())
  game.progress.complete("editor-key") |> ignore
  game.player.y = 8
  assert_eq(game.interactable(), None)
  game.player.y = 0
  game.player.x = 505
  assert_eq(game.interactable(), None)
  game.player.x = 500
  assert_eq(game.interactable(), Some("editor-switch"))
  assert_true(game.interact())
  game.commands.advance(game.progress, 1, 1) |> ignore
  assert_true(game.progress.has("editor-gate"))
  assert_false(game.interact())
  assert_eq(game.progress.anchor, anchor)
  assert_eq(game.player.hp, 7)
}

///|
test "first scout crosses the ramp landing before charging and resets at repair" {
  let game = @simulation.Game::new()
  let queries = @simulation.Queries::{ geometry: fn(_, _, _) { None }, }
  let index = game.enemies
    .search_by(fn(e) { e.definition.id == "foundry-west-scout" })
    .unwrap()
  let scout = game.enemies[index]
  let start = scout.position()
  game.update_enemies(queries, 0.1)
  assert_eq(scout.x, start.x)
  game.player.x = -40
  game.player.y = -12
  game.player.z = 66
  for _ in 0..<20 {
    game.update_enemies(queries, 0.1)
    assert_true(scout.phase == @simulation.Idle)
  }
  assert_true(scout.x > start.x + 5)
  game.reset_enemies()
  assert_eq(game.enemies[index].x, start.x)
}

///|
test "boss armor and attack patterns follow machine type under a new instance id" {
  let game = @simulation.Game::new()
  for
    (kind, attack) in [
      (@simulation.Sorter, @simulation.ArmSweep),
      (Overseer, Batteries),
      (Guardian, Fan),
      (Keeper, Batteries),
    ] {
    let source = game.enemies
      .iter()
      .find_first(fn(e) { e.definition.kind == kind })
      .unwrap()
    let copy = @simulation.Enemy::new(
      { ..source.definition, id: "editor-copy", },
      game.progress,
    )
    assert_true(copy.definition.kind.is_boss())
    assert_true(copy.boss_pattern(true).unwrap().kind == attack)
  }
  let prototype = game.enemies
    .iter()
    .find_first(fn(e) { e.definition.kind == Prototype })
    .unwrap()
  let copy = @simulation.Enemy::new(
    { ..prototype.definition, id: "editor-copy", },
    game.progress,
  )
  assert_true(copy.definition.kind.is_boss())
  copy.aim = 0
  let front = copy.position().add({ x: 0, y: 0, z: 5, })
  assert_eq(copy.damage_amount(1, front, CannonHit), 0.4)
  copy.phase = Vent(0.25)
  assert_eq(copy.damage_amount(1, front, CannonHit), 1)
}

///|
test "coordinated squads stagger shared charge and mortar warnings across machine types" {
  let game = @simulation.Game::new()
  for
    (first, second, allowed) in [
      (@simulation.Scout, @simulation.Interceptor, false),
      (Siege, Artillery, false),
      (Interceptor, Artillery, true),
      (Prototype, Interceptor, true),
    ] {
    let def = {
      ..game.enemies[0].definition,
      battle: Some("test"),
      coordinated: true,
    }
    let ready = @simulation.Enemy::new({ ..def, kind: first, }, game.progress)
    let busy = @simulation.Enemy::new({ ..def, kind: second, }, game.progress)
    busy.phase = Warn(Fire(ChargeAttack))
    busy.warning_age = 0.6
    assert_eq(@simulation.can_telegraph(0, [ready, busy]), allowed)
  }
}

///|
test "mortar flinch follows the machine even outside its original encounter" {
  let game = @simulation.Game::new()
  let source = game.enemies[0].definition
  game.time = 3
  for
    (kind, delay) in [
      (@simulation.Scout, 0.6),
      (Interceptor, 0.2),
      (Prototype, 0.0),
    ] {
    let def = {
      ..source,
      id: "editor-copy",
      kind,
      spawn: { x: 500, y: 0, z: 500, },
      persistent: false,
    }
    let enemy = @simulation.Enemy::new(def, game.progress)
    game.enemies.clear()
    game.enemies.push(enemy)
    assert_true(game.hit_enemy(0, 1, enemy.position(), MortarHit) > 0)
    assert_eq(
      enemy.stunned_until,
      if delay > 0 {
        game.time + delay
      } else {
        0
      },
    )
  }
}

///|
test "a refit changes the next projectile and its impact, including with an earlier shot in flight" {
  let game = @simulation.Game::new()
  let from = @simulation.Vec3::{ x: 500, y: 2, z: 500, }
  let to = @simulation.Vec3::{ x: 500, y: 2, z: 505, }
  let normal = @simulation.Vec3::{ x: 0, y: 0, z: -1, }
  let queries = @simulation.Queries::{
    geometry: fn(ray, limit, _) {
      let distance = to.z - ray.origin.z
      if distance >= 0 && distance <= limit {
        Some({
          target: @simulation.Terrain,
          point: to,
          distance,
          normal: Some(normal),
        })
      } else {
        None
      }
    },
  }
  assert_true(game.fire(queries, from, to))
  let coil = game.pickups
    .iter()
    .find_first(fn(p) { p.id == "cannon-coil" })
    .unwrap()
  game.progress.complete(coil.requires.unwrap()) |> ignore
  assert_true(game.player.acquire(coil, game.progress))
  game.time += 0.6
  assert_true(game.fire(queries, from, to))
  assert_false(game.shots[0].reinforced())
  assert_true(game.shots[1].reinforced())
  game.update_shots(queries, 0.2)
  assert_eq(game.shots.length(), 0)
  let upgraded = game.effects.filter(fn(e) {
    e is @simulation.ReinforcedStrike(_, _, @simulation.Cannon)
  })
  assert_eq(upgraded.length(), 1)
}

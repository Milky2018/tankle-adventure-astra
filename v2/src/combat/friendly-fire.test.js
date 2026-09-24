import { createEnemyState } from './enemy-state.js';
import { initialFoldedState } from '../app/state.js';
import { createProgression } from '../progression/commands.js';
import { BOSS_ARENAS } from './boss-arenas.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createFoldedCombat } from './projectiles.js';

function enemy(id, x, z, extra = {}) {
  return {
    id,
    x,
    y: 0,
    z,
    hp: 10,
    max: 10,
    type: 'turret',
    radius: 1,
    aim: Math.PI,
    phase: 'idle',
    parts: [],
    kind: 'enemy',
    ...extra,
  };
}
function fixture(enemies, { walls = [], hives = [], controls = [] } = {}) {
  const p = { x: 0, y: 0, z: 20, hp: 50, invincible: 0 },
    state = Object.assign(initialFoldedState(), {
      mirrorTurns: {},
      combatArena: enemies.find((e) => BOSS_ARENAS.some((a) => a.id === e.id))?.id,
    }),
    shots = [],
    events = [],
    sounds = [],
    killed = [];
  const world = {
    enemies,
    hives,
    controls,
    mirrors: [],
    lifts: [],
    cast(origin, dir, range, options = {}) {
      const ray = new T.Ray(origin, dir);
      let nearest = null;
      for (const wall of walls) {
        const point = ray.intersectBox(wall, new T.Vector3());
        if (point) {
          const distance = point.distanceTo(origin);
          if (distance <= range && (!nearest || distance < nearest.distance))
            nearest = { point, distance };
        }
      }
      if (options.targets !== false)
        for (const target of controls) {
          const point = ray.intersectSphere(
            new T.Sphere(new T.Vector3(target.x, target.y, target.z), target.radius),
            new T.Vector3(),
          );
          if (point) {
            const distance = point.distanceTo(origin);
            if (distance <= range && (!nearest || distance < nearest.distance))
              nearest = { point, distance, target };
          }
        }
      return nearest;
    },
  };
  let time = 1;
  const api = createFoldedCombat({
    progression: createProgression(state, []),
    player: p,
    world,
    state,
    shots,
    mines: [],
    now: () => time,
    scene: { remove() {}, add() {} },
    effects: {
      projectile: () => new T.Mesh(new T.SphereGeometry(0.1), new T.MeshBasicMaterial()),
      burst() {},
      ripple: () => new T.Mesh(),
      refugeImpact() {},
      rejectImpact() {},
      enemyKilled: (e) => killed.push(e.id),
      audio: { event: (...args) => sounds.push(args) },
    },
    events: {
      alertSquad() {},
      save() {},
      setState: (id) => events.push(id),
      detonateMine() {},
      layMine() {},
      hurt() {},
      death() {},
    },
  });
  api.step = (dt) => {
    time += dt;
    api.updateShots(dt);
  };
  return { ...api, p, state, shots, events, sounds, killed, world };
}
function fireThrough(f, shooter) {
  f.shootEnemy(shooter, 0, null, new T.Vector3(f.p.x, 1.2, f.p.z));
  for (let i = 0; i < 150; i++) f.step(1 / 60);
}

test('hostile projectiles retain their player damage and direct-hit protection', () => {
  for (const [type, damage] of [
    ['turret', 5],
    ['sniper', 10],
    ['skirmisher', 5],
  ]) {
    const shooter = enemy('shooter', 0, 0, { type });
    const f = fixture([shooter]);
    fireThrough(f, shooter);
    assert.equal(f.p.hp, 50 - damage, type);
    f.hurt(damage);
    // fireThrough advances past invulnerability; a new hit starts a fresh window.
    assert.equal(f.p.hp, 50 - damage * 2);
    f.hurt(damage);
    assert.equal(f.p.hp, 50 - damage * 2);
  }
});

test('hostile direct fire hits the first ally, ignores its shooter and never operates controls', () => {
  const shooter = enemy('shooter', 0, 0),
    front = enemy('front', 0, 6),
    back = enemy('back', 0, 11);
  const f = fixture([shooter, front, back], {
    controls: [{ id: 'switch', x: 0, y: 1.5, z: 3, radius: 1 }],
  });
  fireThrough(f, shooter);
  assert.equal(shooter.hp, 10);
  assert.equal(front.hp, 9);
  assert.equal(back.hp, 10);
  assert.equal(f.p.hp, 50);
  assert.deepEqual(f.events, []);
});

test('hostile direct fire respects walls and sanctuary boundaries before an ally', () => {
  for (const options of [
    { walls: [new T.Box3(new T.Vector3(-2, 0, 3), new T.Vector3(2, 4, 4))] },
    { hives: [{ x: 0, y: 0, z: 8 }] },
  ]) {
    const shooter = enemy('shooter', 0, 0),
      ally = enemy('ally', 0, 8),
      f = fixture([shooter, ally], options);
    fireThrough(f, shooter);
    assert.equal(ally.hp, 10);
    assert.equal(f.p.hp, 50);
  }
});

test('crossfire uses target armour and living boss parts instead of player-scale damage', () => {
  const shooter = enemy('shooter', 0, 0),
    guard = enemy('guard', 0, 6, { type: 'guard', aim: Math.PI });
  fireThrough(fixture([shooter, guard]), shooter);
  assert.equal(guard.hp, 9.6);
  const boss = enemy('keeper', 0, 8, { type: 'boss', radius: 2 });
  const part = { x: 3, y: 1.7, z: 8, hp: 6, radius: 1.45, enemy: boss };
  boss.parts = [part];
  const side = enemy('side', 3, 0),
    f = fixture([side, boss]);
  f.p.x = 3;
  fireThrough(f, side);
  assert.equal(part.hp, 5);
  assert.equal(boss.hp, 9);
});

test('hostile mortar blast excludes its owner and respects cover and sanctuary', () => {
  const owner = enemy('owner', 0, 0, { type: 'artillery' }),
    open = enemy('open', 0, 2),
    covered = enemy('covered', 3, 0),
    safe = enemy('safe', -3, 0);
  const f = fixture([owner, open, covered, safe], {
    walls: [new T.Box3(new T.Vector3(1, 0, -2), new T.Vector3(2, 4, 2))],
    hives: [{ x: -7, y: 0, z: 0 }],
  });
  f.impact(
    { point: new T.Vector3(0, 0.1, 0) },
    { hostile: true, mortar: true, owner: owner.id, origin: new T.Vector3(0, 1.5, -10) },
  );
  assert.equal(owner.hp, 10);
  assert.equal(open.hp, 7);
  assert.equal(covered.hp, 10);
  assert.equal(safe.hp, 10);
  assert.deepEqual(f.events, []);
});

test('hostile mortar splash preserves boss armour and exposed part rules', () => {
  const boss = enemy('keeper', 0, 0, { type: 'boss' }),
    part = { x: 3, y: 1.7, z: 0, hp: 6, radius: 1.45, enemy: boss };
  boss.parts = [part];
  const guardian = enemy('guardian', 0, 3, { guardian: true, aim: Math.PI });
  const f = fixture([boss, guardian]);
  f.impact(
    { point: new T.Vector3(3, 0.1, 0) },
    { hostile: true, mortar: true, owner: 'artillery', origin: new T.Vector3(0, 1.5, -10) },
  );
  assert.equal(boss.hp, 7);
  assert.equal(part.hp, 3);
  assert.equal(guardian.hp, 10);
});

test('lobbed shots leave their launcher and its parts before any friendly impact', () => {
  const owner = enemy('artillery', 0, 0, { type: 'artillery' });
  owner.parts = [{ x: 0, y: 1.7, z: 0, hp: 6, radius: 2, enemy: owner }];
  const f = fixture([owner]);
  f.shootEnemy(owner, 0, null, new T.Vector3(0, 0.05, 20));
  assert.equal(f.shots[0].owner, owner.id);
  f.step(0.05);
  assert.equal(f.shots.length, 1);
  assert.equal(owner.hp, 10);
  assert.equal(owner.parts[0].hp, 6);
});

test('destroying a battery cancels its unreleased second wave but not shells already in flight', () => {
  const boss = enemy('foundry', 0, 0, { type: 'boss' }),
    part = { x: 0, y: 1.5, z: 0, hp: 4 };
  boss.parts = [part];
  const f = fixture([boss]),
    target = new T.Vector3(0, 1.2, 20);
  f.shootEnemy(boss, 0, part, target, 0, false, { sourcePart: part, speed: 32 });
  f.shootEnemy(boss, 0, part, target, 0.32, false, { sourcePart: part, speed: 32 });
  part.hp = 0;
  f.step(0.016);
  assert.equal(f.shots.length, 1);
  assert.equal(f.shots[0].delay, 0);
  assert.ok(f.shots[0].distance > 0);
});

test('boss attack shapes carry distinct damage through direct and blast impacts', () => {
  for (const [attack, damage] of [
    ['fan', 5],
    ['batteries', 5],
    ['seekers', 10],
    ['barrage', 10],
  ]) {
    const boss = enemy('keeper', 0, 0, { type: 'boss', attack });
    const f = fixture([boss]);
    f.shootEnemy(
      boss,
      0,
      attack === 'seekers' ? new T.Vector3(boss.x, 1.2, boss.z) : null,
      new T.Vector3(f.p.x, attack === 'barrage' ? 0 : 1.2, f.p.z),
      0,
      attack === 'barrage',
      { homing: attack === 'seekers' },
    );
    const shot = f.shots[0];
    boss.attack = 'batteries'; // In-flight payloads do not change with the next pattern.
    assert.equal(shot.damage, damage, attack);
    if (attack === 'barrage') {
      f.impact({ point: new T.Vector3(f.p.x, 0, f.p.z) }, shot);
      assert.equal(f.p.hp, 50 - damage, 'nearby blast uses the same barrage payload');
      const direct = fixture([boss]);
      direct.shootEnemy(boss, 0, null, new T.Vector3(direct.p.x, 0, direct.p.z), 0, true);
      for (let i = 0; i < 180; i++) direct.step(1 / 60);
      assert.equal(direct.p.hp, 50 - damage, 'direct impact and blast cannot charge twice');
    } else {
      for (let i = 0; i < 180; i++) f.step(1 / 60);
      assert.equal(f.p.hp, 50 - damage, attack);
    }
  }
});

test('combat emits different player/enemy hit sounds and positioned enemy launches', () => {
  const shooter = enemy('test-sniper', 5, 0, { type: 'sniper' });
  const target = enemy('test-target', 5, 10);
  const f = fixture([shooter, target]);
  f.shootEnemy(shooter, 0, null, new T.Vector3(0, 1.2, 20));
  assert.equal(f.sounds[0][0], 'rail-shot');
  assert.equal(f.sounds[0][1].position, shooter);
  f.hurt(1);
  assert.equal(f.sounds.at(-1)[0], 'hurt');
  f.hitEnemy(target, 1, new T.Vector3(5, 1.2, 9), 'cannon');
  assert.equal(f.sounds.at(-1)[0], 'hit');
  assert.equal(f.sounds.at(-1)[1].position, target);
});

test('a blast on a rendered canopy cannot damage a Tank through its underside', () => {
  const target = enemy('sheltered', 0, 0);
  const f = fixture([target]);
  const roof = new T.Mesh(new T.BoxGeometry(10, 0.45, 10), new T.MeshBasicMaterial());
  roof.position.set(0, 4.625, 0);
  roof.updateMatrixWorld();
  const ray = new T.Raycaster();
  f.world.cast = (origin, direction, distance) => {
    ray.set(origin, direction);
    ray.far = distance;
    return ray.intersectObject(roof, false)[0] || null;
  };
  const hit = f.world.cast(new T.Vector3(0, 10, 0), new T.Vector3(0, -1, 0), 10);
  for (const hostile of [false, true]) {
    f.impact(hit, { mortar: true, hostile, damage: 3, origin: new T.Vector3(0, 2, -10) });
    assert.equal(target.hp, 10, `Blast crosses the canopy; hostile=${hostile}`);
  }
  roof.geometry.dispose();
  roof.material.dispose();
});

test('Boss lobs reach a Tank just behind arena cover without reaching the ceiling', () => {
  const boss = enemy('keeper', 0, 32, { type: 'boss' });
  const f = fixture([boss], {
    walls: [
      new T.Box3(new T.Vector3(12, 0, 42), new T.Vector3(16, 2, 45)),
      new T.Box3(new T.Vector3(-28, 24, 12), new T.Vector3(28, 25, 60)),
    ],
  });
  Object.assign(f.p, { x: 14, z: 46 });
  f.shootEnemy(boss, 0, null, new T.Vector3(14, 0.05, 46), 0, true, { duration: 1.35 });
  for (let i = 0; i < 180; i++) f.step(1 / 120);
  assert.ok(f.p.hp < 50, 'The cover must not intercept every aimed barrage');
  assert.equal(f.shots.length, 0);
});

test('player, artillery and Boss mortars fly beyond an empty target and only explode on contact', () => {
  for (const [kind, duration, arc] of [
    ['player', 1.15, 10],
    ['artillery', 1.9, 9],
    ['boss', 1.35, 10],
  ]) {
    const owner = enemy('launcher', 0, 0, { type: kind === 'player' ? 'artillery' : kind });
    const ground = new T.Box3(new T.Vector3(-100, -12, -100), new T.Vector3(100, -10, 100));
    const f = fixture([owner], { walls: [ground] });
    f.p.x = 100;
    f.shootEnemy(owner, 0, null, new T.Vector3(0, 5, 20), 0, true, { duration, arc });
    const shot = f.shots[0];
    // Model the aimed surface disappearing after launch.
    shot.target.set(0, 5, 20);
    shot.hostile = kind !== 'player';
    while (f.shots.length && shot.age < duration + 0.05) f.step(1 / 120);
    assert.equal(f.shots.length, 1, `${kind}: no timed airburst`);
    assert.ok(shot.position.z > 20 && shot.position.y < 5, `${kind}: keep falling forward`);
    assert.equal(f.sounds.filter(([name]) => name === 'explode').length, 0);
    while (f.shots.length && shot.age < 4.1) f.step(1 / 120);
    assert.equal(f.shots.length, 0);
    const explosions = f.sounds.filter(([name]) => name === 'explode');
    assert.equal(explosions.length, 1, kind);
    assert.ok(Math.abs(explosions[0][1].position.y + 10) < 1e-8, `${kind}: lower-floor impact`);
  }
});

test('a mortar lost into empty space expires silently instead of exploding', () => {
  const owner = enemy('launcher', 0, 0, { type: 'artillery' });
  const f = fixture([owner]);
  f.p.x = 100;
  f.shootEnemy(owner, 0, null, new T.Vector3(0, 0, 20));
  for (let i = 0; i < 500; i++) f.step(1 / 120);
  assert.equal(f.shots.length, 0);
  assert.equal(f.sounds.filter(([name]) => name === 'explode').length, 0);
});

test('all mortar owners explode immediately on walls and ceilings before the planned landing time', () => {
  for (const kind of ['player', 'artillery', 'boss']) {
    for (const surface of ['wall', 'ceiling']) {
      const owner = enemy('launcher', 0, 0, { type: kind === 'player' ? 'artillery' : kind });
      const box =
        surface === 'wall'
          ? new T.Box3(new T.Vector3(-5, -10, 6), new T.Vector3(5, 30, 7))
          : new T.Box3(new T.Vector3(-50, 6, -50), new T.Vector3(50, 7, 50));
      const f = fixture([owner], { walls: [box] });
      f.p.x = 100;
      f.shootEnemy(owner, 0, null, new T.Vector3(0, 0, 20), 0, true);
      const shot = f.shots[0];
      shot.hostile = kind !== 'player';
      if (kind === 'player') {
        shot.duration = 1.15;
        shot.arc = 10;
      }
      for (let i = 0; i < 480 && f.shots.length; i++) f.step(1 / 120);
      assert.equal(f.shots.length, 0);
      assert.ok(shot.age < shot.duration, `${kind}: ${surface} must interrupt flight`);
      const explosions = f.sounds.filter(([name]) => name === 'explode');
      assert.equal(explosions.length, 1);
      const point = explosions[0][1].position;
      assert.ok(Math.abs((surface === 'wall' ? point.z : point.y) - 6) < 1e-8);
    }
  }
});

test('accepted hits start directional stun and repeated hits do not extend it', () => {
  const f = fixture([]);
  f.hurt(5, { x: -5, z: 20 });
  assert.equal(f.p.hp, 45);
  assert.equal(f.p.hurtUntil, 1.6);
  assert.ok(f.p.knockX > 0);
  assert.equal(f.p.knockZ, 0);
  f.step(0.2);
  f.hurt(10, { x: 5, z: 20 });
  assert.equal(f.p.hp, 45);
  assert.equal(f.p.hurtUntil, 1.6);
  assert.ok(f.p.knockX > 0);
});

test('horizontal trays accept exposed top blasts but reject explosions underneath', () => {
  const tray = { id: 'tray', x: 0, y: 2, z: 0, radius: 0.95, surface: 'top' };
  for (const [height, expected] of [
    [1.95, []],
    [2, ['tray']],
    [2.5, ['tray']],
  ]) {
    const f = fixture([], { controls: [tray] });
    f.impact(
      { point: new T.Vector3(0, height, 0) },
      { mortar: true, hostile: false, origin: new T.Vector3(0, 2, -10) },
    );
    assert.deepEqual(f.events, expected);
  }
});

test('mirror impacts repeat, count a direct Mortar hit once and reject blasts through walls', () => {
  const mirror = { id: 'turntable', turnable: true, x: 0, y: 2, z: 0 };
  const point = new T.Vector3(0, 2, 0),
    origin = new T.Vector3(0, 2, 10);
  const f = fixture([]);
  f.world.mirrors.push(mirror);
  for (let i = 1; i <= 8; i++) {
    f.impact({ mirror, point }, { origin, mortar: i % 2 === 0 });
    assert.equal(f.state.mirrorTurns[mirror.id], i);
  }
  f.impact({ mirror, point }, { origin, hostile: true, mortar: true });
  assert.equal(f.state.mirrorTurns[mirror.id], 8);
  f.impact({ point: new T.Vector3(0, 0, 0) }, { origin, mortar: true });
  assert.equal(f.state.mirrorTurns[mirror.id], 9);
  const blocked = fixture([], {
    walls: [new T.Box3(new T.Vector3(-1, 0.8, -1), new T.Vector3(1, 1.2, 1))],
  });
  blocked.world.mirrors.push(mirror);
  blocked.impact({ point: new T.Vector3(0, 0, 0) }, { origin, mortar: true });
  assert.equal(blocked.state.mirrorTurns[mirror.id], undefined);
});

test('Mortar preserves full veteran damage while shortening only the flinch', () => {
  const ordinary = enemy('ordinary', 0, 0, { type: 'artillery' }),
    veteran = enemy('veteran', 4, 0, { type: 'artillery', variant: 'siege', hp: 20 });
  const f = fixture([ordinary, veteran]);
  f.hitEnemy(ordinary, 3, new T.Vector3(0, 1, 10), 'mortar');
  f.hitEnemy(veteran, 3, new T.Vector3(0, 1, 10), 'mortar');
  assert.equal(ordinary.hp, 7);
  assert.equal(veteran.hp, 17);
  assert.ok(Math.abs(ordinary.stunnedUntil - veteran.stunnedUntil - 0.4) < 1e-8);
});

test('veteran direct fire travels over twice as fast without raising hit damage', () => {
  for (const [type, variant, speed] of [
    ['guard', 'bastion', 36],
    ['reflector', 'prism', 34],
    ['skirmisher', 'flanker', 36],
  ]) {
    const distances = [];
    for (const version of [undefined, variant]) {
      const e = enemy('shooter', 0, 0, { type, variant: version });
      const f = fixture([e]);
      f.shootEnemy(e, 0, null, new T.Vector3(0, 1.5, 40));
      const shot = f.shots[0];
      assert.equal(shot.speed, version ? speed : 15);
      assert.equal(shot.damage, 5);
      f.step(0.1);
      distances.push(shot.position.z);
    }
    assert.ok(distances[1] > distances[0] * 2, variant);
  }
});

test('Siege shells shorten actual flight while preserving arc height and blast damage', () => {
  const progress = [];
  for (const variant of [undefined, 'siege']) {
    const e = enemy('launcher', 0, 0, { type: 'artillery', variant });
    const f = fixture([e]);
    f.shootEnemy(e, 0, null, new T.Vector3(0, 0, 40));
    const shot = f.shots[0];
    assert.equal(shot.duration, variant ? 1.1 : 1.9);
    assert.equal(shot.arc, 9);
    assert.equal(shot.blastDamage, 10);
    f.step(0.55);
    progress.push(shot.position.z);
  }
  assert.ok(progress[1] > progress[0] * 1.7);
});

test('direct impacts identify headless enemies and report death exactly once', () => {
  const [e] = createEnemyState({}, [{ id: 'target', type: 'turret', x: 0, y: 0, z: 0, hp: 2 }]);
  const f = fixture([e]);
  const hit = { target: e, point: new T.Vector3(0, 1.5, 0) };
  const shot = { origin: new T.Vector3(0, 1.5, 10), damage: 2 };
  f.impact(hit, shot);
  f.impact(hit, shot);
  assert.equal(e.hp, 0);
  assert.equal(e.deadAt, 1);
  assert.deepEqual(f.killed, [e.id]);
  assert.deepEqual(f.events, [], 'an enemy is never dispatched as a receiver');
});

test('boss part impacts preserve part ownership without graphical handles', () => {
  const state = initialFoldedState();
  const boss = state.enemies.find((e) => e.id === 'foundry');
  boss.phase = 'vent';
  const f = fixture([boss]);
  const part = boss.parts[0];
  const hit = { target: part, point: new T.Vector3(part.x, part.y, part.z) };
  const shot = { origin: new T.Vector3(part.x, part.y, part.z + 10), damage: 1 };
  f.impact(hit, shot);
  assert.equal(part.hp, part.max - 1);
  assert.equal(boss.hp, boss.max - 1);
  assert.equal(boss.parts[1].hp, boss.parts[1].max);
  assert.deepEqual(f.events, []);
});

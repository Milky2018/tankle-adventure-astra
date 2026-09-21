import test from 'node:test';
import assert from 'node:assert/strict';
import { createFoldedEnemies } from './folded-ai.js';
import { createEncounterPacing } from './folded-pacing.js';
import { createBossArenas } from './folded-boss-arenas.js';
import { initialFoldedState } from './folded-layout.js';
import { createCircuitSignals } from './folded-circuits.js';
import { expansionBattles } from './folded-expansion-layout.js';
import { newPlayer } from './mechanics.js';

// No model, material, geometry, canvas or renderer exists in these fixtures.
function enemy(type, values = {}) {
  const e = {
    id: type,
    type,
    x: 0,
    y: 0,
    z: 20,
    hp: 10,
    max: 10,
    phase: 'idle',
    timer: 0,
    aim: 0,
    radius: 1.35,
    parts: [],
    flash: 0,
    armor: 0,
    ramAt: -10,
    ...values,
  };
  e.spawn = { x: e.x, y: e.y, z: e.z };
  return e;
}
function fixture(enemies, player = {}) {
  const p = Object.assign(newPlayer(), { x: 0, y: 0, z: 33 }, player);
  const state = initialFoldedState();
  for (const battle of expansionBattles) state[battle.id] = true;
  const fired = [],
    events = [],
    hits = [],
    shots = [],
    mines = [];
  let time = 0,
    blocked = false;
  const world = {
    enemies,
    signals: createCircuitSignals(state, []),
    hives: [],
    lifts: [],
    cast: () => (blocked ? { distance: 4 } : null),
    signalRelease() {},
    sidePuzzles: { coverHeldUntil: 0 },
  };
  const view = { readable: () => true };
  for (const name of [
    'reset',
    'hide',
    'roll',
    'showBossWarning',
    'beam',
    'sorterZone',
    'suction',
    'sorterArm',
    'hideWarning',
    'retractArm',
    'clearWarnings',
    'deployment',
    'collapse',
    'idle',
    'warn',
    'line',
    'repair',
    'finish',
    'impact',
  ]) {
    view[name] = (e) => events.push({ name, id: e.id, phase: e.phase });
  }
  const ai = createFoldedEnemies({
    player: p,
    state,
    world,
    shots,
    mines,
    now: () => time,
    view,
    encounterPacing: createEncounterPacing(enemies),
    bossArenas: createBossArenas(enemies, state),
    combat: {
      hurt: (damage) => hits.push(damage),
      hitEnemy: (e, damage) => {
        e.hp = Math.max(0, e.hp - damage);
      },
      shootEnemy: (
        e,
        offset = 0,
        source,
        target = e.lock,
        delay = 0,
        barrage = false,
        options = {},
      ) => {
        fired.push({ id: e.id, offset, target: { ...target }, delay, barrage, ...options });
        events.push({ name: 'shot', id: e.id });
      },
    },
    audio: { event() {} },
    save() {},
  });
  function step(dt = 0.1) {
    time += dt;
    ai.updateEnemies(dt);
  }
  return {
    ai,
    p,
    state,
    world,
    fired,
    events,
    hits,
    shots,
    mines,
    step,
    block: (value) => {
      blocked = value;
    },
  };
}

test('sniper tracks during warning, locks before firing, then recovers', () => {
  const e = enemy('sniper'),
    f = fixture([e]);
  f.step();
  assert.equal(e.phase, 'warn');
  f.p.x = 2;
  f.step();
  assert.equal(e.lock.x, 2);
  while (e.timer > 0.8) f.step(0.05);
  const lock = e.lock.clone();
  f.p.x = -2;
  while (e.phase === 'warn') f.step(0.05);
  assert.equal(e.phase, 'rail');
  assert.equal(f.fired.length, 1);
  assert.deepEqual(f.fired[0].target, { ...lock });
  assert.equal(f.events.at(-2).name, 'shot');
  const shot = f.events.findIndex((event) => event.name === 'shot');
  assert.equal(f.events[shot - 1].name, 'warn');
  assert.equal(f.events[shot - 1].phase, 'warn');
  f.step(0.2);
  assert.equal(e.phase, 'vent');
});

test('skirmisher strafes while releasing three distinct burst directions', () => {
  const e = enemy('skirmisher'),
    f = fixture([e]);
  const start = { x: e.x, z: e.z };
  for (let i = 0; i < 15; i++) f.step();
  assert.deepEqual(
    f.fired.map((shot) => shot.offset),
    [-0.08, 0, 0.08],
  );
  assert.ok(Math.hypot(e.x - start.x, e.z - start.z) > 1);
  assert.equal(e.phase, 'vent');
});

test('artillery brackets a locked position even after sight is lost', () => {
  const e = enemy('artillery'),
    f = fixture([e]);
  f.step();
  const lock = e.lock.clone();
  f.block(true);
  f.p.x = 4;
  for (let i = 0; i < 16; i++) f.step();
  assert.equal(f.fired.length, 3);
  assert.deepEqual(
    f.fired.map((s) => s.delay),
    [0, 0.32, 0.64],
  );
  assert.deepEqual(f.fired[1].target, { ...lock });
  assert.equal(e.phase, 'vent');
});

test('repairer chooses a wounded squadmate and cover interrupts healing', () => {
  const healer = enemy('repairer', { encounter: 'squad' });
  const patient = enemy('turret', { id: 'patient', x: 4, hp: 3, encounter: 'squad', timer: 100 });
  const unrelated = enemy('turret', { id: 'other', x: -4, hp: 1, timer: 100 });
  const f = fixture([healer, patient, unrelated]);
  f.step();
  assert.equal(healer.patient, patient);
  while (healer.phase === 'warn') f.step();
  f.step();
  assert.ok(patient.hp > 3);
  assert.equal(unrelated.hp, 1);
  const before = patient.hp;
  f.block(true);
  f.step();
  assert.equal(patient.hp, before);
});

test('stun suppresses a committed attack and refuge stops squad pursuit', () => {
  const e = enemy('turret', { encounter: 'squad' }),
    f = fixture([e]);
  f.step();
  e.stunnedUntil = 2;
  f.step(0.5);
  assert.equal(e.phase, 'stunned');
  assert.equal(f.fired.length, 0);
  e.stunnedUntil = 0;
  f.world.hives.push({ x: f.p.x, y: f.p.y, z: f.p.z });
  f.step();
  assert.equal(e.phase, 'idle');
  assert.equal(e.alertUntil, 0);
  assert.equal(e.lastSeen, null);
});

test('Guardian cycles from fan volleys to paired seekers without a model', () => {
  const e = enemy('guard', { id: 'guardian', guardian: true, x: 202, y: 16, z: 75 });
  const f = fixture([e], { x: 202, y: 16, z: 60 });
  for (let i = 0; i < 130; i++) f.step();
  assert.equal(f.state.combatArena, 'guardian');
  assert.ok(f.fired.some((shot) => shot.speed === 36 && !shot.homing));
  assert.equal(f.fired.filter((shot) => shot.homing).length, 2);
  assert.ok(f.events.some((event) => event.name === 'showBossWarning'));
});

test('arena release cancels owned hazards and reset preserves persistent deaths', () => {
  const e = enemy('boss', { id: 'keeper', persistent: true, x: 0, y: -56, z: 28 });
  const reserve = enemy('miner', { id: 'reserve', reserveFor: 'keeper' });
  const f = fixture([e, reserve], { x: 0, y: -56, z: 45 });
  f.step();
  f.shots.push({ owner: 'keeper' }, { owner: 'reserve' }, { owner: 'unrelated' });
  f.mines.push({ owner: 'reserve' });
  e.hp = 0;
  f.state.keeper = true;
  f.step();
  assert.equal(f.state.combatArena, null);
  assert.deepEqual(
    f.shots.map((s) => !!s.captured),
    [true, true, false],
  );
  assert.equal(f.mines[0].disarmed, true);
  f.ai.resetEnemies();
  assert.equal(e.hp, 0);
  assert.equal(reserve.hp, 0);
  assert.equal(e.phase, 'idle');
});

test('a sheltered sniper repositions and attacks without leaving its authored post', () => {
  const e = enemy('sniper', { z: 26, patrol: { x: -2, z: 24, w: 4, d: 4 } });
  const f = fixture([e]);
  for (let i = 0; i < 240; i++) {
    f.step(0.05);
    assert.ok(e.x >= -2 && e.x <= 2 && e.z >= 24 && e.z <= 28);
  }
  assert.ok(e.z < 25.9);
  assert.ok(f.fired.length > 0);
});

test('physical contact is harmless unless a charging machine is attacking', () => {
  for (const [type, phase, expected] of [
    ['guard', 'idle', []],
    ['scout', 'warn', []],
    ['scout', 'charge', [5]],
    ['elite', 'charge', [5]],
  ]) {
    const e = enemy(type, { z: 30, phase, timer: 1, awake: true });
    const f = fixture([e], { z: 31, speed: 1 });
    f.step(0.01);
    assert.deepEqual(f.hits, expected, `${type}/${phase}`);
  }
});

test('welder closes during early warning but commits before its sweep', () => {
  const e = enemy('welder'),
    f = fixture([e], { z: 34 });
  f.step(0.05);
  assert.equal(e.phase, 'warn');
  f.p.x = 3;
  f.step(0.2);
  assert.ok(e.z > 21, 'Early warning must continue advancing');
  assert.ok(e.aim > 0, 'Early warning follows lateral movement');
  while (e.timer > 0.35) f.step(0.025);
  const locked = e.aim,
    x = e.x,
    z = e.z;
  f.p.x = -10;
  f.step(0.1);
  assert.equal(e.aim, locked);
  assert.equal(e.x, x);
  assert.equal(e.z, z);
});

test('welder advances through a committed sweep and threatens mid-range without tracking behind', () => {
  const e = enemy('welder', { phase: 'flame', timer: 1.8, aim: 0 }),
    f = fixture([e], { z: 37 });
  f.step(0.9);
  assert.ok(e.z > 23, 'Committed sweep must gain ground');
  assert.deepEqual(f.hits, [5]);
  const behind = enemy('welder', { phase: 'flame', timer: 1.8, aim: 0 }),
    g = fixture([behind], { z: 15 });
  g.step(0.9);
  assert.deepEqual(g.hits, []);
  assert.equal(behind.aim, 0);
});

test('welder sweep still stops at solid cover', () => {
  const e = enemy('welder', { phase: 'flame', timer: 1.8, aim: 0 }),
    f = fixture([e], { z: 37 });
  f.block(true);
  f.step(0.9);
  assert.deepEqual(f.hits, []);
});

test('completed finite courts keep both the first squad and reserves cleared after reconstruction', () => {
  const group = [
    enemy('artillery', { battle: 'cargo-battery', wave: 0 }),
    enemy('guard', { battle: 'cargo-battery', wave: 1 }),
  ];
  const patrol = enemy('scout');
  const f = fixture([...group, patrol]);
  f.state['cargo-battery'] = true;
  f.ai.resetEnemies();
  assert.ok(group.every((e) => e.hp === 0));
  assert.equal(patrol.hp, patrol.max);
});

test('Prototype alternates warned cannon fire with its committed charge', () => {
  const e = enemy('elite', {
    id: 'prototype',
    x: -32,
    y: -16,
    z: 130,
    hp: 9,
    max: 9,
    persistent: true,
  });
  const f = fixture([e], { x: -40, y: -16, z: 122 });
  for (let i = 0; i < 240; i++) f.step(0.05);
  assert.ok(
    f.events.some((event) => event.phase === 'charge'),
    'Prototype must keep its charge',
  );
  assert.ok(f.fired.length >= 3, `Expected a cannon volley, got ${f.fired.length} shots`);
  assert.ok(
    f.events.some((event) => event.name === 'warn'),
    'Firing must be telegraphed',
  );
});

test('hunters commit a spaced pair of water torpedoes and expose stationary recovery', () => {
  const e = enemy('hunter', { x: -114, y: -8, z: 44, hp: 3, max: 3 });
  const f = fixture([e], { x: -114, y: -8, z: 36, deployed: true, afloat: true });
  f.step(0.01);
  assert.equal(e.phase, 'warn');
  const lock = { ...e.lock };
  f.p.x -= 4;
  f.step(1.31);
  assert.equal(e.phase, 'vent');
  assert.equal(f.fired.length, 2);
  assert.deepEqual(
    f.fired.map((s) => [s.delay, s.torpedo, s.speed]),
    [
      [0, true, 12],
      [0.65, true, 12],
    ],
  );
  assert.equal(f.fired[0].target.x, lock.x);
  const at = [e.x, e.z];
  f.step(0.5);
  assert.deepEqual([e.x, e.z], at);
});

test('swimmers cross water and real shore ramps, while land units and water-only dredgers cannot', () => {
  const hunter = enemy('hunter', { x: 6, y: -16, z: -36 });
  const dry = enemy('guard', { x: 6, y: -16, z: -36 });
  const f = fixture([hunter], { x: 6, y: -16, z: -20 });
  f.ai.moveEnemy(hunter, 0, 6, 0.5);
  assert.ok(hunter.z > -34);
  const land = fixture([dry]);
  land.ai.moveEnemy(dry, 0, 6, 0.5);
  assert.equal(dry.z, -36);
  hunter.x = 14;
  hunter.z = -37;
  hunter.y = -16;
  hunter.travelHeading = Math.PI;
  for (let i = 0; i < 240; i++) f.ai.moveEnemy(hunter, Math.PI, 6, 1 / 60);
  assert.ok(hunter.y > -9 && hunter.z < -61, JSON.stringify(hunter));
  const dredger = enemy('dredger', { x: 438, y: -24, z: 50 });
  const pump = fixture([dredger]);
  for (let i = 0; i < 120; i++) pump.ai.moveEnemy(dredger, Math.PI, 2.4, 1 / 60);
  assert.ok(dredger.z > 48);
});

test('dredger pull has no damage, locks its bearing, respects walls and has a separate one-hit bite', () => {
  const e = enemy('dredger', { x: -134, y: -8, z: 88, hp: 5, max: 5, radius: 2 });
  const f = fixture([e], { x: -134, y: -8, z: 95, deployed: true, afloat: true });
  f.step(0.01);
  assert.equal(e.phase, 'warn');
  f.step(1.21);
  assert.equal(e.phase, 'suction');
  const locked = e.aim,
    before = f.p.z;
  f.step(0.2);
  assert.ok(f.p.z < before);
  assert.deepEqual(f.hits, []);
  assert.equal(e.aim, locked);
  f.block(true);
  const covered = f.p.z;
  f.step(0.2);
  assert.equal(f.p.z, covered);
  f.block(false);
  f.p.x = e.x;
  f.p.z = e.z + 3;
  e.phase = 'bite';
  e.timer = 0.01;
  f.step(0.02);
  assert.deepEqual(f.hits, [5]);
  assert.equal(e.phase, 'vent');
  f.step(0.1);
  assert.deepEqual(f.hits, [5]);
});

test('water enemies share the permanent crosscurrent and stagger their attack warnings', () => {
  const hunter = enemy('hunter', { id: 'h', x: -116, y: -8, z: 64, timer: 9, encounter: 'water' });
  const pump = enemy('dredger', { id: 'd', x: -127, y: -8, z: 64, timer: 9, encounter: 'water' });
  const f = fixture([hunter, pump], { x: -120, y: -8, z: 70, deployed: true, afloat: true });
  hunter.timer = pump.timer = 100;
  f.step(0.1);
  const forward = hunter.x;
  assert.ok(forward > -116);
  hunter.phase = 'vent';
  hunter.timer = 100;
  f.step(0.1);
  assert.ok(hunter.x > forward);
  hunter.phase = pump.phase = 'idle';
  hunter.timer = pump.timer = 0;
  f.step(0.01);
  assert.equal([hunter, pump].filter((e) => e.phase === 'warn').length, 1);
});

test('an elevated artillery observer acquires below the breastwork without moving its emplacement', () => {
  const e = enemy('artillery', { x: -41, y: 0, z: -58, emplacement: true, spotterHeight: 9 });
  const f = fixture([e], { x: -22, y: -8, z: -69 });
  const observations = [];
  f.world.cast = (origin) => {
    observations.push(origin.y);
    return origin.y < 8 ? { distance: 3 } : null;
  };
  for (let i = 0; i < 70; i++) f.step(0.1);
  assert.ok(f.fired.length > 0);
  assert.ok(observations.includes(9));
  assert.deepEqual([e.x, e.y, e.z], [-41, 0, -58]);
  f.world.cast = () => ({ distance: 3 });
  e.alertUntil = 0;
  e.lastSeen = null;
  e.phase = 'idle';
  e.timer = 0;
  const shots = f.fired.length;
  for (let i = 0; i < 40; i++) f.step(0.1);
  assert.equal(f.fired.length, shots, 'A covered observer must not acquire unseen new positions');
});

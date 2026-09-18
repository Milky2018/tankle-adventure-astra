import test from 'node:test';
import assert from 'node:assert/strict';
import { createFoldedEnemies } from './folded-ai.js';
import { createEncounterPacing } from './folded-pacing.js';
import { createBossArenas } from './folded-boss-arenas.js';
import { initialFoldedState } from './folded-layout.js';
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

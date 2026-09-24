import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  MAX_HP,
  BASE_SPEED,
  OVERDRIVE_MAX_SPEED,
  PHOENIX_MAX_SPEED,
  PLAYER_HURT_RADIUS,
  ENEMY_HURT_SCALE,
} from '../player/mechanics.js';
import { MORTAR, FLOTATION } from '../player/abilities.js';
import { ENEMY_KINDS } from '../rendering/enemy-models.js';
import { foldedEnemies } from '../world/terrain.js';
import { bossPattern } from './bosses.js';
import { CANNON, LASER, hostileShotDamage, hostileContactDamage } from './weapons.js';

// Captured by importing the archived 0.1.0 sources, not the refactored modules.
// Update only with an intentional, reviewed gameplay change.
const baseline = JSON.parse(
  readFileSync(new URL('../../tests/fixtures/balance-0.1.0.json', import.meta.url), 'utf8'),
);

test('balance preserves the baseline apart from explicitly authored gameplay changes', () => {
  assert.deepEqual(
    {
      MAX_HP,
      BASE_SPEED,
      OVERDRIVE_MAX_SPEED,
      PHOENIX_MAX_SPEED,
      PLAYER_HURT_RADIUS,
      ENEMY_HURT_SCALE,
    },
    {
      ...baseline.player,
      MAX_HP: 25,
      BASE_SPEED: 10,
    },
  );
  assert.deepEqual(MORTAR, { ...baseline.mortar, height: 10, damage: 2 });
  assert.deepEqual(FLOTATION, baseline.flotation);
  assert.deepEqual(ENEMY_KINDS, {
    ...baseline.enemies,
    hunter: { role: 'ranged', speed: 6, reach: 24, warn: 1.3, recovery: 2, attack: 'torpedoes' },
    dredger: {
      role: 'pressure',
      speed: 2.4,
      reach: 11,
      warn: 1.2,
      recovery: 2.4,
      attack: 'suction',
    },
    welder: { ...baseline.enemies.welder, speed: 6.8, reach: 18, warn: 0.9, recovery: 0.9 },
  });
  assert.deepEqual(
    Object.fromEntries(
      foldedEnemies.filter((e) => e.id in baseline.health).map((e) => [e.id, e.hp]),
    ),
    // These old placements were retired for the Cargo acquisition and Overseer arena.
    Object.fromEntries(
      Object.entries({
        ...baseline.health,
        keeper: 63,
        guardian: 36,
        'lens-gallery-skirmisher-2': 15,
        'coolant-separator-artillery-1': 20,
        'hearth-intake-guard-1': 27,
      }).filter(
        ([id]) =>
          !['loading-gunner', 'loading-scout', 'upper-gunner', 'upper-scout'].includes(id) &&
          !id.startsWith('proving-endurance-') &&
          !/^proving-return-(scout-6|guard-7)$/.test(id),
      ),
    ),
  );
  const bosses = foldedEnemies
    .filter((e) => e.persistent)
    .map((e) => ({ ...e, max: e.hp, attackCycle: 1, parts: [] }));
  assert.deepEqual(
    Object.fromEntries(bosses.map((e) => [e.id, bossPattern(e)])),
    baseline.bossPatterns,
  );
});

test('weapon values match the current damage balance and retain heat and range contracts', () => {
  assert.deepEqual(CANNON, { damage: 1, heat: 20, cooldown: 0.5, speed: 38, range: 24 });
  assert.deepEqual(LASER, { damage: 3, heat: 24, range: 90, bounces: 5 });
  for (const [enemy, damage] of [
    [{ id: 'keeper', type: 'boss' }, 5],
    [{ type: 'boss' }, 5],
    [{ type: 'guard', guardian: true }, 5],
    [{ type: 'sniper' }, 10],
    [{ type: 'skirmisher' }, 5],
    [{ type: 'turret' }, 5],
  ]) {
    assert.equal(hostileShotDamage(enemy), damage);
  }
});

test('Keeper endurance retains destructible feeds and an uncapped core', () => {
  const keeper = foldedEnemies.find((e) => e.id === 'keeper');
  assert.deepEqual(keeper.parts, [6.75, 6.75]);
  assert.equal(keeper.core, 49.5);
  assert.equal(keeper.hp, keeper.core + keeper.parts.reduce((a, b) => a + b, 0));
});

test('only committed charging enemies deal contact damage', () => {
  for (const type of Object.keys(ENEMY_KINDS))
    for (const phase of ['idle', 'warn', 'vent', 'charge']) {
      assert.equal(
        hostileContactDamage({ type, phase }),
        phase === 'charge' && ['scout', 'elite'].includes(type) ? 5 : 0,
        `${type}/${phase}`,
      );
    }
  assert.equal(hostileShotDamage({ type: 'artillery' }), 10);
});

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
} from './mechanics.js';
import { MORTAR, FLOTATION } from './abilities.js';
import { ENEMY_KINDS } from './folded-enemies.js';
import { foldedEnemies } from './folded-layout.js';
import { bossPattern } from './folded-bosses.js';
import { CANNON, LASER, hostileShotDamage, hostileContactDamage } from './folded-weapons.js';

// Captured by importing the archived 0.1.0 sources, not the refactored modules.
// Update only with an intentional, reviewed gameplay change.
const baseline = JSON.parse(
  readFileSync(new URL('../test-fixtures/balance-0.1.0.json', import.meta.url), 'utf8'),
);

test('balance preserves the baseline apart from explicitly authored travel, hull and Keeper changes', () => {
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
      BASE_SPEED: Number((baseline.player.BASE_SPEED * 1.4).toFixed(1)),
    },
  );
  assert.deepEqual(MORTAR, { ...baseline.mortar, height: 10 });
  assert.deepEqual(FLOTATION, baseline.flotation);
  assert.deepEqual(ENEMY_KINDS, {
    ...baseline.enemies,
    welder: { ...baseline.enemies.welder, speed: 6.8, reach: 18, warn: 0.9, recovery: 0.9 },
  });
  assert.deepEqual(
    Object.fromEntries(
      foldedEnemies.filter((e) => e.id in baseline.health).map((e) => [e.id, e.hp]),
    ),
    { ...baseline.health, keeper: 84 },
  );
  const bosses = foldedEnemies
    .filter((e) => e.persistent)
    .map((e) => ({ ...e, max: e.hp, attackCycle: 1, parts: [] }));
  assert.deepEqual(
    Object.fromEntries(bosses.map((e) => [e.id, bossPattern(e)])),
    baseline.bossPatterns,
  );
});

test('extracted weapon values retain the 0.1.0 direct-fire and laser contracts', () => {
  assert.deepEqual(CANNON, { damage: 1, heat: 20, cooldown: 0.5, speed: 38, range: 24 });
  assert.deepEqual(LASER, { damage: 4.5, heat: 24, range: 90, bounces: 5 });
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
  assert.deepEqual(keeper.parts, [9, 9]);
  assert.equal(keeper.core, 66);
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

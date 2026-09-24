import test from 'node:test';
import assert from 'node:assert/strict';
import { foldedEnemies, foldedBattles } from './folded-content.js';
import { initialFoldedState, serializeFoldedState } from './folded-state.js';
import { createEnemyState } from './folded-enemy-state.js';

// Runtime records can be inspected or cloned before any scene exists.
test('sessions own enemy health, nested data and boss parts independently of content', () => {
  const first = initialFoldedState();
  const second = initialFoldedState();
  assert.equal(first.enemies.length, foldedEnemies.length);
  for (const [i, enemy] of first.enemies.entries()) {
    const definition = foldedEnemies[i];
    assert.equal(enemy.kind, 'enemy');
    assert.equal(enemy.max, definition.hp);
    assert.deepEqual(enemy.spawn, { x: definition.x, y: definition.y, z: definition.z });
    assert.equal(enemy.parts.length, definition.parts?.length || 0);
    for (const [j, part] of enemy.parts.entries()) {
      assert.equal(part.enemy, enemy);
      assert.equal(part.kind, 'enemy-part');
      assert.equal(part.hp, definition.parts[j]);
      assert.equal(part.x, definition.x + (j ? 4 : -4));
      assert.equal(part.y, definition.y + 1.7);
      assert.notEqual(part, second.enemies[i].parts[j]);
      part.hp = 0;
      assert.equal(second.enemies[i].parts[j].hp, definition.parts[j]);
    }
    enemy.hp = 0;
    enemy.spawn.x += 100;
    assert.equal(second.enemies[i].spawn.x, definition.x);
  }
  const definitions = [{ id: 'patrol', type: 'scout', hp: 2, x: 0, y: 0, z: 0, route: [[1, 2]] }];
  const [patrol] = createEnemyState({}, definitions);
  patrol.route[0][0] = 20;
  assert.equal(definitions[0].route[0][0], 1);
});

test('durable victories, pending encounter completion and reserves restore without a scene', () => {
  const battle = foldedBattles.find((b) => foldedEnemies.some((e) => e.battle === b.battle));
  for (const progress of [
    { [battle.id]: true, prototype: true },
    { pendingSignals: { [battle.id]: { changes: { [battle.id]: true } } }, prototype: true },
  ]) {
    const enemies = createEnemyState(progress);
    for (const e of enemies) {
      const dormant =
        e.reserveFor || (e.persistent && progress[e.id]) || e.battle === battle.battle;
      assert.equal(e.hp, dormant ? 0 : e.max, e.id);
    }
  }
});

test('enemy runtime is transient and cannot leak through campaign serialization', () => {
  const state = initialFoldedState();
  const before = serializeFoldedState(state);
  const boss = state.enemies.find((e) => e.parts.length);
  boss.hp = 1;
  boss.parts[0].hp = 0;
  boss.phase = 'warn';
  boss.x += 30;
  assert.deepEqual(serializeFoldedState(state), before);
  assert.equal(Object.hasOwn(JSON.parse(JSON.stringify(state)), 'enemies'), false);
  const restored = initialFoldedState(serializeFoldedState(state));
  const fresh = restored.enemies.find((e) => e.id === boss.id);
  assert.equal(fresh.hp, fresh.max);
  assert.equal(fresh.parts[0].hp, fresh.parts[0].max);
  assert.equal(fresh.phase, 'idle');
  assert.equal(fresh.x, fresh.spawn.x);
});

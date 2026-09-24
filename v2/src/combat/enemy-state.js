import { foldedEnemies, foldedBattles } from '../content/compile.js';

// Definitions describe spawns. Each session owns health, phases and boss parts;
// constructing a scene cannot initialize or reset combat.
export function createEnemyState(progress, definitions = foldedEnemies) {
  return definitions.map((definition) => {
    const e = structuredClone(definition);
    const enemy = {
      ...e,
      kind: 'enemy',
      spawn: { x: e.x, y: e.y, z: e.z },
      hp:
        e.reserveFor ||
        (e.persistent && progress[e.id]) ||
        foldedBattles.some(
          (b) =>
            b.battle === e.battle &&
            (progress[b.id] || progress.pendingSignals?.[b.id]?.changes[b.id]),
        )
          ? 0
          : e.hp,
      max: e.hp,
      phase: 'idle',
      timer: e.startup ?? 1,
      aim: Math.PI / 2,
      flash: 0,
      armor: 0,
      ramAt: -10,
      shieldPull: 0,
      shieldRemoved: false,
      radius:
        e.type === 'boss'
          ? 3.2
          : e.guardian
            ? 2.4
            : e.type === 'dredger'
              ? 2
              : e.type === 'guard'
                ? 1.75
                : 1.35,
    };
    enemy.parts = (e.parts || []).map((hp, i) => ({
      kind: 'enemy-part',
      x: e.x + (i ? 4 : -4),
      y: e.y + 1.7,
      z: e.z,
      hp,
      max: hp,
      radius: 1.45,
      enemy,
    }));
    return enemy;
  });
}

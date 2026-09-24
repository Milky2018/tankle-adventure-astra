// Player weapon balance.
export const CANNON = { damage: 1, heat: 20, cooldown: 0.5, speed: 38, range: 24 };
export const LASER = { damage: 3, heat: 24, range: 90, bounces: 5 };

export const HOSTILE_DAMAGE = {
  keeper: 5,
  boss: 5,
  sniper: 10,
  skirmisher: 5,
  ordinary: 5,
  barrage: 10,
  mine: 5,
  flame: 5,
  charge: 5,
  friendlyShot: 1,
  friendlyBlast: 3,
};

export const BOSS_ATTACK_DAMAGE = { fan: 5, batteries: 5, seekers: 10, barrage: 10, sweep: 10 };

function bossProjectile(enemy) {
  return enemy.type === 'boss' || enemy.guardian || enemy.id === 'sorter';
}

export function hostileBlastDamage(enemy) {
  return bossProjectile(enemy) ? BOSS_ATTACK_DAMAGE.barrage : HOSTILE_DAMAGE.barrage;
}

export function hostileShotDamage(enemy, attack) {
  if (bossProjectile(enemy) && BOSS_ATTACK_DAMAGE[attack] != null)
    return BOSS_ATTACK_DAMAGE[attack];
  if (enemy.id === 'keeper') return HOSTILE_DAMAGE.keeper;
  if (enemy.guardian || enemy.type === 'boss') return HOSTILE_DAMAGE.boss;
  if (enemy.type === 'artillery') return HOSTILE_DAMAGE.barrage;
  if (enemy.type === 'sniper') return HOSTILE_DAMAGE.sniper;
  if (enemy.type === 'skirmisher') return HOSTILE_DAMAGE.skirmisher;
  return HOSTILE_DAMAGE.ordinary;
}

export function hostileContactDamage(enemy) {
  return enemy.phase === 'charge' &&
    (enemy.type === 'scout' || enemy.type === 'elite' || enemy.id === 'prototype')
    ? HOSTILE_DAMAGE.charge
    : 0;
}

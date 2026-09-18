// Player weapon values remain at the 0.1.0 baseline.
export const CANNON = { damage: 1, heat: 20, cooldown: 0.5, speed: 38, range: 24 };
export const LASER = { damage: 4.5, heat: 24, range: 90, bounces: 5 };

export const HOSTILE_DAMAGE = {
  keeper: 9,
  boss: 15,
  sniper: 14,
  skirmisher: 5,
  ordinary: 8,
  barrage: 10,
  friendlyShot: 1,
  friendlyBlast: 3,
};

export const BOSS_ATTACK_DAMAGE = { fan: 9, batteries: 12, seekers: 16, barrage: 18 };

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
  if (enemy.type === 'sniper') return HOSTILE_DAMAGE.sniper;
  if (enemy.type === 'skirmisher') return HOSTILE_DAMAGE.skirmisher;
  return HOSTILE_DAMAGE.ordinary;
}

// Distinct machines require distinct decisions, not just different health pools.
export const ENEMY_KINDS = {
  scout: { role: 'pressure', speed: 5.6, reach: 11, warn: 1.1, recovery: 1.5, attack: 'charge' },
  turret: { role: 'ranged', speed: 0, reach: 27, warn: 1.2, recovery: 1.5, attack: 'shot' },
  guard: {
    role: 'pressure',
    speed: 3.8,
    reach: 12,
    warn: 1.5,
    recovery: 1.6,
    attack: 'shield-shot',
  },
  skirmisher: {
    role: 'pressure',
    speed: 6.2,
    reach: 18,
    warn: 0.8,
    recovery: 1.4,
    attack: 'burst',
  },
  sniper: { role: 'ranged', speed: 2.8, reach: 86, warn: 2.2, recovery: 2.2, attack: 'rail' },
  artillery: { role: 'ranged', speed: 2.5, reach: 55, warn: 1.4, recovery: 2.8, attack: 'lob' },
  miner: { role: 'pressure', speed: 4.6, reach: 13, warn: 0.8, recovery: 2.1, attack: 'mine' },
  welder: { role: 'pressure', speed: 6.8, reach: 18, warn: 0.9, recovery: 0.9, attack: 'sweep' },
  repairer: { role: 'support', speed: 4.5, reach: 10, warn: 1, recovery: 2, attack: 'repair' },
  reflector: { role: 'ranged', speed: 3.2, reach: 16, warn: 1.6, recovery: 1.9, attack: 'reflect' },
  elite: { role: 'pressure', speed: 4.2, reach: 20, warn: 1.5, recovery: 1.6, attack: 'charge' },
  boss: { role: 'ranged', speed: 0, reach: 27, warn: 1.4, recovery: 2.4, attack: 'shot' },
};

export function woundedAlly(enemy, enemies) {
  return enemies
    .filter(
      (e) =>
        e !== enemy &&
        e.hp > 0 &&
        e.hp < e.max &&
        e.encounter === enemy.encounter &&
        Math.abs(e.y - enemy.y) < 2 &&
        Math.hypot(e.x - enemy.x, e.z - enemy.z) < 18,
    )
    .sort((a, b) => a.hp / a.max - b.hp / b.max)[0];
}

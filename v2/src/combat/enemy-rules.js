// Distinct machines require distinct decisions, not just different health pools.
export const ENEMY_KINDS = {
  hunter: { role: 'ranged', speed: 6, reach: 24, warn: 1.3, recovery: 2, attack: 'torpedoes' },
  dredger: { role: 'pressure', speed: 2.4, reach: 11, warn: 1.2, recovery: 2.4, attack: 'suction' },
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

// Veteran health multiplies the local ordinary unit, not the opening-area baseline.
export const ENEMY_VARIANTS = {
  interceptor: {
    name: 'Interceptor',
    base: 'scout',
    health: 3,
    speed: 11.2,
    chargeSpeed: 26,
    warn: 0.75,
    recovery: 0.75,
    color: 0xb85443,
  },
  bastion: {
    name: 'Bastion',
    base: 'guard',
    health: 3,
    speed: 7.6,
    reach: 24,
    warn: 0.85,
    recovery: 0.75,
    projectileSpeed: 36,
    color: 0xc4aa71,
  },
  siege: {
    name: 'Siege Carrier',
    base: 'artillery',
    health: 2.5,
    speed: 5,
    warn: 0.95,
    recovery: 1.4,
    lobDuration: 1.1,
    color: 0x986b4c,
  },
  prism: {
    name: 'Prism Sentinel',
    base: 'reflector',
    health: 2.5,
    speed: 6.4,
    reach: 32,
    warn: 0.9,
    recovery: 0.85,
    projectileSpeed: 34,
    color: 0xc7b5d2,
  },
  flanker: {
    name: 'Flanker',
    base: 'skirmisher',
    health: 3,
    speed: 12.4,
    reach: 36,
    warn: 0.55,
    recovery: 0.7,
    projectileSpeed: 36,
    color: 0x9f504c,
  },
};
export const enemySpec = (e) => ({ ...ENEMY_KINDS[e.type], ...(ENEMY_VARIANTS[e.variant] || {}) });

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

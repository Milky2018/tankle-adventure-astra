export const MAX_HP = 50;
export const BASE_SPEED = 7;
export const OVERDRIVE_MAX_SPEED = 1.6;
export const PLAYER_HURT_RADIUS = 0.8;
export const ENEMY_HURT_SCALE = 1.15;
// Telegraphs and movement share the same physical charge envelope.
export const CHARGE = {
  scout: { radius: 1.5, speed: 13, duration: 0.75 },
  elite: { radius: 1.9, speed: 19, duration: 1.2 }
};
export const DEFAULT_BINDINGS = { up: 'KeyW', left: 'KeyA', down: 'KeyS', right: 'KeyD', fire: 'Mouse0', magnet: 'Mouse2', weapon: 'KeyQ', overdrive: 'ShiftLeft', map: 'Tab', repair: 'KeyE', skip: 'Space', pause: 'Escape' };
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const approach = (a, b, amount) => a < b ? Math.min(a + amount, b) : Math.max(a - amount, b);
export const angleDelta = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
export function newPlayer() {
  return { x: 0, z: 6, hp: MAX_HP, heat: 0, overheated: false, speed: 1, lastHeat: -10, lastShot: -10, invincible: 0, heading: Math.PI, aim: Math.PI, overdrive: false, magnet: false, mortar: false, weapon: 'cannon' };
}
export function shootHeat(p, time, cost = 20, cooldown = 0.5) {
  if (p.overheated || p.hp <= 0 || time - p.lastShot < Math.max(cooldown, p.shotCooldown || 0.5)) return false;
  p.lastShot = p.lastHeat = time;
  p.shotCooldown = cooldown;
  p.heat = Math.min(100, p.heat + cost);
  if (p.heat >= 100) p.overheated = true;
  return true;
}
export function updateHeat(p, dt, time, boost, moving) {
  const active = boost && moving && p.overdrive && !p.overheated;
  const speedRange = OVERDRIVE_MAX_SPEED - 1;
  p.speed = approach(p.speed, active ? OVERDRIVE_MAX_SPEED : 1, dt * speedRange / (active ? 0.5 : 0.35));
  if (p.speed > 1.00001) {
    // The shared engine budget continues during deceleration, including an overheat coast.
    p.heat = Math.min(100, p.heat + 15 * dt);
    p.lastHeat = time;
  } else if (time - p.lastHeat >= 0.75) {
    p.heat = Math.max(0, p.heat - 25 * dt);
    if (p.heat === 0) p.overheated = false;
  }
  if (p.heat >= 100) p.overheated = true;
}
export function screenMovement(horizontal, vertical) {
  const len = Math.hypot(horizontal, vertical);
  if (!len) return { x: 0, z: 0 };
  return { x: (horizontal + vertical) / (Math.SQRT2 * len), z: (vertical - horizontal) / (Math.SQRT2 * len) };
}
export function damagePlayer(p, amount, time, hazard = false) {
  if (p.hp <= 0 || (!hazard && time < p.invincible)) return false;
  p.hp = Math.max(0, p.hp - amount);
  if (!hazard) p.invincible = time + 0.6;
  return true;
}
export function inside(x, z, r, margin = 0) {
  return x >= r.x - margin && x <= r.x + r.w + margin && z >= r.z - margin && z <= r.z + r.d + margin;
}
export function segmentCircle(ax, az, bx, bz, cx, cz, radius) {
  const dx = bx - ax, dz = bz - az;
  const t = clamp(((cx - ax) * dx + (cz - az) * dz) / (dx * dx + dz * dz || 1), 0, 1);
  return Math.hypot(ax + t * dx - cx, az + t * dz - cz) <= radius;
}

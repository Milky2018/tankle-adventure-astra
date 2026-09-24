// Strafe ahead of the committed sweep from its warning, then hold outside its arc.
// The fixture uses ordinary movement and fire, never immunity or extra HP.
export function keeperDodge(player, boss) {
  if (boss.attack !== 'sweep' || !['warn', 'sweep'].includes(boss.phase)) return null;
  const x = player.x - boss.x, z = player.z - boss.z;
  const angle = Math.atan2(x, z) - boss.aim;
  const delta = Math.atan2(Math.sin(angle), Math.cos(angle));
  if (boss.sweepSign * delta > 1.15) return ['Mouse0'];
  const dx = boss.sweepSign * z, dz = -boss.sweepSign * x;
  const keys = Math.abs(dx) > Math.abs(dz)
    ? dx > 0 ? ['KeyS', 'KeyD'] : ['KeyW', 'KeyA']
    : dz > 0 ? ['KeyS', 'KeyA'] : ['KeyW', 'KeyD'];
  keys.push('Mouse0');
  return keys;
}

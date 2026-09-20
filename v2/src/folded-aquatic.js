// Water combat keeps steering available; suction is weaker than normal water cruise.
export const AQUATIC = {
  torpedoHeight: 0.6,
  suctionReach: 11,
  suctionHalfAngle: 0.65,
  pullSpeed: 2.4,
  biteReach: 3.5,
};
export const swims = (enemy) => enemy.type === 'hunter' || enemy.type === 'dredger';

export function inSuction(enemy, body, reach = AQUATIC.suctionReach) {
  const dx = body.x - enemy.x,
    dz = body.z - enemy.z,
    distance = Math.hypot(dx, dz);
  return (
    Math.abs(body.y - enemy.y) < 0.6 &&
    distance > 0.01 &&
    distance < reach &&
    (dx * Math.sin(enemy.aim) + dz * Math.cos(enemy.aim)) / distance >
      Math.cos(AQUATIC.suctionHalfAngle)
  );
}

export function torpedoTargets(shots) {
  return shots
    .filter((s) => s.torpedo && !s.captured && !(s.delay > 0))
    .map((s) => ({
      kind: 'torpedo',
      shot: s,
      ...s.position,
      radius: 0.85,
    }));
}

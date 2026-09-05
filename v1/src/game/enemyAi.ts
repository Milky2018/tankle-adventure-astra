import type { EnemyKind } from './types';

const ALERT_RADIUS: Record<EnemyKind, number> = {
  scout: 9.5,
  turret: 9.5,
  guard: 11,
  elite: 10,
  boss: 18,
};

export function shouldTrackPlayer(
  kind: EnemyKind,
  playerDistanceFromSpawn: number,
  encounterUnlocked = true,
): boolean {
  return encounterUnlocked && playerDistanceFromSpawn < ALERT_RADIUS[kind];
}

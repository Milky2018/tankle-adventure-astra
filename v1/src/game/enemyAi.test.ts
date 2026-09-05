import { describe, expect, it } from 'vitest';
import { shouldTrackPlayer } from './enemyAi';

describe('enemy awareness', () => {
  it('does not track the player outside the enemy alert radius', () => {
    expect(shouldTrackPlayer('scout', 10)).toBe(false);
    expect(shouldTrackPlayer('turret', 10)).toBe(false);
    expect(shouldTrackPlayer('guard', 12)).toBe(false);
  });

  it('tracks the player inside the enemy alert radius', () => {
    expect(shouldTrackPlayer('scout', 9)).toBe(true);
    expect(shouldTrackPlayer('turret', 9)).toBe(true);
    expect(shouldTrackPlayer('guard', 10)).toBe(true);
  });

  it('keeps the elite dormant until its encounter is unlocked', () => {
    expect(shouldTrackPlayer('elite', 5, false)).toBe(false);
    expect(shouldTrackPlayer('elite', 5, true)).toBe(true);
  });
});

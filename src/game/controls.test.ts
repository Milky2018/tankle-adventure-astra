import { describe, expect, it } from 'vitest';
import { aimHeading, movementDirection } from './controls';

describe('isometric movement', () => {
  it('maps WASD to fixed screen directions', () => {
    expect(movementDirection(0, 1)).toEqual({ x: -Math.SQRT1_2, z: -Math.SQRT1_2 });
    expect(movementDirection(1, 0)).toEqual({ x: Math.SQRT1_2, z: -Math.SQRT1_2 });
    expect(movementDirection(0, -1)).toEqual({ x: Math.SQRT1_2, z: Math.SQRT1_2 });
    expect(movementDirection(-1, 0)).toEqual({ x: -Math.SQRT1_2, z: Math.SQRT1_2 });
  });

  it('normalizes diagonal movement and cancels opposing inputs', () => {
    const diagonal = movementDirection(1, 1);
    expect(Math.hypot(diagonal.x, diagonal.z)).toBeCloseTo(1);
    expect(diagonal.x).toBeCloseTo(0);
    expect(diagonal.z).toBeCloseTo(-1);
    expect(movementDirection(0, 0)).toEqual({ x: 0, z: 0 });
  });
});

describe('cursor aiming', () => {
  it('returns the hull-space heading toward a ground point', () => {
    expect(aimHeading({ x: 0, z: 0 }, { x: 0, z: -4 })).toBeCloseTo(0);
    expect(aimHeading({ x: 0, z: 0 }, { x: 4, z: 0 })).toBeCloseTo(-Math.PI / 2);
    expect(aimHeading({ x: 0, z: 0 }, { x: -4, z: 0 })).toBeCloseTo(Math.PI / 2);
  });
});

import { describe, expect, it } from 'vitest';
import {
  RULES,
  applyDamage,
  canUseHotSystem,
  overdriveIntensity,
  updateSpeedMultiplier,
  updateThermal,
  type ThermalState,
} from './rules';

const cold = (): ThermalState => ({ heat: 0, overheated: false, idleTime: 0 });

describe('thermal rules', () => {
  it('permits four cold shots and overheats on the fifth', () => {
    let state = cold();
    for (let shot = 0; shot < 4; shot += 1) {
      state = updateThermal(state, { delta: 0, shots: 1, overdriveIntensity: 0 });
    }
    expect(state).toMatchObject({ heat: 80, overheated: false });

    state = updateThermal(state, { delta: 0, shots: 1, overdriveIntensity: 0 });
    expect(state).toMatchObject({ heat: 100, overheated: true });
    expect(canUseHotSystem(state)).toBe(false);
  });

  it('waits before cooling and only clears Overheated at zero', () => {
    let state: ThermalState = { heat: 100, overheated: true, idleTime: 0 };
    state = updateThermal(state, { delta: RULES.coolingDelay, shots: 0, overdriveIntensity: 0 });
    expect(state.heat).toBe(100);

    state = updateThermal(state, { delta: 2, shots: 0, overdriveIntensity: 0 });
    expect(state).toMatchObject({ heat: 50, overheated: true });

    state = updateThermal(state, { delta: 2, shots: 0, overdriveIntensity: 0 });
    expect(state).toMatchObject({ heat: 0, overheated: false });
  });

  it('adds cannon and Overdrive heat into one budget', () => {
    const state = updateThermal(cold(), { delta: 2, shots: 1, overdriveIntensity: 1 });
    expect(state.heat).toBe(70);
  });
});

describe('Overdrive speed', () => {
  it('reaches maximum in 1.2 seconds and returns in 0.35 seconds', () => {
    const maximum = updateSpeedMultiplier(1, RULES.overdriveAcceleration, true);
    expect(maximum).toBe(1.5);
    expect(overdriveIntensity(maximum)).toBe(1);

    const normal = updateSpeedMultiplier(maximum, RULES.overdriveDeceleration, false);
    expect(normal).toBe(1);
  });

  it('continues from its current speed when re-engaged', () => {
    const partial = updateSpeedMultiplier(1, 0.6, true);
    const decelerated = updateSpeedMultiplier(partial, 0.1, false);
    const resumed = updateSpeedMultiplier(decelerated, 0.1, true);
    expect(resumed).toBeGreaterThan(decelerated);
    expect(resumed).toBeLessThan(1.5);
  });
});

describe('damage rules', () => {
  it('clamps health between zero and the maximum', () => {
    expect(applyDamage(50, 8)).toBe(42);
    expect(applyDamage(5, 15)).toBe(0);
    expect(applyDamage(50, -4)).toBe(50);
  });
});

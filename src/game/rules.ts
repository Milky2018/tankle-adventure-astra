export const RULES = {
  maxHealth: 50,
  maxHeat: 100,
  shotHeat: 20,
  overdriveHeatPerSecond: 25,
  coolingDelay: 0.75,
  coolingPerSecond: 25,
  baseSpeed: 7.8,
  maxSpeedMultiplier: 1.5,
  overdriveAcceleration: 1.2,
  overdriveDeceleration: 0.35,
  ramThreshold: 1.3,
  directHitGrace: 0.6,
  fireInterval: 0.5,
} as const;

export type ThermalState = Readonly<{
  heat: number;
  overheated: boolean;
  idleTime: number;
}>;

export type ThermalInput = Readonly<{
  delta: number;
  shots: number;
  overdriveIntensity: number;
}>;

export function updateThermal(state: ThermalState, input: ThermalInput): ThermalState {
  const heatGenerated =
    input.shots * RULES.shotHeat +
    RULES.overdriveHeatPerSecond * clamp(input.overdriveIntensity, 0, 1) * input.delta;

  if (heatGenerated > 0) {
    const heat = clamp(state.heat + heatGenerated, 0, RULES.maxHeat);
    return {
      heat,
      overheated: state.overheated || heat >= RULES.maxHeat,
      idleTime: 0,
    };
  }

  const idleTime = state.idleTime + input.delta;
  const coolingTime = Math.max(0, idleTime - RULES.coolingDelay) - Math.max(0, state.idleTime - RULES.coolingDelay);
  const heat = clamp(state.heat - coolingTime * RULES.coolingPerSecond, 0, RULES.maxHeat);
  return {
    heat,
    overheated: state.overheated && heat > 0,
    idleTime,
  };
}

export function canUseHotSystem(state: ThermalState): boolean {
  return !state.overheated;
}

export function updateSpeedMultiplier(
  current: number,
  delta: number,
  accelerating: boolean,
): number {
  const target = accelerating ? RULES.maxSpeedMultiplier : 1;
  const duration = accelerating ? RULES.overdriveAcceleration : RULES.overdriveDeceleration;
  const rate = (RULES.maxSpeedMultiplier - 1) / duration;
  return moveToward(current, target, rate * delta);
}

export function overdriveIntensity(multiplier: number): number {
  return clamp((multiplier - 1) / (RULES.maxSpeedMultiplier - 1), 0, 1);
}

export function applyDamage(health: number, damage: number): number {
  return clamp(health - Math.max(0, damage), 0, RULES.maxHealth);
}

export function moveToward(current: number, target: number, maximumDelta: number): number {
  if (Math.abs(target - current) <= maximumDelta) return target;
  return current + Math.sign(target - current) * maximumDelta;
}

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

import { MORTAR } from './abilities.js';
import { Vector3 } from 'three';

export const MORTAR_MAX_AGE = 4;
export const MORTAR_PREVIEW_SEGMENTS = 120;

export function mortarPosition(
  origin,
  target,
  age,
  duration = MORTAR.duration,
  height = MORTAR.height,
) {
  const t = Math.max(0, age / duration);
  const point = origin.clone().lerp(target, t);
  point.y += 4 * height * t * (1 - t);
  return point;
}

// Resolve launch intent against a supporting floor, not a target's hull or an aim plane.
export function mortarGroundTarget(target, castGround) {
  const start = target.clone();
  start.y += 0.45;
  const hit = castGround(start, new Vector3(0, -1, 0), 320);
  return hit ? hit.point.clone() : target.clone();
}

// Continue the forecast beyond the aimed point until collision or silent expiry.
export function predictMortar(origin, target, cast) {
  const points = [origin.clone()];
  for (let i = 1; i <= MORTAR_PREVIEW_SEGMENTS; i++) {
    const age = (MORTAR_MAX_AGE * i) / MORTAR_PREVIEW_SEGMENTS;
    const point = mortarPosition(origin, target, age);
    const previous = points.at(-1),
      delta = point.clone().sub(previous),
      distance = delta.length();
    const hit = cast(previous, delta.normalize(), distance);
    points.push(hit ? hit.point.clone() : point);
    if (hit)
      return { points, hit, point: points.at(-1), obstructed: age < MORTAR.duration - 1 / 30 };
  }
  return { points, point: points.at(-1), obstructed: false };
}

import { MORTAR } from './abilities.js';
import { clamp } from './mechanics.js';

export function mortarPosition(
  origin,
  target,
  age,
  duration = MORTAR.duration,
  height = MORTAR.height,
) {
  const t = clamp(age / duration, 0, 1);
  const point = origin.clone().lerp(target, t);
  point.y += 4 * height * t * (1 - t);
  return point;
}

// Match the live shell, including ceilings, enemies and sanctuary boundaries.
export function predictMortar(origin, target, cast) {
  const points = [origin.clone()];
  for (let i = 1; i <= 32; i++) {
    const point = mortarPosition(origin, target, (MORTAR.duration * i) / 32);
    const previous = points.at(-1),
      delta = point.clone().sub(previous),
      distance = delta.length();
    const hit = cast(previous, delta.normalize(), distance);
    points.push(hit ? hit.point.clone() : point);
    if (hit) return { points, hit, point: points.at(-1), obstructed: i < 32 };
  }
  return { points, point: points.at(-1), obstructed: false };
}

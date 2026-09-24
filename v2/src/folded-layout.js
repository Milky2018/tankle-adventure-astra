import { completeProgress } from './folded-state.js';
import { foldedDecks, foldedSolids, architectureGrid } from './folded-content.js';
import { sideObstacles } from './folded-side-layout.js';
import { inRect, deckHeight } from './hoist-layout.js';
import { phoenixReady, redContact, clamp } from './mechanics.js';
import { circuitReady } from './folded-signal-state.js';

export function activeSolid(s, state) {
  if (s.arena) return state.combatArena === s.arena;
  if (s.permanent || s.rail) return true;
  if (s.red || s.phoenix) return !state[s.id];
  return !circuitReady(state, s.localControl || s.id, s);
}

export function foldedAimHeight(p, target) {
  const verticalReach = Math.hypot(target.x - p.x, target.z - p.z) * Math.tan((Math.PI * 40) / 180);
  return clamp(target.y, p.y + 2 - verticalReach, p.y + 2 + verticalReach);
}
export function foldedSupport(x, z, y, deployed = false, lifts = []) {
  let best = null;
  for (const d of [...foldedDecks, ...lifts]) {
    if ((d.water && !deployed) || !inRect(x, z, d)) continue;
    const height = deckHeight(d, z);
    // A recessed shaft bottom is not a boarding surface while its platform is away.
    if (!d.stops && lifts.some((l) => inRect(x, z, l) && Math.abs(height - l.stops[0]) < 0.01))
      continue;
    // At a ramp seam, step onto the higher reachable surface instead of sticking
    // to a coplanar landing underneath it. Other floors remain out of reach.
    if (
      Math.abs(height - y) <= 0.45 &&
      (!best || height > best.height || (height === best.height && best.water && !d.water))
    )
      best = { ...d, height };
  }
  return best;
}
export function foldedBlocked(x, y, z, state, r = 0.9) {
  const blocks = (s) =>
    activeSolid(s, state) && y + 2 > s.y + 0.12 && y < s.y + s.h - 0.1 && inRect(x, z, s, r);
  return (
    (state.bodies?.obstacles || sideObstacles).find(blocks) ||
    (state.bodies?.solids || foldedSolids).find(blocks) ||
    [...architectureGrid.near(x, z, r)].find(
      (s) => y + 2 > s.y + 0.12 && y < s.y + s.h - 0.1 && inRect(x, z, s, r),
    ) ||
    foldedDecks.find(
      (d) =>
        !d.water &&
        inRect(x, z, d, -0.01) &&
        deckHeight(d, z) > y + 0.45 &&
        deckHeight(d, z) < y + 3.25,
    )
  );
}
export function moveFolded(p, dx, dz, state, lifts = []) {
  // A stationary land hull cannot enter water; lifts already move their riders.
  if (!dx && !dz && !p.deployed) {
    p.afloat = false;
    return;
  }
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.2));
  for (let i = 0; i < steps; i++)
    for (const [ax, az] of [
      [dx / steps, 0],
      [0, dz / steps],
    ]) {
      if (!ax && !az) continue;
      const x = p.x + ax,
        z = p.z + az,
        floor = foldedSupport(x, z, p.y, p.deployed, lifts);
      if (!floor) {
        p.speed = 1;
        continue;
      }
      const wall = foldedBlocked(x, floor.height, z, state);
      if (wall?.red && redContact(p) && p.speed > 1) completeProgress(state, wall.id);
      else if (wall && wall.phoenix && phoenixReady(p)) completeProgress(state, wall.id);
      else if (wall) {
        p.speed = 1;
        continue;
      }
      // Sample corners as well as side midpoints, preventing diagonal ledge cutting.
      if (
        ![
          [0.9, 0],
          [-0.9, 0],
          [0, 0.9],
          [0, -0.9],
          [0.64, 0.64],
          [0.64, -0.64],
          [-0.64, 0.64],
          [-0.64, -0.64],
        ].every(([ox, oz]) =>
          foldedSupport(x + ox, z + oz, deckHeight(floor, z + oz), p.deployed, lifts),
        )
      ) {
        p.speed = 1;
        continue;
      }
      p.x = x;
      p.z = z;
      p.y = floor.height;
    }
  p.afloat = !!foldedSupport(p.x, p.z, p.y, p.deployed, lifts)?.water;
}

export { inRect, deckHeight };
export * from './folded-content.js';
export { initialFoldedState } from './folded-state.js';

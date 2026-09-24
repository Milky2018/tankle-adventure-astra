import { circuitTargetKey } from './signal-state.js';
import { createCircuitRouter, orthogonalCircuit } from './circuit-routing.js';
import { SIGNAL } from '../rendering/palette.js';

export const circuitEventSources = [
  { id: 'inner-thermal', x: 147.5, y: -6.7, z: 97.5 },
  { id: 'sorter', x: 44, y: -6.7, z: -154 },
  { id: 'guardian', x: 202, y: 17.3, z: 64 },
  { id: 'rail-crossing', x: -162, y: 9.3, z: -66 },
  { id: 'coolant-return', x: 324.5, y: -22.7, z: 112.6, ground: -24 },
];

export function circuitLinks(controls, solids, lifts, decks = null, architecture = []) {
  const route = decks ? createCircuitRouter(decks, lifts, [...solids, ...architecture]) : null;
  const links = [];
  for (const c of controls) {
    if (c.slide) continue;
    const ids = c.feeds || c.effects || [c.id];
    const endpoints = [
      ...solids.filter(
        (s) =>
          (ids.includes(s.id) && !s.permanent) ||
          ids.includes(s.rail?.release) ||
          ids.includes(s.rail?.latch),
      ),
      ...lifts.filter(
        (l) => ids.includes(l.lock || l.id) || l.locks?.some((id) => ids.includes(id)),
      ),
      ...controls
        .filter((t) => t.requires === c.id)
        .map((t) => ({ ...t, circuitKey: circuitTargetKey(t), y: t.ground ?? t.y - 1.3 })),
    ];
    endpoints.push(...(c.destinations || []));
    for (const target of endpoints) {
      if (target.red && target.id === c.id) continue;
      if (target.localControl === c.id) {
        links.push({
          id: c.id,
          target: target.id,
          targetKey: circuitTargetKey(target),
          local: true,
          points: [
            [c.x, c.y, c.z],
            [c.x, c.y - 0.8, c.z],
          ],
        });
        continue;
      }
      const ground = c.ground ?? c.y - 1.3,
        end = [
          target.x + (target.w || 0) / 2,
          (target.y ?? target.stops[0]) + 0.12,
          target.z + (target.d || 0) / 2,
        ];
      if (target.stops) {
        end[0] = Math.max(target.x + 0.3, Math.min(target.x + target.w - 0.3, c.x));
        end[2] = Math.max(target.z + 0.3, Math.min(target.z + target.d - 0.3, c.z));
        end[1] =
          target.stops.reduce((best, y) =>
            Math.abs(y - ground) < Math.abs(best - ground) ? y : best,
          ) + 0.12;
      }
      let points = [
        [c.x, ground + 0.12, c.z],
        [c.x, ground + 0.12, end[2]],
        [end[0], ground + 0.12, end[2]],
        end,
      ];
      if (route) {
        const facing = c.facing || [0, 0, 1],
          socket = [
            c.x + facing[0] * 0.4,
            c.y + (c.surface === 'top' ? 0.08 : -0.45),
            c.z + facing[2] * 0.4,
          ];
        const foot = [socket[0], ground + 0.28, socket[2]],
          lead = [socket];
        const plinth = solids.find(
          (s) =>
            s.permanent &&
            s.y <= ground + 0.05 &&
            socket[0] > s.x &&
            socket[0] < s.x + s.w &&
            socket[2] > s.z &&
            socket[2] < s.z + s.d &&
            ground < s.y + s.h,
        );
        if (plinth) {
          const exits = [
            [plinth.x - 0.34, socket[2]],
            [plinth.x + plinth.w + 0.34, socket[2]],
            [socket[0], plinth.z - 0.34],
            [socket[0], plinth.z + plinth.d + 0.34],
          ];
          exits.sort(
            (a, b) =>
              Math.hypot(a[0] - end[0], a[1] - end[2]) - Math.hypot(b[0] - end[0], b[1] - end[2]),
          );
          const [x, z] =
            c.cable?.exit === 'east' ? [plinth.x + plinth.w + 0.34, socket[2]] : exits[0];
          lead.push(
            [socket[0], plinth.y + plinth.h + 0.28, socket[2]],
            [x, plinth.y + plinth.h + 0.28, z],
          );
          foot[0] = x;
          foot[2] = z;
        }
        let finish;
        const blocked = (p) =>
          lifts.some(
            (l) =>
              p[0] > l.x + 0.5 &&
              p[0] < l.x + l.w - 0.5 &&
              p[2] > l.z + 0.5 &&
              p[2] < l.z + l.d - 0.5 &&
              l.stops.some((y) => Math.abs(p[1] - y - 0.28) < 0.1),
          ) ||
          [...solids, ...architecture].some(
            (s) =>
              !s.invisible &&
              !s.motion &&
              !s.rail &&
              p[0] > s.x - 0.23 &&
              p[0] < s.x + s.w + 0.23 &&
              p[2] > s.z - 0.23 &&
              p[2] < s.z + s.d + 0.23 &&
              p[1] > s.y - 0.02 &&
              p[1] < s.y + s.h + 0.23,
          );
        const candidates = [];
        if (target.stops) {
          for (const x of [target.x + 0.3, target.x + target.w - 0.3])
            for (const dz of [-0.35]) candidates.push([x, end[1] + 0.16, target.z + dz]);
        } else if (target.w) {
          for (const t of [0.5, 0.25, 0.75]) {
            if (target.w >= target.d)
              for (const z of [target.z - 0.35, target.z + target.d + 0.35])
                candidates.push([target.x + target.w * t, target.y + 0.28, z]);
            if (target.d > target.w)
              for (const x of [target.x - 0.35, target.x + target.w + 0.35])
                candidates.push([x, target.y + 0.28, target.z + target.d * t]);
          }
        } else candidates.push([target.x, target.y + 0.28, target.z]);
        finish = candidates
          .filter((p) => !blocked(p))
          .sort(
            (a, b) =>
              Math.hypot(a[0] - foot[0], a[2] - foot[2]) -
              Math.hypot(b[0] - foot[0], b[2] - foot[2]),
          )[0];
        finish = c.cable?.finish || finish;
        if (!finish) throw new Error(`No exposed circuit socket on ${target.id}`);
        try {
          if (c.cable?.risers) {
            const [first, ...remaining] = c.cable.risers;
            points = [...lead, ...route(foot, first), ...remaining, finish];
          } else {
            points = [...lead];
            let from = foot;
            for (const to of [...(c.cable?.via || []), finish]) {
              points.push(...route(from, to));
              from = to;
            }
          }
        } catch (error) {
          throw new Error(`${c.id} -> ${target.id}: ${error.message}`);
        }
      } else points = c.circuit || points;
      links.push({
        id: c.id,
        target: target.id,
        targetKey: circuitTargetKey(target),
        points: orthogonalCircuit(points),
        magnetic: c.kind === 'magnet' && !c.slide,
      });
    }
  }
  return links;
}

export function circuitColor(open, elapsed, progress, duration = 3) {
  if (!open) return SIGNAL.ready;
  if (elapsed < duration - 1e-7) {
    const front = Math.max(0, elapsed / duration);
    if (progress > front) return SIGNAL.ready;
    if (front - progress < 0.07) return 0xfff1b0;
  }
  return SIGNAL.open;
}

export { circuitTargetKey, circuitReady, createCircuitSignals } from './signal-state.js';

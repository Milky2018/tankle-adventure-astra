import { Vector3 } from 'three';
import { foldedLiftDefs, foldedMirrors, foldedPickups } from './folded-content.js';

// Gameplay records contain coordinates and mechanical state, never scene handles.
// Normal vectors are shared math values used by reflection and by presentation.
export function createMachineryState(progress) {
  const machinery = {
    lifts: structuredClone(foldedLiftDefs),
    pickups: structuredClone(foldedPickups),
    mirrors: foldedMirrors.map((definition) => ({
      ...structuredClone(definition),
      angle: definition.turnable ? (-(progress.mirrorTurns[definition.id] || 0) * Math.PI) / 2 : 0,
      normal: new Vector3(),
      flash: 0,
      ground: definition.y - 2,
    })),
  };
  resetMachineryLifts(machinery, progress);
  advanceMachineryState(machinery, progress, 0);
  return machinery;
}

export function resetMachineryLifts(machinery, progress) {
  for (const lift of machinery.lifts) {
    lift.y = lift.settle && !progress[lift.lock] ? lift.stops.at(-1) : lift.stops[0];
    lift.destination = lift.stops[0];
    lift.wait = 0;
  }
  followLifts(machinery);
}

function followLifts({ pickups, lifts }) {
  for (const pickup of pickups) {
    if (!pickup.lift) continue;
    pickup.y = lifts.find((lift) => lift.id === pickup.lift).y;
  }
}

const vertical = new Vector3(0, 1, 0);
export function advanceMachineryState(machinery, progress, dt) {
  for (const mirror of machinery.mirrors) {
    mirror.flash = Math.max(0, mirror.flash - dt);
    if (mirror.turnable) {
      const target = (-(progress.mirrorTurns[mirror.id] || 0) * Math.PI) / 2;
      const travel = Math.PI * 2 * dt;
      mirror.angle += Math.max(-travel, Math.min(travel, target - mirror.angle));
    }
    mirror.normal
      .set(...mirror.n)
      .normalize()
      .applyAxisAngle(vertical, mirror.angle);
  }
  followLifts(machinery);
}

import { createMachineryState } from './folded-machinery-state.js';
import { foldedFlags, foldedSolids } from './folded-content.js';
import { sideObstacles } from './folded-side-layout.js';
import { restoreSlidePositions } from './folded-mechanisms.js';
import { migrateFoldedSave } from './folded-save-migrations.js';

export function initialFoldedState(saved = {}) {
  const state = migrateFoldedSave(saved);
  Object.defineProperty(state, 'progressEvents', { value: [] });
  Object.defineProperty(state, 'machinery', { value: createMachineryState(state) });
  // Session-owned collision bodies share positions with animated machinery,
  // but are neither authored definitions nor saved progression.
  Object.defineProperty(state, 'bodies', {
    value: {
      obstacles: structuredClone(sideObstacles),
      solids: structuredClone(foldedSolids),
    },
    enumerable: false,
  });
  state.slidePositions = restoreSlidePositions(state.bodies.solids, saved.slidePositions, state);
  return state;
}

// Durable completion and its notification are one operation. Only the simulation
// consumes these events; rendering never infers transitions by comparing snapshots.
export function completeProgress(state, id) {
  if (state[id]) return false;
  state[id] = true;
  state.progressEvents.push(id);
  return true;
}
export function recordPuzzleState(state, puzzles) {
  state.sidePuzzles = structuredClone(puzzles);
  if (puzzles.rail?.solved) completeProgress(state, 'rail-crossing');
  if (puzzles.gutter?.grown) completeProgress(state, 'garden-bloom');
}
export function turnMirror(state, id) {
  state.mirrorTurns[id] = (state.mirrorTurns[id] || 0) + 1;
  return state.mirrorTurns[id];
}

export function serializeFoldedState(state) {
  const flags = Object.fromEntries(
    foldedFlags.filter((id) => Object.hasOwn(state, id)).map((id) => [id, state[id]]),
  );
  return structuredClone({
    ...flags,
    sorter: !!state.sorter,
    'maintenance-started': !!state['maintenance-started'],
    bossRouteRevision: state.bossRouteRevision,
    progressionRevision: state.progressionRevision,
    anchor: state.anchor,
    discovered: state.discovered,
    sidePuzzles: state.sidePuzzles,
    pendingSignals: state.pendingSignals,
    mirrorTurns: state.mirrorTurns,
    slidePositions: state.slidePositions,
  });
}

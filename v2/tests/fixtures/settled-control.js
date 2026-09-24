import { controlChanges } from '../../src/progression/commands.js';
import { foldedControls } from '../../src/content/compile.js';

// Route tests start walking after machinery has settled. Timing and partial-save
// behavior are tested through createProgression, never through this fixture.
export function settleControl(id, kind, player, state, lifts, time = 0) {
  const changes = controlChanges(foldedControls.find(c => c.id === id), kind, player, state, time);
  if (!changes) return false;
  Object.assign(state, changes);
  return true;
}

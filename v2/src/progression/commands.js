import { foldedControls } from '../content/compile.js';
import { mechanismReady } from '../combat/encounter-pacing.js';
import { createCircuitSignals } from '../machinery/signal-state.js';
import { completeProgress } from '../app/state.js';

// Pure command evaluation. An effect is declared with its source, not recovered
// by mutating a clone of the entire save and diffing it afterwards.
export function controlChanges(control, kind, player, state, time = 0) {
  if (!control || state[control.id] || !mechanismReady(control, player, time, state)) return null;
  const weapons =
    control.weapons || (control.kind === 'shot' ? ['cannon', 'mortar', 'laser'] : [control.kind]);
  if (!weapons.includes(kind) || (kind === 'magnet' && !player.magnet)) return null;
  const effects = control.effects || [control.id];
  if (effects.every((id) => state[id])) return null;
  return Object.fromEntries(effects.map((id) => [id, true]));
}

export function createProgression(state, links, controls = foldedControls) {
  const signals = createCircuitSignals(state, links);
  const starts = new Map();
  const byId = new Map(controls.map((control) => [control.id, control]));
  const linked = new Set(links.map((link) => link.id));
  function flush(time) {
    for (const id of state.progressEvents.splice(0)) {
      // Receiver activation is handled by activate(). A machine may later
      // report completion under the same ID; that must not replay its input.
      if (byId.has(id) || !linked.has(id)) continue;
      starts.set(id, time);
      signals.trigger(id, {}, true);
    }
  }
  return {
    // Read-only timing queries used by the scene. No scene object is needed to
    // restore a save, activate a receiver, or finish a timed signal.
    signals: {
      duration: signals.duration,
      active(id) {
        const effects = byId.get(id)?.effects;
        return signals.active(id) || !!effects?.every((flag) => state[flag]);
      },
      pending: signals.pending,
      elapsed(id, time) {
        const pending = signals.pending(id);
        return pending
          ? pending.duration - pending.remaining
          : time - (starts.get(id) ?? -Infinity);
      },
    },
    activate(id, kind, player, time) {
      if (signals.active(id)) return false;
      const changes = controlChanges(byId.get(id), kind, player, state, time);
      if (!changes) return false;
      starts.set(id, time);
      return signals.trigger(id, changes);
    },
    complete(id, time, { delayed = false, effects = [] } = {}) {
      if (signals.active(id)) return false;
      starts.set(id, time);
      if (delayed)
        return signals.trigger(id, Object.fromEntries([id, ...effects].map((key) => [key, true])));
      completeProgress(state, id);
      for (const effect of effects) completeProgress(state, effect);
      flush(time);
      return true;
    },
    advance(dt, time) {
      flush(time);
      const delivered = signals.advance(dt);
      for (const signal of delivered) starts.set(signal.id, time - signal.duration);
      return delivered.length > 0;
    },
  };
}

// Authored coordinates identify individual destinations even when gates share a flag.
// Platforms and sliding bodies keep the same identity throughout their travel.
export function circuitTargetKey(target) {
  if (target.targetKey || target.circuitKey) return target.targetKey || target.circuitKey;
  const x = target.rail?.axis === 'x' ? target.rail.min : target.x;
  const z = target.rail?.axis === 'z' ? target.rail.min : target.z;
  const y =
    target.stops?.[0] ??
    target.ground ??
    (target.kind ? (target.restY ?? target.y) - 1.3 : target.y);
  return [target.id, ...[x, y, z].map((v) => v.toFixed(4))].join(':');
}

export function circuitReady(state, id, target) {
  for (const [source, signal] of Object.entries(state.pendingSignals || {})) {
    if (source !== id && !Object.hasOwn(signal.changes, id)) continue;
    const key = typeof target === 'string' ? null : circuitTargetKey(target);
    const branch = signal.targets?.find((t) => (key ? t.key === key : t.target === target));
    const duration = branch?.duration ?? (target.localControl === id ? 0.18 : signal.duration);
    return signal.duration - signal.remaining >= duration - 1e-8;
  }
  return !!state[id];
}

export function createCircuitSignals(state, links) {
  const durations = new Map(),
    targets = new Map();
  for (const link of links) {
    let length = 0;
    for (let i = 1; i < link.points.length; i++)
      length += Math.hypot(...link.points[i].map((v, j) => v - link.points[i - 1][j]));
    const duration = length > 0.01 ? (link.local ? 0.18 : Math.max(1.4, length / 18)) : 0;
    durations.set(link.id, Math.max(durations.get(link.id) || 0, duration));
    if (link.targetKey) {
      if (!targets.has(link.id)) targets.set(link.id, []);
      targets.get(link.id).push({ key: link.targetKey, target: link.target, duration });
    }
  }
  state.pendingSignals ??= {};
  for (const [id, signal] of Object.entries(state.pendingSignals))
    signal.targets ??= structuredClone(targets.get(id) || []);
  return {
    duration: (id, key) =>
      key ? (targets.get(id)?.find((t) => t.key === key)?.duration ?? 0) : durations.get(id) || 0,
    active: (id) => !!state[id] || !!state.pendingSignals[id],
    pending: (id) => state.pendingSignals[id],
    trigger(id, changes, external = false) {
      if ((!external && state[id]) || state.pendingSignals[id]) return false;
      const duration = durations.get(id) || 0;
      if (!duration) Object.assign(state, changes);
      else
        state.pendingSignals[id] = {
          duration,
          remaining: duration,
          changes,
          targets: structuredClone(targets.get(id) || []),
        };
      return true;
    },
    advance(dt) {
      const delivered = [];
      for (const [id, signal] of Object.entries(state.pendingSignals)) {
        signal.remaining = Math.max(0, signal.remaining - dt);
        if (signal.remaining > 1e-8) continue;
        Object.assign(state, signal.changes);
        delivered.push({ id, ...signal });
        delete state.pendingSignals[id];
      }
      return delivered;
    },
  };
}

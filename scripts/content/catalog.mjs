// Circuit keys are stable save-game identities, even after an object is moved.
export function circuitKey(target) {
  if (target.targetKey || target.circuitKey)
    return target.targetKey || target.circuitKey;
  const x = target.rail?.axis === "x" ? target.rail.min : target.x;
  const z = target.rail?.axis === "z" ? target.rail.min : target.z;
  const y =
    target.stops?.[0] ??
    target.ground ??
    (target.kind ? (target.restY ?? target.y) - 1.3 : target.y);
  return [target.id, ...[x, y, z].map((value) => value.toFixed(4))].join(":");
}

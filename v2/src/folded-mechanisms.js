// A magnetic slide is a solid body throughout its travel. The saved coordinate
// describes its rail position, including an unfinished pull.
export function pullSlide(body, player, dt, bodies, supported) {
  const rail = body.rail;
  if (!rail) return false;
  const axis = rail.axis, size = axis === 'x' ? 'w' : 'd';
  const toward = player[axis] - body[axis] - body[size] / 2;
  if (Math.abs(toward) < body[size] / 2 + 1.2) return false;
  const destination = Math.max(rail.min, Math.min(rail.max, body[axis] + Math.sign(toward) * 3 * dt));
  const before = body[axis];
  const steps = Math.max(1, Math.ceil(Math.abs(destination - before) / .15));
  for (let i = 1; i <= steps; i++) {
    const candidate = { ...body, [axis]: before + (destination - before) * i / steps };
    const overlaps = (b, margin = 0) => candidate.x < b.x + b.w + margin && candidate.x + candidate.w > b.x - margin && candidate.z < b.z + b.d + margin && candidate.z + candidate.d > b.z - margin;
    if (overlaps({ x: player.x - .9, z: player.z - .9, w: 1.8, d: 1.8 })) break;
    if (bodies.some(b => b !== body && Math.abs(b.y - body.y) < 2.5 && overlaps(b))) break;
    if (![[.1,.1],[body.w-.1,.1],[.1,body.d-.1],[body.w-.1,body.d-.1]].every(([x,z]) => supported(candidate.x+x,candidate.z+z,body.y))) break;
    body[axis] = candidate[axis];
  }
  return body[axis] !== before;
}

export function restoreSlidePositions(solids, saved = {}, state = {}) {
  const positions = {};
  for (const body of solids.filter(s => s.rail)) {
    const rail = body.rail, value = saved[body.id] ?? (state[rail.latch || rail.release] ? rail.max : undefined);
    if (Number.isFinite(value)) body[rail.axis] = Math.max(rail.min, Math.min(rail.max, value));
    positions[body.id] = body[rail.axis];
  }
  return positions;
}

// The two visible sluice positions divert flow, rather than toggling a door.
export function currentVelocity(current, state) {
  if (!current) return { x: 0, z: 0 };
  const diverted = current.sluice && state[current.sluice];
  return diverted ? current.diverted : current.current;
}

export function stepReleasedSlides(solids, state, dt, occupants, supported) {
  const released = solids.filter(s => s.rail?.release && state[s.rail.release] && s[s.rail.axis] < s.rail.max);
  if (!released.length) return;
  const blockers = [...solids.filter(s => s.permanent || s.rail || !state[s.id]), ...occupants.filter(p => p.hp !== 0).map(p => ({ x: p.x - .9, y: p.y, z: p.z - .9, w: 1.8, d: 1.8 }))];
  for (const body of released) {
    const rail = body.rail;
    const driver = { x: body.x, y: body.y, z: body.z, [rail.axis]: rail.max + 100 };
    if (pullSlide(body, driver, dt, blockers, supported)) state.slidePositions[body.id] = body[rail.axis];
  }
}

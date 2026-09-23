// A magnetic slide is a solid body throughout its travel. The saved coordinate
// describes its rail position, including an unfinished pull.
export function pullSlide(body, player, dt, bodies, supported, occupants = [], moveOccupant) {
  const rail = body.rail;
  if (!rail) return false;
  const axis = rail.axis, size = axis === 'x' ? 'w' : 'd';
  const toward = player[axis] - body[axis] - body[size] / 2;
  if (Math.abs(toward) < body[size] / 2 + 1.2) return false;
  const travel = Math.min((rail.release ? 3 : 12) * dt, Math.abs(toward) - body[size] / 2 - 1.2);
  const destination = Math.max(rail.min, Math.min(rail.max, body[axis] + Math.sign(toward) * travel));
  const before = body[axis];
  if (Math.abs(destination - before) < 1e-5) return false;
  const steps = Math.max(1, Math.ceil(Math.abs(destination - before) / .15));
  for (let i = 1; i <= steps; i++) {
    const candidate = { ...body, [axis]: before + (destination - before) * i / steps };
    const overlaps = (b, margin = 0) => candidate.x < b.x + b.w + margin && candidate.x + candidate.w > b.x - margin && candidate.z < b.z + b.d + margin && candidate.z + candidate.d > b.z - margin;
    if (overlaps({ x: player.x - .9, z: player.z - .9, w: 1.8, d: 1.8 })) break;
    const overlapArea=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.z+a.d,b.z+b.d)-Math.max(a.z,b.z));
    if (bodies.some(b => b !== body && Math.abs(b.y - body.y) < 2.5 && overlaps(b) && overlapArea(candidate,b)>=overlapArea(body,b))) break;
    if (![[.1,.1],[body.w-.1,.1],[.1,body.d-.1],[body.w-.1,body.d-.1]].every(([x,z]) => supported(candidate.x+x,candidate.z+z,body.y))) break;
    const pushed=[];
    let blocked=false;
    for(const enemy of occupants.filter(e=>e.hp>0&&Math.abs(e.y-body.y)<2.5)){
      const radius=enemy.radius||.9,b={x:enemy.x-radius,z:enemy.z-radius,w:radius*2,d:radius*2};
      if(!overlaps(b)||overlapArea(candidate,b)<overlapArea(body,b))continue;
      const direction=Math.sign(destination-before),position=direction>0?candidate[axis]+candidate[size]+radius+.02:candidate[axis]-radius-.02;
      const next={...enemy};
      moveOccupant?.(next,axis==='x'?position-enemy.x:0,axis==='z'?position-enemy.z:0);
      if(Math.abs(next[axis]-position)>.01||occupants.some(e=>e!==enemy&&e.hp>0&&Math.abs(e.y-next.y)<2.5&&Math.hypot(e.x-next.x,e.z-next.z)<(e.radius||.9)+radius)){blocked=true;break;}
      pushed.push({enemy,next});
    }
    if(blocked)break;
    for(const {enemy,next}of pushed){enemy.x=next.x;enemy.y=next.y;enemy.z=next.z;}
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

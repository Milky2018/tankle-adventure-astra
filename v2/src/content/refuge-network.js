// Four permanent repair rooms. Old save identifiers are migrated in one place;
// retired repair posts do not provide healing or reconstruction.
export const refugeHives = [
  { id: 'awakening', name: 'Old Repair Room', x: 0, y: -8, z: 86, heading: -Math.PI / 2 },
  { id: 'turntable', name: 'Central Transit', x: 0, y: 0, z: 27, heading: Math.PI },
  { id: 'distribution', name: 'Eastern Distribution Hall', x: 150, y: 24, z: -28, heading: Math.PI / 2 },
  { id: 'last-refuge', name: 'Furnace Service Room', x: 44, y: -40, z: -10, heading: 0 },
];

const western = new Set(['garden-entry', 'loading-entry', 'bank', 'benches', 'arsenal-hive-0', 'arsenal-hive-3', 'reservoir-hive-0', 'reservoir-hive-3', 'proving-hive-0', 'proving-hive-3']);
const eastern = new Set(['roof', 'emitter', 'yard', 'rig', 'industrial', 'lens-hive-0', 'lens-hive-3', 'coolant-hive-0', 'coolant-hive-3']);
export function migrateRefuge(anchor, state) {
  if (anchor === 'awakening' || anchor === 'lower-foundry' || anchor === 'foundry-exit') return 'awakening';
  if (anchor === 'last-refuge' || anchor?.startsWith('hearth-hive-')) return 'last-refuge';
  if (anchor === 'distribution' || eastern.has(anchor)) return state.phoenix ? 'distribution' : 'turntable';
  if (anchor === 'turntable' || western.has(anchor)) return 'turntable';
  return 'awakening';
}

const deck = (id, x, z, w, d, y, extra = {}) => ({ id, x, z, w, d, y, ...extra });
const gate = (id, x, z, w, d, y, extra = {}) => ({ id, x, z, w, d, y, h: 5, ...extra });
export const refugeDecks = [
  deck('workshop-water-foot', -186, 22, 40, 12, -8, { water: true, region: 'garden' }),
  deck('phoenix-cage-bypass', -28, -80, 96, 12, 16, { region: 'testworks' }),
  deck('workshop-water-ramp', -186, -42, 12, 64, 8, { rise: -16, region: 'garden' }),
  deck('workshop-water-head', -186, -50, 12, 8, 8, { region: 'transit' }),
  deck('optical-screen-track', 216, -8, 5, 16, 24, { region: 'optics' }),
  deck('sorter-track-head', 72, -36, 84, 8, 24, { region: 'testworks' }),
  deck('sorter-fast-track', 72, -28, 8, 72, 24, { rise: -24, region: 'transit' }),
  deck('sorter-track-foot', 30, 44, 50, 8, 0, { region: 'transit' }),
  deck('sorter-track-transit', 30, 32, 12, 20, 0, { region: 'transit' }),
  deck('overseer-service-door', -14, 58, 8, 28, -8, { region: 'foundry' }),
  deck('garden-foundry-walk', 42, 44, 8, 44, -8, { region: 'garden' }),
  deck('garden-foundry-door', 14, 80, 36, 8, -8, { region: 'garden' }),
  deck('arsenal-transit-head', -66, -60, 18, 12, 8, { region: 'transit' }),
  deck('arsenal-transit-ramp', -60, -48, 12, 32, 8, { rise: -8, region: 'transit' }),
  deck('arsenal-transit-walk', -60, -16, 12, 48, 0, { region: 'transit' }),
  deck('arsenal-transit-door', -48, 22, 16, 10, 0, { region: 'transit' }),
  deck('proving-inspection-head', 0, -158, 200, 8, 16, { region: 'testworks' }),
  deck('proving-retry-apron', 194, -182, 12, 32, 16, { region: 'testworks' }),
  deck('proving-inspection-ramp', 0, -150, 12, 64, 16, { rise: -16, region: 'testworks' }),
  deck('proving-inspection-foot', 0, -86, 12, 46, 0, { region: 'transit' }),
  // The engine lesson returns to the original orange boundary at B.
  deck('phoenix-engine-exit', 218, -120, 32, 12, 16, { region: 'testworks' }),
  deck('phoenix-departure', 232, -114, 12, 38, 16, { region: 'testworks' }),
  deck('phoenix-roof-rise', -28, -68, 12, 64, 16, { rise: -16, region: 'testworks' }),
  deck('phoenix-return-foot', -28, -4, 70, 8, 0, { region: 'transit' }),
  deck('carrier-south-bypass',60,-78,44,8,16,{region:'testworks'}),
  deck('phoenix-roof-apron', 56, -88, 188, 12, 16, { region: 'testworks' }),
  deck('coolant-roof-walk', 272, -28, 12, 140, 24, { region: 'circulation' }),
  deck('coolant-roof-boarding', 272, 100, 24, 12, 24, { region: 'circulation' }),
  deck('coolant-lower-boarding', 272, 112, 24, 12, -24, { region: 'circulation' }),
  deck('tower-garden-landing', 180, 154, 12, 12, 16, { region: 'garden' }),
  deck('tower-garden-walk', 140, 154, 40, 12, 16, { region: 'garden' }),
  deck('tower-garden-return', 140, 6, 12, 148, 16, { region: 'garden' }),
  deck('vestibule-approach', 148, 44, 28, 8, -8, { region: 'circulation' }),
  deck('vestibule-hot-lane', 148, 52, 28, 50, -8, { region: 'circulation' }),
  deck('vestibule-end', 148, 102, 28, 12, -8, { region: 'circulation' }),
  deck('vestibule-shaft-neck', 100, 102, 48, 12, -8, { region: 'furnace' }),
  deck('vestibule-shaft-boarding', 88, 90, 12, 12, -8, { region: 'furnace' }),
  deck('vestibule-shaft-foot', 76, 102, 12, 12, -40, { region: 'furnace' }),
  deck('vestibule-predecessor-walk', 76, 12, 12, 102, -40, { region: 'furnace' }),
  // The old deep shaft arrives on the Foundry service side, rather than at B.
  deck('old-shaft-top', 16, -12, 12, 8, -8, { region: 'foundry' }),
  deck('old-shaft-service', 14, -4, 8, 88, -8, { region: 'foundry' }),
];
export const refugeSolids = [
  gate('workshop-water', -186, -41, 12, 1, 7.75),
  { id: 'optical-screen', x: 219.2, y: 24, z: -5.5, w: 1, d: 3, h: 3, rail: { axis: 'z', min: -5.5, max: 2.5, release: 'optical-screen' } },
  gate('roof-express', 72, -28, 8, 1, 24),
  gate('roof-express', 72, 43, 8, 1, 0),
  gate('overseer-service', -14, 68, 8, 1, -8),
  gate('arsenal-return', -60, -15, 12, 1, 0),
  gate('proving-inspection', 194, -158, 1, 8, 16),
  gate('proving-inspection', 0, -149, 12, 1, 15.75),
  // Keep the released-door save key while relocating its approach to the Gardens.
  gate('transit-return', 30, 80, 1, 8, -8),
  gate('phoenix-departure', 196, -88, 1, 12, 16, { phoenix: true }),
  gate('phoenix-departure', -28, -66, 12, 1, 15.5, { phoenix: true }),
  gate('inner-thermal', 148, 96, 28, 1, -8, { red: true }),
  gate('last-cage', 14, 68, 8, 1, -8),
];
export const refugeControls = [
  { id: 'roof-express', x: 76, y: 25.3, z: -30, kind: 'shot', mount: 'roof-express', facing: [0,0,-1] },
  { id: 'sorter-retry', x: 24.6, y: -4.75, z: -118, kind: 'shot', mount: 'sorter-retry', facing: [1,0,0] },
  { id: 'workshop-water', x: -180, y: 9.05, z: -39, kind: 'shot', mount: 'workshop-water', facing: [0,0,1] },
  {id:'transit-return',x:33,y:-6.7,z:84,kind:'shot',mount:'transit-return',facing:[1,0,0]},
  { id: 'optical-screen', x: 214, y: 25.3, z: -10, kind: 'shot', mount: 'optical-screen', facing: [0,0,-1] },
  { id: 'coolant-bypass', x: 278, y: -22.7, z: 117, kind: 'shot', requires: 'coolant-return', destinations: [{id:'coolant-runout',x:284,y:-24,z:106}] },
  { id: 'proving-inspection', x: 195.1, y: 20.25, z: -154, kind: 'shot', mount: 'proving-inspection', facing: [1,0,0] },
  { id: 'overseer-service', x: -10, y: -6.7, z: 61, kind: 'shot', mount: 'overseer-service', facing: [0,0,-1] },
];
export const refugeFlags = ['roof-express','sorter-retry','workshop-water','transit-return','optical-screen','coolant-bypass', 'proving-inspection', 'overseer-service', 'phoenix-departure'];

export const refugeLifts = [
  { id: 'sorter-retry-lift', x: 12, z: -124, w: 12, d: 12, stops: [-8, 0], lock: 'sorter-retry' },
  { id: 'inspection-load', x: 104, z: -18, w: 12, d: 8, stops: [0, 5], lock: 'load', settle: true },
  { id: 'furnace-service-lift', x: 88, z: 102, w: 12, d: 12, stops: [-40, -8], lock: 'inner-thermal' },
  { id: 'coolant-return-lift', x: 284, z: 100, w: 12, d: 12, stops: [-24, 24], lock: 'coolant-return' },
  { id: 'tower-descent', x: 180, z: 154, w: 12, d: 12, stops: [16, 40], lock: 'signal' },
  { id: 'rail-inspection-bridge', x: -160, z: -72, w: 8, d: 8, stops: [8, 14], lock: 'rail-crossing', settle: true },
  { id: 'coolant-maintenance-bridge', x: 300, z: 100, w: 12, d: 12, stops: [-24, -19], lock: 'coolant-return', settle: true },
  { id: 'proving-load', x: 92, z: -164, w: 8, d: 12, stops: [16, 22], lock: 'proving-transfer', settle: true },
  { id: 'final-load', x: 32, z: 84, w: 8, d: 12, stops: [-40, -34], lock: 'hearth-transfer', settle: true },
  { id: 'freight-platform', x: -6, z: -28, w: 12, d: 8, stops: [0, 5], lock: 'bridge-crane', settle: true },
];

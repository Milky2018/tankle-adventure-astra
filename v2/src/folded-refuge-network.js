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
  deck('optical-screen-track', 216, -8, 5, 16, 24, { region: 'optics' }),
  deck('sorter-track-head', 72, -36, 84, 8, 24, { region: 'testworks' }),
  deck('sorter-fast-track', 72, -28, 8, 72, 24, { rise: -24, region: 'transit' }),
  deck('sorter-track-foot', 30, 44, 50, 8, 0, { region: 'transit' }),
  deck('sorter-track-transit', 30, 32, 12, 20, 0, { region: 'transit' }),
  deck('overseer-service-door', -14, 58, 8, 28, -8, { region: 'foundry' }),
  deck('foundry-transit-neck', 6, 80, 24, 8, -8, { region: 'foundry' }),
  deck('foundry-transit-rise', 22, 36, 8, 44, 0, { rise: -8, region: 'foundry' }),
  deck('foundry-transit-head', 22, 28, 14, 8, 0, { region: 'transit' }),
  deck('arsenal-transit-head', -66, -60, 18, 12, 8, { region: 'transit' }),
  deck('arsenal-transit-ramp', -60, -48, 12, 32, 8, { rise: -8, region: 'transit' }),
  deck('arsenal-transit-walk', -60, -16, 12, 48, 0, { region: 'transit' }),
  deck('arsenal-transit-door', -48, 22, 16, 10, 0, { region: 'transit' }),
  deck('proving-inspection-head', 0, -158, 77, 8, 16, { region: 'testworks' }),
  deck('proving-inspection-ramp', 0, -150, 12, 64, 16, { rise: -16, region: 'testworks' }),
  deck('proving-inspection-foot', 0, -86, 12, 46, 0, { region: 'transit' }),
  // The engine bay now exits into its own run, instead of returning to receiving.
  deck('phoenix-engine-exit', 218, -120, 32, 12, 16, { region: 'testworks' }),
  deck('phoenix-departure', 232, -114, 12, 54, 16, { region: 'testworks' }),
  deck('phoenix-roof-rise', 232, -60, 12, 24, 16, { rise: 8, region: 'testworks' }),
  deck('phoenix-roof-apron', 156, -36, 88, 14, 24, { region: 'testworks' }),
  deck('coolant-roof-walk', 272, -28, 12, 140, 24, { region: 'circulation' }),
  deck('coolant-roof-boarding', 272, 100, 24, 12, 24, { region: 'circulation' }),
  deck('coolant-lower-boarding', 272, 112, 24, 12, -24, { region: 'circulation' }),
  deck('tower-garden-landing', 180, 154, 12, 12, 16, { region: 'garden' }),
  deck('tower-garden-walk', 140, 154, 40, 12, 16, { region: 'garden' }),
  deck('tower-garden-return', 140, 6, 12, 148, 16, { region: 'garden' }),
  deck('vestibule-approach', 116, -30, 40, 8, 24, { region: 'circulation' }),
  deck('vestibule-hot-lane', 116, -22, 12, 50, 24, { region: 'circulation' }),
  deck('vestibule-cool-lane', 132, -30, 12, 64, 24, { region: 'circulation' }),
  deck('vestibule-end', 116, 28, 28, 8, 24, { region: 'circulation' }),
  deck('vestibule-shaft-neck', 100, 26, 16, 6, 24, { region: 'furnace' }),
  deck('vestibule-shaft-boarding', 88, 28, 12, 12, 24, { region: 'furnace' }),
  deck('vestibule-shaft-foot', 76, 40, 12, 12, -40, { region: 'furnace' }),
  deck('vestibule-predecessor-walk', 76, 12, 12, 28, -40, { region: 'furnace' }),
  // The old deep shaft arrives on the Foundry service side, rather than at B.
  deck('old-shaft-top', 16, -12, 12, 8, -8, { region: 'foundry' }),
  deck('old-shaft-service', 14, -4, 8, 88, -8, { region: 'foundry' }),
];
export const refugeSolids = [
  { id: 'optical-screen', x: 219.2, y: 24, z: -5.5, w: 1, d: 3, h: 3, rail: { axis: 'z', min: -5.5, max: 2.5, release: 'optical-screen' } },
  gate('sorter', 72, -28, 8, 1, 24),
  gate('sorter', 72, 43, 8, 1, 0),
  gate('overseer-service', -14, 68, 8, 1, -8),
  gate('arena-foundry-service', -14, 57.5, 8, 1, -8, { arena: 'foundry' }),
  gate('arsenal-return', -60, -15, 12, 1, 0),
  gate('proving-inspection', 0, -149, 12, 1, 15.75),
  gate('foundry', 22, 77, 8, 1, -8),
  gate('phoenix-departure', 232, -70, 12, 1, 16, { phoenix: true }),
  gate('inner-thermal', 116, 22, 12, 1, 24, { red: true }),
  gate('inner-transit', 132, -20, 12, 1, 24),
  gate('last-cage', 14, 68, 8, 1, -8),
  gate('arena-foundry-shaft-north', 14, 33.5, 8, 1, -8, { arena: 'foundry' }),
  gate('arena-foundry-shaft', 14, 57.5, 8, 1, -8, { arena: 'foundry' }),
];
export const refugeControls = [
  { id: 'optical-screen', x: 214, y: 25.3, z: -10, kind: 'shot', mount: 'optical-screen', facing: [0,0,-1] },
  { id: 'coolant-bypass', x: 278, y: -22.7, z: 117, kind: 'shot', requires: 'coolant-return' },
  { id: 'inner-transit', x: 122, y: 25.3, z: 35, kind: 'shot', mount: 'inner-transit', requires: 'inner-thermal', facing: [0,0,1] },
  { id: 'proving-inspection', x: 65, y: 17.3, z: -154, kind: 'shot', requires: 'load', mount: 'proving-inspection', facing: [0,0,-1] },
  { id: 'overseer-service', x: -10, y: -6.7, z: 61, kind: 'shot', mount: 'overseer-service', facing: [0,0,-1] },
];
export const refugeFlags = ['optical-screen','coolant-bypass', 'proving-inspection', 'overseer-service', 'phoenix-departure'];

export const refugeLifts = [
  { id: 'foundry-loading-frame', x: -61, z: 44, w: 12, d: 12, stops: [-16, -10], lock: 'relay-west', settle: true },
  { id: 'furnace-service-lift', x: 88, z: 40, w: 12, d: 12, stops: [-40, 24], locks: ['inner-optics', 'inner-thermal'], lock: 'inner-optics' },
  { id: 'coolant-return-lift', x: 284, z: 100, w: 12, d: 12, stops: [-24, 24], lock: 'coolant-return' },
  { id: 'tower-descent', x: 180, z: 154, w: 12, d: 12, stops: [16, 40], lock: 'signal' },
  { id: 'rail-inspection-bridge', x: -160, z: -72, w: 8, d: 8, stops: [8, 14], lock: 'rail-crossing', settle: true },
  { id: 'coolant-maintenance-bridge', x: 300, z: 100, w: 12, d: 12, stops: [-24, -19], lock: 'coolant-return', settle: true },
  { id: 'proving-load', x: 92, z: -164, w: 8, d: 12, stops: [16, 22], lock: 'proving-transfer', settle: true },
  { id: 'final-load', x: 32, z: 84, w: 8, d: 12, stops: [-40, -34], lock: 'hearth-transfer', settle: true },
  { id: 'freight-platform', x: -6, z: -28, w: 12, d: 8, stops: [0, 5], lock: 'bridge-crane', settle: true },
];

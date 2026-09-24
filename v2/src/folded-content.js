import { circuitTargetKey } from './folded-signal-state.js';
import { mountedControlPosition } from './folded-control-housing.js';
import { openLiftShafts } from './folded-shafts.js';
import {
  refugeHives,
  refugeDecks,
  refugeSolids,
  refugeControls,
  refugeFlags,
  refugeLifts,
} from './folded-refuge-network.js';
import {
  explorationDecks,
  explorationBattles,
  explorationControls,
  explorationFlags,
  explorationPickups,
  explorationSolids,
  explorationEnemies,
} from './folded-exploration-layout.js';
import { UPGRADE_IDS } from './folded-upgrades.js';
import { arenaGates, bossReserves } from './folded-boss-arenas.js';
import { transportSolids } from './folded-transport.js';
import { sideDecks, sideGates, sideEnemies } from './folded-side-layout.js';
import {
  expansionBattles,
  expansionDecks,
  expansionSolids,
  expansionControls,
  expansionEnemies,
  expansionPickups,
  expansionFlags,
} from './folded-expansion-layout.js';
import {
  cityDecks,
  cityLifts,
  citySolids,
  cityControls,
  cityPickups,
  cityEnemies,
  cityFlags,
} from './folded-city-layout.js';
import { buildArchitecture, architectureIndex } from './folded-architecture.js';

const deck = (id, x, z, w, d, y, extra = {}) => ({ id, x, z, w, d, y, ...extra });
const authoredDecks = [
  deck('turntable', -16, 10, 32, 26, 0),
  deck('hub-entry', 30, -2, 12, 38, 0),
  deck('hub-entry-neck', 16, 26, 14, 10, 0),
  deck('transport-bridge', -6, -28, 12, 38, 0),
  deck('west-landing', -32, 22, 16, 12, 0),
  deck('garden-descent', -32, -2, 12, 24, -8, { rise: 8 }),
  deck('ferry-approach', -40, -14, 20, 12, -8),
  deck('ferry-cradle', -52, -14, 12, 16, -8),
  deck('launch-ramp', -52, 2, 12, 24, -8, { rise: -8 }),
  deck('launch-pool', -52, 16, 22, 18, -16, { water: true }),
  deck('canal-bend', -42, -10, 12, 32, -16, { water: true }),
  deck('bridge-underside', -42, -10, 74, 12, -16, { water: true }),
  deck('canal-landing', 28, -22, 12, 12, -16),
  deck('east-sill', 32, -22, 8, 22, -16),
  deck('bank-foot', 40, -22, 12, 10, -16),
  deck('bank-ascent', 40, -12, 12, 24, -16, { rise: 8 }),
  deck('garden-bank', 32, 12, 32, 16, -8),
  deck('sluice', 64, 12, 12, 16, -8, { water: true }),
  deck('rear-dock', 76, 12, 18, 16, -8),
  deck('gangway-west', 54, 24, 10, 14, -8),
  deck('gangway', 58, 30, 30, 8, -8),
  deck('gangway-east', 82, 24, 12, 14, -8),

  deck('common-benches', 104, -10, 24, 8, 0),
  deck('inspection-front', 68, -28, 12, 6, 0),
  deck('inspection-turn', 92, -22, 12, 20, 0, { water: true, region: 'garden' }),
  deck('inspection-channel', 68, -22, 36, 12, 0, { water: true, region: 'garden' }),
  deck('inspection-load-bed', 104, -18, 12, 8, 0),
  deck('inspection-tray-plinth', 118, -18, 10, 8, 0),
  deck('loading', -6, -40, 42, 12, 0),
  deck('freight', 36, -40, 40, 12, 0),
  deck('bench-ascent', 104, -42, 12, 24, 8, { rise: -8 }),
  deck('bench-head', 104, -56, 12, 14, 8),
  deck('carrier-landing', 64, -78, 52, 26, 8),
  deck('phoenix-cradle', 64, -94, 28, 16, 16),
  deck('bulkhead-ascent', 148, -92, 12, 90, 24, { rise: -24, region: 'transit' }),
  deck('roof-junction', 132, -40, 40, 18, 24),
  deck('roof-return', 26, -38, 118, 6, 24),
  deck('roof-walk', 29, -32, 6, 30, 24),
  deck('cage-landing', 16, -2, 22, 16, 24),
  deck('observatory-outlook', 172, -36, 24, 12, 24),
  deck('circulation-outlook', 156, -22, 12, 22, 24),
  ...cityDecks,
  ...expansionDecks,
  ...sideDecks,
  ...explorationDecks,
  ...refugeDecks,
];
export const foldedLiftDefs = structuredClone([
  { id: 'carrier', x: 72, z: -90, w: 12, d: 12, stops: [8, 16], lock: 'load' },
  { id: 'cage', x: 4, z: 10, w: 12, d: 12, stops: [0, 24], recess: 0.6 },
  ...cityLifts,
  ...refugeLifts,
]);
export const foldedDecks = openLiftShafts(authoredDecks, foldedLiftDefs);

// Bounds describe solid material, including the moving shutters while closed.
export const foldedSolids = structuredClone([
  { id: 'magnet', x: 68, z: -23, w: 12, d: 1, y: 0, h: 4, magnetic: true },
  { id: 'gangway', x: 69.5, z: 30, w: 1, d: 8, y: -8, h: 3 },
  { id: 'inspection-north-wall', x: 80, z: -23, w: 24, d: 1, y: 0, h: 5, permanent: true },
  { id: 'inspection-ascent-west', x: 103.8, z: -42, w: 0.2, d: 24, y: 0, h: 9, permanent: true },
  { id: 'inspection-ascent-east', x: 115.8, z: -42, w: 0.2, d: 24, y: 0, h: 9, permanent: true },
  { id: 'inspection-tray', x: 120, z: -16, w: 6, d: 6, y: 0, h: 4.8, permanent: true },
  { id: 'brake', x: 72, z: -78.5, w: 12, d: 1, y: 16, h: 2.5 },
  { id: 'guardian', x: 156, z: -16.5, w: 12, d: 1, y: 24, h: 4 },
  { id: 'bank-cover', x: 34, z: -5, w: 3, d: 3, y: -16, h: 2, permanent: true },
  { id: 'canal-cover', x: 29, z: -13, w: 2, d: 2, y: -16, h: 1.6, permanent: true },
  { id: 'bench-cover', x: 124, z: -7, w: 3, d: 4, y: 0, h: 2, permanent: true },
  { id: 'gangway-casing', x: 84.4, z: 28, w: 0.5, d: 6, y: -8, h: 3, permanent: true },
  ...explorationSolids,
  ...citySolids,
  ...expansionSolids,
  ...sideGates,
  ...transportSolids,
  ...arenaGates,
  ...refugeSolids,
]);
export const foldedControls = structuredClone([
  {
    id: 'rail-repair',
    x: -18,
    y: 1.4,
    z: 23,
    kind: 'magnet',
    ground: 0,
    destinations: [{ id: 'cargo-rail', x: -18, y: 0, z: 25 }],
    cable: {
      finish: [-2, 9.65, 18],
      risers: [
        [-11.35, 0.28, 8],
        [-11.35, 9.65, 8],
        [-2, 9.65, 8],
      ],
    },
  },
  {
    id: 'magnet',
    x: 74,
    y: 1.4,
    z: -24,
    kind: 'magnet',
    ground: 0,
    mount: 'magnet',
    facing: [0, 0, -1],
  },
  { id: 'gangway', x: 86, y: -6.6, z: 31, kind: 'shot', mount: 'gangway', facing: [1, 0, 0] },
  {
    id: 'load',
    x: 123,
    y: 6.8,
    z: -13,
    ground: 0,
    kind: 'shot',
    surface: 'top',
    effects: ['load', 'brake'],
    feeds: ['load'],
  },
  {
    id: 'cage',
    x: 150,
    y: 25.4,
    z: -23,
    kind: 'shot',
    requires: 'phoenix',
    facing: [0, 0, -1],
    circuit: [
      [150, 24.12, -23],
      [150, 24.12, -35],
      [32, 24.12, -35],
      [32, 24.12, 8],
      [16, 24.12, 8],
      [10, 24.12, 16],
    ],
  },
  ...cityControls,
  ...expansionControls,
  ...explorationControls,
  ...refugeControls,
]);
export const foldedHives = refugeHives;
export const foldedPickups = [
  ...explorationPickups,
  ...cityPickups.filter((p) => !expansionPickups.some((q) => q.id === p.id)),
  ...expansionPickups,
];
export const foldedEnemies = [
  { id: 'bank-gunner', x: 35, y: -16, z: -20, hp: 2, type: 'turret', encounter: 'garden-bank' },
  {
    id: 'bank-scout',
    x: 44,
    y: -16,
    z: -19,
    hp: 3,
    type: 'guard',
    magneticShield: true,
    encounter: 'garden-bank',
  },
  { id: 'dock-gunner', x: 89, y: -8, z: 17, hp: 3, type: 'artillery', encounter: 'rear-dock' },
  { id: 'dock-scout', x: 87, y: -8, z: 25, hp: 2, type: 'skirmisher', encounter: 'rear-dock' },
  {
    id: 'bench-guard',
    magneticShield: true,
    x: 86,
    y: 8,
    z: -61,
    hp: 3,
    type: 'guard',
    encounter: 'test-benches',
  },
  { id: 'bench-scout', x: 99, y: 8, z: -66, hp: 3, type: 'welder', encounter: 'test-benches' },
  { id: 'track-scout', x: 142, y: 16, z: -82, hp: 2, type: 'scout' },
  ...explorationEnemies,
  ...cityEnemies,
  ...expansionEnemies,
  ...sideEnemies,
  ...bossReserves,
];

// Compilation owns its copies; authored region definitions are never mutated.
const mounted = foldedControls.filter((control) => control.mount);
for (const control of mounted) {
  const body = foldedSolids.find((solid) => solid.id === control.mount);
  if (!body) throw new Error(`Missing mounted actuator: ${control.mount}`);
  Object.assign(control, mountedControlPosition(control, body));
  body.localControl = control.id;
}
// Bind recipient identity before any runtime lift or rail movement.
for (const target of [...foldedSolids, ...foldedControls, ...foldedLiftDefs]) {
  target.circuitKey = circuitTargetKey(target);
}
export const foldedBattles = [...expansionBattles, ...explorationBattles];
export const foldedArchitecture = buildArchitecture(foldedDecks, foldedLiftDefs);
export const architectureGrid = architectureIndex(foldedArchitecture.solids);
export const foldedFlags = [
  ...new Set([
    'sorter',
    'maintenance-started',
    'rail-crossing',
    'garden-bloom',
    'proving-endurance',
    'magnet',
    'freight',
    'gangway',
    'load',
    'brake',
    'cage',
    'launch',
    'optics',
    'pressure',
    'flotation',
    'phoenix',
    'rail-repair',
    ...refugeFlags,
    ...cityFlags,
    ...expansionFlags,
    ...explorationFlags,
    ...UPGRADE_IDS,
  ]),
];

for (const definition of [...foldedControls, ...foldedPickups, ...foldedLiftDefs]) {
  for (const flag of [
    ...(definition.effects || []),
    ...(definition.requires ? [definition.requires] : []),
    ...(definition.lock ? [definition.lock] : []),
    ...(definition.locks || []),
  ]) {
    if (!foldedFlags.includes(flag))
      throw new Error(`${definition.id} references unknown progression flag ${flag}`);
  }
}

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
for (const definitions of [
  foldedDecks,
  foldedLiftDefs,
  foldedSolids,
  foldedControls,
  foldedHives,
  foldedPickups,
  foldedEnemies,
  foldedBattles,
  foldedFlags,
  foldedArchitecture,
])
  freeze(definitions);

export const completionEffects = Object.freeze({ prototype: Object.freeze(['overdrive-return']) });

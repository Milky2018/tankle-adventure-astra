// Dispersed optional finds occupy existing side spaces, not a new acquisition loop.
export const explorationPickups = [
  {
    id: 'armor-foundry',
    upgrade: 'armor',
    x: -67,
    y: -16,
    z: 114,
    place: 'Behind the sorting drive',
  },
  {
    id: 'cannon-coil',
    upgrade: 'cannon',
    x: -187,
    y: 8,
    z: -92,
    place: 'Rail-shop stores',
    requires: 'stores-trial',
    preview: true,
  },
  {
    id: 'armor-reservoir',
    upgrade: 'armor',
    x: -169,
    y: -8,
    z: 99,
    place: 'Drydock maintenance recess',
  },
  {
    id: 'cooling-filter',
    upgrade: 'cooling',
    x: -123,
    y: -8,
    z: 84,
    place: 'Rear of the pump island',
  },
  {
    id: 'armor-proving',
    upgrade: 'armor',
    x: 91,
    y: 16,
    z: -139,
    place: 'Behind the receiving test bed',
  },
  {
    id: 'mortar-charge',
    upgrade: 'mortar',
    x: 195,
    y: 20,
    z: -142,
    place: 'Observation gallery end',
    requires: 'mortar-cache',
    preview: true,
  },
  {
    id: 'armor-lens',
    upgrade: 'armor',
    x: 269,
    y: 24,
    z: -94,
    place: 'Outer collimator inspection corner',
  },
  {
    id: 'laser-focus',
    upgrade: 'laser',
    x: 356,
    y: -24,
    z: 194,
    place: 'Separator maintenance side',
    requires: 'laser-cache',
    preview: true,
  },
  { id: 'armor-hearth', upgrade: 'armor', x: 150, y: -40, z: -8, place: 'Predecessor cooling bay' },
].map((p) => ({ ...p, hidden: true }));

// Bounds are shared by collision, occlusion and the visible machines. Keep the
// through lanes open; recesses, cover and paired threats give detours a purpose.
const machine = (id, kind, x, y, z, w, d, h = 2.5) => ({
  id,
  kind,
  x,
  y,
  z,
  w,
  d,
  h,
  permanent: true,
  exploration: true,
});
export const explorationSolids = [
  machine('stores-screen', 'rack', -188, 8, -87, 10, 2, 3.4),
  machine('stores-spare-hulls', 'rack', -176, 8, -92, 3, 8),
  machine('dispatch-stator', 'coil', -118, 8, 25, 5, 5, 2.8),
  machine('dispatch-pallets', 'rack', -134, 8, 30, 9, 3, 1.6),
  machine('drydock-filter', 'filter', -171, -8, 94, 5, 2, 2.6),
  machine('east-bank-valve', 'filter', -82, -8, 80, 3, 5, 2),
  machine('filter-spares', 'filter', -142, -8, 107, 6, 2, 1.7),
  machine('recoil-spares', 'rack', 66, 16, -164, 3, 8, 1.8),
  machine('impact-wreck', 'rack', 141, 16, -185, 6, 4, 2),
  machine('observation-cabinet', 'rack', 183, 20, -149.5, 3, 1.5, 2.4),
  machine('engine-exhaust', 'coil', 222, 16, -98, 5, 4, 3),
  machine('collimator-screen', 'optics', 266, 24, -92, 6, 2, 2.5),
  machine('lens-polishing-bench', 'optics', 332, 24, -65, 4, 3, 2),
  machine('emitter-coils', 'optics', 312, 24, -40, 5, 3, 2.5),
  machine('separator-service-pump', 'filter', 351, -24, 189, 4, 4, 3),
  machine('coolant-spare-jackets', 'filter', 353, -24, 174, 4, 5, 2.4),
  machine('hearth-tool-bench', 'rack', 148, -40, -4, 4, 2, 2.5),
  machine('service-compressor', 'filter', 114, 0, -1, 4, 3, 2),
  machine('service-stores', 'rack', 129, 0, 6, 5, 3, 2.4),
  machine('freight-side-cargo', 'rack', 107, 8, -112, 6, 3, 2.6),
  machine('freight-stator', 'coil', 131, 8, -103, 4, 2, 2.4),
  machine('yard-valves', 'filter', 163, -8, 37, 5, 4, 2.8),
  machine('yard-pump', 'filter', 180, -8, 48, 5, 3, 2.3),
];

export const explorationEnemies = [
  { id: 'service-lancer', type: 'sniper', x: 124, y: 0, z: 3, hp: 4, encounter: 'service-ambush' },
  {
    id: 'service-flanker',
    type: 'skirmisher',
    x: 116,
    y: 0,
    z: 7,
    hp: 4,
    encounter: 'service-ambush',
  },
  {
    id: 'freight-watch',
    type: 'sniper',
    x: 184,
    y: 24,
    z: -100,
    hp: 3,
    encounter: 'freight-cargo',
  },
  { id: 'freight-miner', type: 'miner', x: 139, y: 24, z: -97, hp: 4, encounter: 'freight-cargo' },
  {
    id: 'stores-shield',
    type: 'guard',
    magneticShield: true,
    x: -180,
    y: 8,
    z: -76,
    hp: 5,
    encounter: 'stores-patrol',
  },
  {
    id: 'stores-flanker',
    type: 'skirmisher',
    x: -171,
    y: 8,
    z: -85,
    hp: 3,
    encounter: 'stores-patrol',
  },
];

// Optional trials never close the approach or gate the main journey.
export const explorationBattles = [
  { id: 'stores-trial', battle: 'stores-trial', x: -184, y: 9.3, z: -80 },
];
for (const e of explorationEnemies.filter((e) => e.encounter === 'stores-patrol')) {
  e.battle = 'stores-trial';
  e.wave = 0;
}
explorationEnemies.push(
  {
    id: 'stores-reserve-lobber',
    type: 'artillery',
    x: -185,
    y: 8,
    z: -68,
    hp: 5,
    battle: 'stores-trial',
    wave: 1,
    encounter: 'stores-reserve',
  },
  {
    id: 'stores-reserve-scout',
    type: 'scout',
    x: -171,
    y: 8,
    z: -92,
    hp: 2,
    battle: 'stores-trial',
    wave: 1,
    encounter: 'stores-reserve',
  },
);
export const explorationControls = [
  { id: 'mortar-cache', kind: 'shot', surface: 'top', x: 183, y: 22.6, ground: 20, z: -142.5 },
  { id: 'laser-cache', kind: 'laser', frontOnly: true, x: 354, y: -22, z: 186, normal: [1, 0, 0] },
];
export const explorationMirrors = [
  {
    id: 'separator-service-mirror',
    x: 363,
    y: -22,
    z: 186,
    n: [Math.SQRT1_2, 0, Math.SQRT1_2],
    size: 6,
  },
];
explorationSolids.push(
  machine('mortar-cache-tray', 'rack', 181, 20, -144.5, 4, 4, 2.5),
  machine('laser-cache-baffle', 'optics', 356.5, -24, 181, 1.5, 3, 3.5),
  ...explorationPickups
    .filter((p) => p.requires)
    .map((p) => ({
      id: p.requires,
      x: p.x - 1.8,
      y: p.y,
      z: p.z - 1.8,
      w: 3.6,
      d: 3.6,
      h: 3,
      invisible: true,
      hidden: true,
    })),
);
export const explorationFlags = [...explorationBattles, ...explorationControls].map((c) => c.id);

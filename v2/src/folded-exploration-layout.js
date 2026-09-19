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
    x: -145,
    y: -8,
    z: 92,
    place: 'Visible reservoir inspection island',
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
    x: 240,
    y: 16,
    z: -124,
    place: 'Impact stores behind the fractured runout shutter',
    requires: 'impact-store',
    preview: true,
  },
  {
    id: 'mortar-charge',
    upgrade: 'mortar',
    x: 165,
    y: 20,
    z: -134,
    place: 'Counterweight inspection annex',
    requires: 'mortar-cache',
    preview: true,
  },
  {
    id: 'armor-lens',
    upgrade: 'armor',
    x: 269,
    y: 24,
    z: -94,
    place: 'Blue inspection drawer beneath the collimator',
    requires: 'collimator-drawer',
    preview: true,
  },
  {
    id: 'laser-focus',
    upgrade: 'laser',
    x: 348,
    y: -24,
    z: 193,
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
  machine('separator-service-pump', 'filter', 346, -24, 188, 2, 2, 3),
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
    id: 'stores-watch',
    type: 'sniper',
    patrol: { x: -153, z: -89, w: 10, d: 7 },
    x: -148,
    y: 8,
    z: -86,
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
    x: -187,
    y: 8,
    z: -52,
    hp: 5,
    battle: 'stores-trial',
    wave: 1,
    encounter: 'stores-reserve',
  },
  {
    id: 'stores-reserve-scout',
    type: 'scout',
    x: -144,
    y: 8,
    z: -94,
    hp: 2,
    battle: 'stores-trial',
    wave: 1,
    encounter: 'stores-reserve',
  },
);
explorationEnemies.push({
  id: 'stores-reserve-miner',
  type: 'miner',
  x: -169,
  y: 8,
  z: -92,
  hp: 3,
  battle: 'stores-trial',
  wave: 1,
  encounter: 'stores-reserve',
});
for (const e of explorationEnemies.filter((e) => e.battle === 'stores-trial'))
  e.activation = { x: -173, y: 8, z: -74, radius: 17 };

export const explorationControls = [
  {
    id: 'mortar-cache',
    kind: 'shot',
    surface: 'top',
    counterweight: true,
    x: 155.5,
    y: 22.6,
    ground: 20,
    z: -134.5,
  },
  {
    id: 'laser-cache',
    kind: 'laser',
    frontOnly: true,
    x: 354,
    y: -22,
    ground: -24,
    z: 193,
    normal: [1, 0, 0],
  },
  { id: 'collimator-drawer', kind: 'magnet', x: 270, y: 25.3, z: -89.5 },
];
export const explorationMirrors = [
  {
    id: 'separator-service-mirror',
    x: 364,
    y: -22,
    z: 193,
    n: [Math.SQRT1_2, 0, Math.SQRT1_2],
    size: 4,
  },
];
explorationSolids.push(
  machine('mortar-cache-tray', 'rack', 153.5, 20, -136.5, 4, 4, 2.5),
  { id: 'mortar-cache', x: 158, y: 20, z: -140.5, w: 6, d: 0.8, h: 3.5 },
  { id: 'impact-store', x: 228, y: 16, z: -128, w: 1, d: 8, h: 3.5, phoenix: true },
  machine('impact-store-north', 'rack', 226, 16, -128, 22, 0.6, 4),
  machine('impact-store-south', 'rack', 226, 16, -120.6, 22, 0.6, 4),
  machine('impact-store-end', 'rack', 247.4, 16, -128, 0.6, 8, 4),

  ...explorationPickups
    .filter((p) => p.requires && !['impact-store', 'mortar-cache'].includes(p.requires))
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
// Two small work spaces provide real approach and recovery room, without scaling
// the city or obstructing its existing through routes.
export const explorationDecks = [
  { id: 'reservoir-inspection-island', x: -149, y: -8, z: 88, w: 8, d: 8, region: 'garden' },
  { id: 'mortar-inspection-neck', x: 158, y: 20, z: -142, w: 6, d: 8, region: 'testworks' },
  {
    id: 'mortar-inspection-room',
    x: 152,
    y: 20,
    z: -138,
    w: 18,
    d: 8,
    region: 'testworks',
    district: 'inspection',
  },
  { id: 'impact-store-spur', x: 222, y: 16, z: -128, w: 26, d: 8, region: 'testworks' },
];
export const explorationRooms = explorationDecks.filter((d) => d.district);
const casing = (id, x, y, z, w, d, h, ground = y) => ({
  id,
  x,
  y,
  z,
  w,
  d,
  h,
  ground,
  permanent: true,
  theme: 'circulation',
});
explorationSolids.push(
  // An L-shaped optical housing: the Tank cannot enter its low light window.
  // The inner partition blocks direct diagonals to the receiver, including its rim.
  casing('optical-case-front', 352, -24, 190, 10.4, 0.6, 4),
  casing('optical-case-sill', 362.4, -24, 190, 4.6, 0.6, 1.2),
  casing('optical-case-lintel', 362.4, -21.2, 190, 4.6, 0.6, 1.2, -24),
  casing('optical-case-west', 352, -24, 190, 0.6, 6, 4),
  casing('optical-case-east', 367, -24, 190, 0.6, 6, 4),
  casing('optical-case-back', 352, -24, 195.4, 15.6, 0.6, 4),
  casing('optical-case-partition-front', 362, -24, 190, 0.4, 2.1, 4),
  casing('optical-case-partition-back', 362, -24, 194, 0.4, 2, 4),
  { ...casing('optical-case-roof', 352, -20, 190, 15.6, 6, 0.3, -24), mass: true },
  machine('stores-cross-cover', 'rack', -160, 8, -82, 4, 10, 2.6),
  {
    ...casing('stores-inspection-canopy', -158, 12.4, -92, 18, 14, 0.45, 8),
    theme: 'transit',
    mass: true,
  },
  ...[-157, -141].flatMap((x) =>
    [-91, -79].map((z) =>
      machine(`stores-canopy-post-${x}-${z}`, 'rack', x, 8, z, 0.45, 0.45, 4.4),
    ),
  ),
);
export const explorationFlags = [
  ...new Set(
    [
      ...explorationBattles,
      ...explorationControls,
      ...explorationSolids.filter((s) => !s.permanent),
    ].map((c) => c.id),
  ),
];

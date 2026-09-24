import { foldedFlags, foldedDecks } from '../content/compile.js';
import { migrateRefuge } from '../content/refuge-network.js';

const LEGACY_REWARD_ACCESS = [
  ['cannon-scope', 'scope-drawer'],
  ['armor-foundry', 'garden-bloom'],
  ['cannon-coil', 'cargo-battery'],
  ['armor-proving', 'impact-store'],
  ['mortar-charge', 'mortar-cache'],
  ['armor-lens', 'collimator-drawer'],
  ['laser-focus', 'signal'],
];

// Normalize durable progression only. There are no bodies, timers, mesh handles
// or emitted completion events during restoration.
export function migrateFoldedSave(saved = {}) {
  const state = {};
  for (const id of foldedFlags) state[id] = saved[id] === true;
  if (state.prototype || state.overdrive) state['overdrive-return'] = true;
  if (state.load) state.brake = true;
  if (state['loading-return']) state['bridge-crane'] = true;
  if (state.ballast) state.ratchet = true;
  if (state['relay-east']) state.relays = true;
  if (state['pressure-return']) state['pressure-thermal'] = true;
  if (state['inner-transit']) state['inner-thermal'] = true;
  if (state.keeper || state.endingSeen) state['core-feed'] = true;
  for (const [district, ability] of [
    ['arsenal', 'magnetModule'],
    ['reservoir', 'flotation'],
    ['proving', 'phoenix'],
    ['lens', 'laser'],
    ['coolant', 'circulation'],
    ['hearth', 'core-feed'],
  ]) {
    if (state[ability] || saved.anchor === `${district}-hive-3`)
      state[`${district}-transfer`] = true;
    if (
      ['proving', 'hearth'].includes(district) &&
      (state[ability] || saved.anchor === `${district}-hive-3`)
    )
      state[`${district}-endurance`] = true;
  }
  state.sorter = saved.sorter === true;
  state['maintenance-started'] = saved['maintenance-started'] === true;
  state.sidePuzzles = structuredClone(saved.sidePuzzles || {});
  if (saved.bossRouteRevision !== 1) {
    if (saved.sorter) state['roof-express'] = true;
    delete state.sidePuzzles.coverX;
  }
  state.bossRouteRevision = 1;
  state.pendingSignals = structuredClone(saved.pendingSignals || {});
  if (state.pendingSignals['relay-east']) state.pendingSignals['relay-east'].changes.relays = true;
  if (state.pendingSignals['loading-return'])
    state.pendingSignals['loading-return'].changes['bridge-crane'] = true;
  // Preserve the old indexed orientation, including an in-flight switch signal.
  state.mirrorTurns = {
    'return-index':
      saved.mirrorTurns?.['return-index'] ??
      (saved['mirror-index'] || saved.pendingSignals?.['mirror-index'] ? 1 : 0),
  };
  delete state.pendingSignals['mirror-index'];
  delete state.pendingSignals['prototype-inspection'];
  delete state.pendingSignals['overdrive-bypass'];
  delete state.pendingSignals['press-return'];
  state['rail-crossing'] = !!(saved.sidePuzzles?.rail?.solved || saved.sidePuzzles?.rail?.secured);
  state['garden-bloom'] = !!saved.sidePuzzles?.gutter?.grown;
  // Historical recovery rules are fixed to the released save format. Editing a
  // pickup prerequisite must never grant a newly introduced flag to old saves.
  for (const [reward, prerequisite] of LEGACY_REWARD_ACCESS)
    if (state[reward]) state[prerequisite] = true;
  // Preserve earned access in legacy saves without granting missing modules.
  if (
    saved.progressionRevision !== 2 &&
    saved.anchor &&
    (state.phoenix || state.laser || state.circulation)
  ) {
    state.pressure = true;
    state['phoenix-departure'] = true;
    state['proving-inspection'] = true;
    if (state.circulation) state['lens-return'] = true;
  }
  state.progressionRevision = 2;
  state.anchor = migrateRefuge(saved.anchor, state);
  state.discovered = Array.isArray(saved.discovered)
    ? saved.discovered.filter((id) => foldedDecks.some((d) => d.id === id))
    : ['turntable'];
  return state;
}

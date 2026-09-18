// Optional discoveries improve equipment, never unlock the main route.
export const UPGRADE_IDS = [
  'armor-foundry',
  'armor-reservoir',
  'armor-proving',
  'armor-lens',
  'armor-hearth',
  'cooling-filter',
  'cannon-coil',
  'mortar-charge',
  'laser-focus',
];
export function applyUpgrades(player, state) {
  player.armorPacks = UPGRADE_IDS.slice(0, 5).filter((id) => state[id]).length;
  player.coolingUpgrade = !!state['cooling-filter'];
  player.cannonUpgrade = !!state['cannon-coil'];
  player.mortarUpgrade = !!state['mortar-charge'];
  player.laserUpgrade = !!state['laser-focus'];
}
export const weaponDamage = (player, weapon, base) => base * (player[`${weapon}Upgrade`] ? 1.5 : 1);

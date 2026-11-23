const bossTypes = new Set(["prototype", "overseer", "sorter", "guardian", "keeper"]);
const enemyKinds = new Set([
  ...bossTypes,
  "hunter",
  "dredger",
  "scout",
  "turret",
  "guard",
  "skirmisher",
  "sniper",
  "artillery",
  "miner",
  "welder",
  "repairer",
  "reflector",
  "interceptor",
  "bastion",
  "siege",
  "prism",
  "flanker",
]);
const abilities = new Set([
  "overdrive",
  "magnet",
  "mortar",
  "flotation",
  "phoenix",
  "laser",
  "circulation",
]);
const upgrades = new Set([
  "armor",
  "cooling",
  "cannon",
  "mortar",
  "laser",
  "scope",
]);

export function validateCatalog(catalog) {
  function require(condition, message) {
    if (!condition) throw new Error(message);
  }
  function finite(value, path) {
    require(typeof value === "number" &&
      Number.isFinite(value), `${path} must be a finite number`);
  }
  for (const name of [
    "decks",
    "barriers",
    "obstacles",
    "architecture",
    "lifts",
    "enemies",
    "arenas",
    "controls",
    "hives",
    "pickups",
    "mirrors",
    "belts",
    "heat",
    "currents",
    "circuits",
  ]) {
    const records = catalog[name];
    require(Array.isArray(records), `${name} must be an array`);
    const keys = new Set();
    for (const [index, record] of records.entries()) {
      const path = `${name}[${record.id ?? index}]`;
      if (record.id != null) {
        require(typeof record.id === "string" &&
          record.id.length > 0, `${path}.id must be a nonempty string`);
        const key =
          name === "barriers"
            ? record.circuitKey
            : name === "decks"
              ? `${record.id}:${record.x}:${record.y}:${record.z}`
              : record.id;
        require(!keys.has(key), `${path} has a duplicate identity`);
        keys.add(key);
      }
      if (name !== "circuits")
        for (const axis of ["x", "y", "z"])
          finite(
            axis === "y" && name === "lifts" ? record.stops?.[0] : record[axis],
            `${path}.${axis}`,
          );
      for (const axis of ["w", "d", "h"])
        if (record[axis] != null) {
          finite(
            axis === "y" && name === "lifts" ? record.stops?.[0] : record[axis],
            `${path}.${axis}`,
          );
          require(record[axis] > 0, `${path}.${axis} must be positive`);
        }
      if (name === "enemies") {
        require(enemyKinds.has(
          record.type,
        ), `${path}.type is unknown: ${record.type}`);
        require(!("variant" in record || "guardian" in record),
          `${path} must identify its machine with type alone`);
        if (record.openingCrossing != null) {
          finite(record.openingCrossing, `${path}.openingCrossing`);
          require(record.openingCrossing >= 0, `${path}.openingCrossing cannot be negative`);
        }
        finite(record.hp, `${path}.hp`);
        require(record.hp > 0, `${path}.hp must be positive`);
      }
      if (name === "pickups")
        require(abilities.has(record.ability) ||
          upgrades.has(
            record.upgrade,
          ), `${path} needs a supported ability or upgrade`);
      if (name === "lifts") {
        require(record.stops?.length >= 2, `${path} needs at least two stops`);
        record.stops.forEach((value) => finite(value, `${path}.stops`));
      }
      if (name === "controls") {
        require(["shot", "magnet", "laser", "use", "dock"].includes(
          record.kind,
        ), `${path}.kind is unknown`);
        if (record.effects != null)
          require(Array.isArray(record.effects) &&
            record.effects.length > 0 &&
            record.effects.every(
              (value) => typeof value === "string" && value.trim().length > 0,
            ), `${path}.effects must contain at least one signal`);
        if (record.weapons)
          require(record.weapons.every((value) =>
            ["cannon", "mortar", "laser", "magnet", "use", "dock"].includes(
              value,
            ),
          ), `${path}.weapons contains an unsupported action`);
      }
      if (name === "circuits") {
        finite(record.duration, `${path}.duration`);
        require(record.duration >= 0, `${path}.duration cannot be negative`);
      }
    }
  }
  const clearSignals = new Set();
  for (const circuit of catalog.circuits) {
    if (circuit.clearedBattle == null) continue;
    require(catalog.enemies.some((e) => e.battle === circuit.clearedBattle),
      `Circuit ${circuit.id} refers to unknown battle ${circuit.clearedBattle}`);
    require(!clearSignals.has(circuit.clearedBattle),
      `Battle ${circuit.clearedBattle} has multiple clear signals`);
    clearSignals.add(circuit.clearedBattle);
  }
  const assignedBosses = new Set();
  for (const arena of catalog.arenas) {
    require(typeof arena.id === "string" && arena.id.length > 0, "Arena needs an id");
    const boss = catalog.enemies.find((e) => e.id === arena.boss);
    require(bossTypes.has(boss?.type), `Arena ${arena.id} needs a placed boss: ${arena.boss}`);
    require(!assignedBosses.has(arena.boss), `Boss ${arena.boss} has multiple arenas`);
    assignedBosses.add(arena.boss);
    require(typeof arena.music === "string" && arena.music.length > 0, `Arena ${arena.id} needs music`);
    require(arena.w > 0 && arena.d > 0, `Arena ${arena.id} needs a footprint`);
    if (arena.victoryEffects != null)
      require(Array.isArray(arena.victoryEffects) && arena.victoryEffects.every((id) => typeof id === "string" && id.length > 0),
        `Arena ${arena.id} needs valid victory signals`);
    if (arena.cover != null)
      require(catalog.obstacles.some((o) => o.id === arena.cover && o.rail),
        `Arena ${arena.id} needs a rail-mounted cover: ${arena.cover}`);
  }
  for (const belt of catalog.belts) {
    if (belt.drive == null) continue;
    const owner = catalog.enemies.find((e) => e.id === belt.drive.enemy);
    require(Number.isInteger(belt.drive.part) && belt.drive.part >= 0 &&
      belt.drive.part < (owner?.parts?.length ?? 0), `Belt ${belt.id} needs an existing drive part`);
  }
  const lifts = new Set(catalog.lifts.map((record) => record.id));
  for (const pickup of catalog.pickups)
    if (pickup.lift)
      require(lifts.has(
        pickup.lift,
      ), `Unknown lift ${pickup.lift} for pickup ${pickup.id}`);
  require(catalog.hives.length >
    0, "At least one repair hive is required for spawning");
  for (const belt of catalog.belts)
    require(Array.isArray(
      catalog["belt-segments"][belt.id],
    ), `Missing conveyor geometry metadata: ${belt.id}`);
  return true;
}

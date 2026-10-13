const enemyKinds = new Set([
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
  "elite",
  "boss",
]);
const variants = new Set([
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
        require(record.variant == null ||
          variants.has(record.variant), `${path}.variant is unknown`);
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

export function validateTuning(tuning) {
  const fields = {
    cannon: ["damage", "heat", "cooldown", "range", "speed"],
    mortar: ["damage", "heat", "cooldown", "range", "speed", "duration", "arc"],
    laser: ["damagePerSecond", "heatPerSecond", "range", "segments"],
    magnet: ["range", "lockedRange", "idleHeatPerSecond", "pullHeatPerSecond"],
    drive: [
      "speed",
      "overdrive",
      "phoenix",
      "boostHeatPerSecond",
      "accelerationTime",
      "decelerationTime",
    ],
  };
  for (const section of Object.keys(tuning))
    if (!(section in fields))
      throw new Error(`Unknown abilities section: ${section}`);
  for (const [section, keys] of Object.entries(fields)) {
    const values = tuning[section] ?? {};
    for (const key of Object.keys(values))
      if (!keys.includes(key))
        throw new Error(`Unknown abilities.${section}.${key}`);
    for (const key of keys)
      if (!Number.isFinite(values[key]) || values[key] <= 0)
        throw new Error(
          `abilities.${section}.${key} must be a positive number`,
        );
  }
  if (!Number.isInteger(tuning.laser.segments))
    throw new Error("abilities.laser.segments must be an integer");
}

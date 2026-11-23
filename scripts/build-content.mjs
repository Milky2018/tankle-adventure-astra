// Compile editable content into typed constants. Generated files are build outputs;
// gameplay behavior remains hand-written MoonBit.
import { readFileSync, writeFileSync } from "node:fs";
import { buildRuntimeArt } from "./content/runtime-art.mjs";
import { checkContent } from "./check-content.mjs";
import { circuitKey } from "./content/catalog.mjs";
const read = (name) =>
  JSON.parse(readFileSync(`content/levels/city/${name}.json`, "utf8"));
await checkContent("simulation/tuning.generated.mbt");
const circuitTargetKey = circuitKey;
const content = {
  foldedDecks: read("decks"),
  foldedSolids: read("barriers"),
  foldedArchitecture: { solids: read("architecture") },
  foldedLiftDefs: read("lifts"),
  foldedEnemies: read("enemies"),
  foldedControls: read("controls"),
  foldedHives: read("hives"),
  foldedPickups: read("pickups"),
  foldedMirrors: read("mirrors"),
};
const sideObstacles = read("obstacles");

const str = JSON.stringify;
const optional = (value) => (value == null ? "None" : `Some(${str(value)})`);
const rect = (r) => `{ x: ${r.x}, z: ${r.z}, w: ${r.w}, d: ${r.d} }`;
const solid = (s) =>
  `{ id: ${str(s.id ?? "")}, rect: ${rect(s)}, y: ${s.y}, h: ${s.h}, shutter_height: None, permanent: ${!!s.permanent}, motion: ${s.motion ? `Some({ axis: ${s.motion.axis.toUpperCase()}, min: ${s.motion.min}, max: ${s.motion.max}, speed: ${s.motion.speed} })` : "None"}, direction: 1, red: ${!!s.red}, phoenix: ${!!s.phoenix}, rail: ${s.rail ? `Some({axis: ${s.rail.axis.toUpperCase()}, min: ${s.rail.min}, max: ${s.rail.max}, release: ${optional(s.rail.release)}, latch: ${optional(s.rail.latch)}})` : "None"}, arena: ${optional(s.arena)}, local_control: ${optional(s.localControl)}, circuit_key: ${str(circuitTargetKey(s))} }`;
const arrayFn = (name, type, values, print) => {
  if (values.length > 256) {
    const parts = [];
    for (let i = 0; i < values.length; i += 256)
      parts.push(
        arrayFn(
          `${name}_${i / 256}`,
          type,
          values.slice(i, i + 256),
          print,
        ).replace("pub fn", "fn"),
      );
    return (
      parts.join("\n") +
      `\n///|\npub fn ${name}() -> Array[${type}] {\nlet items : Array[${type}] = []\n${parts.map((_, i) => `for item in ${name}_${i}() {items.push(item)}`).join("\n")}\nitems\n}\n`
    );
  }
  return `///|\npub fn ${name}() -> Array[${type}] {\n[\n${values
    .map(print)
    .map((s) => `  ${s},`)
    .join("\n")}\n]\n}\n`;
};
const mapRegions = {
  foundry: "Recycling Foundry", transit: "Freight Exchange", garden: "Sunken Gardens",
  testworks: "Proving Grounds", optics: "Silent Observatory", circulation: "Circulation Works",
  furnace: "Central Furnace",
};
const deck = (d) => {
  const name = mapRegions[d.region] ?? d.id.replace(/^prototype-/, "scrap-ram-").replaceAll("-", " ").replace(/\b\w/g, c => c.toUpperCase());
  return `{ id: ${str(d.id)}, map_label: ${str(name)}, rect: ${rect(d)}, y: ${d.y}, rise: ${d.rise ?? 0}, water: ${!!d.water} }`;
};
writeFileSync(
  "simulation/level-world.generated.mbt",
  "// Generated from content/levels/city. Run npm run build:content; do not edit.\n\n" +
    [
      arrayFn(
        "authored_decks",
        "Deck",
        content.foldedDecks,
        deck,
      ),
      arrayFn("authored_arenas", "Arena", read("arenas"), (a) =>
        `{id:${str(a.id)},boss:${str(a.boss)},rect:${rect(a)},y:${a.y},cover:${optional(a.cover)},music:${str(a.music)},victory_effects:[${(a.victoryEffects ?? []).map(str)}]}`,
      ),
      arrayFn("authored_solids", "Solid", content.foldedSolids, solid),
      arrayFn("authored_obstacles", "Solid", sideObstacles, solid),
      arrayFn(
        "authored_architecture",
        "Solid",
        content.foldedArchitecture.solids,
        solid,
      ),
      arrayFn(
        "authored_lifts",
        "Lift",
        content.foldedLiftDefs,
        (l) =>
          `{ id: ${str(l.id)}, rect: ${rect(l)}, stops: [${l.stops}], lock: ${str(l.lock ?? l.id)}, locks: [${(l.locks ?? []).map(str)}], circuit_key: ${str(circuitTargetKey(l))}, settle: ${!!l.settle}, y: ${l.settle ? l.stops.at(-1) : l.stops[0]}, destination: ${l.stops[0]}, wait: 0 }`,
      ),
      `///|\npub fn authored_world() -> World {\nlet architecture = authored_architecture()\n{ decks: authored_decks(), solids: authored_solids(), obstacles: authored_obstacles(), architecture, architecture_grid: architecture_grid(architecture), lifts: authored_lifts() }\n}\n`,
    ].join("\n"),
);
const name = (s) => s[0].toUpperCase() + s.slice(1);
const vec3 = (p) => `{ x: ${p.x}, y: ${p.y}, z: ${p.z} }`;
const numberOption = (n) => (n == null ? "None" : `Some(${n})`);
const enemy = (e) => `{
  id: ${str(e.id)}, kind: ${e.type === "prototype" ? "ScrapRam" : name(e.type)}, spawn: ${vec3(e)}, hp: ${e.hp},
  persistent: ${!!e.persistent}, emplacement: ${!!e.emplacement}, magnetic_shield: ${!!e.magneticShield}, coordinated: ${!!e.coordinated},
  encounter: ${optional(e.encounter)}, battle: ${optional(e.battle)}, wave: ${e.wave ?? 0}, startup: ${numberOption(e.startup)}, opening_crossing: ${e.openingCrossing ?? 0},
  spotter_height: ${numberOption(e.spotterHeight)}, detection_range: ${numberOption(e.detectionRange)}, patrol: ${e.patrol ? `Some(${rect(e.patrol)})` : "None"},
  activation: ${e.activation ? `Some({ position: ${vec3(e.activation)}, radius: ${e.activation.radius} })` : "None"},
  swim_patrol: [${(e.swimPatrol ?? []).map((p) => `{x:${p[0]},z:${p[1]}}`)}], part_hp: [${e.parts ?? []}], core: ${numberOption(e.core)}, mirror: ${!!e.mirror}, reserve_for: ${optional(e.reserveFor)}, reserve_at: ${e.reserveAt ?? 0}
}`;
writeFileSync(
  "simulation/level-enemies.generated.mbt",
  "// Authored enemy definitions. Runtime state is constructed by Enemy::new.\n\n" +
    arrayFn("authored_enemies", "EnemyDef", content.foldedEnemies, enemy),
);

const action = (k) =>
  ({
    cannon: "CannonAction",
    mortar: "MortarAction",
    laser: "LaserAction",
    magnet: "MagnetAction",
    use: "Use",
    dock: "Dock",
  })[k];
const optionalVec = (v) =>
  v ? `Some({x:${v[0]},y:${v[1]},z:${v[2]}})` : "None";
const acquisition = (p) =>
  p.ability
    ? {
        overdrive: "Overdrive",
        magnet: "Magnet",
        mortar: "MortarModule",
        flotation: "Flotation",
        phoenix: "Phoenix",
        laser: "LaserModule",
        circulation: "Circulation",
      }[p.ability]
    : {
        armor: "Armor",
        cooling: "Cooling",
        cannon: "CannonCoil",
        mortar: "MortarCharge",
        laser: "LaserFocus",
        scope: "Scope",
      }[p.upgrade];
writeFileSync(
  "simulation/level-controls.generated.mbt",
  [
    arrayFn(
      "authored_controls",
      "Control",
      content.foldedControls,
      (c) =>
        `{id:${str(c.id)},position:${vec3(c)},ground:${c.ground ?? c.y - 1.3},actions:[${(c.weapons ?? (c.kind === "shot" ? ["cannon", "mortar", "laser"] : [c.kind])).map(action)}],requires:${optional(c.requires)},effects:[${(c.effects ?? [c.id]).map(str)}],circuit_key:${str(circuitTargetKey(c))},mount:${optional(c.mount)},facing:${optionalVec(c.facing)},optical_normal:${optionalVec(c.normal)},top:${c.surface === "top"},rotor:${!!c.rotor},counterweight:${!!c.counterweight},flash:0,pull:0}`,
    ),
    arrayFn(
      "authored_hives",
      "Hive",
      content.foldedHives,
      (h) =>
        `{id:${str(h.id)},name:${str(h.name)},position:${vec3(h)},heading:${h.heading ?? Math.PI},requires:${optional(h.requires)}}`,
    ),
    arrayFn(
      "authored_pickups",
      "Pickup",
      content.foldedPickups,
      (p) =>
        `{id:${str(p.id)},position:${vec3(p)},acquisition:${acquisition(p)},requires:${optional(p.requires)},lift:${optional(p.lift)},hidden:${!!p.hidden},preview:${!!p.preview}}`,
    ),
    arrayFn(
      "authored_mirrors",
      "Mirror",
      content.foldedMirrors,
      (m) =>
        `{id:${str(m.id)},position:${vec3(m)},base_normal:{x:${m.n[0]},y:${m.n[1]},z:${m.n[2]}},size:${m.size},turnable:${!!m.turnable},flash:0,angle:0}`,
    ),
  ].join("\n"),
);
const circuits = read("circuits");
writeFileSync(
  "simulation/level-circuits.generated.mbt",
  [arrayFn(
    "authored_circuits",
    "Circuit",
    circuits,
    (c) =>
      `{id:${str(c.id)},duration:${c.duration},branches:[${c.branches.map((b) => `{key:${str(b.key)},target:${str(b.target)},duration:${b.duration}}`)}]}`,
  ), `///|
fn authored_battle_signals() -> Map[String, String] {
{${circuits
    .filter((c) => c.clearedBattle != null)
    .map((c) => `${str(c.clearedBattle)}:${str(c.id)}`)
    .join(",")}}
}
`].join("\n"),
);
const belt = (b) =>
  `{deck:${deck(b)},velocity:{x:${b.vx ?? 0},z:${b.vz ?? 0}},heat:${b.heat ?? 0},release:${optional(b.release)},stop:${optional(b.stop)},drive:${b.drive ? `Some({enemy:${str(b.drive.enemy)},part:${b.drive.part}})` : "None"}}`;
writeFileSync(
  "simulation/level-motion.generated.mbt",
  [
    arrayFn("authored_belts", "Belt", read("belts"), belt),
    arrayFn("authored_heat", "Belt", read("heat"), belt),
    arrayFn(
      "authored_currents",
      "Current",
      read("currents"),
      (c) =>
        `{rect:${rect(c)},y:${c.y},velocity:{x:${c.current.x},z:${c.current.z}},sluice:${optional(c.sluice)},diverted:{x:${c.diverted?.x ?? 0},z:${c.diverted?.z ?? 0}}}`,
    ),
  ].join("\n"),
);

const segments = read("belt-segments");
writeFileSync(
  "renderer/belt-data.generated.mbt",
  `///|
fn belt_segments() -> Map[String, Array[(Double, Int32)]] {
{${Object.entries(segments)
    .map(
      ([id, parts]) =>
        `${str(id)}:[${parts.map(([travel, heaters]) => `(${travel},${heaters})`)}]`,
    )
    .join(",\n")}}
}
`,
);
buildRuntimeArt("content/art", "public/generated/art", content.foldedSolids, content.foldedControls);
await import("./sound-data.mjs");

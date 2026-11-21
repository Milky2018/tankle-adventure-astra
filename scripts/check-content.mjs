import { readFileSync, readdirSync } from "node:fs";
import { validateCatalog, validateTuning } from "./content/validate.mjs";
import { readScene, walk } from "./content/scene.mjs";
const directory = "content/levels/city";
const catalog = Object.fromEntries(
  readdirSync(directory)
    .filter((name) => name.endsWith(".json"))
    .map((name) => [
      name.slice(0, -5),
      JSON.parse(readFileSync(`${directory}/${name}`)),
    ]),
);
validateCatalog(catalog);
validateTuning(JSON.parse(readFileSync("content/abilities.json", "utf8")));
const bindings = new Set();
walk(readScene().object, (object) => {
  if (object.matrix?.some((value) => !Number.isFinite(value)))
    throw new Error(`Invalid scene transform: ${object.name ?? object.uuid}`);
  const binding = object.userData?.binding;
  if (!binding) return;
  if (bindings.has(binding))
    throw new Error(`Duplicate scene binding: ${binding}`);
  bindings.add(binding);
});
const required = [
  ...["root", "body", "turret", "barrel"].map((role) => `player/${role}`),
  ...catalog.enemies.flatMap((enemy) =>
    ["root", "body", "turret"].map(
      (role) => `enemies/${enemy.id}/model/${role}`,
    ),
  ),
  ...catalog.hives.map((hive) => `world/hives/${hive.id}/root`),
];
for (const binding of required)
  if (!bindings.has(binding))
    throw new Error(
      `Missing scene role: ${binding}. Add its bound art before building.`,
    );
console.log("Content definitions are valid.");

import { readFileSync, readdirSync } from "node:fs";
import { validateCatalog } from "./content/validate.mjs";
import { readScene, walk } from "./content/scene.mjs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runTuning } from "./content/tuning.mjs";

export async function checkContent(output, checkScene = true) {
  const args = [resolve("content/abilities.json")];
  if (output) args.push(resolve(output));
  await runTuning(args);
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
  if (!checkScene) return;
  const bindings = new Set();
  const scene = readScene();
  const geometryIds = new Set(scene.geometries.map((geometry) => geometry.uuid));
  walk(scene.object, (object) => {
    if (object.geometry && !geometryIds.has(object.geometry))
      throw new Error(`Missing geometry ${object.geometry} for ${object.name ?? object.uuid}`);
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
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url))
  await checkContent();

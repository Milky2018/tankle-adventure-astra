import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateCatalog } from "../../scripts/content/validate.mjs";

const city = new URL("../../content/levels/city/", import.meta.url);
const catalog = Object.fromEntries(
  readdirSync(city).filter((file) => file.endsWith(".json"))
    .map((file) => [file.slice(0, -5), JSON.parse(readFileSync(new URL(file, city)))]),
);

test("arena bindings accept distinct instance IDs and reject missing bosses or covers", () => {
  const data = structuredClone(catalog);
  const arena = data.arenas.find((a) => a.id === "sorter");
  arena.id = "freight-test";
  assert.doesNotThrow(() => validateCatalog(data));
  arena.cover = "absent";
  assert.throws(() => validateCatalog(data), /rail-mounted cover/);
  delete arena.cover;
  arena.boss = data.enemies.find((e) => e.type === "turret").id;
  assert.throws(() => validateCatalog(data), /placed boss/);
});

test("machinery rejects references to missing boss parts and encounter groups", () => {
  const data = structuredClone(catalog);
  const belt = data.belts.find((b) => b.drive);
  const part = belt.drive.part;
  belt.drive.part = 200;
  assert.throws(() => validateCatalog(data), /existing drive part/);
  belt.drive.part = part;
  data.circuits.find((c) => c.clearedBattle).clearedBattle = "absent";
  assert.throws(() => validateCatalog(data), /unknown battle/);
});

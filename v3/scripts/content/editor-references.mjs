import { existsSync, readdirSync, readFileSync } from "node:fs";
import { entityKey } from "../../editor/entity-data.js";

// Advisory deletion impact. References are kept intact, never silently rewritten.
export function editorReferences(catalog) {
  const result = {};
  const sources = existsSync("simulation")
    ? readdirSync("simulation")
        .filter(
          (name) =>
            name.endsWith(".mbt") && !/generated|_test|_wbtest/.test(name),
        )
        .map((name) => [name, readFileSync(`simulation/${name}`, "utf8")])
    : [];
  function mentions(value, id, field = "") {
    if (field === "id") return false;
    if (typeof value === "string")
      return value === id || value.startsWith(id + ":");
    if (value && typeof value === "object")
      return Object.entries(value).some(([key, child]) =>
        mentions(child, id, key),
      );
    return false;
  }
  for (const collection of ["enemies", "controls", "pickups"])
    for (const record of catalog[collection]) {
      const refs = [];
      for (const [name, records] of Object.entries(catalog)) {
        if (!Array.isArray(records)) continue;
        for (const other of records)
          if (other !== record && mentions(other, record.id))
            refs.push(`${name}: ${other.id ?? "unnamed"}`);
      }
      if (catalog.circuits.some((circuit) => circuit.id === record.id))
        refs.push(`circuits: ${record.id}`);
      for (const [name, source] of sources)
        if (source.includes(JSON.stringify(record.id)))
          refs.push(`simulation/${name}`);
      result[entityKey({ collection, id: record.id })] = [...new Set(refs)];
    }
  return result;
}

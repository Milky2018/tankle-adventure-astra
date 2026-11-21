// Explicit authoring operation: refresh the standalone palette from chosen city assets.
// Normal game/editor builds never regenerate it, so removing a level instance cannot remove a template.
import { readFileSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { exportProject } from "./scene-editor.mjs";
import { selectResources } from "./content/scene.mjs";
import { belongsTo, entityPrefix } from "../editor/entity-data.js";
const definitions = JSON.parse(readFileSync("content/editor/templates.json"));
const project = exportProject();
const selected = [];
for (const definition of definitions) {
  const root = project.scene.object.children.find(
    (object) =>
      object.userData?.entity?.collection === definition.collection &&
      object.userData.entity.id === definition.source,
  );
  if (!root)
    throw new Error(
      `Missing template source ${definition.collection}:${definition.source}`,
    );
  const prefix = entityPrefix(root.userData.entity);
  selected.push(
    ...project.scene.object.children.filter((object) =>
      belongsTo(object.userData?.binding, prefix),
    ),
  );
}
const scene = selectResources(project.scene, {
  ...project.scene.object,
  userData: {},
  children: [...new Set(selected)],
});
writeFileSync(
  "content/editor/templates.scene.json.gz",
  gzipSync(JSON.stringify(scene)),
);
console.log(`Prepared ${definitions.length} independent object templates.`);

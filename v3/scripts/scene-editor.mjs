import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { dirname } from "node:path";
import { createHash } from "node:crypto";
import {
  HemisphereLight,
  DirectionalLight,
  Matrix4,
  PerspectiveCamera,
  Vector3,
} from "three";
import {
  readScene,
  writeScene,
  walk,
  selectResources,
} from "./content/scene.mjs";
import { validateCatalog } from "./content/validate.mjs";
import { editorReferences } from "./content/editor-references.mjs";
import {
  editableCollections,
  entityKey,
  entityPrefix,
  belongsTo,
  requiredEntityBindings,
  validateNewIdentity,
} from "../editor/entity-data.js";

import {
  collisionCollections,
  collisionObject,
  collisionResources,
  resizeCollision,
} from "./content/colliders.mjs";

const directory = "content/levels/city";
const readCatalog = () =>
  Object.fromEntries(
    readdirSync(directory)
      .filter((name) => name.endsWith(".json"))
      .map((name) => [
        name.slice(0, -5),
        JSON.parse(readFileSync(`${directory}/${name}`)),
      ]),
  );
function revision() {
  const hash = createHash("sha256");
  for (const name of readdirSync(directory).sort())
    hash.update(readFileSync(`${directory}/${name}`));
  hash.update(readFileSync("content/art/city.scene.json.gz"));
  hash.update(readFileSync("content/art/city.buffers.bin.gz"));
  return hash.digest("hex");
}
function transforms(scene) {
  const result = new Map();
  walk(scene, (object, parent) => {
    const local = new Matrix4().fromArray(
      object.matrix ?? new Matrix4().elements,
    );
    result.set(
      object.uuid,
      parent ? result.get(parent.uuid).clone().multiply(local) : local,
    );
  });
  return result;
}
function recordFor(catalog, entity) {
  if (
    Number.isInteger(entity.index) &&
    collisionCollections.has(entity.collection)
  ) {
    const record = catalog[entity.collection]?.[entity.index];
    return record?.id === entity.id ? record : undefined;
  }
  return catalog[entity.collection]?.find(
    (record) =>
      (entity.collection === "barriers" ? record.circuitKey : record.id) ===
      entity.key,
  );
}
export function exportProject(selection, { colliders = false } = {}) {
  const scene = readScene();
  const catalog = readCatalog();
  const world = transforms(scene.object);
  let prefix;
  let collision;
  if (selection && selection !== "player") {
    let entity;
    walk(scene.object, (object) => {
      const e = object.userData?.entity;
      if (e && `${e.collection}:${e.id}` === selection) entity = e;
    });
    if (!entity) {
      const [collection, id] = selection.split(":");
      const matches = collisionCollections.has(collection)
        ? catalog[collection].filter((value) => value.id === id)
        : [];
      if (matches.length > 1)
        throw new Error(
          `Ambiguous collider ${selection}. Give these records unique IDs in the catalog before exporting.`,
        );
      const record = matches[0];
      if (record) {
        collision = collisionObject(collection, record);
        collisionResources(scene);
        world.set(collision.uuid, new Matrix4().fromArray(collision.matrix));
        entity = collision.userData.entity;
      }
    }
    if (!entity)
      throw new Error(
        `Unknown entity ${selection}. Use scene:export -- --list to see available objects.`,
      );
    prefix = entityPrefix(entity);
  } else if (selection === "player") prefix = "player";
  const roots = [];
  function select(object, selectedParent = false) {
    const binding = object.userData?.binding;
    const selected =
      !prefix || binding === prefix || binding?.startsWith(prefix + "/");
    if (selected && !selectedParent && object !== scene.object) {
      roots.push(structuredClone(object));
      roots.at(-1).matrix = world.get(object.uuid).toArray();
      return;
    }
    for (const child of object.children ?? [])
      select(child, selectedParent || (selected && object !== scene.object));
  }
  if (collision) roots.push(collision);
  else select(scene.object);
  if (colliders && !collision) {
    collisionResources(scene);
    for (const collection of collisionCollections) {
      catalog[collection].forEach((record, index) => {
        const helper = collisionObject(collection, record);
        // Export revision freezes this array slot, including decks sharing an ID.
        helper.userData.entity.index = index;
        roots.push(helper);
        world.set(helper.uuid, new Matrix4().fromArray(helper.matrix));
      });
    }
  }
  const object = {
    ...scene.object,
    children: roots,
    matrix: new Matrix4().toArray(),
    userData: {
      ...scene.object.userData,
      tankle: {
        version: 1,
        fullScene: !selection,
        revision: revision(),
        references: editorReferences(catalog),
        roots: roots
          .filter((root) => !root.userData?.editorOnly)
          .map((root) => root.uuid),
      },
    },
  };
  walk(object, (node) => {
    node.matrixAutoUpdate = true;
    // Three r185/r186 ObjectLoader reads underscored free-list keys, while
    // Object3D.toJSON writes the public names. Supply both for editor saves.
    if (node.type === "BatchedMesh") {
      node._availableInstanceIds = node.availableInstanceIds;
      node._availableGeometryIds = node.availableGeometryIds;
    }
    if (/^(enemies|world)\/(?:[^/]+\/)?\d+(\/|$)/.test(node.name ?? ""))
      node.name = node.userData?.binding ?? node.name;
    const entity = node.userData?.entity;
    if (!entity) return;
    const record = recordFor(catalog, entity);
    if (!record) throw new Error(`Missing ${entity.collection}:${entity.key}`);
    const { x, y, z, ...properties } = record;
    node.userData.game = properties;
    if (entity.collection === "controls") {
      const circuit = catalog.circuits.find((value) => value.id === entity.id);
      if (circuit) node.userData.circuit = structuredClone(circuit);
    }
    node.userData.placement = {
      origin: [x, y ?? record.stops?.[0], z],
      matrix: world.get(node.uuid).toArray(),
    };
    if (!node.name || node.name === node.userData.binding)
      node.name = `${entity.collection}: ${entity.id}`;
  });
  const camera = new PerspectiveCamera(50, 1.5, 0.1, 2000);
  camera.name = "Camera";
  const anchor =
    (!selection &&
      roots.find((root) => root.userData?.entity?.collection === "hives")) ||
    roots.find((root) => root.userData?.entity) ||
    roots[0];
  const center = new Vector3().setFromMatrixPosition(
    new Matrix4().fromArray(anchor.matrix),
  );
  camera.position
    .copy(center)
    .add(selection ? new Vector3(15, 12, 18) : new Vector3(55, 65, 75));
  camera.lookAt(center);
  camera.updateMatrixWorld();
  if (selection) {
    const sky = new HemisphereLight(0xffffff, 0x596473, 3);
    const sun = new DirectionalLight(0xffffff, 3);
    sun.position.set(10, 20, 15);
    for (const light of [sky, sun]) {
      light.name = "Editor preview light";
      light.userData.editorOnly = true;
      object.children.push(light.toJSON().object);
    }
  }
  return {
    metadata: {},
    project: {
      shadows: true,
      shadowType: 1,
      toneMapping: 4,
      toneMappingExposure: 1.1,
    },
    camera: camera.toJSON(),
    scene: selectResources(scene, object),
    scripts: {},
    history: { undos: [], redos: [] },
    environmentType: "None",
  };
}

export function importProject(project, dryRun = false) {
  const edited = structuredClone(project.scene ?? project);
  const metadata = edited.object?.userData?.tankle;
  if (metadata?.version !== 1)
    throw new Error(
      "Open a project produced by scene:export before importing edits.",
    );
  if (metadata.revision !== revision())
    throw new Error(
      "Content changed since export. Export a fresh project to avoid overwriting newer edits.",
    );
  if (
    project.scripts &&
    Object.values(project.scripts).some((scripts) => scripts.length)
  )
    throw new Error(
      "Editor JavaScript scripts are not supported. Implement behavior in MoonBit.",
    );
  const scene = readScene();
  const catalog = readCatalog();
  const oldObjects = new Map();
  const parents = new Map();
  walk(scene.object, (object, parent) => {
    oldObjects.set(object.uuid, object);
    parents.set(object.uuid, parent);
  });
  const oldWorld = transforms(scene.object);
  const nextWorld = transforms(edited.object);
  const editedObjects = new Map();
  const bindings = new Set();
  walk(edited.object, (object) => {
    if (editedObjects.has(object.uuid))
      throw new Error(`Duplicate object UUID: ${object.uuid}`);
    editedObjects.set(object.uuid, object);
  });
  const removedRoots = new Set();
  for (const entity of metadata.deleted ?? []) {
    if (!metadata.fullScene || !editableCollections.has(entity.collection))
      throw new Error(
        "Entity deletion requires a full project and an enemy, control or pickup.",
      );
    validateNewIdentity(entity, { id: entity.id });
    const prefix = entityPrefix(entity);
    for (const object of oldObjects.values()) {
      if (
        !metadata.roots.includes(object.uuid) ||
        !belongsTo(object.userData?.binding, prefix)
      )
        continue;
      if (editedObjects.has(object.uuid))
        throw new Error(`Delete the complete entity: ${entityKey(entity)}`);
      removedRoots.add(object.uuid);
    }
    // Circuits describe logical signals, not physical switches. Keep their consumers
    // and timings intact so another control can take over the same signal explicitly.
    catalog[entity.collection] = catalog[entity.collection].filter(
      (record) => record.id !== entity.id,
    );
  }
  const addedEntities = [];
  const seenEntities = new Set();
  walk(edited.object, (object) => {
    const binding = object.userData?.binding;
    if (binding && bindings.has(binding))
      throw new Error(
        `Duplicate binding ${binding}. Scene objects with runtime roles must have unique identities.`,
      );
    if (binding) bindings.add(binding);
    if (object.matrix && !object.matrix.every(Number.isFinite))
      throw new Error(`Non-finite transform on ${object.name}`);
    const entity = object.userData?.entity;
    if (!entity) return;
    const identity = Number.isInteger(entity.index)
      ? `${entityKey(entity)}:${entity.index}`
      : `${entity.collection}:${entity.key}`;
    if (seenEntities.has(identity))
      throw new Error(`Duplicate gameplay identity: ${identity}`);
    seenEntities.add(identity);
    const oldEntity = oldObjects.get(object.uuid)?.userData?.entity;
    if (oldEntity && entityKey(oldEntity) !== entityKey(entity))
      throw new Error(`Keep stable IDs unchanged on ${object.name}`);
    const original = recordFor(catalog, entity);
    if (!original) {
      if (!metadata.fullScene || oldObjects.has(object.uuid))
        throw new Error(`Unknown gameplay identity ${identity}`);
      validateNewIdentity(entity, object.userData.game ?? {});
      if (!edited.object.children.includes(object))
        throw new Error("New gameplay roots must be at the scene's top level.");
      addedEntities.push(entity);
    } else if (!oldEntity && !object.userData.editorOnly) {
      throw new Error(`Duplicate gameplay identity: ${identity}`);
    }
    const placement = object.userData.placement;
    if (!placement || !object.userData.game)
      throw new Error(`Missing authoring properties on ${object.name}`);
    const matrix = nextWorld.get(object.uuid);
    // Physics currently supports translated axis-aligned entities. Child art can rotate/scale freely.
    for (const index of object.userData.editorOnly
      ? []
      : [0, 1, 2, 4, 5, 6, 8, 9, 10])
      if (Math.abs(matrix.elements[index] - placement.matrix[index]) > 1e-5)
        throw new Error(
          `Rotate or scale the model's children, not the gameplay root: ${object.name}`,
        );
    const delta = [12, 13, 14].map(
      (index) => matrix.elements[index] - placement.matrix[index],
    );
    const record = {
      ...object.userData.game,
      x: placement.origin[0] + delta[0],
      y: placement.origin[1] + delta[1],
      z: placement.origin[2] + delta[2],
    };
    if (object.userData.editorOnly)
      resizeCollision(record, matrix, placement.matrix, entity.collection);
    if (
      original &&
      (record.id !== original.id || record.circuitKey !== original.circuitKey)
    )
      throw new Error(
        `Keep stable IDs unchanged on ${object.name}; references are stored in saves and circuits.`,
      );
    if (entity.collection === "lifts") {
      record.stops = record.stops.map((height) => height + delta[1]);
      delete record.y;
    }
    if (entity.collection === "controls" && record.ground != null)
      record.ground += delta[1];
    if (entity.collection === "enemies") {
      if (record.patrol)
        record.patrol = {
          ...record.patrol,
          x: record.patrol.x + delta[0],
          z: record.patrol.z + delta[2],
        };
      if (record.activation)
        record.activation = {
          ...record.activation,
          x: record.activation.x + delta[0],
          y: record.activation.y + delta[1],
          z: record.activation.z + delta[2],
        };
      if (record.swimPatrol)
        record.swimPatrol = record.swimPatrol.map(([x, z]) => [
          x + delta[0],
          z + delta[2],
        ]);
    }
    const records = catalog[entity.collection];
    if (original) records[records.indexOf(original)] = record;
    else {
      records.push(record);
      if (
        entity.collection === "controls" &&
        object.userData.circuit &&
        !catalog.circuits.some((c) => c.id === entity.id)
      ) {
        if (object.userData.circuit.id !== entity.id)
          throw new Error("A copied circuit must use its control's ID.");
        catalog.circuits.push(structuredClone(object.userData.circuit));
      }
    }
    delete object.userData.game;
    delete object.userData.placement;
    delete object.userData.circuit;
  });
  for (const entity of addedEntities)
    for (const binding of requiredEntityBindings(entity))
      if (!bindings.has(binding))
        throw new Error(`Missing scene role: ${binding}`);
  for (const uuid of metadata.roots) {
    const original = oldObjects.get(uuid);
    const replacement = editedObjects.get(uuid);
    if (removedRoots.has(uuid)) {
      const parent = parents.get(uuid);
      parent.children = parent.children.filter((child) => child.uuid !== uuid);
      continue;
    }
    if (!original || !replacement)
      throw new Error(
        `An exported root was removed (${uuid}). Remove gameplay objects through the catalog with their references.`,
      );
    if (!edited.object.children.some((object) => object.uuid === uuid))
      throw new Error(
        "Keep exported roots at the scene's top level. Group or replace their children instead.",
      );
    walk(original, (object) => {
      const binding = object.userData?.binding;
      if (binding && !bindings.has(binding))
        throw new Error(`Required runtime binding removed: ${binding}`);
    });
    const parent = parents.get(uuid);
    replacement.matrix = oldWorld
      .get(parent.uuid)
      .clone()
      .invert()
      .multiply(nextWorld.get(uuid))
      .toArray();
    walk(replacement, (object) => {
      object.matrixAutoUpdate =
        oldObjects.get(object.uuid)?.matrixAutoUpdate ?? true;
    });
    parent.children[parent.children.indexOf(original)] = replacement;
  }
  // New gameplay roots have already passed identity and role validation above.
  for (const object of edited.object.children ?? [])
    if (!metadata.roots.includes(object.uuid)) {
      if (oldObjects.has(object.uuid) || object.userData?.editorOnly) continue;
      scene.object.children.push(object);
    }
  for (const kind of [
    "geometries",
    "materials",
    "textures",
    "images",
    "animations",
    "skeletons",
  ]) {
    const merged = new Map(
      (scene[kind] ?? []).map((resource) => [resource.uuid, resource]),
    );
    for (const resource of edited[kind] ?? [])
      merged.set(resource.uuid, resource);
    scene[kind] = [...merged.values()];
  }
  if (metadata.fullScene) {
    for (const key of [
      "background",
      "environment",
      "fog",
      "backgroundBlurriness",
      "backgroundIntensity",
      "environmentIntensity",
      "backgroundRotation",
      "environmentRotation",
    ]) {
      if (key in edited.object) scene.object[key] = edited.object[key];
      else delete scene.object[key];
    }
  }
  validateCatalog(catalog);
  if (!dryRun) {
    writeScene(selectResources(scene, scene.object));
    for (const [name, records] of Object.entries(catalog))
      writeFileSync(
        `${directory}/${name}.json`,
        JSON.stringify(records, null, 2) + "\n",
      );
  }
  return {
    roots: metadata.roots.length,
    checked: true,
    written: !dryRun,
    revision: revision(),
    rootIds: edited.object.children
      .filter((object) => !object.userData?.editorOnly)
      .map((object) => object.uuid),
  };
}

const [command, file, ...options] = process.argv.slice(2);
if (command === "export") {
  if (file === "--list") {
    const scene = readScene();
    walk(scene.object, (object) => {
      const e = object.userData?.entity;
      if (e) console.log(`${e.collection}:${e.id}`);
    });
    console.log("player");
  } else {
    if (!file)
      throw new Error(
        "Usage: npm run scene:export -- output/editor/prototype.json --entity enemies:prototype",
      );
    const index = options.indexOf("--entity");
    const project = exportProject(index >= 0 ? options[index + 1] : undefined, {
      colliders: options.includes("--colliders"),
    });
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(project));
    console.log(`Editor project written to ${file}`);
  }
} else if (command === "import") {
  if (!file)
    throw new Error(
      "Usage: npm run scene:import -- path/to/editor-project.json [--check]",
    );
  console.log(
    importProject(JSON.parse(readFileSync(file)), options.includes("--check")),
  );
}

import { belongsTo, entityPrefix, validateNewIdentity } from "./entity-data.js";

export function entityBundle(scene, root) {
  const prefix = entityPrefix(root.userData.entity);
  return scene.children.filter(
    (node) => node === root || belongsTo(node.userData.binding, prefix),
  );
}

// Clone a complete runtime entity, including detached attack/effect objects.
// Geometry and materials can be mutated by animation, so give the copy its own resources.
export function cloneEntity(scene, source, id, position, defaults) {
  const sourceEntity = source.userData.entity;
  const entity = { collection: sourceEntity.collection, id, key: id };
  const game = defaults
    ? { ...structuredClone(defaults), id }
    : { ...structuredClone(source.userData.game), id };
  if (entity.collection === "controls") {
    game.circuitKey = id;
    game.effects = defaults ? [id] : (game.effects ?? [sourceEntity.id]);
  }
  validateNewIdentity(entity, game);
  const oldPrefix = entityPrefix(sourceEntity),
    prefix = entityPrefix(entity);
  const geometries = new Map(),
    materials = new Map();
  const resource = (cache, value) => {
    if (!cache.has(value)) cache.set(value, value.clone());
    return cache.get(value);
  };
  const bundle = entityBundle(scene, source).map((object) => {
    const clone = object.clone(true);
    clone.traverse((node) => {
      const binding = node.userData.binding;
      if (binding)
        node.userData.binding = belongsTo(binding, oldPrefix)
          ? prefix + binding.slice(oldPrefix.length)
          : `${prefix}/art/${node.uuid}`;
      if (node.name?.includes("/"))
        node.name = node.userData.binding ?? node.type;
      if (node.geometry) node.geometry = resource(geometries, node.geometry);
      if (node.material)
        node.material = Array.isArray(node.material)
          ? node.material.map((value) => resource(materials, value))
          : resource(materials, node.material);
    });
    return clone;
  });
  const root = bundle.find((node) => node.userData.entity);
  root.userData.entity = entity;
  root.userData.game = game;
  root.name = `${entity.collection}: ${id}`;
  if (root.userData.circuit) {
    if (defaults) delete root.userData.circuit;
    else {
      root.userData.circuit.id = id;
    }
  }
  const delta = position.clone().sub(source.position);
  for (const object of bundle) {
    object.position.add(delta);
    object.updateMatrixWorld(true);
  }
  // Keep the source placement baseline: the importer translates patrols, lift-related
  // coordinates and ground heights exactly once from this baseline, including repeated saves.
  return { root, objects: bundle };
}

export function creationPosition(source, x, ground, z) {
  const origin = source.userData.placement.origin;
  const base =
    source.userData.entity.collection === "controls"
      ? (source.userData.game.ground ?? origin[1] - 1.3)
      : origin[1];
  return source.position.clone().set(
    x + source.position.x - origin[0],
    ground + source.position.y - base,
    z + source.position.z - origin[2],
  );
}

// Shared identity rules for the editor and its content importer.
export const editableCollections = new Set(["enemies", "controls", "pickups"]);
export function entityPrefix(entity) {
  const base = {
    enemies: "enemies",
    controls: "world/controls",
    pickups: "world/views/pickups",
    barriers: "world/walls",
    lifts: "world/views/lifts",
    mirrors: "world/views/mirrors",
    hives: "world/hives",
  }[entity.collection];
  return `${base}/${entity.key}`;
}
export function entityKey(entity) {
  return `${entity.collection}:${entity.id}`;
}
export function belongsTo(binding, prefix) {
  return binding === prefix || binding?.startsWith(prefix + "/");
}
export function requiredEntityBindings(entity) {
  const prefix = entityPrefix(entity);
  return (
    entity.collection === "enemies"
      ? ["model/root", "model/body", "model/turret"]
      : ["root"]
  ).map((role) => `${prefix}/${role}`);
}
export function validateNewIdentity(entity, game) {
  if (
    !editableCollections.has(entity.collection) ||
    entity.key !== entity.id ||
    game.id !== entity.id ||
    !/^[a-zA-Z][a-zA-Z0-9_-]{0,95}$/.test(entity.id)
  )
    throw new Error(`Invalid new gameplay identity: ${entityKey(entity)}`);
}

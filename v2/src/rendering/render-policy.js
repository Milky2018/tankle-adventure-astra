import { makePlayerHaze, setViewDistance } from './haze.js';
import { MeshBasicMaterial } from 'three';
import {
  makeAperture,
  apertureOpacity,
  APERTURE_AIM_THRESHOLD,
  STRUCTURE_APERTURE_RADIUS,
} from './visibility.js';

// A role specifies the color/depth contract once. Camera mode changes uniforms,
// never material categories or shadow participation. Shader cutaways apply only
// to camera passes; Three's physical shadow materials remain opaque.
export const RENDER_ROLES = Object.freeze(
  Object.fromEntries(
    Object.entries({
      floor: { terrain: true, depthWrite: false },
      structure: { radius: STRUCTURE_APERTURE_RADIUS, depthWrite: false },
      fixture: { cameraOnly: true, depthWrite: true },
      belt: { cameraOnly: true, terrain: true, depthWrite: true },
      floorDetail: { depthWrite: false },
      scenery: { depthWrite: true },
      backdrop: { radius: STRUCTURE_APERTURE_RADIUS, depthWrite: true },
    }).map(([name, rule]) => [name, Object.freeze(rule)]),
  ),
);

// A material carries mutable uniforms and belongs to exactly one scene. Keep
// ownership outside userData: Three clones userData but must not clone ownership.
const materialOwners = new WeakMap();

export function createRenderPolicy() {
  const aperture = makeAperture();
  const registrations = new WeakMap();
  function material(material, role, { clone = false, depth = false } = {}) {
    const rule = RENDER_ROLES[role];
    if (!rule) throw new Error(`Unknown render role: ${role}`);
    const source = materialOwners.get(material);
    if (clone) {
      material = material.clone();
      delete material.userData.aperture;
      if (source) material.opacity = source.opacity;
    } else if (source && source.owner !== registrations) {
      throw new Error('Material belongs to another scene; clone it before registration');
    }
    if (material.isSharedPrimitive)
      throw new Error('Clone shared primitive materials before registering a render role');
    const previous = registrations.get(material);
    if (previous) {
      if (previous.role !== role || previous.depth !== depth)
        throw new Error(`Material already registered as ${previous.role}, cannot use as ${role}`);
      return material;
    }
    aperture.apply(material, { ...rule, depthOnly: depth });
    material.transparent = !depth;
    material.depthWrite = depth || rule.depthWrite;
    material.colorWrite = !depth;
    material.userData.renderRole = role;
    const record = {
      owner: registrations,
      role,
      depth,
      opacity: material.opacity,
      depthWrite: material.depthWrite,
    };
    registrations.set(material, record);
    materialOwners.set(material, record);
    return material;
  }
  function fade(material, amount) {
    const record = registrations.get(material);
    if (!record) throw new Error('Cannot fade an unregistered material');
    material.opacity = record.opacity * amount;
    material.depthWrite = record.depthWrite && amount === 1;
  }
  function opacity(
    point,
    player,
    { third, direction, terrain = false, structure = false, support = [] },
  ) {
    return third
      ? aperture.cameraOpacity(point, terrain ? support : [])
      : apertureOpacity(
          point,
          player,
          direction,
          structure ? STRUCTURE_APERTURE_RADIUS : 13,
          terrain ? support : [],
        );
  }
  return {
    material,
    fade,
    opacity,
    depthMaterial(role) {
      return material(
        new MeshBasicMaterial({
          polygonOffset: true,
          polygonOffsetFactor: 1,
          polygonOffsetUnits: 1,
        }),
        role,
        { depth: true },
      );
    },
    aimVisible(point, player, context) {
      return opacity(point, player, context) > APERTURE_AIM_THRESHOLD;
    },
    support: aperture.support,
    setCamera: aperture.setCamera,
    setView: aperture.setView,
    update: aperture.update,
    enable: aperture.enable,
  };
}

// The application owns one rendering context. Every scene builder receives it,
// so fog, camera cutaways and aim visibility cannot acquire separate settings.
export function createSceneRendering(scene, player, settings) {
  const policy = createRenderPolicy();
  makePlayerHaze(scene, player, settings);
  return { ...policy, distance: (camera) => setViewDistance(scene, camera, settings, player) };
}

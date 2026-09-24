import * as T from 'three';
import { box, cylinder, batchStatic } from './factory-models.js';

// Keep the excavation outside the playable city and its longest camera boom.
export function basinBounds(decks) {
  return {
    left: Math.min(-258, ...decks.map((d) => d.x - 40)),
    right: Math.max(454, ...decks.map((d) => d.x + d.w + 40)),
    north: Math.min(-262, ...decks.map((d) => d.z - 40)),
    south: Math.max(248, ...decks.map((d) => d.z + d.d + 40)),
  };
}

// These supports stop below their own slab and never cross a playable lower floor.
export function basinSupports(decks, lifts = []) {
  const supports = [];
  for (const d of decks.filter((d) => !d.water && !d.rise && d.w * d.d >= 200)) {
    for (const [x, z] of [
      [d.x + 2, d.z + 2],
      [d.x + d.w - 2, d.z + d.d - 2],
    ]) {
      if (supports.some((p) => Math.hypot(p.x - x, p.z - z) < 24)) continue;
      if (lifts.some((l) => x > l.x - 3 && x < l.x + l.w + 3 && z > l.z - 3 && z < l.z + l.d + 3))
        continue;
      if (
        decks.some(
          (other) =>
            other !== d &&
            Math.min(other.y, other.y + (other.rise || 0)) < d.y - 2 &&
            x > other.x - 3 &&
            x < other.x + other.w + 3 &&
            z > other.z - 3 &&
            z < other.z + other.d + 3,
        )
      )
        continue;
      supports.push({ x, z, top: d.y - 0.45, bottom: -77, deck: d.id });
    }
  }
  return supports;
}

export function makeCityBackdrop(scene, aperture, decks, lifts) {
  const root = new T.Group();
  root.name = 'city-basin-backdrop';
  scene.add(root);
  const material = (color) => new T.MeshBasicMaterial({ color });
  const stone = material(0x40524c),
    iron = material(0x334743),
    edge = material(0x718074);
  const sediment = new T.MeshBasicMaterial({ color: 0xffffff, vertexColors: true });
  const positions = [],
    colors = [],
    bedColor = new T.Color();
  const bounds = basinBounds(decks);
  const height = (x, z) => -75 + Math.sin(x * 0.037) * 0.9 + Math.cos(z * 0.051) * 0.7;
  for (let x = bounds.left - 14; x < bounds.right + 14; x += 24)
    for (let z = bounds.north - 22; z < bounds.south + 20; z += 24) {
      for (const [dx, dz] of [
        [0, 0],
        [0, 24],
        [24, 0],
        [24, 0],
        [0, 24],
        [24, 24],
      ]) {
        const y = height(x + dx, z + dz);
        positions.push(x + dx, y, z + dz);
        bedColor.setHex(y > -74.5 ? 0x526053 : y < -75.5 ? 0x354b47 : 0x46584e);
        colors.push(bedColor.r, bedColor.g, bedColor.b);
      }
    }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();
  const bed = new T.Mesh(geometry, sediment);
  bed.name = 'sediment-bed';
  root.add(bed);
  // Water occupies the low sediment pockets, with no animated decorative targets.
  const water = material(0x2e4947);
  box(
    root,
    bounds.right - bounds.left + 28,
    0.08,
    bounds.south - bounds.north + 42,
    (bounds.left + bounds.right) / 2,
    -75.15,
    (bounds.north + bounds.south) / 2 - 1,
    water,
    0,
  );
  for (const p of basinSupports(decks, lifts)) {
    const h = p.top - p.bottom;
    box(root, 2, h, 2, p.x, p.bottom + h / 2, p.z, stone, 0);
    box(root, 4, 0.5, 4, p.x, p.top - 0.25, p.z, edge, 0);
    box(root, 4, 1.2, 4, p.x, -76, p.z, stone, 0);
    if (Math.round(p.x + p.z) % 3 === 0) {
      cylinder(root, 0.42, h, p.x + 1.7, p.bottom + h / 2, p.z, iron, 8);
      for (let y = -70; y < p.top; y += 16) box(root, 2.5, 0.18, 0.3, p.x + 0.65, y, p.z, edge, 0);
    }
  }
  // Three sides enclose the excavation; the southern mouth stays open to the horizon.
  for (let x = bounds.left - 6; x < bounds.right + 6; x += 28) {
    const top = 24 + Math.sin(x * 0.08) * 7;
    box(root, 28, top + 78, 14, x + 14, (top - 78) / 2, bounds.north, stone, 0);
    for (const y of [-60, -32, -4])
      box(root, 28, 0.65, 0.5, x + 14, y, bounds.north + 7.2, edge, 0);
  }
  for (const x of [bounds.left, bounds.right])
    for (let z = bounds.north + 14; z < bounds.south - 16; z += 32) {
      const top = 16 + Math.cos(z * 0.09) * 9;
      box(root, 12, top + 78, 32, x, (top - 78) / 2, z + 16, stone, 0);
      for (const y of [-60, -32, -4])
        box(root, 0.5, 0.65, 32, x + (x === bounds.left ? 6.2 : -6.2), y, z + 16, edge, 0);
    }
  for (const m of [stone, iron, edge]) {
    aperture.material(m, 'backdrop');
  }
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = o.receiveShadow = false;
      // Exterior color precedes the city's transparent floors (-2) and fixtures.
      // Otherwise a fog-white background batch can paint over a nearer cutaway.
      o.renderOrder = -3;
    }
  });
  batchStatic(root, { preserveGeometry: true });
  root.updateWorldMatrix(true, true);
  root.traverse((o) => {
    o.matrixAutoUpdate = false;
    o.matrixWorldAutoUpdate = false;
  });
  const warm = new T.Color(0xffdab0),
    neutral = new T.Color(0xffffff),
    base = [stone, iron, edge, water].map((m) => m.color.clone());
  function update(time, p, state) {
    const renewal = state.endingSeen ? 1 : T.MathUtils.clamp(((p.endingTime || 0) - 9) / 14, 0, 1);
    sediment.color.copy(neutral).lerp(warm, renewal * 0.2);
    [stone, iron, edge, water].forEach((m, i) => m.color.copy(base[i]).lerp(warm, renewal * 0.08));
  }
  return { root, update };
}

import * as T from 'three';
import { box, cylinder, batchStatic } from './world.js';

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

function paintSky() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const c = canvas.getContext('2d'),
    w = 1024,
    h = 512;
  c.scale(2, 2);
  const sky = c.createLinearGradient(0, 0, 0, h);
  for (const [at, color] of [
    [0, '#34494f'],
    [0.32, '#687b7b'],
    [0.48, '#a2aaa0'],
    [0.56, '#64746d'],
    [0.75, '#354b48'],
    [1, '#263b39'],
  ])
    sky.addColorStop(at, color);
  c.fillStyle = sky;
  c.fillRect(0, 0, w, h);
  // Periodic cloud bands meet at the longitude seam. Nothing redraws each frame.
  for (let band = 0; band < 23; band++) {
    const y = 35 + band * 8;
    c.beginPath();
    for (let x = 0; x <= w; x += 8) {
      const a = (x / w) * Math.PI * 2,
        v = y + Math.sin(a * 3 + band * 0.9) * 6 + Math.cos(a * 7 + band) * 2;
      x ? c.lineTo(x, v) : c.moveTo(x, v);
    }
    c.lineTo(w, y + 18);
    c.lineTo(0, y + 18);
    c.closePath();
    c.fillStyle = band % 3 ? 'rgba(31,49,53,.045)' : 'rgba(213,220,204,.07)';
    c.fill();
  }
  c.save();
  c.translate(720, 209);
  c.scale(1, 0.16);
  const breakLight = c.createRadialGradient(0, 0, 0, 0, 0, 135);
  breakLight.addColorStop(0, 'rgba(239,215,165,.75)');
  breakLight.addColorStop(0.5, 'rgba(211,198,161,.3)');
  breakLight.addColorStop(1, 'rgba(203,196,174,0)');
  c.fillStyle = breakLight;
  c.fillRect(-140, -140, 280, 280);
  c.restore();
  // Distant contours and silhouettes belong to the panorama, not the playable map.
  for (let layer = 0; layer < 3; layer++) {
    c.beginPath();
    for (let x = 0; x <= w; x += 8) {
      const a = (x / w) * Math.PI * 2,
        y = 265 + layer * 13 + Math.sin(a * 4 + layer) * 8 + Math.sin(a * 9 + layer) * 3;
      x ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.lineTo(w, h);
    c.lineTo(0, h);
    c.closePath();
    c.fillStyle = ['#768780', '#5e726b', '#465f59'][layer];
    c.fill();
  }
  c.strokeStyle = c.fillStyle = '#536961';
  c.lineWidth = 2;
  // A broken elevated freight line, with visible piers rather than floating blocks.
  for (const [start, end] of [
    [72, 162],
    [178, 258],
    [842, 916],
  ]) {
    c.fillRect(start, 245, end - start, 4);
    for (let x = start + 8; x < end; x += 28) c.fillRect(x, 249, 4, 80);
  }
  for (const [x, height] of [
    [308, 38],
    [325, 51],
    [341, 33],
    [812, 45],
  ]) {
    c.fillRect(x, 267 - height, 7, height + 62);
    c.fillRect(x - 2, 265 - height, 11, 3);
    c.fillStyle = '#60736b';
    c.fillRect(x + 2, 267 - height, 2, height + 62);
    c.fillStyle = '#536961';
  }
  for (const [x, height, arm] of [
    [480, 53, 45],
    [755, 37, -37],
  ]) {
    c.beginPath();
    c.moveTo(x - 7, 329);
    c.lineTo(x, 275 - height);
    c.lineTo(x + 7, 329);
    c.moveTo(x - 9, 275 - height + 7);
    c.lineTo(x + arm, 275 - height + 7);
    c.lineTo(x, 275 - height - 2);
    c.moveTo(x + arm, 275 - height + 7);
    c.lineTo(x + arm, 275 - height + 27);
    c.stroke();
  }
  c.beginPath();
  for (let x = 0; x <= w; x += 8) {
    const a = (x / w) * Math.PI * 2,
      y = 290 + Math.sin(a * 4 + 2) * 8 + Math.sin(a * 9 + 2) * 3;
    x ? c.lineTo(x, y) : c.moveTo(x, y);
  }
  c.lineTo(w, h);
  c.lineTo(0, h);
  c.closePath();
  c.fillStyle = '#465f59';
  c.fill();
  // Merge the foot of the skyline into the same dark haze as the excavation.
  const haze = c.createLinearGradient(0, 284, 0, 370);
  haze.addColorStop(0, 'rgba(38,59,57,0)');
  haze.addColorStop(1, '#263b39');
  c.fillStyle = haze;
  c.fillRect(0, 284, w, h - 284);
  const texture = new T.CanvasTexture(canvas);
  texture.mapping = T.EquirectangularReflectionMapping;
  texture.colorSpace = T.SRGBColorSpace;
  return texture;
}

export function makeCityBackdrop(scene, aperture, decks, lifts) {
  const sky = paintSky(),
    overheadHaze = scene.fog.color.clone();
  scene.background = sky;
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
  const height = (x, z) => -75 + Math.sin(x * 0.037) * 0.9 + Math.cos(z * 0.051) * 0.7;
  for (let x = -272; x < 472; x += 24)
    for (let z = -284; z < 268; z += 24) {
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
  box(root, 744, 0.08, 552, 100, -75.15, -8, water, 0);
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
  for (let x = -264; x < 464; x += 28) {
    const top = 24 + Math.sin(x * 0.08) * 7;
    box(root, 28, top + 78, 14, x + 14, (top - 78) / 2, -262, stone, 0);
    for (const y of [-60, -32, -4]) box(root, 28, 0.65, 0.5, x + 14, y, -254.8, edge, 0);
  }
  for (const x of [-258, 454])
    for (let z = -248; z < 232; z += 32) {
      const top = 16 + Math.cos(z * 0.09) * 9;
      box(root, 12, top + 78, 32, x, (top - 78) / 2, z + 16, stone, 0);
      for (const y of [-60, -32, -4])
        box(root, 0.5, 0.65, 32, x + (x < 0 ? 6.2 : -6.2), y, z + 16, edge, 0);
    }
  for (const m of [stone, iron, edge]) {
    aperture.apply(m, { radius: 36 });
    m.depthWrite = true;
  }
  root.traverse((o) => {
    if (o.isMesh) o.castShadow = o.receiveShadow = false;
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
    const depth = T.MathUtils.smoothstep(p.y, -56, 16),
      renewal = state.endingSeen ? 1 : T.MathUtils.clamp(((p.endingTime || 0) - 9) / 14, 0, 1);
    scene.backgroundIntensity = T.MathUtils.lerp(0.48, 0.85, depth) + renewal * 0.08;
    sediment.color.copy(neutral).lerp(warm, renewal * 0.2);
    [stone, iron, edge, water].forEach((m, i) => m.color.copy(base[i]).lerp(warm, renewal * 0.08));
  }
  // Parallel overhead rays have no visible horizon; match their far haze to fog.
  return {
    root,
    update,
    setView: (third) => {
      scene.background = third ? sky : overheadHaze;
    },
  };
}

import * as T from 'three';
import { box, cylinder, ring, mat } from './world.js';
import { REGION_STYLE } from './folded-architecture.js';

// Details follow the collision-backed envelope. Nothing is scattered in a route
// merely to fill floor area; openings, cover and installation approaches stay clear.
export function makeRegionalScenery(parent, rooms, solids) {
  const finishes = new Map(),
    lights = [];
  function finish(region, part) {
    const key = `${region}/${part}`;
    if (!finishes.has(key))
      finishes.set(
        key,
        mat(
          part === 'light'
            ? {
                foundry: 0xd4a77f,
                transit: 0xc6d5dc,
                garden: 0xd7debc,
                testworks: 0xe2dfcd,
                optics: 0xe4d8c0,
                circulation: 0xd5b294,
                furnace: 0xe0ab81,
              }[region]
            : REGION_STYLE[region][part],
          part === 'light',
        ),
      );
    return finishes.get(key);
  }
  function beam(a, b, width, material) {
    const from = new T.Vector3(...a),
      to = new T.Vector3(...b),
      delta = to.sub(from);
    const m = box(
      parent,
      width,
      delta.length(),
      width,
      ...from.addScaledVector(delta, 0.5).toArray(),
      material,
      0,
    );
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize());
    return m;
  }
  for (const r of rooms) {
    const frame = finish(r.region, 'frame'),
      trim = finish(r.region, 'accent'),
      lamp = finish(r.region, 'light');
    const walls = solids.filter((s) => s.room === r.id && s.kind === 'wall' && s.y === r.y);
    // Each wall opening keeps a legible sill and reveal even when its upper face fades.
    for (const [i, s] of walls.entries()) {
      const along = s.w > s.d,
        cx = s.x + s.w / 2,
        cz = s.z + s.d / 2;
      const dx = along ? 0 : cx < r.x + r.w / 2 ? 1 : -1,
        dz = along ? (cz < r.z + r.d / 2 ? 1 : -1) : 0;
      const frontX = cx + dx * (s.w / 2 + 0.06),
        frontZ = cz + dz * (s.d / 2 + 0.06);
      if (r.region === 'foundry') {
        for (const y of [0.45, 2.8].filter((y) => y < s.h))
          box(
            parent,
            along ? s.w : 0.14,
            0.22,
            along ? 0.14 : s.d,
            frontX,
            r.y + y,
            frontZ,
            frame,
            0,
          );
        if (i % 3 === 0)
          for (const n of [-0.9, -0.3, 0.3, 0.9])
            box(
              parent,
              along ? 0.16 : 0.1,
              1.1,
              along ? 0.1 : 0.16,
              frontX + (along ? n : 0),
              r.y + 1.55,
              frontZ + (along ? 0 : n),
              trim,
              0,
            );
      } else if (r.region === 'transit') {
        if (i % 2 === 0)
          box(
            parent,
            along ? 0.28 : 0.18,
            s.h,
            along ? 0.18 : 0.28,
            frontX,
            r.y + s.h / 2,
            frontZ,
            frame,
            0,
          );
        box(
          parent,
          along ? s.w : 0.12,
          0.15,
          along ? 0.12 : s.d,
          frontX,
          r.y + 0.65,
          frontZ,
          trim,
          0,
        );
      } else if (r.region === 'garden') {
        box(
          parent,
          along ? s.w : 0.12,
          0.09,
          along ? 0.12 : s.d,
          frontX,
          r.y + 0.42,
          frontZ,
          trim,
          0,
        );
        // Mineral deposits follow a horizontal waterline rather than a panel grid.
        if (i % 3 === 0)
          box(
            parent,
            along ? s.w * 0.65 : 0.1,
            0.18,
            along ? 0.1 : s.d * 0.65,
            frontX,
            r.y + 0.7,
            frontZ,
            frame,
            0,
          );
      } else if (r.region === 'testworks') {
        box(
          parent,
          along ? s.w : 0.14,
          0.45,
          along ? 0.14 : s.d,
          frontX,
          r.y + 0.7,
          frontZ,
          frame,
          0,
        );
        if (i % 4 === 0)
          for (const n of [-0.7, 0, 0.7])
            box(
              parent,
              along ? 0.13 : 0.08,
              0.65,
              along ? 0.08 : 0.13,
              frontX + (along ? n : 0),
              r.y + 1.6,
              frontZ + (along ? 0 : n),
              trim,
              0,
            );
      } else if (r.region === 'optics') {
        box(
          parent,
          along ? s.w + 0.08 : 0.18,
          0.2,
          along ? 0.18 : s.d + 0.08,
          frontX,
          r.y + Math.min(1.25, s.h),
          frontZ,
          trim,
          0,
        );
      } else if (r.region === 'circulation') {
        box(
          parent,
          along ? s.w : 0.16,
          0.2,
          along ? 0.16 : s.d,
          frontX,
          r.y + 0.45,
          frontZ,
          trim,
          0,
        );
        if (i % 3 === 0) {
          const pipe = cylinder(
            parent,
            0.16,
            Math.min(s.h, 3),
            frontX,
            r.y + Math.min(s.h, 3) / 2,
            frontZ,
            trim,
            8,
          );
          for (const y of [0.6, 2.2].filter((y) => y < s.h))
            ring(pipe, 0.19, 0.045, 0, y - Math.min(s.h, 3) / 2, 0, frame);
        }
      } else {
        box(
          parent,
          along ? s.w : 0.16,
          0.38,
          along ? 0.16 : s.d,
          frontX,
          r.y + 0.55,
          frontZ,
          trim,
          0,
        );
      }
      // Sparse broad lamps sit on solid masonry, away from the mechanism colour language.
      if (i % 4 === 0 && s.h >= 2.5) {
        const y = r.y + Math.min(3.1, s.h - 0.35);
        box(parent, along ? 1.5 : 0.18, 0.18, along ? 0.18 : 1.5, frontX, y, frontZ, lamp, 0);
        lights.push({
          x: frontX + dx * 1.15,
          y,
          z: frontZ + dz * 1.15,
          color: lamp.color.getHex(),
          ground: r.y,
        });
      }
    }
    const roofs = solids.filter((s) => s.room === r.id && s.kind === 'roof');
    for (const [i, s] of roofs.entries()) {
      if (r.region === 'transit') {
        // Local trusses cannot bridge a carved opening for an upper route or lift.
        const x = s.x + 0.3,
          z = s.z + s.d / 2,
          y = s.y - 0.25;
        beam([x, y, z], [s.x + s.w - 0.3, y, z], 0.2, frame);
        if (s.w > 4) {
          beam([x, y, z], [x + s.w / 2, y + 1.5, z], 0.16, trim);
          beam([x + s.w / 2, y + 1.5, z], [s.x + s.w - 0.3, y, z], 0.16, trim);
        }
      }
      if (i % 3 === 0 && r.region !== 'garden') {
        const along = r.w > r.d;
        box(
          parent,
          along ? Math.min(5, s.w) : 0.35,
          0.1,
          along ? 0.35 : Math.min(5, s.d),
          s.x + s.w / 2,
          s.y - 0.08,
          s.z + s.d / 2,
          lamp,
          0,
        );
      }
    }
    // Construction at the edge carries each area's silhouette into ordinary rooms.
    if (r.region === 'garden') {
      for (let z = r.z + 4; z < r.z + r.d; z += 16) {
        const side = walls.find((s) => s.w < s.d && z >= s.z && z < s.z + s.d);
        if (!side) continue;
        const x = side.x + side.w / 2;
        beam([x, r.y + side.h, z], [x, r.y + 6, z], 0.16, frame);
        beam([x, r.y + 6, z], [x + (x < r.x + r.w / 2 ? 3 : -3), r.y + 8, z], 0.16, frame);
      }
    }
    if (r.region === 'testworks' && r.w > 20 && r.d > 20) {
      // Rubber contact strips are flush with the floor, not new driving barriers.
      for (const x of [r.x + 1, r.x + r.w - 1])
        box(parent, 0.3, 0.025, r.d - 2, x, r.y + 0.015, r.z + r.d / 2, frame, 0);
    }
  }
  return lights;
}

// A fixed pool keeps local light sources affordable. A source fades out before
// reassignment, so crossing a threshold never drags a lamp through the room.
export function makeRegionalLights(scene, sources) {
  const slots = Array.from({ length: 3 }, () => {
    const light = new T.PointLight(0xffffff, 0, 18, 2);
    scene.add(light);
    return { light, source: null };
  });
  let last = 0;
  return {
    update(time, p) {
      const dt = Math.min(0.1, Math.max(0, time - last));
      last = time;
      const candidates = sources
        .filter((s) => Math.abs(s.ground - p.y) < 5 && Math.hypot(s.x - p.x, s.z - p.z) < 32)
        .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))
        .slice(0, 3);
      for (const slot of slots) {
        const target = candidates.includes(slot.source) ? 3.5 : 0;
        slot.light.intensity = T.MathUtils.damp(slot.light.intensity, target, 8, dt);
        if (target === 0 && slot.light.intensity < 0.2) {
          slot.source = candidates.find((s) => !slots.some((other) => other.source === s)) || null;
          slot.light.intensity = 0;
          if (slot.source) {
            slot.light.position.set(slot.source.x, slot.source.y, slot.source.z);
            slot.light.color.setHex(slot.source.color);
          }
        }
      }
    },
    slots,
  };
}

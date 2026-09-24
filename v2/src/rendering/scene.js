import { createOcclusion } from './occlusion.js';
import { makeSlideMarkers } from './slide-view.js';
import { makeThermalFloors } from './thermal-view.js';
import {
  controlHousingParts,
  controlCoverPart,
  mountedControlPosition,
} from '../machinery/control-housing.js';
import { cityMaterials } from './materials.js';
import { groundPatches } from '../world/ground.js';
import { makeSidePuzzles } from '../machinery/side-puzzles.js';
import { architectureIndex, REGION_STYLE, regionAt } from '../world/architecture.js';
import { magnetPullable } from '../combat/damage.js';
import { REFUGE_RADIUS } from '../world/refuges.js';
import { SORTER_REACH, BARRAGE } from '../combat/attacks.js';
import { mechanismReady } from '../combat/encounter-pacing.js';
import { expansionBelts, expansionHeat } from '../content/expansion-layout.js';
import { circuitColor, circuitEventSources, circuitReady } from '../machinery/circuits.js';
import { orthogonalCircuit } from '../machinery/circuit-routing.js';
import { routeSigns } from '../content/guidance.js';
import { makeCityPresentation } from './presentation.js';
import { SIGNAL } from './visibility.js';
import { foldedEnemyModel, prepareEnemyMaterials } from './enemy-models.js';
import { cityBelts } from '../content/city-layout.js';
import * as T from 'three';
import {
  box,
  cylinder,
  ring,
  mat,
  C,
  tankModel,
  batchStatic as batchGeometry,
  chargeWarning,
} from './factory-models.js';
import { renderDecks } from '../world/deck-geometry.js';
import {
  foldedArchitecture,
  foldedBattles,
  foldedDecks,
  foldedLiftDefs,
  foldedControls,
  foldedHives,
  foldedEnemies,
  activeSolid,
  inRect,
  deckHeight,
} from '../world/terrain.js';

export function makeFoldedWorld(
  scene,
  state,
  { batching = true, circuitDefs, signals, rendering },
) {
  const batchStatic = batching ? batchGeometry : () => {};
  const foldedSolids = state.bodies.solids;
  const sidePuzzles = makeSidePuzzles(scene, state);
  const viewPlayer = { x: 0, y: 0, z: 0 };
  const presentation = makeCityPresentation(scene, rendering);
  let thirdPerson = false,
    supportPatches = [];
  const fixed = new T.Group();
  scene.add(fixed);
  const surfaces = [],
    walls = [],
    controls = [],
    hives = [],
    pickupViews = [],
    liftViews = [],
    enemies = state.enemies,
    enemyViews = new Map(),
    pillars = [],
    floorDetails = [],
    mirrorViews = [],
    belts = [];
  const raycaster = new T.Raycaster();
  const deckRegions = new Map(
    foldedDecks.map((d) => [
      d.id,
      d.region ||
        regionAt(
          { x: d.x + d.w / 2, y: d.y + (d.rise || 0) / 2, z: d.z + d.d / 2 },
          foldedArchitecture.rooms,
        ),
    ]),
  );
  const surfaceMaterials = cityMaterials(),
    waterMaterial = surfaceMaterials.water,
    waterTexture = waterMaterial.map;
  const trims = new Map(
    foldedDecks.map((d) => {
      const g = new T.Group();
      scene.add(g);
      return [d.id, g];
    }),
  );
  const patches = renderDecks(
    [...foldedDecks].sort((a, b) => Number(!!a.water) - Number(!!b.water)),
    foldedLiftDefs.map((l) => ({ ...l, recess: Math.max(0.6, l.recess || 0) })),
  ).flatMap((d) => {
    if (d.rise) return [d];
    const pieces = [];
    for (let x = d.x; x < d.x + d.w; x += 12)
      for (let z = d.z; z < d.z + d.d; z += 12)
        pieces.push({ ...d, x, z, w: Math.min(12, d.x + d.w - x), d: Math.min(12, d.z + d.d - z) });
    return pieces;
  });
  const floorDepthMaterial = rendering.depthMaterial('floor');
  const floorDepthBatches = new T.Group(),
    floorMeshes = new T.Group(),
    floorBatches = new T.Group(),
    floorMaterials = new Map();
  scene.add(floorMeshes, floorBatches, floorDepthBatches);
  for (const d of patches) {
    const key = d.water ? 'water' : deckRegions.get(d.id),
      style = REGION_STYLE[deckRegions.get(d.id)];
    if (!floorMaterials.has(key))
      floorMaterials.set(
        key,
        d.water
          ? new T.MeshPhongMaterial({
              color: 0x397d9d,
              specular: 0x658581,
              shininess: 40,
              normalMap: waterMaterial.normalMap,
              normalScale: new T.Vector2(0.32, 0.32),
            })
          : new T.MeshToonMaterial({ color: style.floor, ...surfaceMaterials[style.paving] }),
      );
    const mesh = box(
      floorMeshes,
      d.w,
      0.65,
      Math.hypot(d.d, d.rise || 0),
      d.x + d.w / 2,
      d.y + (d.rise || 0) / 2 - 0.325 - (d.recess || 0),
      d.z + d.d / 2,
      floorMaterials.get(key),
      0,
    );
    rendering.material(mesh.material, 'floor');
    mesh.userData.aperture = true;
    mesh.userData.supportSurface = true;
    // The opaque depth pass handles other floors. Draw translucent floor color
    // before ground fixtures, whose merged centers cannot sort against each tile.
    mesh.renderOrder = -2;
    mesh.name = `folded-floor:${d.id}`;
    if (d.rise) mesh.rotation.x = -Math.atan2(d.rise, d.d);
    {
      mesh.geometry = mesh.geometry.clone();
      const pos = mesh.geometry.attributes.position,
        uv = mesh.geometry.attributes.uv;
      for (let i = 0; i < pos.count; i++)
        uv.setXY(i, (pos.getX(i) + mesh.position.x) / 8, -(pos.getZ(i) + mesh.position.z) / 8);
      mesh.material.map = d.water ? waterTexture : surfaceMaterials[style.paving].map;
    }
    // Opaque floor fragments must occlude lower structures regardless of transparent sorting.
    // The matching aperture in the depth pass keeps the lower room visible.
    floorBatches.add(mesh.clone());
    const batchDepth = new T.Mesh(mesh.geometry, floorDepthMaterial);
    batchDepth.position.copy(mesh.position);
    batchDepth.rotation.copy(mesh.rotation);
    floorDepthBatches.add(batchDepth);
    const depth = new T.Mesh(mesh.geometry, floorDepthMaterial);
    depth.name = `folded-floor-depth:${d.id}`;
    mesh.add(depth);
    surfaces.push({ ...d, mesh, opacity: 1 });
  }
  // Third-person color and depth passes batch independently; overhead patches sort among props.
  // Collision and aim queries keep using the original patches in both views.
  batchStatic(floorBatches, { preserveGeometry: true });
  batchStatic(floorDepthBatches, { preserveGeometry: true });
  floorBatches.visible = floorDepthBatches.visible = false;
  // Quiet edge markings, with taller structure on the far side of each space.
  const edges = new Set();
  for (const d of foldedDecks)
    for (const side of ['left', 'right', 'front', 'back']) {
      const along = side === 'front' || side === 'back',
        length = along ? d.w : d.d,
        trim = trims.get(d.id);
      for (let t = 1; t < length; t += 2) {
        const x = along ? d.x + t : side === 'left' ? d.x : d.x + d.w,
          z = along ? (side === 'front' ? d.z : d.z + d.d) : d.z + t,
          y = deckHeight(d, z);
        const ox = along ? 0 : side === 'left' ? -0.1 : 0.1,
          oz = along ? (side === 'front' ? -0.1 : 0.1) : 0;
        if (
          foldedDecks.some(
            (o) =>
              o !== d && inRect(x + ox, z + oz, o) && Math.abs(deckHeight(o, z + oz) - y) < 0.5,
          ) ||
          foldedLiftDefs.some((l) => inRect(x + ox, z + oz, l) && l.stops.includes(y))
        )
          continue;
        const key = [x, y, z, along].join('/');
        if (edges.has(key)) continue;
        edges.add(key);
        box(
          trim,
          along ? 1.7 : 0.12,
          0.09,
          along ? 0.12 : 1.7,
          x,
          y + 0.08,
          z,
          d.water ? 0x709389 : 0x89978f,
          0,
        );
        if ((d.id === 'roof-return' && along) || (d.id === 'roof-walk' && !along))
          box(trim, along ? 2 : 0.12, 0.12, along ? 0.12 : 2, x, y + 0.8, z, C.metal, 0);
      }
    }
  const trimMaterials = new Map(),
    floorTrimMeshes = new T.Group(),
    floorTrimBatches = new T.Group(),
    floorTrimDepth = new T.Group();
  scene.add(floorTrimMeshes, floorTrimBatches, floorTrimDepth);
  for (const [id, g] of trims) {
    const parts = surfaces.filter((s) => s.id === id);
    if (!parts.length) {
      scene.remove(g);
      continue;
    }
    for (const s of parts) {
      s.trim = new T.Group();
      floorTrimMeshes.add(s.trim);
    }
    for (const mesh of [...g.children]) {
      const s = parts.find((s) => inRect(mesh.position.x, mesh.position.z, s, 0.01)) || parts[0];
      s.trim.add(mesh);
    }
    scene.remove(g);
    for (const s of parts) {
      if (s.rise) {
        const length = Math.hypot(s.d, s.rise),
          pitch = -Math.atan2(s.rise, s.d);
        // Continuous side rails and cross seams make the climb readable in projection.
        for (const side of [-1, 1]) {
          const x = s.x + s.w / 2 + side * (s.w / 2 - 0.2);
          const rail = box(
            s.trim,
            0.16,
            0.16,
            length,
            x,
            s.y + s.rise / 2 + 1,
            s.z + s.d / 2,
            C.metal,
            0,
          );
          rail.rotation.x = pitch;
          for (let z = s.z + 0.3; z < s.z + s.d; z += 6)
            box(s.trim, 0.15, 1, 0.15, x, deckHeight(s, z) + 0.5, z, C.dark, 0);
        }
        for (let z = s.z + 2; z < s.z + s.d; z += 4) {
          const seam = box(
            s.trim,
            s.w - 0.8,
            0.045,
            0.16,
            s.x + s.w / 2,
            deckHeight(s, z) + 0.045,
            z,
            0xb5b99a,
            0,
          );
          seam.rotation.x = pitch;
        }
      }
      s.trim.traverse((m) => {
        if (m.isMesh) {
          if (!trimMaterials.has(m.material)) {
            const material = m.material.clone();
            rendering.material(material, 'floor');
            trimMaterials.set(m.material, material);
          }
          m.material = trimMaterials.get(m.material);
        }
      });
      for (const mesh of s.trim.children) {
        floorTrimBatches.add(mesh.clone());
        // Rails stay in front of fogged batches; the aperture still opens through them.
        const depth = new T.Mesh(mesh.geometry, floorDepthMaterial);
        depth.position.copy(mesh.position);
        depth.quaternion.copy(mesh.quaternion);
        floorTrimDepth.add(depth);
      }
      batchStatic(s.trim);
    }
  }
  batchStatic(floorTrimBatches);
  floorTrimBatches.visible = false;
  batchStatic(floorTrimDepth, { preserveGeometry: true });
  // These transforms never change. Freeze both view representations, including the inactive one.
  for (const root of [
    floorMeshes,
    floorBatches,
    floorDepthBatches,
    floorTrimMeshes,
    floorTrimBatches,
    floorTrimDepth,
  ]) {
    root.updateWorldMatrix(true, true);
    root.traverse((object) => {
      object.matrixAutoUpdate = false;
      object.matrixWorldAutoUpdate = false;
    });
  }
  const signs = routeSigns.map((sign) => {
    const root = new T.Group();
    root.position.set(sign.x, sign.y, sign.z);
    root.rotation.y = sign.yaw;
    scene.add(root);
    const region = sign.region || regionAt(sign, foldedArchitecture.rooms),
      style = REGION_STYLE[region];
    // One quiet lintel and two low lamps frame the opening, leaving its center clear.
    for (const side of [-1, 1]) {
      if (region === 'circulation') {
        cylinder(root, 0.2, 4, side * 4.5, 2, 0, style.accent, 10);
        for (const y of [1, 3]) ring(root, 0.25, 0.06, side * 4.5, y, 0, style.frame);
      } else box(root, 0.3, 4, 0.3, side * 4.5, 2, 0, style.frame, 0);
      box(root, 0.4, 0.16, 0.4, side * 4.5, 0.3, 0, mat(0xcbd0bf, true), 0);
      if (region === 'transit') {
        const brace = box(root, 1.5, 0.14, 0.2, side * 3.85, 3.6, 0, style.accent, 0);
        brace.rotation.z = side * 0.5;
      }
    }
    box(
      root,
      9.3,
      ['foundry', 'furnace'].includes(region) ? 0.6 : 0.25,
      0.35,
      0,
      4,
      0,
      style.wall,
      0,
    );
    if (region === 'optics') box(root, 8.6, 0.08, 0.14, 0, 3.8, 0.2, style.accent, 0);
    floorDetails.push({ root, x: sign.x, y: sign.y, z: sign.z, radius: 5 });
    return { ...sign, root };
  });
  const massDepth = new T.Group();
  massDepth.name = 'folded-mass-depth';
  scene.add(massDepth);
  const massDepthMaterial = rendering.depthMaterial('structure');
  for (const d of foldedSolids) {
    const mesh = box(
      scene,
      d.w,
      d.h,
      d.d,
      d.x + d.w / 2,
      d.y + d.h / 2,
      d.z + d.d / 2,
      mat(
        d.magnetic
          ? d.rail
            ? SIGNAL.magnet
            : C.dark
          : d.mass
            ? 0x294b48
            : d.theme
              ? REGION_STYLE[d.theme].frame
              : d.permanent
                ? C.teal
                : d.red
                  ? 0x9e573b
                  : d.phoenix
                    ? C.orange
                    : C.dark,
      ),
      0.08,
    );
    if (d.masonry) {
      mesh.material.color.setHex(REGION_STYLE[d.theme].wall);
      Object.assign(mesh.material, surfaceMaterials[REGION_STYLE[d.theme].surface]);
      const g = mesh.geometry.clone(),
        pos = g.attributes.position,
        uv = g.attributes.uv;
      for (let i = 0; i < pos.count; i++)
        uv.setXY(
          i,
          (d.w > d.d ? pos.getX(i) + d.x : pos.getZ(i) + d.z) / 8,
          (pos.getY(i) + d.y) / 4,
        );
      mesh.geometry = g;
      box(
        mesh,
        d.w + 0.08,
        0.16,
        d.d + 0.08,
        0,
        d.h / 2 + 0.08,
        0,
        REGION_STYLE[d.theme].accent,
        0,
      );
      box(mesh, d.w + 0.04, 0.1, d.d + 0.04, 0, -d.h / 2 + 0.45, 0, REGION_STYLE[d.theme].frame, 0);
    }
    if (d.mass) {
      rendering.material(mesh.material, 'structure');
      mesh.userData.massAperture = true;
      const prepass = new T.Mesh(mesh.geometry, massDepthMaterial);
      prepass.position.copy(mesh.position);
      massDepth.add(prepass);
    }
    if (d.exploration) {
      const finish = d.kind === 'filter' ? 0x88a79b : d.kind === 'optics' ? 0xb2bdb4 : 0x8a8e82;
      if (d.kind === 'coil' || d.kind === 'optics') {
        for (const side of [-0.28, 0.28]) {
          const r = ring(
            mesh,
            Math.min(d.w, d.d) * 0.32,
            0.12,
            side * d.w,
            0,
            d.d / 2 + 0.04,
            finish,
          );
          r.rotation.x = Math.PI / 2;
        }
      } else {
        for (let y = -d.h / 2 + 0.35; y < d.h / 2; y += 0.5)
          box(mesh, d.w * 0.85, 0.09, 0.12, 0, y, d.d / 2 + 0.04, finish, 0);
        if (d.kind === 'rack')
          for (const side of [-0.42, 0.42])
            box(mesh, 0.12, d.h, 0.15, side * d.w, 0, d.d / 2 + 0.08, C.metal, 0);
      }
      box(mesh, d.w * 0.75, 0.09, d.d * 0.6, 0, d.h / 2 + 0.045, 0, finish, 0);
    }
    if (d.rail) {
      const r = d.rail,
        along = r.axis === 'x';
      for (const side of [-1, 1])
        box(
          scene,
          along ? r.max - r.min + d.w : 0.14,
          0.12,
          along ? 0.14 : r.max - r.min + d.d,
          along ? (r.min + r.max + d.w) / 2 : d.x + d.w / 2 + side * (d.w / 2 + 0.25),
          d.y + 0.06,
          along ? d.z + d.d / 2 + side * (d.d / 2 + 0.25) : (r.min + r.max + d.d) / 2,
          C.metal,
          0,
        );
    }
    if (d.motion) {
      // Suspended scrap hulls ride real rails, with open wheel wells and lifting eyes.
      for (const side of [-1, 1]) {
        box(mesh, d.w, 0.3, 0.35, 0, -d.h / 2 + 0.25, side * (d.d / 2 + 0.15), C.metal, 0);
        ring(mesh, 0.4, 0.12, side * d.w * 0.3, d.h / 2 + 0.25, 0, C.metal).rotation.x =
          Math.PI / 2;
      }
      for (const x of [-d.w * 0.3, d.w * 0.3])
        box(mesh, 0.22, d.h + 0.25, d.d + 0.15, x, 0, 0, C.dark, 0);
      const turret = cylinder(mesh, 0.75, 0.55, 0, d.h / 2 + 0.15, 0, C.metal, 10);
      turret.rotation.z = 0.15;
      box(mesh, 0.28, 0.28, 1.6, 0, d.h / 2 + 0.3, 0.65, C.dark, 0);
      for (const side of [-1, 1])
        for (const x of [-d.w * 0.3, 0, d.w * 0.3]) {
          const wheel = cylinder(
            mesh,
            0.35,
            0.18,
            x,
            -d.h / 2 + 0.6,
            side * (d.d / 2 + 0.08),
            C.dark,
            8,
          );
          wheel.rotation.x = Math.PI / 2;
        }
    }
    if (!d.permanent)
      box(
        mesh,
        d.w > 2 ? d.w * 0.85 : 0.12,
        0.18,
        d.d > 2 ? d.d * 0.85 : 0.12,
        0,
        0.1,
        0,
        C.metal,
        0,
      );
    if (!d.permanent) {
      for (const side of [-1, 1])
        box(
          mesh,
          d.w > d.d ? 0.24 : d.w + 0.12,
          d.h + 0.3,
          d.w > d.d ? d.d + 0.12 : 0.24,
          d.w > d.d ? side * (d.w / 2 - 0.15) : 0,
          0,
          d.w > d.d ? 0 : side * (d.d / 2 - 0.15),
          C.metal,
          0,
        );
    }
    if (d.arena) {
      const across = d.w > d.d;
      for (let t = -Math.max(d.w, d.d) / 2 + 0.7; t < Math.max(d.w, d.d) / 2; t += 1.5) {
        const stripe = box(
          mesh,
          across ? 0.65 : d.w + 0.04,
          0.18,
          across ? d.d + 0.04 : 0.65,
          across ? t : 0,
          0.45,
          across ? 0 : t,
          C.yellow,
          0,
        );
        stripe.rotation.z = across ? 0.35 : 0;
      }
    }
    walls.push({ ...d, mesh, opacity: 1, open: activeSolid(d, state) ? 0 : 1 });
  }
  // Status stays on the fixed jambs when a shutter retracts into its floor pocket.
  const gateSignals = [];
  for (const d of foldedSolids.filter((d) => !d.permanent && !d.magnetic)) {
    const across = d.w > d.d,
      root = new T.Group();
    root.position.set(d.x + d.w / 2, d.y, d.z + d.d / 2);
    scene.add(root);
    const lamps = [];
    for (const side of [-1, 1]) {
      const x = across ? side * (d.w / 2 + 0.25) : 0,
        z = across ? 0 : side * (d.d / 2 + 0.25);
      box(root, 0.55, 1.1, 0.55, x, 0.55, z, C.dark, 0);
      lamps.push(box(root, 0.38, 0.18, 0.38, x, 1.15, z, mat(SIGNAL.ready, true), 0));
    }
    gateSignals.push({ body: d, id: d.id, arena: d.arena, root, lamps });
    floorDetails.push({
      root,
      x: root.position.x,
      y: d.y,
      z: root.position.z,
      radius: Math.max(d.w, d.d) / 2,
    });
  }
  function makeControl(c) {
    if (c.mount)
      c = {
        ...c,
        ...mountedControlPosition(
          c,
          foldedSolids.find((b) => b.id === c.mount),
        ),
      };
    const root = new T.Group();
    root.name = `folded-control:${c.id}`;
    root.position.set(c.x, c.y, c.z);
    scene.add(root);
    root.rotation.y =
      c.yaw ??
      (c.id === 'pump' ? 0 : c.kind === 'laser' || c.kind === 'magnet' ? Math.PI / 2 : Math.PI / 4);
    const opticalNormal =
        c.kind === 'laser' ? new T.Vector3(...(c.normal || [1, 0, 0])).normalize() : null,
      opticalRadius = c.radius ?? 1.8;
    const inclined = c.mount && (c.facing[0] < 0 || c.facing[2] < 0);
    const facing = c.facing
      ? new T.Vector3(
          c.facing[0] * (inclined ? 0.6 : 1),
          inclined ? 0.8 : c.facing[1],
          c.facing[2] * (inclined ? 0.6 : 1),
        )
      : c.surface !== 'top' && c.kind !== 'laser' && (c.requires || c.pressure || c.cycle)
        ? new T.Vector3(0, 0, 1).applyQuaternion(root.quaternion)
        : null;
    if (c.mount) root.rotation.set(-Math.asin(facing.y), Math.atan2(facing.x, facing.z), 0, 'YXZ');
    else if (opticalNormal || facing)
      root.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), opticalNormal || facing);
    const ground = c.ground ?? c.y - 1.3,
      height = c.y - ground;
    if (!c.mount) {
      box(root, 0.42, height, 0.48, 0, -height / 2, 0, C.dark);
      box(root, 1.6, 0.16, 1.2, 0, -height + 0.08, 0, C.metal);
    }
    const moving = new T.Group();
    root.add(moving);
    let lamp;
    if (c.surface === 'top') {
      box(root, 1.8, 0.35, 1.8, 0, -0.5, 0, C.dark, 0.08);
      for (const y of [-0.4, -0.2]) ring(root, 0.52, 0.08, 0, y, 0, C.metal);
      ring(root, 1, 0.16, 0, 0.03, 0, C.metal);
      lamp = cylinder(moving, 0.8, 0.18, 0, 0.02, 0, mat(SIGNAL.ready, true), 16);
      for (const x of [-0.45, 0.45]) box(moving, 0.12, 0.04, 1.1, x, 0.13, 0, C.dark, 0);
    } else if (c.rotor) {
      ring(root, 1.25, 0.15, 0, 0, 0.2, C.metal);
      lamp = box(moving, 0.8, 0.8, 0.25, 0, 0, 0.4, mat(SIGNAL.ready, true), 0);
      for (const x of [-0.85, 0.85]) box(moving, 0.85, 0.28, 0.35, x, 0, 0.4, C.metal, 0);
      box(moving, 0.28, 1.7, 0.35, 0, 0, 0.4, C.metal, 0);
      for (const y of [-1, 1])
        box(
          root,
          0.35,
          0.6,
          0.4,
          0,
          y * 1.35,
          0.3,
          c.id.startsWith('reservoir') ? 0x89c9bf : C.lightYellow,
          0,
        );
    } else if (c.kind === 'magnet') {
      if (!c.slide) {
        box(root, 1.7, 1.5, 0.18, 0, 0, -0.26, C.metal);
        box(root, 1.1, 0.8, 0.2, 0, 0, -0.13, C.dark);
      }
      for (const x of [-0.68, 0.68]) {
        box(moving, 0.36, 1.4, 0.55, x, 0, 0, SIGNAL.magnet);
        box(moving, 0.38, 0.35, 0.58, x, 0.55, 0, 0xa9dcff);
      }
      box(moving, 1.7, 0.32, 0.55, 0, -0.6, 0, SIGNAL.magnet);
      lamp = box(root, 0.35, 0.16, 0.12, 0, 0.92, -0.12, mat(SIGNAL.magnet, true));
      if (!c.slide) {
        box(moving, 1.15, 0.85, 0.2, 0, 0, -0.05, SIGNAL.magnet);
        for (const x of [-0.65, 0.65]) box(root, 0.16, 0.3, 0.28, x, -0.55, -0.06, C.metal);
      } else lamp.visible = false;
    } else if (c.kind === 'laser') {
      const casing = cylinder(root, opticalRadius + 0.16, 0.3, 0, 0, -0.18, C.dark, 24);
      casing.rotation.x = Math.PI / 2;
      for (const r of [opticalRadius, opticalRadius * 0.7]) ring(root, r, 0.09, 0, 0, 0, C.metal);
      lamp = cylinder(moving, opticalRadius, 0.06, 0, 0, 0, mat(C.lightYellow, true), 24);
      lamp.rotation.x = Math.PI / 2;
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2,
          fin = box(
            moving,
            0.2,
            0.35,
            0.12,
            Math.sin(a) * (opticalRadius + 0.16),
            Math.cos(a) * (opticalRadius + 0.16),
            0.04,
            C.yellow,
            0,
          );
        fin.rotation.z = -a;
      }
    } else if (c.kind === 'use') {
      box(root, 1.4, 0.95, 0.5, 0, 0, 0, C.dark);
      lamp = box(root, 0.4, 0.22, 0.08, 0, 0.3, 0.3, mat(SIGNAL.ready, true));
      ring(moving, 0.62, 0.12, 0, -0.15, 0.44, C.yellow);
      for (const angle of [0, Math.PI / 2]) {
        const spoke = box(moving, 1, 0.12, 0.12, 0, -0.15, 0.44, C.metal);
        spoke.rotation.z = angle;
      }
    } else if (c.kind === 'dock') {
      for (const x of [-1, 1]) box(root, 0.35, 1.6, 0.8, x, -0.2, 0, C.metal);
      lamp = box(moving, 1.3, 0.35, 0.65, 0, -0.6, 0.25, mat(C.mint, true));
      for (const x of [-0.75, 0.75]) box(moving, 0.4, 0.4, 1.4, x, -0.4, 0.4, C.yellow);
    } else {
      box(root, 1.65, 1.65, 0.5, 0, 0, -0.1, C.dark);
      for (const x of [-0.67, 0.67])
        for (const y of [-0.67, 0.67]) box(root, 0.2, 0.2, 0.12, x, y, 0.22, C.metal, 0);
      ring(root, 0.64, 0.14, 0, 0, 0.26, C.metal);
      lamp = cylinder(moving, 0.48, 0.22, 0, 0, 0.34, mat(SIGNAL.ready, true), 12);
      lamp.rotation.x = Math.PI / 2;
      ring(moving, 0.27, 0.055, 0, 0, 0.49, C.lightYellow);
      const core = cylinder(moving, 0.09, 0.08, 0, 0, 0.5, C.lightYellow, 8);
      core.rotation.x = Math.PI / 2;
      // The target is a sprung machine paddle, with a visible travel slot.
      for (const x of [-0.95, 0.95]) box(root, 0.12, 1.15, 0.9, x, 0, -0.18, C.metal, 0);
      box(root, 2.1, 0.22, 0.95, 0, -0.88, -0.18, C.dark, 0);
    }
    // Rings here stand upright, facing the same direction as their mechanism.
    root.traverse((m) => {
      if (c.surface !== 'top' && m.geometry?.type === 'TorusGeometry') m.rotation.x = 0;
    });
    const casing = new T.Group();
    root.add(casing);
    for (const child of [...root.children])
      if (child !== moving && child !== lamp && child !== casing) casing.add(child);
    batchStatic(casing);
    const housing = controlHousingParts(c).map((b) =>
      box(root, b.w, b.h, b.d, b.x, b.y, b.z, mat(C.dark), 0),
    );
    const lid = controlCoverPart(c),
      cover = lid ? box(root, lid.w, lid.h, lid.d, lid.x, lid.y, lid.z, mat(C.metal), 0) : null;
    if (cover) {
      for (const x of [-0.55, 0.55]) {
        const stripe = box(
          cover,
          0.18,
          c.surface === 'top' ? 0.025 : lid.h * 0.65,
          c.surface === 'top' ? 1.5 : 0.025,
          x,
          c.surface === 'top' ? 0.1 : 0,
          c.surface === 'top' ? 0 : 0.105,
          C.yellow,
          0,
        );
        stripe.rotation.z = c.surface === 'top' ? 0 : -0.3;
      }
      housing.push(cover);
    }
    // A magnet grip points along its rail instead of presenting an unmarked post.
    if (c.slide) {
      const b = foldedSolids.find((s) => s.id === c.slide),
        arrow = new T.Group();
      root.add(arrow);
      arrow.position.y = 0.95;
      const direction = b.rail.axis === 'x' ? new T.Vector3(1, 0, 0) : new T.Vector3(0, 0, 1);
      direction.applyQuaternion(root.quaternion.clone().invert());
      arrow.quaternion.setFromUnitVectors(new T.Vector3(1, 0, 0), direction);
      box(arrow, 2, 0.12, 0.12, 0, 0, 0, SIGNAL.magnet, 0);
      for (const sign of [-1, 1])
        for (const side of [-1, 1]) {
          const tip = box(arrow, 0.55, 0.12, 0.12, sign * 0.8, 0, side * 0.15, SIGNAL.magnet, 0);
          tip.rotation.y = (sign * side * Math.PI) / 4;
        }
    }
    const weight = c.counterweight ? box(root, 2, 2, 1, 0, 3, -0.7, C.metal) : null;
    if (weight) {
      for (const x of [-1.4, 1.4]) box(root, 0.18, 5, 0.18, x, 1.5, -0.7, C.dark, 0);
      box(root, 3, 0.3, 1, 0, 4, -0.7, C.metal, 0);
    }
    let plate = null,
      plateFeed = null;
    if (c.pressure) {
      const q = c.pressure,
        base = new T.Group();
      base.position.set(q.x, q.y, q.z);
      scene.add(base);
      box(base, 4.8, 0.16, 4.8, 0, 0.08, 0, C.dark, 0);
      plate = box(base, 4.2, 0.14, 4.2, 0, 0.3, 0, mat(SIGNAL.ready, true), 0);
      for (const x of [-1.3, 0, 1.3]) box(plate, 0.3, 0.035, 3.8, x, 0.09, 0, C.dark, 0);
      const delta = new T.Vector3(c.x - q.x, 0, c.z - q.z),
        length = delta.length();
      plateFeed = box(
        base,
        0.16,
        0.08,
        length,
        delta.x / 2,
        0.13,
        delta.z / 2,
        mat(SIGNAL.ready, true),
        0,
      );
      plateFeed.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), delta.normalize());
      floorDetails.push({ root: base, x: q.x, y: q.y, z: q.z, radius: length + 3 });
    }
    const mountWall = c.mount ? walls.find((w) => w.id === c.mount) : null,
      mountOffset = mountWall ? root.position.clone().sub(mountWall.mesh.position) : null;
    const localLamps = [];
    if (c.mount && !c.slide) {
      // The short feed is part of the door, so it follows the actuator down.
      // Cancel the inclined control's rotation: wiring follows world axes.
      const feed = new T.Group();
      feed.name = `local-circuit:${c.id}`;
      feed.quaternion.copy(root.quaternion).invert();
      root.add(feed);
      const points = orthogonalCircuit(
        [
          [-0.8, -0.6, 1.4],
          [-1.6, -0.6, 1.4],
          [-1.6, -1.4, 1.4],
        ].map((p) => new T.Vector3(...p).applyQuaternion(root.quaternion).toArray()),
      ).map((p) => new T.Vector3(...p));
      const lengths = points.slice(1).map((p, i) => p.distanceTo(points[i])),
        total = lengths.reduce((a, b) => a + b, 0);
      for (let i = 1; i < points.length; i++) {
        const delta = points[i].clone().sub(points[i - 1]),
          mesh = box(feed, 0.12, 0.12, lengths[i - 1], 0, 0, 0, C.dark, 0);
        mesh.name = 'circuit-segment';
        mesh.position.copy(points[i - 1]).addScaledVector(delta, 0.5);
        mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), delta.normalize());
      }
      const end = points.at(-1);
      box(feed, 0.5, 0.5, 0.22, end.x, end.y, end.z, C.metal, 0);
      for (let n = 1; n <= 5; n++) {
        let remaining = (total * n) / 5,
          i = 0;
        while (i < lengths.length - 1 && remaining > lengths[i]) remaining -= lengths[i++];
        const p = points[i].clone().lerp(points[i + 1], remaining / lengths[i]);
        p.addScaledVector(new T.Vector3(...c.facing), 0.1);
        localLamps.push(box(feed, 0.14, 0.14, 0.14, p.x, p.y, p.z, mat(SIGNAL.ready, true), 0));
      }
    }
    const control = {
      ...c,
      localLamps,
      mountWall,
      mountOffset,
      restY: c.y,
      root,
      lamp,
      moving,
      cover,
      weight,
      plate,
      plateFeed,
      opticalNormal,
      housing,
      coverBase: lid,
      facing,
      detachAge: state[c.id] ? 1 : 0,
      detached: !!state[c.id],
      pullDirection: new T.Vector3(0, 0, 1),
      radius: opticalNormal ? opticalRadius : 0.95,
      flash: 0,
      engaged: state[c.id] ? 1 : 0,
    };
    for (const mesh of housing) mesh.userData.controlHousing = c.id;
    controls.push(control);
    return control;
  }
  for (const c of foldedControls) makeControl(c);
  const eventTerminals = [];
  for (const c of circuitEventSources) {
    const root = new T.Group();
    root.name = `circuit-source:${c.id}`;
    root.position.set(c.x, c.y - 1.3, c.z);
    scene.add(root);
    box(root, 0.9, 0.8, 0.7, 0, 0.4, 0, C.dark, 0);
    cylinder(root, 0.28, 0.18, 0, 0.85, 0, C.metal, 8);
    const lamp = box(root, 0.5, 0.12, 0.07, 0, 0.85, 0.4, mat(SIGNAL.ready, true), 0);
    eventTerminals.push({ id: c.id, lamp });
  }
  const controlFeeds = [],
    circuitLampGeometry = new T.BoxGeometry(0.25, 0.13, 0.25),
    conduitSupports = new Set();
  const battleDisplays = [];
  for (const b of foldedBattles) {
    const root = new T.Group();
    root.name = `battle-display:${b.id}`;
    root.position.set(b.x, b.y - 1.3, b.z);
    scene.add(root);
    cylinder(root, 1.8, 0.55, 0, 0.275, 0, C.dark, 8);
    const icons = foldedEnemies
      .filter((e) => e.battle === b.battle)
      .map((enemy, i) => {
        const icon = new T.Group();
        icon.name = `battery-icon:${enemy.id}`;
        icon.position.set(i < 2 ? -0.85 : 0.85, 0.6, i % 2 ? 0.8 : -0.8);
        root.add(icon);
        box(icon, 0.65, 0.18, 0.8, 0, 0.15, 0, C.metal, 0.04);
        for (const side of [-1, 1]) {
          const wheel = cylinder(icon, 0.22, 0.16, side * 0.38, 0.22, 0.15, C.dark, 8);
          wheel.rotation.z = Math.PI / 2;
        }
        const tube = new T.Group();
        tube.position.set(0, 0.35, 0);
        tube.rotation.x = -0.65;
        icon.add(tube);
        cylinder(tube, 0.22, 0.8, 0, 0.4, 0, SIGNAL.ready, 10);
        cylinder(tube, 0.15, 0.025, 0, 0.815, 0, C.dark, 10);
        ring(tube, 0.23, 0.05, 0, 0.8, 0, C.lightYellow);
        return { id: enemy.id, root: icon };
      });
    battleDisplays.push({ id: b.id, root, icons });
    floorDetails.push({ root, x: b.x, y: b.y - 1.3, z: b.z, radius: 3 });
  }
  for (const link of circuitDefs) {
    if (link.local) continue;
    const points = link.points.map((p) => new T.Vector3(...p)),
      root = new T.Group(),
      lamps = [];
    scene.add(root);
    root.name = `folded-circuit:${link.id}:${link.target}`;
    let length = 0;
    for (let i = 1; i < points.length; i++) length += points[i].distanceTo(points[i - 1]);
    if (length < 0.01) {
      scene.remove(root);
      continue;
    }
    let traveled = 0;
    for (let i = 1; i < points.length; i++) {
      const delta = points[i].clone().sub(points[i - 1]),
        span = delta.length();
      if (span < 0.01) continue;
      delta.normalize();
      const cable = box(root, 0.14, 0.14, span, 0, 0, 0, C.dark, 0);
      cable.castShadow = false;
      cable.position.copy(points[i - 1]).addScaledVector(delta, span / 2);
      cable.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), delta);
      // Long level runs beside ramps sit on sparse brackets, outside driving space.
      if (Math.abs(delta.z) > 0.99)
        for (const d of foldedDecks.filter((d) => d.rise)) {
          const x = points[i].x,
            y = points[i].y,
            near = Math.max(d.z, Math.min(points[i - 1].z, points[i].z)),
            far = Math.min(d.z + d.d, Math.max(points[i - 1].z, points[i].z));
          if (Math.min(Math.abs(x - d.x), Math.abs(x - d.x - d.w)) > 0.5 || far - near < 3)
            continue;
          for (let z = far - 0.2; z > near; z -= 8) {
            const ground = deckHeight(d, z),
              height = y - ground,
              key = `${x.toFixed(2)}:${y.toFixed(2)}:${z.toFixed(2)}`;
            if (height < 0.6 || conduitSupports.has(key)) continue;
            conduitSupports.add(key);
            box(fixed, 0.12, height, 0.12, x, ground + height / 2, z, C.metal, 0);
            box(fixed, 0.4, 0.1, 0.4, x, ground + 0.05, z, C.metal, 0);
          }
        }
      if (link.magnetic) {
        for (let t = 0; t < span; t += 0.7) {
          const size = Math.min(0.6, span - t),
            center = t + size / 2;
          const position = points[i - 1].clone().addScaledVector(delta, center);
          // Mount the luminous strip on the cable casing, not inside its dark core.
          if (Math.abs(delta.y) > 0.95) position.x -= 0.11;
          else position.y += 0.11;
          lamps.push({
            position,
            progress: (traveled + center) / length,
            color: new T.Color(SIGNAL.ready),
            direction: delta.clone(),
            length: size,
          });
        }
      } else
        for (let t = 0.2; t < span; t += 1.25) {
          const position = points[i - 1].clone().addScaledVector(delta, t);
          if (Math.abs(delta.y) > 0.95) position.x -= 0.13;
          else position.y += 0.13;
          lamps.push({
            position,
            progress: (traveled + t) / length,
            color: new T.Color(SIGNAL.ready),
          });
        }
      traveled += span;
    }
    lamps.push({
      position: points
        .at(-1)
        .clone()
        .add(new T.Vector3(0, 0.13, 0)),
      progress: 1,
      color: new T.Color(SIGNAL.ready),
    });
    {
      const end = points.at(-1);
      box(root, 0.55, 0.14, 0.55, end.x, end.y - 0.08, end.z, C.metal, 0);
    }
    batchStatic(root);
    const mesh = new T.InstancedMesh(circuitLampGeometry, mat(0xffffff, true), lamps.length),
      matrix = new T.Matrix4();
    lamps.forEach((lamp, i) => {
      if (lamp.direction)
        matrix.compose(
          lamp.position,
          new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 0, 1), lamp.direction),
          new T.Vector3(0.6, 0.7, lamp.length / 0.25),
        );
      else matrix.makeTranslation(lamp.position.x, lamp.position.y, lamp.position.z);
      mesh.setMatrixAt(i, matrix);
      mesh.setColorAt(i, lamp.color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
    root.add(mesh);
    controlFeeds.push({ ...link, root, mesh, lamps, duration: Math.max(1.4, length / 18) });
    const start = points[0];
    floorDetails.push({
      root,
      x: start.x,
      y: start.y,
      z: start.z,
      radius: length,
      floorMark: true,
      circuit: true,
    });
  }
  const tenderDrive = new T.Group();
  scene.add(tenderDrive);
  box(tenderDrive, 1, 0.8, 1, 108, -23.6, 32, C.dark, 0);
  cylinder(tenderDrive, 0.32, 0.18, 108, -23.1, 32, C.metal, 8);
  box(tenderDrive, 2, 0.12, 0.18, 109, -23.85, 32, C.metal, 0);
  const slideMarkers = makeSlideMarkers(scene, [
    ...foldedSolids.filter((s) => s.rail && s.magnetic),
    ...state.bodies.obstacles.filter((s) => s.rail),
  ]);
  const thermalFloors = makeThermalFloors(scene, [
    ...expansionHeat,
    ...cityBelts.filter((b) => b.heat),
  ]);
  for (const feed of controlFeeds) feed.duration = signals.duration(feed.id, feed.targetKey);
  for (const d of state.machinery.lifts) {
    // Fixed shaft rims carry power even while the platform is at the other stop.
    for (const y of d.stops) {
      for (const z of [d.z, d.z + d.d])
        box(fixed, d.w + 0.4, 0.12, 0.5, d.x + d.w / 2, y + 0.05, z, C.metal, 0);
      for (const x of [d.x, d.x + d.w])
        box(fixed, 0.5, 0.12, d.d, x, y + 0.05, d.z + d.d / 2, C.metal, 0);
    }
    const root = new T.Group();
    scene.add(root);
    const mesh = box(root, d.w, 0.55, d.d, d.x + d.w / 2, -0.275, d.z + d.d / 2, mat(0x657770), 0);
    const markings = new T.Group();
    root.add(markings);
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        const x = d.x + d.w / 2 + sx * (d.w / 2 - 0.35),
          z = d.z + d.d / 2 + sz * (d.d / 2 - 1.3);
        box(markings, 0.28, 0.035, 2, x, 0.025, z, C.yellow, 0);
      }
    for (const direction of [-1, 1])
      for (const side of [-1, 1]) {
        const arrow = box(
          markings,
          1.3,
          0.035,
          0.18,
          d.x + d.w / 2 + side * 0.45,
          0.025,
          d.z + d.d / 2 + direction * 0.9,
          C.yellow,
          0,
        );
        arrow.rotation.y = (side * direction * Math.PI) / 4;
      }
    batchStatic(markings);
    for (const x of [d.x + 0.3, d.x + d.w - 0.3]) {
      const h = d.stops.at(-1) - d.stops[0] + 6,
        mesh = box(scene, 0.45, h, 0.45, x, d.stops[0] + h / 2, d.z, mat(C.dark), 0);
      mesh.material.transparent = true;
      pillars.push({ mesh, x: x - 0.225, z: d.z - 0.225, w: 0.45, d: 0.45, y: d.stops[0], h });
      box(root, 0.18, 1, 0.18, x, 0.5, d.z, C.dark, 0);
    }
    root.position.y = d.y;
    liftViews.push({ ...d, body: d, root, mesh });
  }
  for (const h of foldedHives) {
    const root = new T.Group();
    root.name = `folded-hive:${h.id}`;
    root.position.set(h.x, h.y, h.z);
    scene.add(root);
    cylinder(root, 2.8, 0.18, 0, 0.08, 0, C.dark, 6);
    ring(root, REFUGE_RADIUS, 0.055, 0, 0.08, 0, mat(C.mint, true));
    const halo = ring(root, 2.1, 0.12, 0, 0.2, 0, mat(C.mint, true)),
      scan = ring(root, 1.7, 0.065, 0, 0.25, 0, mat(C.mint, true));
    const arms = [],
      lamps = [];
    for (const side of [-1, 1]) {
      box(root, 0.65, 2.8, 0.8, side * 2.4, 1.4, -0.8, C.dark);
      lamps.push(box(root, 0.32, 1.5, 0.14, side * 2.4, 1.5, -0.33, mat(C.mint, true)));
      const pivot = new T.Group();
      pivot.position.set(side * 2.4, 2.7, -0.8);
      root.add(pivot);
      cylinder(pivot, 0.3, 0.6, 0, 0, 0, C.metal, 10).rotation.x = Math.PI / 2;
      box(pivot, 1.45, 0.22, 0.28, -side * 0.6, 0, 0, C.metal);
      box(pivot, 0.38, 0.6, 0.5, -side * 1.2, -0.22, 0, C.yellow);
      lamps.push(box(pivot, 0.25, 0.1, 0.3, -side * 1.2, -0.56, 0, mat(C.mint, true)));
      arms.push({ pivot, side });
    }
    hives.push({
      ...h,
      root,
      halo,
      scan,
      arms,
      lamps,
      proximity: 0,
      pulse: 0,
      pulseKind: 'repair',
    });
  }
  for (const p of state.machinery.pickups) {
    const root = new T.Group();
    root.position.set(p.x, p.y, p.z);
    scene.add(root);
    cylinder(root, 2.2, 0.4, 0, 0.2, 0, C.dark, 8);
    const halo = ring(root, 1.7, 0.12, 0, 0.6, 0, mat(C.yellow, true));
    const item = new T.Group();
    root.add(item);
    if (p.upgrade) {
      root.scale.setScalar(0.72);
      if (p.upgrade === 'armor')
        for (let i = 0; i < 3; i++)
          box(item, 1.8, 0.22, 1.6, 0, 1 + i * 0.28, 0, i === 2 ? C.lightYellow : C.metal, 0.1);
      else if (p.upgrade === 'scope') {
        const tube = cylinder(item, 0.4, 2, 0, 1.5, 0, C.metal, 16);
        tube.rotation.x = Math.PI / 2;
        for (const y of [-1, 1]) {
          cylinder(tube, 0.6, 0.25, 0, y, 0, C.lightYellow, 16);
          cylinder(tube, 0.45, 0.02, 0, y + (y > 0 ? 0.14 : -0.14), 0, C.mint, 16);
        }
        box(item, 0.18, 0.7, 0.12, 0, 1.5, 1.16, C.dark, 0);
        box(item, 0.7, 0.18, 0.12, 0, 1.5, 1.16, C.dark, 0);
      } else if (p.upgrade === 'cooling') {
        box(item, 1.9, 1.6, 0.65, 0, 1.5, 0, C.metal, 0.1);
        ring(item, 0.62, 0.09, 0, 1.5, 0.4, C.lightYellow).rotation.x = Math.PI / 2;
        for (let i = 0; i < 4; i++) {
          const blade = box(item, 0.18, 1, 0.08, 0, 1.5, 0.45, C.mint, 0.04);
          blade.rotation.z = (i * Math.PI) / 4;
        }
      } else {
        const tube = cylinder(
          item,
          p.upgrade === 'mortar' ? 0.6 : 0.35,
          1.8,
          0,
          1.5,
          0,
          C.lightYellow,
          12,
        );
        tube.rotation.x = p.upgrade === 'mortar' ? 0.5 : Math.PI / 2;
        for (const y of [-0.6, 0, 0.6])
          ring(tube, p.upgrade === 'mortar' ? 0.65 : 0.42, 0.1, 0, y, 0, C.metal);
      }
    } else if (p.id === 'flotation')
      for (const x of [-0.8, 0.8]) box(item, 0.6, 0.6, 2.2, x, 1.4, 0, C.lightYellow, 0.2);
    else if (p.ability === 'magnet') {
      const arc = new T.Mesh(
        new T.TorusGeometry(0.8, 0.2, 8, 16, Math.PI * 1.4),
        mat(SIGNAL.magnet),
      );
      arc.position.y = 1.5;
      item.add(arc);
    } else if (p.ability === 'mortar') {
      box(item, 1.7, 0.25, 1.5, 0, 0.85, 0.25, C.metal, 0.1);
      const tube = cylinder(item, 0.55, 2.2, 0, 1.8, 0, C.metal, 12);
      tube.rotation.x = 0.5;
      cylinder(tube, 0.65, 0.18, 0, 1.1, 0, C.yellow, 12);
      cylinder(tube, 0.43, 0.05, 0, 1.21, 0, C.dark, 12);
      for (const x of [-0.65, 0.65])
        box(item, 0.18, 1, 0.18, x, 1.3, 0.4, C.lightYellow, 0.03).rotation.z = -x * 0.6;
    } else if (p.id === 'laser') {
      box(item, 0.5, 0.5, 2.4, 0, 1.5, 0, C.lightYellow);
      for (const z of [-0.6, 0.6])
        ring(item, 0.6, 0.1, 0, 1.5, z, C.metal).rotation.x = Math.PI / 2;
    } else if (p.id === 'circulation') {
      for (const x of [-0.7, 0.7]) {
        cylinder(item, 0.45, 1.6, x, 1.5, 0, C.mint, 8);
        ring(item, 0.45, 0.1, x, 1, 0, C.metal);
      }
    } else {
      cylinder(item, 0.65, 1.4, 0, 1.5, 0, C.orange, 8);
      for (const x of [-1, 1]) box(item, 0.6, 0.25, 1.5, x, 1.5, 0, C.yellow, 0.12);
    }
    const cage = p.preview ? new T.Group() : null;
    if (cage) {
      root.add(cage);
      for (const x of [-1.8, 1.8])
        for (const z of [-1.8, 1.8]) box(cage, 0.12, 3, 0.12, x, 1.5, z, C.metal, 0);
      ring(cage, 2.2, 0.12, 0, 3, 0, C.metal);
    }
    pickupViews.push({ ...p, body: p, root, item, halo, cage });
  }
  for (const e of enemies) {
    const model = foldedEnemyModel(e.id === 'sorter' ? 'sorter' : e.type, e.variant);
    scene.add(model.root);
    model.root.position.set(e.x, e.y, e.z);
    if (e.id === 'prototype') {
      model.frontArmor = box(model.body, 2.4, 1.3, 0.35, 0, 1.2, 1.35, C.metal);
      box(model.body, 1.1, 0.65, 0.15, 0, 1.2, 1.2, mat(C.orange, true));
    }
    if (magnetPullable(e)) {
      for (const side of [-1, 1])
        box(model.body, 0.2, 0.38, 1, side * 0.75, 1.1, 0, mat(SIGNAL.magnet, true), 0);
    }
    if (e.magneticShield && model.frontArmor) {
      model.frontArmor.material = mat(SIGNAL.magnet);
      for (const x of [-0.7, 0.7])
        box(model.frontArmor, 0.3, 0.55, 0.12, x, 0, 0.34, mat(0xa9dcff, true));
    }
    if (e.spotterHeight) {
      cylinder(model.body, 0.12, e.spotterHeight - 1, 0, (e.spotterHeight + 1) / 2, 0, C.metal, 6);
      box(model.body, 0.65, 0.35, 0.65, 0, e.spotterHeight, 0, mat(C.orange, true));
    }
    const materials = prepareEnemyMaterials(model, { batching });
    // Prototype's three rays each contain an origin, endpoint and return vertex.
    const warningGeometry = new T.BufferGeometry().setAttribute(
      'position',
      new T.BufferAttribute(
        new Float32Array(
          e.id === 'prototype' ? 27 : ['welder', 'dredger'].includes(e.type) ? 45 : 6,
        ),
        3,
      ).setUsage(T.DynamicDrawUsage),
    );
    warningGeometry.setDrawRange(0, 2);
    const warning = new T.Line(
      warningGeometry,
      new T.LineBasicMaterial({
        color: e.type === 'sniper' ? 0xff263c : C.orange,
        transparent: true,
        opacity: 0.95,
      }),
    );
    scene.add(warning);
    warning.visible = false;
    warning.frustumCulled = false;
    if (e.type === 'boss') model.root.scale.setScalar(1.8);
    const charge = ['scout', 'elite'].includes(e.type)
      ? chargeWarning(e.type, e.variant === 'interceptor' ? 2 : 1)
      : null;
    if (charge) scene.add(charge.root);
    const zone =
      e.id === 'sorter'
        ? new T.LineLoop(
            new T.BufferGeometry().setFromPoints([
              new T.Vector3(),
              ...Array.from({ length: 25 }, (_, i) => {
                const a = -0.9 + (i * 1.8) / 24;
                return new T.Vector3(Math.sin(a) * SORTER_REACH, 0, Math.cos(a) * SORTER_REACH);
              }),
            ]),
            new T.LineBasicMaterial({ color: C.lightYellow, transparent: true, opacity: 0.8 }),
          )
        : ring(
            scene,
            e.type === 'artillery' || e.id === 'keeper' ? 4 : 3,
            0.1,
            e.x,
            e.y + 0.1,
            e.z,
            mat(C.orange, true),
          );
    if (e.id === 'sorter') scene.add(zone);
    zone.visible = false;
    const flame =
      e.type === 'welder' || e.id === 'keeper'
        ? new T.Mesh(
            new T.ConeGeometry(1, 1, 10, 1, true),
            new T.MeshBasicMaterial({
              color: C.orange,
              transparent: true,
              opacity: 0.32,
              depthWrite: false,
              side: T.DoubleSide,
            }),
          )
        : null;
    if (flame) {
      scene.add(flame);
      flame.visible = false;
    }
    const supportBeam = new T.Line(
      new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3()]),
      new T.LineBasicMaterial({ color: SIGNAL.open }),
    );
    scene.add(supportBeam);
    supportBeam.visible = false;
    supportBeam.frustumCulled = false;
    const batteryWarning = ['keeper', 'foundry', 'guardian', 'sorter'].includes(e.id)
      ? new T.LineSegments(
          new T.BufferGeometry().setAttribute(
            'position',
            new T.BufferAttribute(new Float32Array(240), 3).setUsage(T.DynamicDrawUsage),
          ),
          new T.LineBasicMaterial({ color: C.orange }),
        )
      : null;
    if (batteryWarning) {
      scene.add(batteryWarning);
      batteryWarning.visible = false;
      batteryWarning.frustumCulled = false;
    }
    const deployment =
      e.wave || e.reserveFor
        ? ring(scene, 2, 0.1, e.x, e.y + 0.09, e.z, mat(SIGNAL.ready, true))
        : null;
    if (deployment) floorDetails.push({ root: deployment, x: e.x, y: e.y, z: e.z, radius: 2.2 });
    const siegeZone =
      e.variant === 'siege' ? ring(scene, 4, 0.1, e.x, e.y + 0.1, e.z, mat(C.orange, true)) : null;
    if (siegeZone) siegeZone.visible = false;
    const view = {
      body: e,
      y: e.y,
      siegeZone,
      deployment,
      batteryWarning,
      charge,
      zone,
      flame,
      supportBeam,
      model,
      materials,
      warning,
    };
    enemyViews.set(e, view);
    view.barrageWarnings = batteryWarning
      ? Array.from({ length: 3 }, () => {
          const marker = ring(
            scene,
            BARRAGE.radius,
            0.1,
            e.x,
            e.y + 0.12,
            e.z,
            mat(C.orange, true),
          );
          marker.visible = false;
          return marker;
        })
      : [];
    if (e.reserveFor) {
      const hatch = new T.Group();
      hatch.position.set(e.x, e.y + 0.03, e.z);
      scene.add(hatch);
      ring(hatch, 2.1, 0.15, 0, 0, 0, C.metal);
      for (const side of [-1, 1]) box(hatch, 3.5, 0.06, 0.18, 0, 0.03, side * 1.4, C.metal, 0);
      floorDetails.push({ root: hatch, x: e.x, y: e.y, z: e.z, radius: 2.3 });
    }
    for (const part of e.parts) {
      const root = new T.Group();
      root.position.set(part.x, e.y, part.z);
      scene.add(root);
      box(root, 2.4, 1.6, 2.8, 0, 0.8, 0, C.dark);
      const lamp = box(root, 1.5, 1.1, 1.8, 0, 1.7, 0, mat(C.orange, true));
      const shutter = e.id === 'foundry' ? box(root, 1.8, 1.3, 0.2, 0, 1.7, 1.05, C.metal) : null;
      enemyViews.set(part, { body: part, y: part.y, enemy: e, shutter, root, lamp });
      root.visible = e.hp > 0;
    }
    if (e.parts.length) {
      const lamp = box(model.body, 1.2, 0.95, 0.08, 0, 1.3, 1.49, mat(C.orange, true), 0);
      const panelMaterial = mat(C.metal),
        shutters = [-1, 1].map((side) =>
          box(model.body, 0.65, 1, 0.14, side * 0.325, 1.3, 1.6, panelMaterial, 0),
        );
      view.coreModel = { lamp, shutters };
    }
    if (e.mirror && e.type !== 'reflector') {
      const plate = box(model.body, 1.65, 1.25, 0.1, 0, 1.4, 1.52, mat(0xd3eee4, true));
      plate.name = 'mirror-plate';
    }
    if (e.guardian) {
      model.root.scale.setScalar(1.35);
      const weak = box(model.body, 1.8, 1.3, 0.15, 0, 1.3, -1.8, mat(C.orange, true));
      weak.name = 'rear-aperture';
    }
    view.baseScale = model.root.scale.clone();
    model.root.visible = e.hp > 0;
  }
  // One split wheel and axle are visible from the bridge, canal and roof.
  const wheel = new T.Group();
  wheel.position.set(-20, -3, 6);
  wheel.rotation.y = Math.PI / 2;
  scene.add(wheel);
  const rim = new T.Mesh(new T.TorusGeometry(7, 0.8, 8, 56, Math.PI * 1.7), mat(C.metal));
  wheel.add(rim);
  for (let i = 0; i < 7; i++) {
    const a = i * 0.72;
    const spoke = box(wheel, 0.55, 6, 0.6, Math.sin(a) * 3, Math.cos(a) * 3, 0, C.dark, 0);
    spoke.rotation.z = -a;
  }
  const axle = cylinder(fixed, 0.8, 10, -18, -3, 6, C.dark, 16);
  axle.rotation.z = Math.PI / 2;
  box(fixed, 2, 13, 3, -24, -8.5, 6, C.dark, 0);
  const turntableTrim = new T.Group(),
    bridgeTrim = new T.Group();
  scene.add(turntableTrim, bridgeTrim);
  for (const r of [7.9, 9.2]) ring(turntableTrim, r, 0.13, 0, 0.13, 23, C.dark);
  for (const x of [-3, 3]) box(bridgeTrim, 0.16, 0.07, 36, x, 0.08, -8, C.metal, 0);
  for (let z = -24; z < 10; z += 4) box(bridgeTrim, 7, 0.06, 0.25, 0, 0.07, z, 0x596e62, 0);
  floorDetails.push(
    { root: turntableTrim, x: 0, y: 0, z: 23, radius: 10, floorMark: true },
    { root: bridgeTrim, x: 0, y: 0, z: -8, radius: 18, floorMark: true },
  );
  const arrivalRail = new T.Group();
  scene.add(arrivalRail);
  for (const side of [-1, 1]) {
    box(arrivalRail, 12, 0.045, 0.12, 30, 0.06, 4 + side * 2.2, 0x76847d, 0);
    box(arrivalRail, 0.12, 0.045, 26, 36 + side * 2.2, 0.06, 17, 0x76847d, 0);
    box(arrivalRail, 24, 0.045, 0.12, 24, 0.06, 30 + side * 2.2, 0x76847d, 0);
  }
  floorDetails.push({ root: arrivalRail, x: 30, y: 0, z: 17, radius: 21, floorMark: true });
  for (const x of [66, 100]) {
    box(fixed, 1.5, 18.8, 16, x, -10.6, -20, C.dark, 0);
    for (const z of [-26, -15]) box(fixed, 2.4, 22.2, 2.4, x, -11.9, z, 0x38534e, 0);
  }
  for (const x of [-8, 8])
    for (const z of [-22, 7]) {
      const mesh = box(scene, 1.8, 16, 1.8, x, -8, z, mat(C.dark), 0);
      mesh.material.transparent = true;
      pillars.push({ mesh, x: x - 0.9, z: z - 0.9, w: 1.8, d: 1.8, y: -16, h: 16 });
      box(fixed, 3, 0.65, 3, x, -15.5, z, C.teal, 0);
    }
  // The broken press foot and water-worn ribs are silhouettes, outside the route.
  for (let z = -20; z < 40; z += 12) {
    box(fixed, 3, 20, 3, -58, -14, z, 0x294a49, 0);
    box(fixed, 6, 0.6, 5, -58, -5, z, 0x48645b, 0);
  }
  // The garden's retaining wall supports the bank from outside its walking strip.
  for (const z of [16, 26]) box(fixed, 1.4, 10, 2, 30.3, -13, z, 0x42625a, 0);
  for (const x of [102, 108, 114]) {
    cylinder(fixed, 0.8, 50, x, -2, -104, C.dark, 12);
    ring(fixed, 1, 0.12, x, 20, -104, C.metal);
  }
  box(fixed, 12, 64, 12, 24, -10, -118, 0x203e3d, 0);
  box(fixed, 10, 6, 10, 24, 25, -118, 0x765e45, 0);
  for (const x of [-49, -44, -35, 34, 39, 58])
    for (const z of [17, 25]) {
      const y = x < 0 ? -16 : -8;
      for (let i = 0; i < 3; i++) {
        const reed = box(
          fixed,
          0.12,
          1.2 + i * 0.3,
          0.12,
          x + i * 0.35,
          y + 0.7,
          z + (i % 2) * 0.3,
          0x9d9e64,
          0,
        );
        reed.rotation.z = (i - 1) * 0.18;
      }
    }
  // Suspension cables connect the loading frame and automatic carrier.
  for (const [x, z, bottom, top] of [
    [85, -41, 6, 18],
    [95, -41, 6, 18],
    [73, -90, 17, 23],
    [83, -90, 17, 23],
  ])
    cylinder(fixed, 0.06, top - bottom, x, (bottom + top) / 2, z, C.metal, 6);
  box(fixed, 14, 0.65, 1, 90, 18, -41, C.dark, 0);
  box(fixed, 14, 0.65, 1, 78, 23, -90, C.dark, 0);
  // The moving shoe and fixed lamps indicate alignment with the upper landing.
  const carrierGauge = new T.Group();
  carrierGauge.name = 'folded-carrier-gauge';
  scene.add(carrierGauge);
  floorDetails.push({ root: carrierGauge, x: 78, y: 8, z: -77.6, radius: 8 });
  for (const x of [72.3, 83.7]) box(carrierGauge, 0.22, 8, 0.16, x, 12, -77.75, C.metal, 0);
  const carrierShoes = [72.3, 83.7].map((x) =>
    box(carrierGauge, 0.8, 0.35, 0.3, x, 8, -77.6, mat(SIGNAL.ready, true), 0),
  );
  const brakeFeed = [];
  for (const x of [74, 76, 80, 82])
    brakeFeed.push(box(carrierGauge, 1, 0.15, 0.2, x, 17, -77.5, mat(SIGNAL.ready, true), 0));
  // An unbroken, supported acceleration lane reads through repeated chevrons.
  for (let x = 96; x < 154; x += 6)
    for (const sign of [-1, 1]) {
      const arrow = box(fixed, 1.7, 0.04, 0.2, x, 16.06, -86 + sign * 0.65, C.lightYellow, 0);
      arrow.rotation.y = (sign * Math.PI) / 4;
    }
  // Short assemblies keep sloped transport readable and cutaways local.
  for (const b of [...cityBelts, ...expansionBelts]) {
    const horizontal = !!b.vx,
      length = horizontal ? b.w : b.d,
      slope = horizontal ? 0 : (b.rise || 0) / b.d,
      stretch = Math.hypot(1, slope),
      segments = [],
      thermal = b.heat ? mat(0xffa05a, true) : null;
    for (let start = 0; start < length; start += 12) {
      const span = Math.min(12, length - start),
        travel = span * stretch,
        cross = horizontal ? b.d : b.w;
      const root = new T.Group(),
        x = horizontal ? b.x + start + span / 2 : b.x + b.w / 2,
        z = horizontal ? b.z + b.d / 2 : b.z + start + span / 2;
      root.name = `folded-belt:${b.id}:${start}`;
      root.position.set(x, deckHeight(b, z), z);
      root.rotation.x = -Math.atan(slope);
      scene.add(root);
      box(
        root,
        horizontal ? travel : cross - 0.3,
        0.08,
        horizontal ? cross - 0.3 : travel,
        0,
        0.02,
        0,
        C.track,
        0,
      );
      const heaters = [];
      if (thermal)
        for (const side of [-1, 1])
          heaters.push(
            box(root, 0.2, 0.1, travel - 0.4, side * (cross / 2 - 0.5), 0.22, 0, thermal, 0),
          );
      const rollers = [];
      for (const side of [-1, 1]) {
        box(
          root,
          horizontal ? travel : 0.2,
          0.22,
          horizontal ? 0.2 : travel,
          horizontal ? 0 : side * (cross / 2 - 0.15),
          0.07,
          horizontal ? side * (cross / 2 - 0.15) : 0,
          C.metal,
          0,
        );
        const roller = cylinder(
          root,
          0.22,
          cross - 0.45,
          horizontal ? side * (travel / 2 - 0.28) : 0,
          -0.04,
          horizontal ? 0 : side * (travel / 2 - 0.28),
          C.metal,
          12,
        );
        roller.rotation[horizontal ? 'x' : 'z'] = Math.PI / 2;
        roller.userData.mount = roller.quaternion.clone();
        rollers.push(roller);
        for (const end of [-1, 1])
          box(
            root,
            0.4,
            0.16,
            0.4,
            horizontal ? end * (travel / 2 - 0.28) : side * (cross / 2 - 0.15),
            0.22,
            horizontal ? side * (cross / 2 - 0.15) : end * (travel / 2 - 0.28),
            C.yellow,
            0.04,
          );
      }
      const count = Math.ceil(travel / 1.05),
        geometry = new T.BoxGeometry(
          horizontal ? 0.62 : cross - 0.65,
          0.1,
          horizontal ? cross - 0.65 : 0.62,
        ),
        mesh = new T.InstancedMesh(geometry, mat(0xffffff), count);
      mesh.name = `folded-belt-slats:${b.id}:${start}`;
      mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
      root.add(mesh);
      const dummy = new T.Object3D();
      for (let i = 0; i < count; i++) {
        dummy.position.set(
          horizontal ? (i * travel) / count - travel / 2 : 0,
          0.15,
          horizontal ? 0 : (i * travel) / count - travel / 2,
        );
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, new T.Color(i % 6 === 0 ? 0xb6a578 : 0x485956));
      }
      mesh.boundingBox = new T.Box3(
        new T.Vector3(
          horizontal ? -travel / 2 - 0.32 : -(cross - 0.65) / 2,
          0.1,
          horizontal ? -(cross - 0.65) / 2 : -travel / 2 - 0.32,
        ),
        new T.Vector3(
          horizontal ? travel / 2 + 0.32 : (cross - 0.65) / 2,
          0.2,
          horizontal ? (cross - 0.65) / 2 : travel / 2 + 0.32,
        ),
      );
      mesh.boundingSphere = mesh.boundingBox.getBoundingSphere(new T.Sphere());
      segments.push({ root, mesh, count, travel, rollers, heaters, beltSurface: b });
    }
    belts.push({ ...b, horizontal, length, stretch, segments, mesh: segments[0].mesh, phase: 0 });
  }
  const mirrorCanvas = document.createElement('canvas');
  mirrorCanvas.width = mirrorCanvas.height = 128;
  const mirrorPaint = mirrorCanvas.getContext('2d'),
    sheen = mirrorPaint.createLinearGradient(0, 128, 128, 0);
  for (const [stop, color] of [
    [0, '#90a69f'],
    [0.38, '#dce5d8'],
    [0.43, '#fff7dd'],
    [0.53, '#fff7dd'],
    [0.58, '#a3b9b0'],
    [1, '#e5ebd9'],
  ])
    sheen.addColorStop(stop, color);
  mirrorPaint.fillStyle = sheen;
  mirrorPaint.fillRect(0, 0, 128, 128);
  const mirrorTexture = new T.CanvasTexture(mirrorCanvas);
  mirrorTexture.colorSpace = T.SRGBColorSpace;
  for (const d of state.machinery.mirrors) {
    const normal = d.normal,
      root = new T.Group();
    root.position.set(d.x, d.y, d.z);
    root.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), normal);
    scene.add(root);
    // The physical plane reflects on both sides; no opaque backing may conceal it.
    for (const y of [-1.65, 1.65]) box(root, d.size + 0.5, 0.3, 0.35, 0, y, 0, C.dark, 0);
    const mesh = new T.Mesh(
      d.turnable ? new T.BoxGeometry(d.size, 3, 0.3) : new T.PlaneGeometry(d.size, 3),
      new T.MeshBasicMaterial({ color: 0xd3eee4, map: mirrorTexture, side: T.DoubleSide }),
    );
    root.add(mesh);
    for (const x of [-d.size / 2, d.size / 2]) box(root, 0.15, 3.3, 0.12, x, 0, 0.08, C.yellow);
    if (d.turnable) {
      cylinder(root, 0.7, 0.3, 0, -1.8, 0, C.metal, 12);
      const base = new T.Group();
      base.position.set(d.x, d.y - 1.9, d.z);
      scene.add(base);
      cylinder(base, 1.5, 0.2, 0, 0, 0, C.dark, 24);
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        box(base, 0.24, 0.12, 0.24, Math.sin(a) * 1.2, 0.16, Math.cos(a) * 1.2, C.yellow, 0);
      }
      floorDetails.push({ root: base, x: d.x, y: d.y - 1.9, z: d.z, radius: 1.5 });
    }
    const mirror = { ...d, body: d, root, mesh };
    mesh.userData.mirror = d;
    mirrorViews.push(mirror);
  }
  // Continuous recessed tracks make the quiet final approach a clear Phoenix run.
  for (const side of [-1, 1]) box(fixed, 218, 0.05, 0.14, 145, -39.93, 6 + side * 2.3, 0x89978f, 0);
  // Local relay feeds end at the adjacent workshop and Prototype doors.
  // Service rails lead out of the repair bay; quiet metal never competes with a live target.
  for (const d of foldedDecks.filter((d) =>
    ['foundry-west', 'foundry-west-ramp', 'foundry-reclaim-track'].includes(d.id),
  )) {
    const root = new T.Group();
    root.position.set(d.x + d.w / 2, d.y + (d.rise || 0) / 2, d.z + d.d / 2);
    root.rotation.x = -Math.atan2(d.rise || 0, d.d);
    scene.add(root);
    const across = d.w > d.d,
      length = across ? d.w : Math.hypot(d.d, d.rise || 0);
    for (const side of [-1, 1])
      box(
        root,
        across ? length : 0.1,
        0.045,
        across ? 0.1 : length,
        across ? 0 : side * 2.2,
        0.04,
        across ? side * 2.2 : 0,
        0x76847d,
        0,
      );
    floorDetails.push({
      root,
      x: root.position.x,
      y: root.position.y,
      z: root.position.z,
      radius: length / 2,
      floorMark: true,
    });
  }
  // Relay lamps belong to recognisable flywheel drives, rather than isolated target posts.
  const relayDrives = [];
  for (const id of ['relay-west', 'relay-east']) {
    const c = foldedControls.find((c) => c.id === id),
      root = new T.Group();
    root.position.set(c.x, c.y - 1.5, c.z - 5.5);
    scene.add(root);
    box(root, 4.6, 0.5, 2.5, 0, 0.25, 0, C.dark, 0.1);
    const axle = cylinder(root, 1.35, 3.2, 0, 1.7, 0, C.dark, 12);
    axle.rotation.z = Math.PI / 2;
    for (const x of [-1.5, 1.5]) {
      const flywheel = ring(root, 1.4, 0.22, x, 1.7, 0, C.metal);
      flywheel.rotation.z = Math.PI / 2;
    }
    const rotor = new T.Group();
    rotor.position.set(1.75, 1.7, 0);
    root.add(rotor);
    for (const angle of [0, Math.PI / 3, (Math.PI * 2) / 3]) {
      const spoke = box(rotor, 0.13, 2.4, 0.14, 0, 0, 0, C.metal, 0);
      spoke.rotation.x = angle;
    }
    const lamp = box(root, 1.3, 0.16, 0.5, 0, 3.15, 0, mat(SIGNAL.ready, true), 0);
    box(root, 0.14, 0.14, 4.2, 0, 0.1, 3.4, C.dark, 0);
    relayDrives.push({ id, rotor, lamp });
    floorDetails.push({ root, x: c.x, y: c.y - 1.5, z: c.z - 5.5, radius: 3 });
  }
  // Large machines stand beside paths, with a visible common furnace at the bottom.
  const furnace = new T.Group();
  scene.add(furnace);
  furnace.position.set(0, -56, -8);
  cylinder(furnace, 6, 1, 0, 0.5, 0, C.dark, 16);
  ring(furnace, 5.5, 0.5, 0, 6.7, 0, C.dark);
  const firebox = cylinder(furnace, 4.8, 6, 0, 3.4, 0, mat(C.orange, true), 16);
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 4)
    box(furnace, 0.65, 8, 0.65, Math.sin(a) * 5.3, 4, Math.cos(a) * 5.3, C.metal);
  floorDetails.push({ root: furnace, x: 0, y: -56, z: -8, radius: 7 });
  const clamps = [];
  for (const x of [-3, 3]) clamps.push(box(scene, 0.5, 1, 3, x, -55.5, 0, mat(C.metal)));

  for (const [x, y, z] of [
    [-40, -16, 40],
    [216, -24, 108],
    [234, -8, 40],
  ]) {
    cylinder(fixed, 1.8, 4, x, y + 2, z, C.dark, 12);
    for (const yy of [1, 3]) ring(fixed, 1.9, 0.2, x, y + yy, z, C.metal);
  }
  // Discarded compatible chassis physically lead toward the voluntary docking socket.
  for (const [x, z, y] of [
    [76, 50, -40],
    [98, 25, -40],
    [82, -6.5, -40],
    [50, -18, -40],
  ]) {
    const wreck = tankModel();
    wreck.root.position.set(x, y, z);
    wreck.root.rotation.y = 1.8;
    wreck.turret.rotation.z = 0.3;
    scene.add(wreck.root);
    floorDetails.push({ root: wreck.root, x, y, z, radius: 3 });
    wreck.root.traverse((m) => {
      if (m.isMesh && m.material.color) {
        m.material = m.material.clone();
        m.material.color.lerp(new T.Color(C.dark), 0.7);
      }
    });
  }
  const press = new T.Group();
  press.position.set(-46, -16, 40);
  scene.add(press);
  for (const x of [-5, 5]) {
    box(press, 1.1, 24, 1.3, x, 12, 0, C.dark);
    for (const y of [1, 11, 22]) box(press, 1.5, 0.7, 1.7, x, y, 0, C.metal, 0);
  }
  const pressHead = box(press, 13, 2.4, 3.5, 0, 23.3, 0, 0x87958a);
  pressHead.rotation.z = -0.06;
  cylinder(press, 1.1, 11, 0, 16, 0, C.dark, 12);
  const ram = box(press, 8, 2.5, 3.5, 0, 8, 0, mat(C.metal));
  floorDetails.push({ root: press, x: -46, y: -16, z: 40, radius: 8 });
  const pipeLights = [];
  // The same three vertical mains can be seen from optics, the pump and the rig.
  for (const x of [142, 146, 150]) {
    const pipe = box(scene, 1.2, 57, 1.2, x, 3, -42, mat(C.dark), 0);
    pipe.material.transparent = true;
    pillars.push({ mesh: pipe, x: x - 0.6, z: -42.6, w: 1.2, d: 1.2, y: -25.5, h: 57 });
    for (const y of [-24, -8, 24]) {
      const lamp = ring(scene, 0.7, 0.12, x, y, -42, mat(C.orange, true));
      pipeLights.push({ lamp, y });
    }
  }
  const tender = new T.Group();
  tender.position.set(110, -24, 30);
  scene.add(tender);
  box(tender, 1.8, 0.8, 2, 0, 0.5, 0, C.metal);
  const tenderLamp = box(tender, 0.65, 0.22, 0.1, 0, 1, 1, mat(C.dark, true));
  for (const side of [-1, 1]) box(tender, 0.35, 0.35, 2.2, side * 1.05, 0.2, 0, C.metal, 0.1);
  const tenderDetail = { root: tender, x: 110, y: -24, z: 30, radius: 2, stops: [-24, -16] };
  floorDetails.push(tenderDetail);
  const dish = new T.Group();
  dish.position.set(204, 42, 146);
  scene.add(dish);
  cylinder(dish, 0.5, 5, 0, 2.5, 0, C.dark, 12);
  const bowl = new T.Mesh(
    new T.SphereGeometry(4, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    new T.MeshToonMaterial({ color: C.metal, side: T.DoubleSide }),
  );
  bowl.position.y = 5;
  bowl.rotation.z = 0.5;
  dish.add(bowl);
  floorDetails.push({ root: dish, x: 204, y: 40, z: 146, radius: 5 });
  // Batch scenery within small 3-D cells, preserving independent fade bounds.
  const cells = new Map();
  for (const mesh of [...fixed.children]) {
    const key = [mesh.position.x, mesh.position.y, mesh.position.z]
      .map((v) => Math.floor(v / 12))
      .join('/');
    if (!cells.has(key)) {
      const root = new T.Group();
      root.name = `folded-scenery:${key}`;
      cells.set(key, root);
    }
    cells.get(key).add(mesh);
  }
  for (const root of cells.values()) {
    fixed.add(root);
    batchStatic(root);
  }
  scene.updateMatrixWorld(true);
  const occlusion = createOcclusion(scene, rendering, batchStatic);
  const registerOccluder = occlusion.register,
    occluders = occlusion.objects;
  for (const root of sidePuzzles.roots)
    registerOccluder(
      root,
      root.name.startsWith('side-circuit:')
        ? { floorMark: true, circuit: true }
        : sidePuzzles.owners.get(root),
      { dynamic: true },
    );
  for (const wall of walls) registerOccluder(wall.mesh, wall, { dynamic: true, clone: !wall.mass });
  for (const object of [
    ...controls,
    ...hives,
    ...pickupViews,
    ...liftViews,
    ...floorDetails,
    ...mirrorViews,
  ])
    registerOccluder(object.root, object, {
      dynamic:
        object.stops !== undefined ||
        !!object.lift ||
        !!object.mount ||
        mirrorViews.includes(object),
      cameraSoft:
        hives.includes(object) || controls.includes(object) || pickupViews.includes(object),
      layered: controls.includes(object) || hives.includes(object) || pickupViews.includes(object),
    });
  for (const object of pillars) registerOccluder(object.mesh, object);
  for (const root of cells.values()) registerOccluder(root);
  for (const b of belts) for (const segment of b.segments) registerOccluder(segment.root, segment);
  for (const mesh of [wheel, ...clamps, ...pipeLights.map((p) => p.lamp)])
    registerOccluder(mesh, null, { dynamic: true });
  for (const enemy of enemies) {
    const view = enemyViews.get(enemy);
    registerOccluder(view.model.root, view, { clone: false, dynamic: true, layered: true });
    for (const part of enemy.parts) {
      const partView = enemyViews.get(part);
      registerOccluder(partView.root, partView, { dynamic: true, layered: true });
    }
  }
  occlusion.seal();
  const sightDirection = new T.Vector3(28, 39.6, 28).normalize();
  scene.updateMatrixWorld(true);
  function setThirdPerson(value) {
    thirdPerson = value;
    rendering.setView(value);
    presentation.setView(value);
    massDepth.visible = true;
    floorMeshes.visible = !value;
    floorBatches.visible = floorDepthBatches.visible = value;
    floorTrimMeshes.visible = !value;
    floorTrimBatches.visible = value;
    occlusion.reset();
  }
  function updateCameraOcclusion(camera, p, dt) {
    rendering.setCamera(p, camera);
  }
  function pulseHive(id, kind = 'repair') {
    const hive = hives.find((h) => h.id === id);
    if (!hive) return;
    hive.pulse = kind === 'respawn' ? 2.4 : 1.8;
    hive.pulseKind = kind;
  }

  const surfaceGrid = architectureIndex(surfaces),
    wallGrid = architectureIndex(walls.filter((w) => !w.motion && !w.rail));
  const movingWalls = walls.filter((w) => w.motion || w.rail);
  // Synchronize scene query bounds and meshes from simulation-owned bodies.
  // Calling this repeatedly must not advance machinery or modify a save.
  function syncMovingSolids() {
    for (const w of movingWalls) {
      const s = foldedSolids.find((s) => s.id === w.id);
      w.x = s.x;
      w.z = s.z;
      w.mesh.position.x = s.x + s.w / 2;
      w.mesh.position.z = s.z + s.d / 2;
      w.mesh.updateMatrixWorld();
    }
  }
  function cast(
    origin,
    direction,
    distance,
    { targets = true, aiming = false, extras = [], terrainOnly = false } = {},
  ) {
    raycaster.set(origin, direction);
    raycaster.far = distance;
    if (terrainOnly)
      return (
        raycaster
          .intersectObjects(
            [
              ...[...surfaceGrid.ray(origin, direction, distance)].map((s) => s.mesh),
              ...liftViews.map((l) => l.mesh),
            ],
            false,
          )
          .find(
            (h) =>
              h.face.normal.y > 0.5 &&
              (!aiming ||
                (!thirdPerson && !h.object.userData.aperture) ||
                rendering.aimVisible(h.point, viewPlayer, {
                  third: thirdPerson,
                  direction: sightDirection,
                  terrain: h.object.userData.supportSurface,
                  support: supportPatches,
                })),
          ) || null
      );
    // Overhead picking selects the working face; the muzzle ray still collides with every housing.
    const controlMeshes =
      aiming && !thirdPerson
        ? []
        : controls
            .filter(
              (c) =>
                (!c.mount || c.slide || !signals.active(c.id)) &&
                (!aiming || !c.root.userData.cutaway),
            )
            .flatMap((c) => c.housing);
    const meshes = [
      ...controlMeshes,
      ...[...surfaceGrid.ray(origin, direction, distance)].map((s) => s.mesh),
      ...[...wallGrid.ray(origin, direction, distance), ...movingWalls]
        .filter((w) => activeSolid(w, state) && (!aiming || w.opacity > 0.4))
        .map((w) => w.mesh),
      ...liftViews.filter((l) => !aiming || !l.root.userData.cutaway).map((l) => l.mesh),
      ...mirrorViews.filter((m) => !aiming || !m.root.userData.cutaway).map((m) => m.mesh),
    ];
    let hit =
      raycaster.intersectObjects(meshes, false).find(
        (h) =>
          !aiming ||
          (!thirdPerson && !(h.object.userData.aperture || h.object.userData.massAperture)) ||
          rendering.aimVisible(h.point, viewPlayer, {
            third: thirdPerson,
            direction: sightDirection,
            structure: h.object.userData.massAperture,
            terrain: h.object.userData.supportSurface,
            support: supportPatches,
          }),
      ) || null;
    if (hit?.object.userData.mirror) hit.mirror = hit.object.userData.mirror;
    if (hit?.object.userData.controlHousing)
      hit.blockedTarget = controls.find((c) => c.id === hit.object.userData.controlHousing);
    const puzzleHit = sidePuzzles.cast(raycaster, targets);
    if (
      puzzleHit &&
      (!hit || puzzleHit.distance < hit.distance) &&
      (!aiming ||
        (!puzzleHit.target?.root?.userData.cutaway &&
          rendering.aimVisible(puzzleHit.point, viewPlayer, {
            third: thirdPerson,
            direction: sightDirection,
          })))
    )
      hit = puzzleHit;
    const structure = presentation.cast(origin, direction, distance, aiming);
    if (structure && (!hit || structure.distance < hit.distance)) hit = structure;
    if (targets)
      for (const t of [
        ...controls.filter(
          (c) => !['use', 'dock'].includes(c.kind) && (c.slide || !signals.active(c.id)),
        ),
        ...enemies.filter((e) => e.hp > 0),
        ...enemies.filter((e) => e.hp > 0).flatMap((e) => e.parts.filter((p) => p.hp > 0)),
        ...extras.filter((t) => !t.disarmed),
      ]) {
        const point = new T.Vector3(t.x, t.y + (t.kind === 'enemy' ? 1.5 : 0), t.z);
        if (t.facing) point.addScaledVector(t.facing, 0.5);
        // Fading a same-floor magnetic housing must not disable picking its blue grip.
        const accessibleGrip =
          t.kind === 'magnet' && Math.abs((t.ground ?? t.y - 1.3) - viewPlayer.y) < 3;
        const view = enemyViews.get(t);
        const targetRoot = view ? view.model?.root || view.root : t.root;
        if (aiming && targetRoot?.userData.cutaway && !accessibleGrip) continue;
        if (aiming && ((t.kind === 'enemy' && !t.readable) || (t.enemy && !t.enemy.readable)))
          continue;
        const normal = t.opticalNormal || t.facing;
        const intersection = normal
          ? raycaster.ray.intersectPlane(
              new T.Plane().setFromNormalAndCoplanarPoint(normal, point),
              new T.Vector3(),
            )
          : t.surface === 'top' && !aiming
            ? raycaster.ray.intersectPlane(
                new T.Plane(new T.Vector3(0, 1, 0), -t.y),
                new T.Vector3(),
              )
            : raycaster.ray.intersectSphere(new T.Sphere(point, t.radius), new T.Vector3());
        if (
          t.surface === 'top' &&
          intersection &&
          Math.hypot(intersection.x - t.x, intersection.z - t.z) > t.radius
        )
          continue;
        if (normal && intersection && intersection.distanceTo(point) > t.radius) continue;
        if (intersection) {
          const d = intersection.distanceTo(origin);
          if (d <= distance && (!hit || d < hit.distance))
            hit = {
              point: intersection,
              distance: d,
              ...(!aiming &&
              ((t.frontOnly && direction.dot(t.opticalNormal) >= 0) ||
                (t.mount && direction.dot(t.facing) >= 0))
                ? { blockedTarget: t }
                : { target: t }),
            };
        }
      }
    return hit;
  }
  function feedColor(feed, index, time) {
    const elapsed = signals.elapsed(feed.id, time),
      progress =
        feed.lamps[index].progress ??
        feed.lamps[index].userData?.progress ??
        index / Math.max(1, feed.lamps.length - 1);
    return circuitColor(signals.active(feed.id), elapsed, progress, feed.duration || 3);
  }
  function update(dt, time, p, camera = null) {
    rendering.enable(!p.endingTime);
    supportPatches = groundPatches(p, state.machinery.lifts);
    rendering.support(supportPatches);
    if (camera && !thirdPerson) camera.getWorldDirection(sightDirection).negate();
    Object.assign(viewPlayer, { x: p.x, y: p.y, z: p.z });
    rendering.update(
      p,
      sightDirection,
      enemies.some((e) => e.guardian && e.hp > 0 && Math.abs(p.y - e.y) < 3)
        ? T.MathUtils.clamp((30 - Math.hypot(p.x - 202, p.z - 64)) / 8, 0, 1)
        : 0,
    );
    presentation.sight(p, sightDirection);
    presentation.update(time, p, state);
    for (const s of surfaces)
      s.opacity = thirdPerson
        ? 1
        : rendering.opacity(s.mesh.position, p, {
            third: false,
            direction: sightDirection,
            terrain: true,
            support: supportPatches,
          });
    for (const w of walls) {
      w.open = T.MathUtils.damp(w.open, activeSolid(w, state) ? 0 : 1, 9, dt);
      w.mesh.position.y = w.y + w.h / 2 - w.open * (w.h + 0.5);
      w.mesh.visible = !w.invisible && w.open < 0.999;
      w.mesh.updateMatrixWorld();
    }
    for (const c of controls) {
      if (c.mountWall) {
        c.root.position.copy(c.mountWall.mesh.position).add(c.mountOffset);
        c.x = c.root.position.x;
        c.y = c.root.position.y;
        c.z = c.root.position.z;
        c.root.updateMatrixWorld();
      }
      c.flash = Math.max(0, c.flash - dt);
      const localPending = signals.pending(c.id),
        localElapsed = localPending ? localPending.duration - localPending.remaining : Infinity;
      c.localLamps.forEach((lamp, i) =>
        lamp.material.color.setHex(
          circuitColor(signals.active(c.id), localElapsed, (i + 1) / c.localLamps.length, 0.18),
        ),
      );
      const engaged = signals.active(c.id),
        aligned = engaged || mechanismReady(c, p, time, state);
      c.ready = aligned;
      c.engaged = T.MathUtils.damp(c.engaged, engaged ? 1 : 0, 8, dt);
      c.lamp.scale.setScalar(
        !engaged && Math.abs(c.y - p.y - 1.3) < 4 && Math.hypot(c.x - p.x, c.z - p.z) < 22
          ? 1 + Math.sin(time * 3) * 0.06
          : 1,
      );
      c.lamp.material.color.setHex(
        !aligned
          ? C.dark
          : c.flash
            ? C.lightYellow
            : engaged
              ? SIGNAL.open
              : c.kind === 'magnet'
                ? SIGNAL.magnet
                : SIGNAL.ready,
      );
      // An operated optical collector opens its backplate for downstream beams.
      if (c.kind === 'laser' && c.housing[0]) {
        const back = c.housing[0];
        back.position.y = T.MathUtils.damp(
          back.position.y,
          engaged ? c.radius * 2 + 0.7 : 0,
          12,
          dt,
        );
        back.updateWorldMatrix(true, false);
      }
      if (c.cover) {
        if (c.mount) {
          c.cover.scale.y = T.MathUtils.damp(c.cover.scale.y, aligned ? 0.015 : 1, 12, dt);
          c.cover.position.y = (-(1 - c.cover.scale.y) * c.coverBase.h) / 2;
          c.cover.position.z = T.MathUtils.damp(
            c.cover.position.z,
            aligned ? -0.4 : c.coverBase.z,
            12,
            dt,
          );
        } else {
          const axis = c.surface === 'top' ? 'x' : 'y',
            base = c.coverBase[axis];
          c.cover.position[axis] = T.MathUtils.damp(
            c.cover.position[axis],
            base + (aligned ? (c.surface === 'top' ? 2.4 : c.coverBase.h + 0.35) : 0),
            12,
            dt,
          );
        }
        c.cover.updateWorldMatrix(true, false);
      }
      if (c.plate) {
        c.plate.position.y = T.MathUtils.damp(c.plate.position.y, aligned ? 0.14 : 0.3, 12, dt);
        c.plate.material.color.setHex(aligned ? SIGNAL.open : SIGNAL.ready);
        c.plateFeed.material.color.setHex(aligned ? SIGNAL.open : SIGNAL.ready);
      }
      if (c.weight) c.weight.position.y = 3 - c.engaged * 3.4;
      if (c.rotor) c.moving.rotation.z = -Math.PI / 4 + (c.engaged * Math.PI) / 4;
      else if (c.kind === 'magnet' && !c.slide) {
        if (engaged !== c.detached) {
          c.detached = engaged;
          c.detachAge = 0;
          c.pull = 0;
        }
        if (engaged) {
          c.detachAge = Math.min(1, c.detachAge + dt);
          const t = Math.min(1, c.detachAge / 0.75),
            travel = 1 - (1 - t) ** 3;
          // The grip falls in world space even when its inclined door retracts.
          c.moving.position
            .copy(c.pullDirection)
            .applyQuaternion(c.root.quaternion)
            .multiplyScalar(travel * 1.4)
            .add(c.root.position);
          c.moving.position.x += travel * 0.8;
          c.moving.position.y =
            c.restY +
            ((c.ground ?? c.restY - 1.3) - c.restY + 0.65) * t +
            Math.sin(t * Math.PI) * 0.65;
          c.root.worldToLocal(c.moving.position);
          c.moving.rotation.set((t * Math.PI) / 2, 0, t * 0.4);
        } else {
          if (time - (c.tugAt ?? -Infinity) > dt * 1.5)
            c.pull = Math.max(0, (c.pull || 0) - dt * 2);
          c.moving.position.copy(c.pullDirection).multiplyScalar((c.pull || 0) * 0.6);
          c.moving.rotation.set(0, 0, Math.sin(time * 35) * (c.pull || 0) * 0.07);
        }
      } else if (c.kind === 'magnet') c.moving.position.y = c.engaged * 0.55;
      else if (c.kind === 'laser' || c.kind === 'use')
        c.moving.rotation.z = c.engaged * Math.PI * 0.55;
      else if (c.surface === 'top') c.moving.position.y = -c.engaged * 0.4;
      else c.moving.position.z = -c.engaged * 0.3 - (c.flash ? Math.sin(c.flash * 24) * 0.08 : 0);
      c.root.updateMatrixWorld();
    }
    for (const m of mirrorViews) {
      m.mesh.material.color.setHex(m.body.flash ? C.lightYellow : 0xd3eee4);
      m.root.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), m.body.normal);
      m.root.updateMatrixWorld();
    }
    for (const l of liftViews) {
      l.y = l.body.y;
      l.root.position.y = l.y;
      l.root.updateMatrixWorld();
    }
    const carrierLift = state.machinery.lifts.find((l) => l.id === 'carrier'),
      aligned = Math.abs(carrierLift.y - 16) < 0.15;
    for (const shoe of carrierShoes) {
      shoe.position.y = carrierLift.y + 0.25;
      shoe.material.color.setHex(aligned ? SIGNAL.open : SIGNAL.ready);
    }
    for (const lamp of brakeFeed) lamp.material.color.setHex(aligned ? SIGNAL.open : C.dark);
    for (const display of battleDisplays)
      for (const icon of display.icons)
        icon.root.visible = enemies.find((e) => e.id === icon.id).hp > 0;
    for (const p of pickupViews) {
      p.y = p.body.y;
      p.root.position.y = p.y;
      p.root.updateMatrixWorld();
      p.root.visible = p.preview || !p.requires || !!state[p.requires];
      p.item.visible = !state[p.id];
      if (p.cage) p.cage.visible = !state[p.requires];
      p.halo.material.color.setHex(
        state[p.id] ? C.dark : p.requires && !state[p.requires] ? C.metal : C.yellow,
      );
      p.item.position.y = Math.sin(time * 2) * 0.15;
      p.item.rotation.y = time * 0.35;
    }
    for (const h of hives) {
      h.root.visible = !h.requires || !!state[h.requires];
      h.pulse = Math.max(0, h.pulse - dt);
      const nearby = Math.abs(p.y - h.y) < 2 && Math.hypot(p.x - h.x, p.z - h.z) < 6,
        active = state.anchor === h.id;
      h.proximity = T.MathUtils.damp(h.proximity, nearby ? 1 : 0, 5, dt);
      const work =
        h.pulse > 0
          ? Math.sin((1 - h.pulse / (h.pulseKind === 'respawn' ? 2.4 : 1.8)) * Math.PI)
          : 0;
      for (const { pivot, side } of h.arms)
        pivot.rotation.z = side * (0.55 - h.proximity * 0.4 - work * 0.55);
      h.halo.scale.setScalar(1 + Math.sin(time * 2) * 0.025 + h.proximity * 0.08);
      h.halo.material.color.setHex(active || nearby ? C.mint : C.metal);
      h.scan.position.y =
        0.25 +
        (h.pulse > 0 ? ((((h.pulseKind === 'respawn' ? 2.4 : 1.8) - h.pulse) * 1.8) % 1) * 2.4 : 0);
      h.scan.scale.setScalar(h.pulse > 0 ? 1 + work * 0.3 : 0.95 + Math.sin(time * 2) * 0.04);
      h.scan.visible = nearby || h.pulse > 0;
      for (const lamp of h.lamps)
        lamp.material.color.setHex(
          h.pulse > 0 ? C.lightYellow : active || nearby ? C.mint : C.metal,
        );
    }
    const matrix = new T.Matrix4(),
      rollerSpin = new T.Quaternion(),
      rollerAxis = new T.Vector3(0, 1, 0);
    slideMarkers.update(time);
    thermalFloors.update(time, state);
    for (const b of belts) {
      if (Math.hypot(p.x - b.x - b.w / 2, p.z - b.z - b.d / 2) > 80 + b.length / 2) continue;
      const part = b.id.includes('feed-') ? (b.id.endsWith('left') ? 0 : 1) : null,
        owner = enemies.find((e) => e.id === (b.id.startsWith('foundry') ? 'foundry' : 'keeper')),
        working = part === null || (owner.hp > 0 && owner.parts[part].hp > 0);
      if (working)
        b.phase +=
          dt *
          (b.release && state[b.release] ? -4 : Math.hypot(b.vx, b.vz) * Math.sign(b.vx || b.vz)) *
          b.stretch;
      for (const segment of b.segments) {
        const { mesh, count, travel } = segment;
        for (const lamp of segment.heaters)
          lamp.material.color.setHex(state[b.release] || state[b.stop] ? C.metal : 0xffa05a);
        for (let i = 0; i < count; i++) {
          const along =
            (((((i * travel) / count + b.phase) % travel) + travel) % travel) - travel / 2;
          matrix.makeTranslation(b.horizontal ? along : 0, 0.15, b.horizontal ? 0 : along);
          mesh.setMatrixAt(i, matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
        rollerSpin.setFromAxisAngle(rollerAxis, -b.phase / 0.22);
        for (const roller of segment.rollers)
          roller.quaternion.copy(roller.userData.mount).multiply(rollerSpin);
      }
    }
    for (const feed of gateSignals)
      feed.lamps.forEach((lamp, i) =>
        lamp.material.color.setHex(
          feed.arena
            ? state.combatArena === feed.arena
              ? C.red
              : SIGNAL.open
            : !activeSolid(feed.body, state)
              ? SIGNAL.open
              : SIGNAL.ready,
        ),
      );
    for (const terminal of eventTerminals)
      terminal.lamp.material.color.setHex(signals.active(terminal.id) ? SIGNAL.open : SIGNAL.ready);
    for (const feed of controlFeeds) {
      const active = signals.active(feed.id),
        elapsed = signals.elapsed(feed.id, time);
      if (feed.resting === active && (!active || elapsed >= feed.duration)) continue;
      let changed = false;
      feed.lamps.forEach((lamp, i) => {
        const color = feedColor(feed, i, time);
        if (lamp.color.getHex() !== color) {
          lamp.color.setHex(color);
          feed.mesh.setColorAt(i, lamp.color);
          changed = true;
        }
      });
      if (changed) feed.mesh.instanceColor.needsUpdate = true;
      feed.resting = !active || elapsed >= feed.duration ? active : undefined;
    }
    for (const drive of relayDrives) {
      if (state[drive.id]) drive.rotor.rotation.x += dt * 1.8;
      drive.lamp.material.color.setHex(state[drive.id] ? SIGNAL.open : SIGNAL.ready);
    }

    for (const e of enemies) {
      const view = enemyViews.get(e);
      view.y = e.y;
      if (e.id === 'prototype')
        view.model.frontArmor.position.y = T.MathUtils.damp(
          view.model.frontArmor.position.y,
          e.phase === 'vent' ? 2.7 : 1.2,
          12,
          dt,
        );
      for (const part of e.parts) {
        const partView = enemyViews.get(part);
        partView.y = part.y;
        if (partView.shutter)
          partView.shutter.position.y = T.MathUtils.damp(
            partView.shutter.position.y,
            e.phase === 'vent' ? 3.2 : 1.7,
            10,
            dt,
          );
        partView.lamp.material.color.setHex(part.hp ? C.orange : C.dark);
        partView.root.visible = e.hp > 0;
      }
      if (view.coreModel) {
        const open =
          e.hp > 0 &&
          e.parts.every((part) => part.hp <= 0) &&
          (e.id !== 'foundry' || e.phase === 'vent');
        view.coreModel.lamp.material.color.setHex(open ? C.orange : C.dark);
        view.coreModel.shutters.forEach(
          (shutter, i) =>
            (shutter.position.x = T.MathUtils.damp(
              shutter.position.x,
              (i ? 1 : -1) * (open ? 1 : 0.325),
              10,
              dt,
            )),
        );
      }
    }
    const renewal = presentation.finale.update(
      dt,
      time,
      p,
      state,
      enemies.find((e) => e.id === 'keeper'),
    );
    const keeper = enemies.find((e) => e.id === 'keeper');
    const flare = Math.max(
      0,
      ...presentation.finale.feeds
        .filter((f) => keeper.hp > 0 && keeper.parts[f.index].hp > 0)
        .flatMap((f) =>
          f.scraps.map((s) => Math.pow(Math.max(0, 1 - ((f.phase + s.offset) % 26) / 3), 2)),
        ),
    );
    const glow = renewal.power || 0.035 + flare * 0.2;
    firebox.material.color.setRGB(0.4 + glow * 0.6, 0.15 + glow * 0.65, 0.04 + glow * 0.3);
    clamps.forEach(
      (m, i) => (m.position.x = (i ? 1 : -1) * (3 - Math.min(1, p.dockHold / 2 || 0) * 1.3)),
    );
    ram.position.y = state.foundry
      ? T.MathUtils.damp(ram.position.y, 10.5, 3, dt)
      : 8 + Math.sin(time * 0.75) * 2.5;
    tenderLamp.material.color.setHex(state.maintenance ? C.mint : C.dark);
    tender.position.set(...sidePuzzles.delivery.position);
    tender.rotation.y = sidePuzzles.delivery.heading;
    Object.assign(tenderDetail, {
      x: tender.position.x,
      y: tender.position.y,
      z: tender.position.z,
    });
    for (const { lamp, y } of pipeLights)
      lamp.material.color.setHex(
        p.endingTime || (state.pump && y === -8) || (state['pressure-return'] && y === -24)
          ? C.mint
          : C.orange,
      );
    const dishFeed = controlFeeds.find((f) => f.id === 'signal' && f.target === 'signal-dish');
    const signalPhase = signals.elapsed('signal', time) - (dishFeed?.duration || 0);
    bowl.rotation.y = circuitReady(state, 'signal', 'signal-dish')
      ? signalPhase < 0.65
        ? 0
        : signalPhase < 1.5
          ? ((signalPhase - 0.65) / 0.85) * 0.35
          : 0.35
      : 0;
    wheel.rotation.z = Math.sin(time * 0.08) * 0.06;
    waterTexture.offset.x = time * 0.012;
    waterMaterial.normalMap.offset.copy(waterTexture.offset);
    occlusion.update(dt, p, { thirdPerson, supportPatches, sightDirection });
    // Interactive roots update locally before raycasts; rendering updates the scene once
    // after enemies, projectiles and effects have also advanced.
    if (camera) updateCameraOcclusion(camera, p, dt);
  }
  return {
    syncMovingSolids,
    sidePuzzles,
    battleDisplays,
    controlFeeds,
    signs,
    surfaces,
    walls,
    controls,
    hives,
    pickups: state.machinery.pickups,
    lifts: state.machinery.lifts,
    enemies,
    wheel,
    mirrors: state.machinery.mirrors,
    views: {
      lifts: liftViews,
      pickups: pickupViews,
      mirrors: mirrorViews,
      enemy: (body) => enemyViews.get(body),
    },
    belts,
    occluders,
    presentation,
    pulseHive,
    cast,
    update,
    setThirdPerson,
    updateCameraOcclusion,
  };
}

import * as THREE from 'three';

const gradient = new THREE.DataTexture(
  new Uint8Array([32, 32, 32, 128, 128, 128, 230, 230, 230]),
  3,
  1,
  THREE.RedFormat,
);
gradient.needsUpdate = true;
gradient.minFilter = THREE.NearestFilter;
gradient.magFilter = THREE.NearestFilter;

export const COLORS = {
  ink: 0x101719,
  ground: 0x263438,
  groundAlt: 0x314348,
  structure: 0x41636a,
  structureDark: 0x263b40,
  yellow: 0xf3c84b,
  teal: 0x49c6b5,
  orange: 0xf08a3e,
  red: 0xf04e47,
  purple: 0xa86bd6,
  cream: 0xf2ead7,
  molten: 0xff5c28,
} as const;

export function toon(
  color: THREE.ColorRepresentation,
  emissive: THREE.ColorRepresentation = 0x000000,
): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({ color, emissive, gradientMap: gradient });
}

export function outlined(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  outlineScale = 1.045,
): THREE.Group {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  const outline = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ color: COLORS.ink, side: THREE.BackSide }),
  );
  outline.scale.setScalar(outlineScale);
  group.add(outline);
  return group;
}

export type TankVisual = THREE.Group & {
  userData: {
    turret: THREE.Group;
    barrel: THREE.Group;
    muzzle: THREE.Object3D;
    antenna: THREE.Group;
    radiator: THREE.Mesh;
    wheels: THREE.Mesh[];
    body: THREE.Group;
    coolingAssemblies?: readonly [THREE.Group, THREE.Group];
    core?: THREE.Group;
  };
};

const TANK_PROPORTIONS: Record<
  'player' | 'scout' | 'turret' | 'guard' | 'elite' | 'boss',
  readonly [number, number, number]
> = {
  player: [2.4, 0.75, 3.2],
  scout: [2, 0.48, 2.75],
  turret: [1.8, 0.72, 2.25],
  guard: [3, 1.08, 3.45],
  elite: [3.4, 1.08, 4.1],
  boss: [6.8, 2.1, 8.2],
};

export function createTankVisual(
  color: THREE.ColorRepresentation,
  scale = 1,
  variant: 'player' | 'scout' | 'turret' | 'guard' | 'elite' | 'boss' = 'player',
): TankVisual {
  const root = new THREE.Group() as TankVisual;
  const armor = toon(color);
  const dark = toon(COLORS.ink);
  const hot = toon(0x5f201d, COLORS.red);
  const [width, height, depth] = TANK_PROPORTIONS[variant];

  const bodyGeometry = variant === 'scout'
    ? new THREE.ConeGeometry(width * 0.72, depth, 4)
    : new THREE.BoxGeometry(width, height, depth);
  if (variant === 'scout') bodyGeometry.rotateX(-Math.PI / 2);
  const body = outlined(bodyGeometry, armor, 1.055);
  body.position.y = height * 0.72;
  root.add(body);

  const wheels: THREE.Mesh[] = [];
  if (variant !== 'turret') {
    const wheelRadius = height * 0.42;
    for (const side of [-1, 1]) {
      const tread = outlined(
        new THREE.BoxGeometry(width * 0.22, height * 0.68, depth * 1.08),
        dark,
        1.04,
      );
      tread.position.set(side * width * 0.5, height * 0.5, 0);
      root.add(tread);
      const wheelCount = variant === 'boss' ? 5 : 4;
      for (let index = 0; index < wheelCount; index += 1) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius, wheelRadius, width * 0.22, 10), armor);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(
          side * width * 0.51,
          height * 0.48,
          THREE.MathUtils.lerp(-depth * 0.38, depth * 0.38, index / (wheelCount - 1)),
        );
        wheel.castShadow = true;
        root.add(wheel);
        wheels.push(wheel);
      }
    }
  } else {
    const pedestal = outlined(new THREE.CylinderGeometry(width * 0.54, width * 0.72, 1.1, 8), dark);
    pedestal.position.y = 0.48;
    root.add(pedestal);
  }

  const turret = new THREE.Group();
  turret.position.y = variant === 'boss' ? 2.5 : height * 1.2;
  if (variant !== 'scout') {
    const turretWidth = variant === 'boss' ? width * 0.54 : width * 0.64;
    const turretBody = outlined(
      new THREE.CylinderGeometry(turretWidth * 0.72, turretWidth, height * 0.72, 8),
      armor,
      1.05,
    );
    turret.add(turretBody);
    const barrel = outlined(
      new THREE.CylinderGeometry(width * 0.075, width * 0.1, depth * (variant === 'turret' ? 1.2 : 0.78), 8),
      armor,
      1.06,
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, height * 0.08, -depth * 0.58);
    barrel.userData.restZ = barrel.position.z;
    turret.add(barrel);
    const muzzle = new THREE.Object3D();
    muzzle.position.set(0, height * 0.08, -depth * (variant === 'turret' ? 1.2 : 1));
    turret.add(muzzle);
    root.userData.barrel = barrel;
    root.userData.muzzle = muzzle;
  } else {
    const ram = outlined(new THREE.BoxGeometry(width * 0.95, 0.25, 0.38), dark);
    ram.position.set(0, 0.12, -depth * 0.54);
    ram.userData.restZ = ram.position.z;
    turret.add(ram);
    const muzzle = new THREE.Object3D();
    muzzle.position.set(0, 0.1, -depth * 0.7);
    turret.add(muzzle);
    root.userData.barrel = ram;
    root.userData.muzzle = muzzle;
  }
  root.add(turret);

  const radiator = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.5, height * 0.45, 0.16),
    hot,
  );
  radiator.position.set(0, height * 0.72, depth * 0.53);
  radiator.castShadow = true;
  root.add(radiator);

  const antenna = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, height * 1.5, 5), dark);
  stem.position.y = height * 0.75;
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), toon(COLORS.teal, COLORS.teal));
  tip.position.y = height * 1.5;
  antenna.add(stem, tip);
  antenna.position.set(width * 0.28, height * 1.25, depth * 0.2);
  if (variant === 'player') root.add(antenna);

  if (variant === 'player') {
    for (const x of [-width * 0.24, width * 0.24]) {
      const light = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), toon(COLORS.cream, COLORS.cream));
      light.position.set(x, height * 0.88, -depth * 0.51);
      root.add(light);
    }
  }

  if (variant === 'boss') {
    const assemblies: [THREE.Group, THREE.Group] = [new THREE.Group(), new THREE.Group()];
    for (const [index, side] of ([-1, 1] as const).entries()) {
      const assembly = assemblies[index]!;
      const housing = outlined(
        new THREE.BoxGeometry(width * 0.22, height * 0.7, depth * 0.32),
        toon(COLORS.structureDark),
        1.055,
      );
      const vent = new THREE.Mesh(
        new THREE.CylinderGeometry(height * 0.27, height * 0.27, width * 0.08, 8),
        toon(COLORS.teal, COLORS.teal),
      );
      vent.rotation.z = Math.PI / 2;
      vent.position.x = side * width * 0.13;
      assembly.add(housing, vent);
      assembly.position.set(side * width * 0.56, height * 1.18, depth * 0.08);
      root.add(assembly);
    }

    const core = outlined(
      new THREE.IcosahedronGeometry(height * 0.45, 1),
      toon(COLORS.molten, COLORS.red),
      1.08,
    );
    core.position.set(0, height * 1.15, -depth * 0.48);
    core.visible = false;
    root.add(core);
    root.userData.coolingAssemblies = assemblies;
    root.userData.core = core;
  }

  root.scale.setScalar(scale);
  root.userData.turret = turret;
  root.userData.antenna = antenna;
  root.userData.radiator = radiator;
  root.userData.wheels = wheels;
  root.userData.body = body;
  return root;
}

export function createRepairHive(): THREE.Group {
  const root = new THREE.Group();
  const base = outlined(new THREE.CylinderGeometry(2.3, 2.55, 0.5, 12), toon(COLORS.structureDark));
  base.position.y = 0.25;
  root.add(base);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.7, 0.12, 8, 32),
    toon(COLORS.teal, COLORS.teal),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.54;
  root.add(ring);
  for (let index = 0; index < 4; index += 1) {
    const arm = new THREE.Group();
    const column = outlined(new THREE.BoxGeometry(0.35, 2.6, 0.35), toon(COLORS.structure));
    column.position.y = 1.3;
    arm.add(column);
    const tool = outlined(new THREE.BoxGeometry(0.65, 0.35, 1.2), toon(COLORS.yellow));
    tool.position.set(0, 2.5, -0.45);
    tool.rotation.x = -0.5;
    arm.add(tool);
    arm.rotation.y = index * Math.PI / 2;
    arm.position.set(Math.sin(arm.rotation.y) * 2, 0, Math.cos(arm.rotation.y) * 2);
    root.add(arm);
  }
  const beacon = new THREE.PointLight(COLORS.teal, 0, 12, 2);
  beacon.position.y = 2.4;
  beacon.name = 'beacon';
  root.add(beacon);
  return root;
}

export function createRelay(): THREE.Group {
  const root = new THREE.Group();
  const base = outlined(new THREE.CylinderGeometry(0.9, 1.2, 1.3, 8), toon(COLORS.structureDark));
  base.position.y = 0.65;
  const coil = new THREE.Mesh(new THREE.TorusKnotGeometry(0.55, 0.13, 42, 7), toon(COLORS.red, COLORS.red));
  coil.position.y = 1.65;
  root.add(base, coil);
  root.userData.coil = coil;
  return root;
}

export function createExplosion(color: THREE.ColorRepresentation, count = 12): THREE.Group {
  const root = new THREE.Group();
  for (let index = 0; index < count; index += 1) {
    const puff = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.25 + Math.random() * 0.35, 0),
      toon(index % 3 === 0 ? COLORS.cream : color, index % 2 === 0 ? color : 0x000000),
    );
    puff.position.set((Math.random() - 0.5) * 1.2, Math.random() * 1.2, (Math.random() - 0.5) * 1.2);
    puff.userData.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 5,
      2 + Math.random() * 5,
      (Math.random() - 0.5) * 5,
    );
    root.add(puff);
  }
  return root;
}

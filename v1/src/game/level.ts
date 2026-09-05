import * as THREE from 'three';
import type { Collider, Conveyor, Progress, ZoneId } from './types';
import { COLORS, createRelay, createRepairHive, outlined, toon } from './visuals';

type Rect = Readonly<{ minX: number; maxX: number; minZ: number; maxZ: number }>;

export class Level {
  readonly root = new THREE.Group();
  readonly conveyors: Conveyor[] = [];
  readonly hives = new Map<Progress['checkpoint'], THREE.Group>();
  readonly relays = new Map<'west' | 'east', THREE.Group>();
  readonly eliteBarrier: THREE.Group;
  readonly exitGate: THREE.Group;

  #walkable: Rect[] = [];
  #obstacles: Collider[] = [];
  #zones = new Map<ZoneId, Rect>();
  #bossConveyorActive: [boolean, boolean] = [false, false];
  #time = 0;

  constructor(scene: THREE.Scene) {
    this.root.name = 'abandoned-tank-assembly-plant';
    scene.add(this.root);

    this.#createGround();
    this.#createArchitecture();
    this.#createConveyors();
    this.#createLandmarks();

    this.eliteBarrier = this.#createBarrier(20, -31, 10);
    this.exitGate = this.#createBarrier(0, -40, 13);
    this.root.add(this.eliteBarrier, this.exitGate);
  }

  applyProgress(progress: Progress): void {
    const west = this.relays.get('west');
    const east = this.relays.get('east');
    if (west) west.visible = !progress.westRelay;
    if (east) east.visible = !progress.eastRelay;
    this.eliteBarrier.visible = !(progress.westRelay && progress.eastRelay);
    this.exitGate.visible = !progress.bossDefeated;
    for (const [id, hive] of this.hives) {
      const active = id === progress.checkpoint || (id === 'a' && progress.checkpoint !== 'a');
      const beacon = hive.getObjectByName('beacon') as THREE.PointLight | undefined;
      if (beacon) beacon.intensity = active ? 4 : 0.25;
    }
  }

  update(delta: number): void {
    this.#time += delta;
    for (const [conveyorIndex, conveyor] of this.conveyors.entries()) {
      const strips = conveyor.mesh.userData.strips as THREE.Mesh[];
      const axis = conveyor.mesh.userData.axis as 'x' | 'z';
      const length = conveyor.mesh.userData.length as number;
      const isBossConveyor = conveyorIndex >= 2;
      const active = !isBossConveyor || this.#bossConveyorActive[conveyorIndex - 2];
      conveyor.mesh.traverse((object) => {
        if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshToonMaterial) {
          object.material.opacity = active ? 1 : 0.38;
          object.material.transparent = !active;
        }
      });
      if (!active) continue;
      for (const [index, strip] of strips.entries()) {
        const direction = Math.sign(axis === 'x' ? conveyor.velocity.x : conveyor.velocity.z) || 1;
        strip.position[axis] = ((index * 2.4 + this.#time * 7 * direction + length / 2) % length) - length / 2;
      }
    }
    for (const hive of this.hives.values()) {
      const ring = hive.children[1];
      if (ring) ring.rotation.z = this.#time * 0.35;
      hive.position.y = Math.sin(this.#time * 1.5 + hive.position.x) * 0.04;
    }
    for (const relay of this.relays.values()) {
      const coil = relay.userData.coil as THREE.Mesh;
      coil.rotation.y += delta * 1.6;
      coil.rotation.x += delta * 0.7;
    }
  }

  canOccupy(position: THREE.Vector3, radius: number): boolean {
    const inside = this.#walkable.some((rect) =>
      position.x >= rect.minX &&
      position.x <= rect.maxX &&
      position.z >= rect.minZ &&
      position.z <= rect.maxZ
    );
    if (!inside) return false;
    return !this.#obstacles.some((rect) => {
      if (rect.enabled && !rect.enabled()) return false;
      return position.x + radius > rect.minX && position.x - radius < rect.maxX &&
        position.z + radius > rect.minZ && position.z - radius < rect.maxZ;
    });
  }

  conveyorVelocityAt(position: THREE.Vector3): THREE.Vector3 {
    const velocity = new THREE.Vector3();
    for (const [index, conveyor] of this.conveyors.entries()) {
      if (index >= 2 && !this.#bossConveyorActive[index - 2]) continue;
      const bounds = conveyor.bounds;
      if (position.x > bounds.minX && position.x < bounds.maxX &&
          position.z > bounds.minZ && position.z < bounds.maxZ) {
        velocity.add(conveyor.velocity);
      }
    }
    return velocity;
  }

  setBossConveyorsActive(left: boolean, right: boolean): void {
    this.#bossConveyorActive = [left, right];
  }

  isFurnace(position: THREE.Vector3): boolean {
    return (
      position.z > -36 && position.z < -18 &&
      ((position.x > -9 && position.x < -5.4) || (position.x > 5.4 && position.x < 9))
    );
  }

  nearbyHive(position: THREE.Vector3): Progress['checkpoint'] | null {
    for (const [id, hive] of this.hives) {
      if (hive.position.distanceTo(position) < 3.7) return id;
    }
    return null;
  }

  hitRelay(position: THREE.Vector3): 'west' | 'east' | null {
    for (const [id, relay] of this.relays) {
      if (relay.visible && relay.position.distanceTo(position) < 1.6) return id;
    }
    return null;
  }

  discover(position: THREE.Vector3): ZoneId | null {
    for (const [id, rect] of this.#zones) {
      if (position.x > rect.minX && position.x < rect.maxX && position.z > rect.minZ && position.z < rect.maxZ) {
        return id;
      }
    }
    return null;
  }

  spawnFor(checkpoint: Progress['checkpoint']): THREE.Vector3 {
    if (checkpoint === 'c') return new THREE.Vector3(20, 0, -14);
    if (checkpoint === 'exit') return new THREE.Vector3(0, 0, -37);
    return new THREE.Vector3(-4.5, 0, 15);
  }

  #createGround(): void {
    const addWalkable = (x: number, z: number, width: number, depth: number, zone?: ZoneId): void => {
      const floor = new THREE.Mesh(
        new THREE.BoxGeometry(width, 0.32, depth),
        toon(zone === 'boss' ? COLORS.groundAlt : COLORS.ground),
      );
      floor.position.set(x, -0.18, z);
      floor.receiveShadow = true;
      this.root.add(floor);
      const rect = { minX: x - width / 2, maxX: x + width / 2, minZ: z - depth / 2, maxZ: z + depth / 2 };
      this.#walkable.push(rect);
      if (zone) this.#zones.set(zone, rect);

      const lines = new THREE.GridHelper(Math.max(width, depth), Math.round(Math.max(width, depth) / 2), 0x4a5c5f, 0x344649);
      lines.scale.set(width / Math.max(width, depth), 1, depth / Math.max(width, depth));
      lines.position.set(x, 0.01, z);
      lines.material.transparent = true;
      lines.material.opacity = 0.22;
      this.root.add(lines);
    };

    addWalkable(0, 12, 18, 18, 'a');
    addWalkable(10, 12, 20, 5);
    addWalkable(20, 8, 9, 12, 'b');
    addWalkable(20, -2, 5, 16);
    addWalkable(20, -19, 25, 20, 'c');
    addWalkable(12, -23, 9, 15, 'branch-west');
    addWalkable(35, -23, 10, 15, 'branch-east');
    addWalkable(20, -34, 13, 14, 'elite');
    addWalkable(0, -4, 5, 18);
    addWalkable(0, -26, 18, 27, 'boss');
    addWalkable(0, -42, 11, 7, 'exit');
  }

  #createArchitecture(): void {
    const addBlock = (x: number, z: number, width: number, depth: number, height = 2.2): void => {
      const block = outlined(new THREE.BoxGeometry(width, height, depth), toon(COLORS.structureDark), 1.025);
      block.position.set(x, height / 2, z);
      this.root.add(block);
      this.#obstacles.push({ minX: x - width / 2, maxX: x + width / 2, minZ: z - depth / 2, maxZ: z + depth / 2 });
    };

    addBlock(-6, 6, 3, 2, 3);
    addBlock(6, 6, 3, 2, 3);
    addBlock(13, 10, 1.6, 1.6, 4.5);
    addBlock(27, -14, 2, 2, 5);
    addBlock(13, -23, 2.4, 4.2, 3.4);
    addBlock(27, -23, 2.4, 4.2, 3.4);
    addBlock(8.4, -23, 0.8, 15, 3.2);
    addBlock(0, -26, 3.2, 4.2, 4.8);

    for (const x of [-8, -4, 4, 8]) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 7, 8), toon(COLORS.structure));
      pipe.position.set(x, 2.6, -13.5);
      pipe.rotation.z = Math.PI / 2;
      this.root.add(pipe);
    }

    for (let index = 0; index < 18; index += 1) {
      const x = -8 + (index % 5) * 3.8;
      const z = 18 - Math.floor(index / 5) * 3.5;
      const scrap = outlined(
        new THREE.DodecahedronGeometry(0.25 + (index % 3) * 0.12, 0),
        toon(index % 2 === 0 ? COLORS.structure : COLORS.orange),
        1.04,
      );
      scrap.position.set(x + Math.sin(index) * 0.8, 0.25, z + Math.cos(index) * 0.6);
      scrap.rotation.set(index, index * 0.4, index * 0.2);
      this.root.add(scrap);
    }

    const crane = new THREE.Group();
    const column = outlined(new THREE.CylinderGeometry(0.75, 1, 8, 8), toon(COLORS.structure));
    column.position.y = 4;
    const arm = outlined(new THREE.BoxGeometry(11, 0.75, 0.8), toon(COLORS.yellow));
    arm.position.set(3.8, 7.2, 0);
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.16, 8, 16, Math.PI * 1.4), toon(COLORS.orange));
    hook.position.set(8, 4.8, 0);
    hook.rotation.z = Math.PI;
    crane.add(column, arm, hook);
    crane.position.set(20, 0, -18);
    this.root.add(crane);

    for (const side of [-1, 1]) {
      const furnace = new THREE.Mesh(
        new THREE.BoxGeometry(3.6, 0.18, 18),
        new THREE.MeshBasicMaterial({ color: COLORS.molten }),
      );
      furnace.position.set(side * 7.2, 0.02, -27);
      this.root.add(furnace);
      const glow = new THREE.PointLight(COLORS.molten, 3, 14, 2);
      glow.position.set(side * 7.2, 2, -27);
      this.root.add(glow);
    }
  }

  #createConveyors(): void {
    this.conveyors.push(this.#makeConveyor(0, -3.5, 4.6, 3.2, new THREE.Vector3(0, 0, 8.97)));
    this.conveyors.push(this.#makeConveyor(20, 0, 4.6, 2.8, new THREE.Vector3(0, 0, -8.97)));
    const left = this.#makeConveyor(-3.5, -27, 3.2, 17, new THREE.Vector3(-4.2, 0, 0));
    const right = this.#makeConveyor(3.5, -27, 3.2, 17, new THREE.Vector3(4.2, 0, 0));
    this.conveyors.push(left, right);
  }

  #makeConveyor(x: number, z: number, width: number, depth: number, velocity: THREE.Vector3): Conveyor {
    const root = new THREE.Group();
    root.position.set(x, 0.08, z);
    const base = new THREE.Mesh(new THREE.BoxGeometry(width, 0.22, depth), toon(COLORS.structureDark));
    base.receiveShadow = true;
    root.add(base);
    const strips: THREE.Mesh[] = [];
    const axis: 'x' | 'z' = Math.abs(velocity.x) > Math.abs(velocity.z) ? 'x' : 'z';
    const length = axis === 'x' ? width : depth;
    const count = Math.ceil(length / 2.4);
    for (let index = 0; index < count; index += 1) {
      const geometry = axis === 'x'
        ? new THREE.BoxGeometry(0.45, 0.04, depth * 0.82)
        : new THREE.BoxGeometry(width * 0.82, 0.04, 0.45);
      const strip = new THREE.Mesh(geometry, toon(COLORS.yellow));
      strip.position.set(axis === 'x' ? index * 2.4 - width / 2 : 0, 0.14, axis === 'z' ? index * 2.4 - depth / 2 : 0);
      root.add(strip);
      strips.push(strip);
    }
    root.userData.strips = strips;
    root.userData.axis = axis;
    root.userData.length = length;
    this.root.add(root);
    return {
      bounds: { minX: x - width / 2, maxX: x + width / 2, minZ: z - depth / 2, maxZ: z + depth / 2 },
      velocity,
      mesh: root,
    };
  }

  #createLandmarks(): void {
    const hiveData: Array<[Progress['checkpoint'], number, number]> = [
      ['a', -4.7, 15],
      ['c', 20, -15],
      ['exit', 0, -42],
    ];
    for (const [id, x, z] of hiveData) {
      const hive = createRepairHive();
      hive.position.set(x, 0, z);
      this.hives.set(id, hive);
      this.root.add(hive);
    }

    const west = createRelay();
    west.position.set(10.2, 0, -26.5);
    const east = createRelay();
    east.position.set(36.5, 0, -26.5);
    this.relays.set('west', west);
    this.relays.set('east', east);
    this.root.add(west, east);
  }

  #createBarrier(x: number, z: number, width: number): THREE.Group {
    const root = new THREE.Group();
    root.position.set(x, 0, z);
    for (let index = 0; index < 7; index += 1) {
      const beam = new THREE.Mesh(
        new THREE.BoxGeometry(width, 0.08, 0.08),
        new THREE.MeshBasicMaterial({ color: COLORS.red, transparent: true, opacity: 0.75 }),
      );
      beam.position.y = 0.4 + index * 0.45;
      root.add(beam);
    }
    const light = new THREE.PointLight(COLORS.red, 2, 10, 2);
    light.position.y = 1.8;
    root.add(light);
    this.#obstacles.push({
      minX: x - width / 2,
      maxX: x + width / 2,
      minZ: z - 0.35,
      maxZ: z + 0.35,
      enabled: () => root.visible,
    });
    return root;
  }
}

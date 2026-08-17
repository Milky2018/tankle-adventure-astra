import * as THREE from 'three';
import { AudioSystem } from './audio';
import { Input } from './input';
import { Level } from './level';
import {
  RULES,
  applyDamage,
  canUseHotSystem,
  overdriveIntensity,
  updateSpeedMultiplier,
  updateThermal,
  type ThermalState,
} from './rules';
import { saveProgress } from './save';
import type { EnemyKind, Progress, ZoneId } from './types';
import { COLORS, createExplosion, createTankVisual, type TankVisual } from './visuals';

type Enemy = {
  id: number;
  kind: EnemyKind;
  visual: TankVisual;
  spawn: THREE.Vector3;
  health: number;
  maxHealth: number;
  radius: number;
  cooldown: number;
  hitCooldown: number;
  state: 'idle' | 'prepare' | 'charge' | 'cooling';
  timer: number;
  vulnerable: boolean;
  chargeDirection: THREE.Vector3;
  leftCooling?: number;
  rightCooling?: number;
  coreHealth?: number;
};

type Projectile = {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  owner: 'player' | 'enemy';
  damage: number;
  life: number;
  radius: number;
};

type Effect = {
  root: THREE.Group;
  age: number;
  duration: number;
};

export type WorldSnapshot = Readonly<{
  health: number;
  heat: number;
  speed: number;
  overheated: boolean;
  playerPosition: THREE.Vector3;
  hullHeading: number;
  turretAim: number;
  enemies: ReadonlyArray<Readonly<{ position: THREE.Vector3; kind: EnemyKind }>>;
  discovered: ReadonlyArray<ZoneId>;
  progress: Readonly<Progress>;
  nearbyHive: Progress['checkpoint'] | null;
  bossHealth: number | null;
  dead: boolean;
  completed: boolean;
}>;

export class World {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly level: Level;

  #player: {
    visual: TankVisual;
    health: number;
    thermal: ThermalState;
    speedMultiplier: number;
    fireCooldown: number;
    damageGrace: number;
    furnaceTimer: number;
    radius: number;
  };
  #progress: Progress;
  #enemies: Enemy[] = [];
  #projectiles: Projectile[] = [];
  #effects: Effect[] = [];
  #cameraYaw = 0;
  #cameraPitch = 0.42;
  #enemyId = 0;
  #dead = false;
  #deathTime = 0;
  #bossActive = false;
  #bossConveyorClock = 0;
  #elapsed = 0;

  constructor(
    private readonly viewport: HTMLElement,
    progress: Progress,
    private readonly audio: AudioSystem,
  ) {
    this.#progress = structuredClone(progress);
    this.scene.background = new THREE.Color(0x0d1518);
    this.scene.fog = new THREE.FogExp2(0x0d1518, 0.0125);
    this.camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 170);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    viewport.replaceChildren(this.renderer.domElement);

    const ambient = new THREE.HemisphereLight(0xbfe6db, 0x182225, 1.8);
    const sun = new THREE.DirectionalLight(0xffe4aa, 3.4);
    sun.position.set(-24, 40, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -60;
    sun.shadow.camera.right = 60;
    sun.shadow.camera.top = 60;
    sun.shadow.camera.bottom = -60;
    this.scene.add(ambient, sun);

    this.level = new Level(this.scene);
    this.level.applyProgress(this.#progress);

    const visual = createTankVisual(COLORS.yellow, 0.9, 'player');
    this.scene.add(visual);
    this.#player = {
      visual,
      health: RULES.maxHealth,
      thermal: { heat: 0, overheated: false, idleTime: 0 },
      speedMultiplier: 1,
      fireCooldown: 0,
      damageGrace: 0,
      furnaceTimer: 0,
      radius: 1.15,
    };
    this.#resetPlayer();
    this.#spawnEnemies();
    addEventListener('resize', this.#resize);
  }

  get progress(): Progress {
    return structuredClone(this.#progress);
  }

  tick(delta: number, input: Input): WorldSnapshot {
    const dt = Math.min(delta, 0.05);
    this.#elapsed += dt;
    this.level.update(dt);

    if (this.#dead) {
      this.#deathTime += dt;
      if (this.#deathTime >= 3 || input.pressedCode('Space')) this.respawn();
    } else if (!this.#progress.completed) {
      this.#updatePlayer(dt, input);
      this.#updateEnemies(dt);
      this.#updateProjectiles(dt);
      this.#updateEffects(dt);
      this.#updateProgress(input);
    }

    this.#updateCamera(dt, input);
    this.audio.update(dt, this.#bossActive ? 1 : this.#enemies.some((enemy) => enemy.visual.position.distanceTo(this.#player.visual.position) < 16) ? 0.55 : 0.1);
    this.renderer.render(this.scene, this.camera);
    return this.snapshot();
  }

  snapshot(): WorldSnapshot {
    const boss = this.#enemies.find((enemy) => enemy.kind === 'boss');
    return {
      health: this.#player.health / RULES.maxHealth,
      heat: this.#player.thermal.heat / RULES.maxHeat,
      speed: overdriveIntensity(this.#player.speedMultiplier),
      overheated: this.#player.thermal.overheated,
      playerPosition: this.#player.visual.position.clone(),
      hullHeading: this.#player.visual.rotation.y,
      turretAim: this.#cameraYaw,
      enemies: this.#enemies
        .filter((enemy) => enemy.visual.visible && enemy.visual.position.distanceTo(this.#player.visual.position) < 22)
        .map((enemy) => ({ position: enemy.visual.position.clone(), kind: enemy.kind })),
      discovered: [...this.#progress.discovered],
      progress: structuredClone(this.#progress),
      nearbyHive: this.level.nearbyHive(this.#player.visual.position),
      bossHealth: boss && this.#bossActive ? this.#enemyHealthFraction(boss) : null,
      dead: this.#dead,
      completed: this.#progress.completed,
    };
  }

  respawn(): void {
    this.#dead = false;
    this.#deathTime = 0;
    this.#player.health = RULES.maxHealth;
    this.#player.thermal = { heat: 0, overheated: false, idleTime: 0 };
    this.#player.speedMultiplier = 1;
    this.#player.visual.visible = true;
    this.#resetPlayer();
    this.#clearCombatObjects();
    this.#spawnEnemies();
    this.level.applyProgress(this.#progress);
  }

  destroy(): void {
    removeEventListener('resize', this.#resize);
    this.renderer.dispose();
    this.viewport.replaceChildren();
  }

  #updatePlayer(delta: number, input: Input): void {
    const player = this.#player;
    player.fireCooldown -= delta;
    player.damageGrace -= delta;

    const turn = (input.down('left') ? 1 : 0) - (input.down('right') ? 1 : 0);
    const drive = (input.down('forward') ? 1 : 0) - (input.down('backward') ? 1 : 0);
    const wantsOverdrive =
      this.#progress.overdrive &&
      drive > 0 &&
      input.down('overdrive') &&
      canUseHotSystem(player.thermal);
    player.speedMultiplier = updateSpeedMultiplier(player.speedMultiplier, delta, wantsOverdrive);

    const steeringScale = THREE.MathUtils.lerp(1, 0.5, overdriveIntensity(player.speedMultiplier));
    player.visual.rotation.y += turn * delta * 2.15 * steeringScale * (drive < 0 ? -0.72 : 1);

    const forward = new THREE.Vector3(
      -Math.sin(player.visual.rotation.y),
      0,
      -Math.cos(player.visual.rotation.y),
    );
    const driveSpeed = RULES.baseSpeed * player.speedMultiplier * (drive < 0 ? 0.62 : drive);
    const movement = forward.multiplyScalar(driveSpeed * delta);
    movement.addScaledVector(this.level.conveyorVelocityAt(player.visual.position), delta);
    this.#moveActor(player.visual, movement, player.radius);

    player.visual.userData.turret.rotation.y = this.#cameraYaw - player.visual.rotation.y;
    for (const wheel of player.visual.userData.wheels) wheel.rotation.x += driveSpeed * delta * 2.4;
    const barrel = player.visual.userData.barrel;
    barrel.position.z = THREE.MathUtils.lerp(
      barrel.position.z,
      barrel.userData.restZ as number,
      1 - Math.exp(-delta * 12),
    );
    player.visual.userData.antenna.rotation.z = Math.sin(this.#elapsed * 9) * 0.05 * Math.abs(drive);
    player.visual.userData.body.rotation.z = THREE.MathUtils.lerp(
      player.visual.userData.body.rotation.z,
      -turn * 0.045 * player.speedMultiplier,
      1 - Math.exp(-delta * 8),
    );

    let shots = 0;
    if (input.firing && player.fireCooldown <= 0 && canUseHotSystem(player.thermal)) {
      this.#firePlayer();
      player.fireCooldown = RULES.fireInterval;
      shots = 1;
    }
    const previousOverheated = player.thermal.overheated;
    player.thermal = updateThermal(player.thermal, {
      delta,
      shots,
      overdriveIntensity: overdriveIntensity(player.speedMultiplier),
    });
    if (!previousOverheated && player.thermal.overheated) this.audio.overheat();

    this.#applyRamming();
    this.#applyFurnaceDamage(delta);
  }

  #updateEnemies(delta: number): void {
    const playerPosition = this.#player.visual.position;
    for (const enemy of [...this.#enemies]) {
      enemy.cooldown -= delta;
      enemy.hitCooldown -= delta;
      const toPlayer = playerPosition.clone().sub(enemy.visual.position);
      const distance = toPlayer.length();
      const direction = toPlayer.normalize();
      const aim = Math.atan2(-direction.x, -direction.z);
      enemy.visual.userData.turret.rotation.y = aim - enemy.visual.rotation.y;

      const activationRadius = enemy.kind === 'boss' ? 18 : enemy.kind === 'elite' ? 10 : enemy.kind === 'guard' ? 11 : 9.5;
      if (enemy.kind !== 'boss' && playerPosition.distanceTo(enemy.spawn) > activationRadius) {
        if (enemy.kind !== 'turret' && enemy.visual.position.distanceTo(enemy.spawn) > 0.25) {
          const home = enemy.spawn.clone().sub(enemy.visual.position).normalize();
          const homeAim = Math.atan2(-home.x, -home.z);
          enemy.visual.rotation.y = this.#rotateToward(enemy.visual.rotation.y, homeAim, delta * 2.5);
          this.#moveActor(enemy.visual, home.multiplyScalar(delta * 3.2), enemy.radius);
        }
        continue;
      }

      if (enemy.kind === 'scout') {
        enemy.visual.rotation.y = this.#rotateToward(enemy.visual.rotation.y, aim, delta * 4.2);
        if (distance > 1.9) this.#moveActor(enemy.visual, direction.multiplyScalar(delta * 4.8), enemy.radius);
        if (distance < 2.1 && enemy.hitCooldown <= 0) {
          this.#damagePlayer(5);
          enemy.hitCooldown = 1.2;
          enemy.visual.position.addScaledVector(direction, -1.4);
        }
      } else if (enemy.kind === 'turret') {
        if (distance < 20 && enemy.cooldown <= 0) {
          this.#fireEnemy(enemy, 8, 10.5);
          enemy.cooldown = 2.1;
        }
      } else if (enemy.kind === 'guard') {
        if (distance > 7) {
          enemy.visual.rotation.y = this.#rotateToward(enemy.visual.rotation.y, aim, delta * 1.45);
          this.#moveActor(enemy.visual, direction.multiplyScalar(delta * 2.2), enemy.radius);
        }
        if (distance < 16 && enemy.cooldown <= 0) {
          this.#fireEnemy(enemy, 10, 9);
          enemy.cooldown = 3;
        }
      } else if (enemy.kind === 'elite') {
        this.#updateElite(enemy, delta, direction, distance, aim);
      } else {
        this.#updateBoss(enemy, delta, direction, distance, aim);
      }
    }
  }

  #updateElite(enemy: Enemy, delta: number, direction: THREE.Vector3, distance: number, aim: number): void {
    if (!this.#progress.westRelay || !this.#progress.eastRelay) return;
    enemy.timer -= delta;
    if (enemy.state === 'idle') {
      enemy.state = 'prepare';
      enemy.timer = 1.05;
      enemy.chargeDirection.copy(direction);
    } else if (enemy.state === 'prepare') {
      enemy.visual.rotation.y = this.#rotateToward(enemy.visual.rotation.y, aim, delta * 2.5);
      enemy.visual.scale.setScalar(1 + Math.sin(this.#elapsed * 24) * 0.025);
      if (enemy.timer <= 0) {
        enemy.state = 'charge';
        enemy.timer = 0.9;
        enemy.chargeDirection.copy(direction);
      }
    } else if (enemy.state === 'charge') {
      this.#moveActor(enemy.visual, enemy.chargeDirection.clone().multiplyScalar(delta * 13), enemy.radius);
      if (distance < 2.6 && enemy.hitCooldown <= 0) {
        this.#damagePlayer(12);
        enemy.hitCooldown = 1;
      }
      if (enemy.timer <= 0) {
        enemy.state = 'cooling';
        enemy.timer = 1.7;
        enemy.vulnerable = true;
      }
    } else {
      enemy.visual.scale.setScalar(1 + Math.sin(this.#elapsed * 10) * 0.04);
      if (enemy.cooldown <= 0 && distance < 17) {
        this.#fireEnemy(enemy, 8, 9);
        enemy.cooldown = 1.7;
      }
      if (enemy.timer <= 0) {
        enemy.state = 'idle';
        enemy.vulnerable = false;
        enemy.visual.scale.setScalar(1);
      }
    }
  }

  #updateBoss(enemy: Enemy, delta: number, _direction: THREE.Vector3, distance: number, aim: number): void {
    if (!this.#bossActive && distance < 18) this.#bossActive = true;
    if (!this.#bossActive) {
      this.level.setBossConveyorsActive(false, false);
      return;
    }
    this.#bossConveyorClock += delta;
    const conveyorPulse = this.#bossConveyorClock % 4.4 < 2.6;
    this.level.setBossConveyorsActive(
      conveyorPulse && (enemy.leftCooling ?? 0) > 0,
      conveyorPulse && (enemy.rightCooling ?? 0) > 0,
    );
    enemy.visual.rotation.y = this.#rotateToward(enemy.visual.rotation.y, aim, delta * 0.42);
    if (enemy.cooldown <= 0 && distance < 27) {
      const phaseTwo = (enemy.leftCooling ?? 0) <= 0 && (enemy.rightCooling ?? 0) <= 0;
      const count = phaseTwo ? 5 : 3;
      for (let index = 0; index < count; index += 1) {
        const spread = (index - (count - 1) / 2) * 0.11;
        this.#fireEnemy(enemy, phaseTwo ? 10 : 8, 8.5, spread);
      }
      enemy.cooldown = phaseTwo ? 1.65 : 2.35;
    }
  }

  #updateProjectiles(delta: number): void {
    for (const projectile of [...this.#projectiles]) {
      projectile.mesh.position.addScaledVector(projectile.velocity, delta);
      projectile.life -= delta;
      let remove = projectile.life <= 0 || !this.level.canOccupy(projectile.mesh.position, projectile.radius);

      if (!remove && projectile.owner === 'player') {
        const relay = this.level.hitRelay(projectile.mesh.position);
        if (relay) {
          if (relay === 'west') this.#progress.westRelay = true;
          else this.#progress.eastRelay = true;
          saveProgress(this.#progress);
          this.level.applyProgress(this.#progress);
          this.#explode(projectile.mesh.position, COLORS.red);
          remove = true;
        }
        const hit = !remove ? this.#enemies.find((enemy) =>
          enemy.visual.visible && horizontalDistance(enemy.visual.position, projectile.mesh.position) < enemy.radius + projectile.radius
        ) : undefined;
        if (hit) {
          this.#damageEnemy(hit, projectile);
          remove = true;
        }
      } else if (!remove && projectile.owner === 'enemy' &&
        horizontalDistance(projectile.mesh.position, this.#player.visual.position) < this.#player.radius + projectile.radius) {
        this.#damagePlayer(projectile.damage);
        remove = true;
      }

      if (remove) this.#removeProjectile(projectile);
    }
  }

  #updateEffects(delta: number): void {
    for (const effect of [...this.#effects]) {
      effect.age += delta;
      for (const child of effect.root.children) {
        const velocity = child.userData.velocity as THREE.Vector3 | undefined;
        if (velocity) {
          child.position.addScaledVector(velocity, delta);
          velocity.y -= 8 * delta;
        }
        child.scale.multiplyScalar(1 + delta * 1.2);
        const material = (child as THREE.Mesh).material as THREE.Material | undefined;
        if (material) {
          material.transparent = true;
          material.opacity = Math.max(0, 1 - effect.age / effect.duration);
        }
      }
      if (effect.age >= effect.duration) {
        this.scene.remove(effect.root);
        this.#effects = this.#effects.filter((candidate) => candidate !== effect);
      }
    }
  }

  #updateProgress(input: Input): void {
    const zone = this.level.discover(this.#player.visual.position);
    if (zone && !this.#progress.discovered.includes(zone)) {
      this.#progress.discovered.push(zone);
      saveProgress(this.#progress);
    }

    const nearbyHive = this.level.nearbyHive(this.#player.visual.position);
    if (nearbyHive && input.pressed('interact')) {
      if (nearbyHive === 'exit' && this.#progress.bossDefeated) {
        this.#progress.checkpoint = 'exit';
        this.#progress.completed = true;
      } else {
        this.#progress.checkpoint = nearbyHive;
      }
      this.#player.health = RULES.maxHealth;
      this.#player.thermal = { heat: 0, overheated: false, idleTime: 0 };
      saveProgress(this.#progress);
      this.level.applyProgress(this.#progress);
      this.audio.activate();
      if (!this.#progress.completed) {
        this.#clearCombatObjects();
        this.#spawnEnemies();
      }
    }
  }

  #damageEnemy(enemy: Enemy, projectile: Projectile): void {
    let damage = 1;
    if (enemy.kind === 'guard') {
      const enemyForward = new THREE.Vector3(-Math.sin(enemy.visual.rotation.y), 0, -Math.cos(enemy.visual.rotation.y));
      const incoming = projectile.velocity.clone().normalize().negate();
      damage = enemyForward.dot(incoming) > 0.25 ? 0 : 1;
    } else if (enemy.kind === 'elite' && !enemy.vulnerable) {
      damage = 0;
    } else if (enemy.kind === 'boss') {
      const impact = enemy.visual.worldToLocal(projectile.mesh.position.clone());
      const localX = impact.x;
      if ((enemy.leftCooling ?? 0) > 0 && localX < -1.1) enemy.leftCooling = Math.max(0, (enemy.leftCooling ?? 0) - 1);
      else if ((enemy.rightCooling ?? 0) > 0 && localX > 1.1) enemy.rightCooling = Math.max(0, (enemy.rightCooling ?? 0) - 1);
      else if ((enemy.leftCooling ?? 0) <= 0 && (enemy.rightCooling ?? 0) <= 0) enemy.coreHealth = Math.max(0, (enemy.coreHealth ?? 0) - 1);
      this.#syncBossVisual(enemy);
      damage = 0;
      if ((enemy.coreHealth ?? 1) <= 0) enemy.health = 0;
    }

    enemy.health -= damage;
    this.audio.impact();
    this.#explode(projectile.mesh.position, damage > 0 ? COLORS.orange : COLORS.structure);
    if (enemy.health <= 0) this.#destroyEnemy(enemy);
  }

  #destroyEnemy(enemy: Enemy): void {
    this.audio.explosion();
    this.#explode(enemy.visual.position, enemy.kind === 'boss' ? COLORS.molten : COLORS.orange, enemy.kind === 'boss' ? 30 : 14);
    this.scene.remove(enemy.visual);
    this.#enemies = this.#enemies.filter((candidate) => candidate !== enemy);
    if (enemy.kind === 'elite') {
      this.#progress.eliteDefeated = true;
      this.#progress.overdrive = true;
      saveProgress(this.#progress);
    } else if (enemy.kind === 'boss') {
      this.#progress.bossDefeated = true;
      this.#bossActive = false;
      this.level.setBossConveyorsActive(false, false);
      saveProgress(this.#progress);
      this.level.applyProgress(this.#progress);
    }
  }

  #damagePlayer(damage: number, continuous = false): void {
    if (this.#dead || (!continuous && this.#player.damageGrace > 0)) return;
    this.#player.health = applyDamage(this.#player.health, damage);
    if (!continuous) this.#player.damageGrace = RULES.directHitGrace;
    this.audio.hurt();
    if (this.#player.health <= 0) {
      this.#dead = true;
      this.#deathTime = 0;
      this.#player.visual.userData.turret.rotation.x = 0.25;
    }
  }

  #applyFurnaceDamage(delta: number): void {
    if (!this.level.isFurnace(this.#player.visual.position)) {
      this.#player.furnaceTimer = 0;
      return;
    }
    this.#player.furnaceTimer += delta;
    while (this.#player.furnaceTimer >= 0.5) {
      this.#player.furnaceTimer -= 0.5;
      this.#damagePlayer(5, true);
    }
  }

  #applyRamming(): void {
    for (const enemy of [...this.#enemies]) {
      const distance = enemy.visual.position.distanceTo(this.#player.visual.position);
      if (distance > enemy.radius + this.#player.radius || enemy.hitCooldown > 0) continue;
      enemy.hitCooldown = 0.6;
      const direction = enemy.visual.position.clone().sub(this.#player.visual.position);
      if (direction.lengthSq() < 0.001) direction.set(0, 0, -1);
      direction.normalize();
      if (this.#player.speedMultiplier >= RULES.ramThreshold && enemy.kind !== 'elite' && enemy.kind !== 'boss') {
        if (enemy.kind === 'guard') {
          const guardForward = new THREE.Vector3(-Math.sin(enemy.visual.rotation.y), 0, -Math.cos(enemy.visual.rotation.y));
          if (guardForward.dot(direction.clone().negate()) > 0.25) this.#damagePlayer(5);
          else enemy.health -= 1;
        } else {
          enemy.health -= 1;
        }
        this.#player.speedMultiplier = Math.max(1, this.#player.speedMultiplier - 0.2);
        enemy.visual.position.addScaledVector(direction, 0.7);
        this.#explode(enemy.visual.position, COLORS.yellow, 8);
        if (enemy.health <= 0) this.#destroyEnemy(enemy);
      }
      const separation = enemy.radius + this.#player.radius - distance + 0.05;
      this.#moveActor(this.#player.visual, direction.clone().multiplyScalar(-separation), this.#player.radius);
      if (enemy.kind === 'elite' || enemy.kind === 'boss') this.#player.speedMultiplier = 1;
    }
  }

  #firePlayer(): void {
    const muzzle = this.#player.visual.userData.muzzle;
    const position = new THREE.Vector3();
    muzzle.getWorldPosition(position);
    const direction = new THREE.Vector3(-Math.sin(this.#cameraYaw), 0, -Math.cos(this.#cameraYaw));
    this.#spawnProjectile(position, direction.multiplyScalar(24), 'player', 1, COLORS.yellow, 0.18);
    this.#player.visual.userData.barrel.position.z += 0.25;
    this.audio.shoot();
  }

  #fireEnemy(enemy: Enemy, damage: number, speed: number, spread = 0): void {
    const position = new THREE.Vector3();
    enemy.visual.userData.muzzle.getWorldPosition(position);
    const direction = this.#player.visual.position.clone().sub(position).setY(0).normalize();
    direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), spread);
    this.#spawnProjectile(position, direction.multiplyScalar(speed), 'enemy', damage, COLORS.red, 0.22);
  }

  #spawnProjectile(
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    owner: Projectile['owner'],
    damage: number,
    color: THREE.ColorRepresentation,
    radius: number,
  ): void {
    const mesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(radius, 1),
      new THREE.MeshBasicMaterial({ color }),
    );
    mesh.position.copy(position);
    const light = new THREE.PointLight(color, 2, 5, 2);
    mesh.add(light);
    this.scene.add(mesh);
    this.#projectiles.push({ mesh, velocity, owner, damage, life: 3, radius });
  }

  #spawnEnemies(): void {
    this.#enemies = [];
    this.#spawnEnemy('scout', 20, 8);
    this.#spawnEnemy('scout', 11, -18.5);
    this.#spawnEnemy('scout', 14.5, -27);
    this.#spawnEnemy('turret', 10.5, -24);
    this.#spawnEnemy('guard', 35, -24);
    this.#spawnEnemy('turret', 32, -18);
    if (!this.#progress.eliteDefeated) this.#spawnEnemy('elite', 20, -37.5);
    if (!this.#progress.bossDefeated) this.#spawnEnemy('boss', 0, -27);
  }

  #spawnEnemy(kind: EnemyKind, x: number, z: number): void {
    const spec = {
      scout: { health: 1, radius: 1, scale: 0.76, color: COLORS.orange },
      turret: { health: 2, radius: 1.2, scale: 0.88, color: 0x58b8cd },
      guard: { health: 3, radius: 1.55, scale: 1, color: 0x677c73 },
      elite: { health: 3, radius: 1.75, scale: 1.05, color: COLORS.purple },
      boss: { health: 1, radius: 4.2, scale: 0.9, color: 0xc6573f },
    }[kind];
    const visual = createTankVisual(spec.color, spec.scale, kind);
    visual.position.set(x, 0, z);
    visual.rotation.y = kind === 'boss' ? Math.PI : 0;
    this.scene.add(visual);
    this.#enemies.push({
      id: this.#enemyId++,
      kind,
      visual,
      spawn: visual.position.clone(),
      health: spec.health,
      maxHealth: spec.health,
      radius: spec.radius,
      cooldown: 1.2 + Math.random(),
      hitCooldown: 0,
      state: 'idle',
      timer: 0,
      vulnerable: kind !== 'elite',
      chargeDirection: new THREE.Vector3(),
      ...(kind === 'boss' ? { leftCooling: 3, rightCooling: 3, coreHealth: 4 } : {}),
    });
  }

  #enemyHealthFraction(enemy: Enemy): number {
    if (enemy.kind === 'boss') {
      return ((enemy.leftCooling ?? 0) + (enemy.rightCooling ?? 0) + (enemy.coreHealth ?? 0)) / 10;
    }
    return enemy.health / enemy.maxHealth;
  }

  #syncBossVisual(enemy: Enemy): void {
    const assemblies = enemy.visual.userData.coolingAssemblies;
    if (!assemblies) return;
    assemblies[0].visible = (enemy.leftCooling ?? 0) > 0;
    assemblies[1].visible = (enemy.rightCooling ?? 0) > 0;
    if (enemy.visual.userData.core) {
      enemy.visual.userData.core.visible = !assemblies[0].visible && !assemblies[1].visible;
    }
  }

  #resetPlayer(): void {
    this.#player.visual.position.copy(this.level.spawnFor(this.#progress.checkpoint));
    this.#player.visual.rotation.set(0, 0, 0);
    this.#player.visual.userData.turret.rotation.set(0, 0, 0);
    this.#cameraYaw = 0;
  }

  #moveActor(visual: THREE.Object3D, movement: THREE.Vector3, radius: number): void {
    const x = visual.position.clone();
    x.x += movement.x;
    if (this.level.canOccupy(x, radius)) visual.position.x = x.x;
    const z = visual.position.clone();
    z.z += movement.z;
    if (this.level.canOccupy(z, radius)) visual.position.z = z.z;
  }

  #updateCamera(delta: number, input: Input): void {
    const mouse = input.consumeMouseDelta();
    this.#cameraYaw -= mouse.x * 0.0024;
    this.#cameraPitch = THREE.MathUtils.clamp(this.#cameraPitch - mouse.y * 0.0018, 0.14, 0.78);
    const target = this.#player.visual.position.clone().add(new THREE.Vector3(0, 1.4, 0));
    const distance = 8;
    const desired = target.clone().add(new THREE.Vector3(
      Math.sin(this.#cameraYaw) * Math.cos(this.#cameraPitch) * distance,
      Math.sin(this.#cameraPitch) * distance + 1.4,
      Math.cos(this.#cameraYaw) * Math.cos(this.#cameraPitch) * distance,
    ));
    this.camera.position.lerp(desired, 1 - Math.exp(-delta * 11));
    this.camera.lookAt(target);
  }

  #rotateToward(current: number, target: number, amount: number): number {
    let difference = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (difference < -Math.PI) difference += Math.PI * 2;
    return current + THREE.MathUtils.clamp(difference, -amount, amount);
  }

  #explode(position: THREE.Vector3, color: THREE.ColorRepresentation, count = 10): void {
    const root = createExplosion(color, count);
    root.position.copy(position);
    this.scene.add(root);
    this.#effects.push({ root, age: 0, duration: 0.7 });
  }

  #removeProjectile(projectile: Projectile): void {
    this.scene.remove(projectile.mesh);
    this.#projectiles = this.#projectiles.filter((candidate) => candidate !== projectile);
  }

  #clearCombatObjects(): void {
    for (const enemy of this.#enemies) this.scene.remove(enemy.visual);
    for (const projectile of this.#projectiles) this.scene.remove(projectile.mesh);
    this.#enemies = [];
    this.#projectiles = [];
    this.#bossActive = false;
    this.#bossConveyorClock = 0;
    this.level.setBossConveyorsActive(false, false);
  }

  #resize = (): void => {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
  };
}

function horizontalDistance(a: THREE.Vector3, b: THREE.Vector3): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

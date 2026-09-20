import { pullSlide } from './folded-mechanisms.js';
import { applyUpgrades, weaponDamage, scopeRange } from './folded-upgrades.js';
import { predictMortar, mortarGroundTarget, MORTAR_PREVIEW_SEGMENTS } from './folded-ballistics.js';
import { createFoldedPreferences, mountFoldedSettings, keyGlyph } from './folded-settings.js';
import { createFoldedEffects, createPhoenixExhaust } from './folded-effects.js';
import { createPlayerDeath, DEATH_HOLD } from './folded-death.js';
import { createFoldedEnemies } from './folded-ai.js';
import { createEnemyView } from './folded-enemy-view.js';
import { installFoldedInput } from './folded-input.js';
import { createFoldedSave } from './folded-save.js';
import { createFoldedMap } from './folded-map.js';
import { createFoldedCombat } from './folded-projectiles.js';
import { CANNON, LASER, HOSTILE_DAMAGE } from './folded-weapons.js';
import { createBossArenas } from './folded-boss-arenas.js';
import { traceFoldedLaser } from './folded-laser.js';
import { createGroundPose, groundPatches, groundAim } from './folded-ground.js';
import { refugeAt, REFUGE_CLEARANCE } from './folded-refuges.js';
import { createEncounterPacing } from './folded-pacing.js';
import { FollowCamera, cameraMovement } from './folded-camera.js';
import { magnetPullable, playerStunned, hitDisplacement, hitOpacity } from './folded-combat.js';
import { moveWithConveyor, stepLifts, applyFloorHeat } from './folded-machinery.js';
import { SIGNAL } from './folded-visibility.js';
import * as T from 'three';
import './style.css';
import './folded.css';
import { tankModel, box, cylinder, ring, mat, C } from './world.js';
import { FactoryAudio } from './audio.js';
import { flotationAssembly } from './gardens.js';
import { toggleFlotation, FLOTATION, MORTAR, mortarTarget } from './abilities.js';
import {
  newPlayer,
  playerMaxHp,
  BASE_SPEED,
  shootHeat,
  updateHeat,
  screenMovement,
  clamp,
  angleDelta,
  redContact,
  phoenixReady,
} from './mechanics.js';
import {
  foldedSolids,
  foldedArchitecture,
  foldedDecks,
  foldedHives,
  releaseFolded,
  foldedSupport,
  moveFolded,
  deckHeight,
} from './folded-layout.js';
import { makeFoldedWorld } from './folded-world.js';
import { createAbilityHud, createThreatHud } from './folded-hud.js';
import { createJourneyMenu } from './journey-menu.js';
import { createEnding } from './folded-ending.js';
import { ENDING_DURATION, endingShot } from './folded-finale.js';
import { mountFoldedInterface } from './folded-interface.js';

const $ = (id) => document.getElementById(id),
  params = new URLSearchParams(location.search),
  route = params.get('route'),
  freight = route === 'freight',
  garden = route === 'garden',
  preview = freight || garden || route === 'foundry';
const interfaceView = mountFoldedInterface();
const saves = createFoldedSave(route);
const state = saves.load();
const preferences = createFoldedPreferences(saves.loadSettings(), saves.saveSettings);
const prefs = preferences.values,
  bindings = prefs.bindings;
const p = Object.assign(newPlayer(), {
  overdrive: freight || garden || state.overdrive,
  magnet: garden || state.magnetModule,
  mortar: freight || state.mortarModule,
  flotation: state.flotation,
  phoenix: state.phoenix,
  laser: state.laser,
  circulation: state.circulation,
  y: 0,
});
applyUpgrades(p, state);
p.hp = playerMaxHp(p);
Object.assign(
  p,
  foldedHives.find((h) => h.id === state.anchor),
);
const scene = new T.Scene();
scene.background = new T.Color(0x1b3032);
scene.fog = new T.Fog(0x1b3032, 65, 105);
const renderer = new T.WebGLRenderer({
  canvas: $('game'),
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
const overheadCamera = new T.OrthographicCamera(-30, 30, 17, -17, 0.1, 160),
  follow = new FollowCamera(innerWidth / innerHeight, p.heading),
  focus = new T.Vector3(p.x, p.y, p.z),
  offset = new T.Vector3(28, 39.6, 28);
const cameraSettings = prefs.cameraSettings;
follow.pitch = (cameraSettings.third.pitch * Math.PI) / 180;
follow.boom = cameraSettings.third.distance;
follow.height = cameraSettings.third.height;
follow.shoulder = cameraSettings.third.shoulder;
follow.sensitivity = cameraSettings.third.sensitivity;
function updateOverheadAngle() {
  const angle = (cameraSettings.overhead.angle * Math.PI) / 180,
    length = Math.hypot(28, 39.6, 28);
  offset.set(
    (Math.cos(angle) * length) / Math.SQRT2,
    Math.sin(angle) * length,
    (Math.cos(angle) * length) / Math.SQRT2,
  );
}
updateOverheadAngle();
let thirdPerson = (params.get('view') || prefs.cameraView || 'third') !== 'overhead',
  camera = thirdPerson ? follow.camera : overheadCamera;
scene.add(new T.HemisphereLight(0xf6ead3, 0x7e948b, 1.8));
// Indirect fill keeps undersides and shaded routes readable from either camera.
scene.add(new T.AmbientLight(0xdce7df, 1.2));
const sun = new T.DirectionalLight(0xffe3b1, 3.2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = sun.shadow.camera.bottom = -45;
sun.shadow.camera.right = sun.shadow.camera.top = 45;
sun.shadow.camera.far = 90;
sun.shadow.bias = -0.0001;
sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);
const fill = new T.DirectionalLight(0x9ec5d5, 0.65);
fill.position.set(20, 12, -30);
scene.add(fill);
const world = makeFoldedWorld(scene, state, {
    batching: !(import.meta.env.DEV && params.has('test') && params.has('unbatched')),
  }),
  model = tankModel();
scene.add(model.root);
world.setThirdPerson(thirdPerson);
const encounterPacing = createEncounterPacing(world.enemies),
  bossArenas = createBossArenas(world.enemies, state),
  groundPose = createGroundPose();
const endingCamera = new T.PerspectiveCamera(55, innerWidth / innerHeight, 0.15, 160);
// Rotate the actual trunnion, so pitch does not swing the whole barrel below the hull.
for (const child of model.barrel.children) child.position.y -= 2;
model.barrel.position.y = 2;
const flotation = flotationAssembly(model.body);
const hullMaterials = [];
model.root.traverse((m) => {
  if (m.isMesh && m.material.color) {
    m.material = m.material.clone();
    hullMaterials.push({
      m: m.material,
      color: m.material.color.clone(),
      opacity: m.material.opacity,
      transparent: m.material.transparent,
      depthWrite: m.material.depthWrite,
    });
  }
});
const laserBeam = new T.LineSegments(
  new T.BufferGeometry().setAttribute(
    'position',
    new T.BufferAttribute(new Float32Array(36), 3).setUsage(T.DynamicDrawUsage),
  ),
  new T.LineBasicMaterial({ color: 0xffedbe }),
);
scene.add(laserBeam);
laserBeam.visible = false;
laserBeam.frustumCulled = false;
const laserCores = Array.from({ length: 6 }, () =>
  cylinder(laserBeam, 0.055, 1, 0, 0, 0, mat(0xffedbe, true), 6),
);
const laserGuide = new T.LineSegments(
  new T.BufferGeometry().setAttribute('position', new T.BufferAttribute(new Float32Array(36), 3)),
  new T.LineDashedMaterial({
    color: 0xffedbe,
    transparent: true,
    opacity: 0.65,
    depthTest: false,
    depthWrite: false,
    dashSize: 0.3,
    gapSize: 0.18,
  }),
);
scene.add(laserGuide);
laserGuide.visible = false;
laserGuide.frustumCulled = false;
laserGuide.renderOrder = 4;
const laserEndpoint = new T.Mesh(
  new T.SphereGeometry(0.14, 8, 6),
  new T.MeshBasicMaterial({ color: 0xffedbe, depthTest: false, depthWrite: false }),
);
scene.add(laserEndpoint);
laserEndpoint.visible = false;
laserEndpoint.renderOrder = 4;
const mortarGuide = new T.Line(
  new T.BufferGeometry().setAttribute(
    'position',
    new T.BufferAttribute(new Float32Array((MORTAR_PREVIEW_SEGMENTS + 1) * 3), 3),
  ),
  new T.LineDashedMaterial({
    color: 0xffe4a9,
    transparent: true,
    opacity: 0.5,
    dashSize: 0.6,
    gapSize: 0.5,
  }),
);
scene.add(mortarGuide);
mortarGuide.visible = false;
mortarGuide.frustumCulled = false;
const mortarLanding = new T.Mesh(
  new T.RingGeometry(MORTAR.radius - 0.09, MORTAR.radius, 64),
  new T.MeshBasicMaterial({
    color: 0xffe4a9,
    transparent: true,
    opacity: 0.75,
    depthTest: false,
    depthWrite: false,
    side: T.DoubleSide,
  }),
);
mortarLanding.rotation.x = -Math.PI / 2;
mortarLanding.renderOrder = 5;
mortarLanding.visible = false;
scene.add(mortarLanding);
const magneticBeam = new T.Group();
scene.add(magneticBeam);
magneticBeam.visible = false;
const magneticCore = cylinder(magneticBeam, 0.07, 1, 0, 0, 0, mat(0xc8e7ff, true), 8);
const magneticGlow = cylinder(
  magneticBeam,
  0.22,
  1,
  0,
  0,
  0,
  new T.MeshBasicMaterial({
    color: SIGNAL.magnet,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  }),
  8,
);
const magneticRings = Array.from({ length: 5 }, () => {
  const r = new T.Mesh(new T.TorusGeometry(0.36, 0.055, 6, 18), mat(SIGNAL.magnet, true));
  magneticBeam.add(r);
  return r;
});
const magnetEmitter = new T.Group();
model.turret.add(magnetEmitter);
for (const x of [0.8, 1.2]) box(magnetEmitter, 0.12, 0.18, 0.6, x, 2, 1, SIGNAL.magnet);
box(magnetEmitter, 0.5, 0.18, 0.16, 1, 2, 0.72, SIGNAL.magnet);
const audio = new FactoryAudio();
audio.volume = prefs.volume ?? 0.55;
audio.music = prefs.music ?? true;
audio.sfx = prefs.sfx ?? true;
const keys = new Set(),
  pointer = new T.Vector2(0, 0),
  picker = new T.Raycaster(),
  aim = new T.Vector3(p.x, p.y + 2, p.z - 10);
const shots = [],
  mines = [],
  discovered = new Set(state.discovered);
const effects = createFoldedEffects(scene);
const phoenixExhaust = createPhoenixExhaust(model.body);
const { burst, ripple, projectile, updateSparks, updateWaves } = effects;
let time = 0,
  frames = 0,
  paused = false,
  mapOpen = false,
  deathAt = -1,
  hitAt = -10,
  last = performance.now(),
  mapAt = -1,
  moved = false,
  fired = false,
  mapped = false;
let manual = import.meta.env.DEV && params.has('test') && params.has('manual'),
  magnetic = null,
  magnetLock = null,
  recoil = 0,
  laserSoundAt = -1,
  repairAt = -10,
  wakeAt = -1,
  magnetSoundAt = -10;
const deathView = createPlayerDeath({ model, scene, hullMaterials, project, burst, ripple });
const combatEvents = {
  alertSquad,
  save,
  setState,
  detonateMine,
  layMine,
  hurt: (at) => {
    hitAt = at;
  },
  death: (at) => {
    deathAt = at;
    keys.clear();
    bossArenas.reset();
    deathView.begin();
    audio.update(time, p, false, '', false);
  },
};
const { hurt, castWeapon, hitEnemy, impact, shootEnemy, updateShots } = createFoldedCombat({
  player: p,
  world,
  state,
  scene,
  shots,
  mines,
  now: () => time,
  effects: { burst, ripple, refugeImpact, rejectImpact, audio, projectile },
  events: combatEvents,
});
const hp = $('hp');
for (let i = 0; i < playerMaxHp(p) / 5; i++) hp.append(document.createElement('i'));
const abilityHud = createAbilityHud($('tools'), $('acquired'), keyGlyph);
const cameraToggle = document.createElement('button');
cameraToggle.id = 'camera-toggle';
cameraToggle.className = 'icon-button';
cameraToggle.setAttribute('aria-label', 'Switch camera');
cameraToggle.innerHTML =
  '<svg viewBox="0 0 24 24"><path d="M3 7h4l2-3h6l2 3h4v13H3zM12 10a3 3 0 1 0 0 6 3 3 0 1 0 0-6"/></svg><kbd></kbd>';
$('hud').append(cameraToggle);
cameraToggle.onclick = () => input(bindings.camera);
const lookHint = document.createElement('div');
lookHint.id = 'look-hint';
lookHint.setAttribute('role', 'img');
lookHint.setAttribute('aria-label', 'Hold middle mouse to look, or click to capture the mouse');
lookHint.innerHTML =
  '<kbd></kbd><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4"/></svg>';
keyGlyph(lookHint.querySelector('kbd'), 'Mouse1');
$('hud').append(lookHint);
let minimapBounds;
const threatHud = createThreatHud($('hud'));
const mapView = createFoldedMap({
  player: p,
  world,
  state,
  discovered,
  heading: () => (thirdPerson ? follow.yaw + Math.PI : Math.PI / 4),
});
const drawMap = (large) => mapView.draw(large);
const journeyMenu = createJourneyMenu(() => {});
const ending = createEnding(
  () => {
    ending.hide();
    respawn();
    setPause(false);
    $('settings-button').focus();
  },
  () => {
    location.href = '/';
  },
);
const skipEnding = document.createElement('button');
skipEnding.id = 'ending-skip';
skipEnding.textContent = 'Skip';
skipEnding.hidden = true;
skipEnding.onclick = () => {
  if (p.endingTime >= 0.75) completeEnding();
};
document.body.append(skipEnding);
const dockProgress = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
dockProgress.id = 'dock-progress';
dockProgress.setAttribute('viewBox', '0 0 48 48');
dockProgress.setAttribute('aria-hidden', 'true');
dockProgress.innerHTML =
  '<circle class="dock-track" cx="24" cy="24" r="21"/><circle class="dock-fill" cx="24" cy="24" r="21" pathLength="100"/>';
$('interaction').append(dockProgress);
$('journey-button').onclick = () => journeyMenu.show();
document.querySelector('#settings .subtitle').textContent = preview
  ? `Route previews · ${freight ? 'Freight entrance' : garden ? 'Garden entrance' : 'Chapter 1 · Foundry'}`
  : 'Campaign · Mechanical City';
$('new-game').textContent = preview ? 'Restart preview' : 'Restart campaign';
$('reset-confirm').textContent = preview
  ? 'Click again to reset this preview. Your campaign save is unaffected.'
  : 'Click again to reset the campaign and begin at the Foundry.';

const enemies = createFoldedEnemies({
  player: p,
  state,
  world,
  shots,
  mines,
  now: () => time,
  encounterPacing,
  bossArenas,
  combat: { hurt, hitEnemy, shootEnemy },
  audio,
  save,
  view: createEnemyView({ world, project, getCamera: () => camera, burst }),
});

function save() {
  world.sidePuzzles.persist();
  state.discovered = [...discovered];
  saves.save(state);
}
let rejectedAt = -10;
function rejectImpact(kind, position) {
  if (kind !== 'laser' || time - rejectedAt > 0.12) {
    audio.event('armor', position ? { position } : 0);
    rejectedAt = time;
  }
}
function setState(id, kind) {
  if (id === 'maintenance') {
    const changed = kind === 'cannon' && !state['maintenance-started'] && !state.maintenance;
    if (changed) {
      state['maintenance-started'] = true;
      audio.event('lever');
      save();
    } else rejectImpact(kind);
    return changed;
  }
  if (world.sidePuzzles.targets.some((t) => t.id === id)) {
    const changed =
      (kind === 'cannon' || (id === 'rail-signal' && kind === 'use')) && world.sidePuzzles.act(id);
    if (changed) {
      audio.event('lever');
      save();
    } else rejectImpact(kind);
    return changed;
  }
  if (world.signals.active(id)) return false;
  const next = { ...state };
  if (!releaseFolded(id, kind, p, next, world.lifts, time)) {
    rejectImpact(kind);
    return false;
  }
  const changes = Object.fromEntries(
    Object.entries(next).filter(([key, value]) => value === true && !state[key]),
  );
  world.signals.trigger(id, changes);
  world.signalRelease(id, time);
  audio.event('lever');
  save();
  return true;
}
function project(x, y, z) {
  const v = new T.Vector3(x, y, z).project(camera);
  return {
    x: (v.x * 0.5 + 0.5) * innerWidth,
    y: (-0.5 * v.y + 0.5) * innerHeight,
    visible: Math.abs(v.x) < 0.92 && Math.abs(v.y) < 0.9 && v.z >= -1 && v.z <= 1,
  };
}
function updateCamera(dt) {
  scene.fog.near = thirdPerson ? 65 : 105;
  scene.fog.far = thirdPerson ? 105 : 150;
  if (thirdPerson) {
    follow.update(p, dt);
    focus.set(p.x, p.y, p.z);
  } else {
    focus.lerp(new T.Vector3(p.x, p.y, p.z), 1 - Math.exp(-dt * 7));
    camera.position.copy(focus).add(offset);
    camera.lookAt(focus);
    camera.updateMatrixWorld();
  }
  sun.position.copy(focus).add(new T.Vector3(-18, 55, 16));
  sun.target.position.copy(focus);
  sun.target.updateMatrixWorld();
  world.updateCameraOcclusion(camera, p, 0);
}
function updatePlayerPose(dt, snap = false) {
  const pose = groundPose.update(p, groundPatches(p, world.lifts), dt, snap);
  model.root.position.set(p.x, pose.y, p.z);
  model.root.quaternion.copy(pose.orientation);
  model.body.rotation.y = p.heading;
}
function weaponOrigin() {
  return new T.Vector3(0, 2, 0).applyQuaternion(model.root.quaternion).add(model.root.position);
}
function updateAim() {
  if (thirdPerson) pointer.set(0, 0);
  picker.setFromCamera(pointer, camera);
  const direct = world.cast(picker.ray.origin, picker.ray.direction, 300, {
    aiming: true,
    extras: mines,
  });
  const tray =
    p.weapon === 'mortar'
      ? [direct?.target, direct?.blockedTarget].find((target) => target?.surface === 'top')
      : null;
  const hit =
    p.weapon === 'mortar' && !direct?.target && !tray
      ? world.cast(picker.ray.origin, picker.ray.direction, 300, {
          aiming: true,
          terrainOnly: true,
        })
      : direct;
  if (thirdPerson) {
    if (hit) aim.copy(hit.point);
    else aim.copy(picker.ray.origin).addScaledVector(picker.ray.direction, 150);
    const muzzle = weaponOrigin();
    if (aim.clone().sub(muzzle).dot(follow.forward) < 1)
      aim.copy(muzzle).addScaledVector(follow.forward, 2);
  } else if (hit?.target || hit?.mirror) aim.copy(hit.point);
  else if (hit) {
    if (p.weapon === 'mortar') aim.copy(hit.point);
    else {
      const plane = new T.Plane(new T.Vector3(0, 1, 0), -hit.point.y - 2);
      picker.ray.intersectPlane(plane, aim);
    }
  } else picker.ray.intersectPlane(new T.Plane(new T.Vector3(0, 1, 0), -p.y - 2), aim);
  if (p.weapon === 'mortar') {
    // A tray rim identifies its horizontal landing surface, even when viewed from below.
    if (tray) picker.ray.intersectPlane(new T.Plane(new T.Vector3(0, 1, 0), -tray.y), aim);
    const range = scopeRange(p, MORTAR.range);
    const clamped = Math.hypot(aim.x - p.x, aim.z - p.z) > range;
    const t = mortarTarget(p.x, p.z, aim.x, aim.z, range);
    aim.x = t.x;
    aim.z = t.z;
    if (clamped) aim.y = Math.max(p.y, aim.y);
    // Elevated machinery has a contact surface of its own. Actor hulls and
    // range-clamped aim instead resolve to the supporting ground below them.
    const machinery = tray || (hit?.target && !hit.target.model && !hit.target.enemy);
    if (!machinery || clamped)
      aim.copy(
        mortarGroundTarget(aim, (start, direction, distance) =>
          world.cast(start, direction, distance, { terrainOnly: true }),
        ),
      );
  } else aim.copy(groundAim(weaponOrigin(), aim, model.root.quaternion).target);
  const turretAim = groundAim(weaponOrigin(), aim, model.root.quaternion);
  model.turret.rotation.y = turretAim.yaw;
  model.barrel.rotation.x = p.weapon === 'mortar' ? -0.4 : -turretAim.pitch;
  p.aim = Math.atan2(aim.x - p.x, aim.z - p.z);
  mortarGuide.visible = p.weapon === 'mortar' && p.hp > 0 && !p.endingTime;
  mortarLanding.visible = mortarGuide.visible;
  if (mortarGuide.visible) {
    const predicted = predictMortar(weaponOrigin(), aim, (start, dir, range) =>
      castWeapon(start, dir, range, { extras: mines }),
    );
    const position = mortarGuide.geometry.attributes.position;
    predicted.points.forEach((q, i) => position.setXYZ(i, q.x, q.y, q.z));
    mortarGuide.geometry.setDrawRange(0, predicted.points.length);
    position.needsUpdate = true;
    mortarGuide.computeLineDistances();
    const floor = world.cast(
      predicted.point.clone().add(new T.Vector3(0, 0.15, 0)),
      new T.Vector3(0, -1, 0),
      80,
      { terrainOnly: true },
    );
    mortarLanding.visible = !!predicted.hit && !!floor;
    if (floor) {
      mortarLanding.position.copy(floor.point).add(new T.Vector3(0, 0.07, 0));
      const normal = floor.face.normal.clone().transformDirection(floor.object.matrixWorld);
      mortarLanding.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), normal);
    }
    mortarLanding.material.color.setHex(predicted.obstructed ? 0xffad62 : 0xffe4a9);
    mortarLanding.userData.prediction = predicted.point.toArray();
  }
}
function updateLaser(dt) {
  laserBeam.visible = laserGuide.visible = laserEndpoint.visible = false;
  if (p.weapon !== 'laser' || !p.laser || p.hp <= 0 || p.endingTime || playerStunned(p, time))
    return;
  const origin = weaponOrigin(),
    path = traceFoldedLaser(origin, aim.clone().sub(origin), (start, dir, range) =>
      castWeapon(start, dir, range, { extras: mines }),
    ),
    points = path.flatMap((s) => [s.start, s.end]);
  const firing = keys.has(bindings.fire) && !p.overheated;
  // Show the computed path over foreground cover; the trace itself still stops
  // at every physical obstruction. Keep a faint guide under the live beam.
  laserGuide.geometry.setFromPoints(points);
  laserGuide.geometry.setDrawRange(0, points.length);
  laserGuide.computeLineDistances();
  laserGuide.visible = true;
  laserGuide.material.opacity = firing ? 0.2 : 0.65;
  if (!firing) {
    const last = path.at(-1);
    laserEndpoint.visible = !!last?.hit;
    if (last) laserEndpoint.position.copy(last.end);
    return;
  }
  p.heat = Math.min(100, p.heat + LASER.heat * dt);
  p.lastHeat = time;
  p.boostCooling = false;
  p.actionHeatAt = time;
  if (p.heat >= 100) p.overheated = true;
  for (let i = 0; i < path.length; i++) {
    const { start, end, hit } = path[i];
    if (hit?.refuge) {
      refugeImpact(end, start);
      break;
    }
    if (hit?.mirror) {
      hit.mirror.flash = 0.15;
      continue;
    }
    if (path[i].reflected) continue;
    if (hit?.target) {
      const t = hit.target;
      if (t.kind === 'mine') detonateMine(t);
      else if (t.enemy || t.model)
        hitEnemy(
          t.enemy || t,
          weaponDamage(p, 'laser', LASER.damage) * dt,
          start,
          'laser',
          t.enemy ? t : null,
        );
      else setState(t.id, 'laser');
    }
  }
  if (time - laserSoundAt > 0.13) {
    audio.event('laser');
    laserSoundAt = time;
  }
  laserBeam.geometry.setFromPoints(points);
  laserBeam.geometry.setDrawRange(0, points.length);
  laserBeam.visible = true;
  for (let i = 0; i < laserCores.length; i++) {
    const core = laserCores[i];
    core.visible = i * 2 < points.length;
    if (core.visible) {
      const a = points[i * 2],
        b = points[i * 2 + 1],
        delta = b.clone().sub(a);
      core.position.copy(a).addScaledVector(delta, 0.5);
      core.scale.set(p.laserUpgrade ? 1.8 : 1, delta.length(), p.laserUpgrade ? 1.8 : 1);
      core.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize());
    }
  }
  fired = true;
}

let refugeImpactAt = -10;
function refugeImpact(point, origin) {
  if (time - refugeImpactAt < 0.3) return;
  refugeImpactAt = time;
  burst(point, C.mint, 8);
  const pulse = ripple(point, 1.8, C.mint, 0.6, 0.9),
    normal = origin.clone().sub(point).normalize();
  pulse.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), normal);
  audio.event('blocked');
}

function fire() {
  if (playerStunned(p, time)) return false;
  if (p.weapon === 'laser') return false;
  const mortar = p.weapon === 'mortar';
  if (
    paused ||
    mapOpen ||
    !shootHeat(
      p,
      time,
      mortar ? MORTAR.heat : CANNON.heat,
      mortar ? MORTAR.cooldown : CANNON.cooldown,
    )
  )
    return false;
  const origin = weaponOrigin(),
    dir = aim.clone().sub(origin).normalize();
  const mesh = projectile(origin, dir, mortar);
  const upgraded = !!p[`${p.weapon}Upgrade`];
  if (upgraded) {
    mesh.scale.multiplyScalar(1.3);
    mesh.material.color.setHex(0xffffff);
  }
  shots.push({
    damage: weaponDamage(p, p.weapon, mortar ? MORTAR.damage : CANNON.damage),
    upgraded,
    range: scopeRange(p, mortar ? MORTAR.range : CANNON.range),
    origin: origin.clone(),
    position: origin.clone(),
    dir,
    mesh,
    mortar,
    target: aim.clone(),
    age: 0,
    distance: 0,
  });
  burst(origin.clone().addScaledVector(dir, 2.6), 0xfff1b0, 4);
  audio.event(mortar ? 'mortar' : 'shot');
  recoil = 0.38;
  fired = true;
  return true;
}
function target() {
  const pickup = world.pickups.find(
    (q) =>
      !state[q.id] &&
      (!q.requires || state[q.requires]) &&
      Math.hypot(q.x - p.x, q.z - p.z) < 3.5 &&
      Math.abs(q.y - p.y) < 0.5,
  );
  if (pickup) return { ...pickup, kind: 'pickup' };
  const hive = world.hives.find(
    (h) =>
      (!h.requires || state[h.requires]) &&
      Math.hypot(h.x - p.x, h.z - p.z) < 3.5 &&
      Math.abs(h.y - p.y) < 0.5,
  );
  if (hive) return { ...hive, kind: 'hive' };
  const signal = world.sidePuzzles.rail.state.moving
    ? world.sidePuzzles.targets
        .filter((t) => t.id === 'rail-signal')
        .map((t) => ({ ...t, kind: 'use' }))
    : [];
  const use = [...world.controls, ...signal].find(
    (c) =>
      ['use', 'dock'].includes(c.kind) &&
      !state[c.id] &&
      (c.kind !== 'dock' || state.keeper) &&
      Math.abs(c.y - 1.3 - p.y) < 0.6 &&
      Math.hypot(c.x - p.x, c.z - p.z) < 3,
  );
  if (use) return use;
}
function interact() {
  const t = target();
  if (!t || p.hp <= 0) return false;
  if (t.kind === 'pickup') {
    state[t.id] = true;
    if (t.upgrade) {
      const oldMax = playerMaxHp(p);
      applyUpgrades(p, state);
      p.hp = Math.min(playerMaxHp(p), p.hp + playerMaxHp(p) - oldMax);
      abilityHud.acquireUpgrade(t.upgrade, time, p);
      ripple(new T.Vector3(p.x, p.y, p.z), 3, C.lightYellow, 0.9, 0.7);
    } else {
      p[t.ability || t.id] = true;
      abilityHud.acquire(t.ability || t.id, time);
    }
    audio.event('unlock');
    save();
  }
  if (t.kind === 'hive') {
    state.anchor = t.id;
    p.hp = playerMaxHp(p);
    p.heat = 0;
    p.overheated = false;
    p.speed = 1;
    p.invincible = time + 1.5;
    repairAt = time;
    resetEnemies();
    clearShots();
    world.pulseHive(t.id);
    audio.event('repair');
    save();
  }
  if (t.kind === 'use') setState(t.id, 'use');
  return true;
}
function updateLifts(dt) {
  stepLifts(world.lifts, state, p, dt, world.enemies);
}
function resetEnemies(...args) {
  return enemies.resetEnemies(...args);
}
function clearShots() {
  for (const s of shots) {
    scene.remove(s.mesh);
    s.mesh.material.dispose();
    if (s.marker) {
      scene.remove(s.marker);
      s.marker.geometry.dispose();
      s.marker.material.dispose();
    }
  }
  shots.length = 0;
  effects.clearWaves();
  for (const m of mines) {
    scene.remove(m.root);
    m.lamp.material.dispose();
    m.lamp.geometry.dispose();
  }
  mines.length = 0;
}
function respawn() {
  camera = thirdPerson ? follow.camera : overheadCamera;
  world.setThirdPerson(thirdPerson);
  const h = foldedHives.find((h) => h.id === state.anchor);
  Object.assign(p, h, {
    hp: playerMaxHp(p),
    heat: 0,
    overheated: false,
    deployed: false,
    afloat: false,
    speed: 1,
    lastHeat: -10,
    boostCooling: false,
    actionHeatAt: -10,
    lastShot: -10,
    invincible: time + 1,
    hurtUntil: 0,
    hurtAt: -10,
    knockX: 0,
    knockZ: 0,
  });
  phoenixExhaust.update(false, time);
  clearShots();
  resetEnemies();
  p.dockHold = 0;
  p.endingTime = 0;
  ending.hide();
  skipEnding.hidden = true;
  $('hud').classList.remove('ending-active');
  for (const l of world.lifts) {
    l.y = l.settle && !state[l.lock] ? l.stops.at(-1) : l.stops[0];
    l.destination = l.stops[0];
    l.wait = 0;
  }
  deathAt = -1;
  keys.clear();
  updatePlayerPose(1, true);
  focus.set(p.x, p.y, p.z);
  updateCamera(1);
  repairAt = time;
  world.pulseHive(h.id, 'respawn');
  audio.event('repair');
  world.update(0, time, p, camera);
  updateAim();
  deathView.reconstruct();
  updateMusic();
}
function alertSquad(...args) {
  return enemies.alertSquad(...args);
}
function moveEnemy(...args) {
  return enemies.moveEnemy(...args);
}
function layMine(e) {
  if (refugeAt(e, world.hives, state, REFUGE_CLEARANCE)) return;
  if (mines.filter((m) => m.owner === e.id).length >= 3) return;
  const root = new T.Group();
  scene.add(root);
  cylinder(root, 0.6, 0.22, 0, 0.18, 0, SIGNAL.magnet, 8);
  const lamp = ring(root, 0.65, 0.07, 0, 0.34, 0, mat(C.orange, true));
  const mine = {
    id: `mine-${e.id}-${time}`,
    owner: e.id,
    x: e.x,
    y: e.y,
    z: e.z,
    root,
    lamp,
    age: 0,
    trigger: 0,
    radius: 0.7,
    kind: 'mine',
  };
  root.position.set(e.x, e.y, e.z);
  mines.push(mine);
}
function detonateMine(m) {
  if (m.disarmed) return;
  m.disarmed = true;
  const pos = new T.Vector3(m.x, m.y + 0.3, m.z);
  ripple(pos, 3, C.orange, 0.6, 0.8);
  audio.event('explode');
  if (Math.abs(m.y - p.y) < 2 && Math.hypot(m.x - p.x, m.z - p.z) < 3.4)
    hurt(HOSTILE_DAMAGE.mine, m);
  for (const e of world.enemies)
    if (e.hp > 0 && Math.abs(e.y - m.y) < 2 && Math.hypot(e.x - m.x, e.z - m.z) < 3)
      hitEnemy(e, 2, pos, 'mortar');
}
function updateMines(dt) {
  for (let i = mines.length - 1; i >= 0; i--) {
    const m = mines[i];
    m.age += dt;
    moveWithConveyor(m, 0, 0, dt, state, world.lifts, world.enemies);
    m.root.position.set(m.x, m.y, m.z);
    if (refugeAt(m, world.hives, state, REFUGE_CLEARANCE)) m.disarmed = true;
    if (m.age > 1 && Math.abs(m.y - p.y) < 2 && Math.hypot(m.x - p.x, m.z - p.z) < 2.8)
      m.trigger = Math.max(m.trigger, 0.001);
    if (m.trigger) m.trigger += dt;
    m.lamp.scale.setScalar(m.trigger ? 1 + Math.sin(time * 25) * 0.25 : 1);
    m.lamp.material.color.setHex(m.disarmed ? SIGNAL.open : m.age < 1 ? SIGNAL.ready : C.red);
    if (m.disarmed || m.age > 14 || m.trigger > 0.9) {
      if (!m.disarmed && m.trigger > 0.9) detonateMine(m);
      scene.remove(m.root);
      m.lamp.material.dispose();
      m.lamp.geometry.dispose();
      mines.splice(i, 1);
    }
  }
}
function beginBossAttack(...args) {
  return enemies.beginBossAttack(...args);
}
function updateSorter(...args) {
  return enemies.updateSorter(...args);
}
function updateEnemies(...args) {
  return enemies.updateEnemies(...args);
}
function updateMagnet(dt) {
  magnetic = null;
  magneticBeam.visible = false;
  magnetEmitter.visible = p.magnet;
  if (!p.magnet || !keys.has(bindings.magnet) || p.hp <= 0 || playerStunned(p, time)) {
    if (magnetLock?.id === 'sorting-cover' || magnetLock?.slide) save();
    magnetLock = null;
    return;
  }
  const origin = weaponOrigin(),
    aimDir = aim.clone().sub(origin).normalize();
  const candidates = [
    ...world.sidePuzzles.targets.filter((c) => c.kind === 'magnet'),
    ...world.controls.filter(
      (c) => c.kind === 'magnet' && (c.slide || !world.signals.active(c.id)),
    ),
    ...world.enemies.filter(
      (e) =>
        ((e.magneticShield && !e.shieldRemoved) || magnetPullable(e)) &&
        e.hp > 0 &&
        !refugeAt(p, world.hives, state),
    ),
    ...mines.filter((m) => !m.disarmed),
    ...shots
      .filter((s) => s.hostile && s.mortar)
      .map((s) => ({ kind: 'shell', id: 'shell', shot: s, ...s.position })),
  ];
  const selected = candidates
    .map((c) => {
      const pos = new T.Vector3(c.x, c.y + (c.model ? 1.5 : 0), c.z),
        delta = pos.clone().sub(origin);
      return {
        c,
        pos,
        delta,
        locked: c === magnetLock,
        pointed:
          c.kind === 'magnet' && picker.ray.distanceSqToPoint(pos) <= (c.radius || 0.75) ** 2,
        distance: delta.length(),
        alignment: delta.clone().normalize().dot(aimDir),
      };
    })
    .filter((q) => q.distance < 13 && (q.pointed || q.alignment > (q.locked ? 0.75 : 0.95)))
    .sort(
      (a, b) =>
        Number(b.locked) - Number(a.locked) ||
        Number(b.pointed) - Number(a.pointed) ||
        b.alignment - a.alignment ||
        a.distance - b.distance,
    )
    .find((q) => {
      const h = world.cast(origin, q.delta.clone().normalize(), q.distance, { extras: mines });
      return !h || h.target === q.c || h.distance > q.distance - 0.8;
    });
  const c = p.overheated ? null : selected?.c;
  magnetLock = c || null;
  let end =
    selected && !p.overheated
      ? selected.pos
      : origin.clone().addScaledVector(aimDir, p.overheated ? 2 : 13);
  if (!c) {
    const delta = end.clone().sub(origin),
      hit = world.cast(origin, delta.clone().normalize(), delta.length());
    if (hit) end = hit.point;
  }
  const axis = end.clone().sub(origin),
    length = axis.length(),
    dir = axis.clone().normalize();
  magnetic = c?.id || (p.overheated ? 'blocked' : 'search');
  magneticBeam.visible = true;
  for (const shaft of [magneticCore, magneticGlow]) {
    shaft.position.copy(origin).addScaledVector(axis, 0.5);
    shaft.scale.y = length;
    shaft.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir);
  }
  magneticGlow.material.color.setHex(p.overheated ? C.red : SIGNAL.magnet);
  for (let i = 0; i < magneticRings.length; i++) {
    const t = (i / 5 + time * (c ? -1.4 : 1.4)) % 1;
    const u = (t + 1) % 1,
      r = magneticRings[i];
    r.position.copy(origin).addScaledVector(axis, u);
    r.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), dir);
    r.scale.setScalar(c ? 1 : 1 + u * 1.5);
    r.material.color.setHex(p.overheated ? C.red : SIGNAL.magnet);
  }
  if (time - magnetSoundAt > 0.7) {
    audio.event(p.overheated ? 'blocked' : c ? 'magnet-pull' : 'magnet');
    magnetSoundAt = time;
  }
  if (p.overheated) return;
  p.heat = Math.min(100, p.heat + (c ? 12 : 3) * dt);
  p.lastHeat = time;
  p.boostCooling = false;
  p.actionHeatAt = time;
  if (p.heat >= 100) p.overheated = true;
  if (!c) return;
  if (c.slide) {
    const body = state.bodies.solids.find((b) => b.id === c.slide);
    if (
      pullSlide(
        body,
        p,
        dt,
        [
          ...state.bodies.solids.filter(
            (b) => b !== body && (b.permanent || b.rail || !state[b.id]),
          ),
          ...state.bodies.obstacles,
          ...foldedArchitecture.solids,
          ...world.enemies
            .filter((e) => e.hp > 0)
            .map((e) => ({
              x: e.x - e.radius,
              y: e.y,
              z: e.z - e.radius,
              w: e.radius * 2,
              d: e.radius * 2,
            })),
        ],
        (x, z, y) => !!foldedSupport(x, z, y, false, world.lifts),
      )
    ) {
      state.slidePositions[body.id] = body[body.rail.axis];
      if (body.rail.latch && body[body.rail.axis] === body.rail.max && !state[body.rail.latch]) {
        state[body.rail.latch] = true;
        world.signalRelease(body.rail.latch, time);
        audio.event('lever');
        save();
      }
    }
  } else if (c.id === 'sorting-cover') world.sidePuzzles.pullCover(dt, p, world.enemies, time);
  else if (c.model && magnetPullable(c)) {
    const body = { x: c.x, y: c.y, z: c.z, speed: 1 };
    if (length > c.radius + 1.4)
      moveFolded(body, -dir.x * 5 * dt, -dir.z * 5 * dt, state, world.lifts);
    if (!refugeAt(body, world.hives, state, REFUGE_CLEARANCE + c.radius)) {
      c.x = body.x;
      c.y = body.y;
      c.z = body.z;
    }
    c.stunnedUntil = time + 0.2;
    alertSquad(c);
  } else if (c.model) {
    c.shieldPull = Math.min(1, c.shieldPull + dt / 0.7);
    c.stunnedUntil = time + 0.2;
    if (c.shieldPull >= 1) {
      c.shieldRemoved = true;
      c.stunnedUntil = time + 2.2;
      audio.event('armor', { position: c });
      effects.pullShield(c, origin);
    }
  } else if (c.kind === 'mine') {
    c.pull = (c.pull || 0) + dt;
    const body = { x: c.x, y: c.y, z: c.z, speed: 1 };
    moveFolded(body, -dir.x * 5 * dt, -dir.z * 5 * dt, state, world.lifts);
    c.x = body.x;
    c.z = body.z;
    if (c.pull > 0.4) {
      c.disarmed = true;
      burst(new T.Vector3(c.x, c.y + 0.5, c.z), SIGNAL.magnet, 6);
      audio.event('lever');
    }
  } else if (c.kind === 'shell') {
    c.shot.captured = true;
    burst(end, SIGNAL.magnet, 8);
    audio.event('armor');
  } else {
    c.tugAt = time;
    c.pullDirection.copy(origin).sub(c.root.position);
    c.pullDirection.y = 0;
    c.pullDirection.normalize().applyQuaternion(c.root.quaternion.clone().invert());
    c.pull = (c.pull || 0) + dt;
    if (c.pull >= 0.6 && setState(c.id, 'magnet')) {
      burst(end, SIGNAL.magnet, 6);
      audio.event('armor', { position: c });
    }
  }
}
function updateEnding(dt) {
  world.transport(dt, p);
  updateLifts(dt);
  const shot = endingShot(p.endingTime);
  if (camera !== endingCamera) {
    camera = endingCamera;
    world.setThirdPerson(true);
    scene.fog.near = 105;
    scene.fog.far = 150;
  }
  endingCamera.aspect = innerWidth / innerHeight;
  endingCamera.updateProjectionMatrix();
  camera.position.set(...shot.eye);
  camera.lookAt(new T.Vector3(...shot.at));
  camera.updateMatrixWorld();
  const view = { ...p, x: shot.at[0], y: shot.at[1], z: shot.at[2] };
  sun.position.set(view.x - 18, view.y + 55, view.z + 16);
  sun.target.position.set(view.x, view.y, view.z);
  sun.target.updateMatrixWorld();
  world.update(dt, time, view, camera);
  for (const { m, color } of hullMaterials)
    m.color.copy(color).lerp(new T.Color(0xe99955), Math.min(0.55, p.endingTime * 0.08));
  model.radiator.material.color.setHex(C.orange);
  model.turret.rotation.y += angleDelta(model.turret.rotation.y, p.heading) * Math.min(1, dt * 2);
  model.barrel.rotation.x = T.MathUtils.damp(model.barrel.rotation.x, 0, 2, dt);
  model.antenna.rotation.z = Math.sin(p.endingTime * 2) * Math.max(0, 0.18 - p.endingTime * 0.035);
  audio.update(time, p, false, 'r7-furnace', false, false);
  audio.environment(time, view, world.presentation.region, state, Math.PI);
  skipEnding.hidden = p.endingTime < 0.75;
}
function completeEnding() {
  p.endingTime = ENDING_DURATION;
  updateEnding(0);
  paused = true;
  keys.clear();
  skipEnding.hidden = true;
  $('settings').hidden = true;
  audio.update(time, p, false, 'r7-furnace', false, false);
  ending.show();
  if (document.pointerLockElement) document.exitPointerLock();
  renderer.render(scene, camera);
  hud();
}
function advance(dt) {
  if (paused || mapOpen) return;
  time += dt;
  phoenixExhaust.update(p.hp > 0 && !p.endingTime && phoenixReady(p), time);
  if (world.advanceSignals(dt, time)) {
    if (!state.relays && state['relay-west'] && state['relay-east']) state.relays = true;
    save();
  }
  if (deathAt >= 0) {
    laserBeam.visible = laserGuide.visible = laserEndpoint.visible = false;
    mortarGuide.visible = mortarLanding.visible = magneticBeam.visible = false;
    world.update(dt, time, p, camera);
    updateSparks(dt);
    updateWaves(dt);
    deathView.update(time - deathAt);
    updateMusic();
    if (time - deathAt >= DEATH_HOLD) respawn();
    return;
  }
  deathView.reveal(dt);
  if (p.endingTime) {
    p.endingTime = Math.min(ENDING_DURATION, p.endingTime + dt);
    updateEnding(dt);
    if (p.endingTime >= ENDING_DURATION) completeEnding();
    return;
  }
  const dock = target();
  const walking = [bindings.up, bindings.down, bindings.left, bindings.right].some((k) =>
    keys.has(k),
  );
  p.dockHold =
    dock?.kind === 'dock' && keys.has(bindings.repair) && !walking ? (p.dockHold || 0) + dt : 0;
  if (p.dockHold) {
    p.x *= Math.exp(-dt * 2.5);
    p.z *= Math.exp(-dt * 2.5);
    p.heading += angleDelta(p.heading, Math.PI) * Math.min(1, dt * 4);
  }
  if (p.dockHold >= 2) {
    p.endingTime = 0.001;
    p.speed = 1;
    recoil = 0;
    state.endingSeen = true;
    state.anchor = 'last-refuge';
    save();
    keys.clear();
    updatePlayerPose(1, true);
    laserBeam.visible =
      laserGuide.visible =
      laserEndpoint.visible =
      magneticBeam.visible =
      mortarGuide.visible =
      mortarLanding.visible =
        false;
    clearShots();
    audio.event('couple');
    if (document.pointerLockElement) document.exitPointerLock();
    updateEnding(0);
    return;
  }
  p.pumpPressure =
    Math.abs(p.y + 8) < 0.5 && Math.hypot(p.x - 58, p.z - 4) < 1.5
      ? Math.min(1, (p.pumpPressure || 0) + dt)
      : 0;
  world.transport(dt, p);
  updateLifts(dt);
  const horizontal = Number(keys.has(bindings.right)) - Number(keys.has(bindings.left)),
    vertical = Number(keys.has(bindings.down)) - Number(keys.has(bindings.up));
  const move = thirdPerson
    ? cameraMovement(horizontal, vertical, follow.yaw)
    : screenMovement(horizontal, vertical);
  const moving = !!(move.x || move.z),
    wasOverheated = p.overheated;
  updateHeat(p, dt, time, keys.has(bindings.overdrive), moving);
  if (!refugeAt(p, world.hives, state)) applyFloorHeat(p, dt, time, state);
  if (wasOverheated && !p.overheated) audio.event('ready');
  const breakable = foldedSolids.filter(
      (s) => s.red || s.phoenix || ['launch', 'optics', 'pressure'].includes(s.id),
    ),
    before = breakable.map((s) => state[s.id]),
    oldX = p.x,
    oldZ = p.z;
  const travelScale = p.deployed ? (p.afloat ? 1.15 : FLOTATION.speed) : 1;
  const impactSpeed = p.speed;
  const knock = hitDisplacement(p, time, dt);
  moveWithConveyor(
    p,
    move.x * BASE_SPEED * p.speed * travelScale * dt + knock.x,
    move.z * BASE_SPEED * p.speed * travelScale * dt + knock.z,
    dt,
    state,
    world.lifts,
    world.enemies,
  );
  if (before.some((v, i) => v !== state[breakable[i].id])) {
    audio.event('ram');
    burst(new T.Vector3(p.x, p.y + 1, p.z), C.orange, 18);
    save();
  }
  if (moving) {
    p.heading += angleDelta(p.heading, Math.atan2(move.x, move.z)) * Math.min(1, dt * 12);
    moved = true;
  }
  if (moving && world.sidePuzzles.pushCarrier(p, impactSpeed)) {
    audio.event('ram');
    save();
  }
  if (world.sidePuzzles.update(dt, p, world.enemies)) {
    audio.event('lever');
    save();
  }
  updatePlayerPose(dt);
  updateCamera(dt);
  world.update(dt, time, p, camera);
  updateAim();
  if (keys.has(bindings.fire)) fire();
  updateLaser(dt);
  updateMagnet(dt);
  updateEnemies(dt);
  updateShots(dt);
  updateMines(dt);
  if (model.root.position.x !== p.x || model.root.position.z !== p.z) updatePlayerPose(0);
  if (!wasOverheated && p.overheated) audio.event('heat');
  recoil = Math.max(0, recoil - dt * 2);
  model.barrel.position.z = -recoil;
  phoenixExhaust.update(p.hp > 0 && phoenixReady(p), time);
  model.rollWheels(Math.hypot(p.x - oldX, p.z - oldZ) * 2.4);
  for (const { m, color, opacity, transparent, depthWrite } of hullMaterials) {
    const fade =
      (thirdPerson ? clamp((follow.distance - 1.25) / 1.75, 0, 1) : 1) * hitOpacity(p, time);
    m.opacity = opacity * fade;
    m.transparent = transparent || fade < 1;
    m.depthWrite = depthWrite && fade === 1;
    m.color.copy(color).lerp(new T.Color(C.red), redContact(p) ? 0.75 : 0);
    if (time - repairAt < 1.5)
      m.color.lerp(new T.Color(C.mint), Math.max(0, 1 - (time - repairAt) / 1.5) * 0.65);
  }
  flotation.update(p.deployed, time, moving);
  model.radiator.material.color.setHex(p.overheated ? C.red : C.orange);
  updateSparks(dt);
  if (p.afloat && moving && Math.hypot(p.x - oldX, p.z - oldZ) > 0.01 && time - wakeAt > 0.18) {
    ripple(new T.Vector3(p.x, p.y, p.z), 2.6, 0xd9f3e6, 1.1, 0.28);
    wakeAt = time;
  }
  updateWaves(dt);
  const pickup = target();
  if (pickup?.kind === 'pickup' && Math.hypot(pickup.x - p.x, pickup.z - p.z) < 2.6) interact();
  const support = foldedSupport(p.x, p.z, p.y, p.deployed, world.lifts);
  let learned = false;
  for (const d of foldedDecks)
    if (
      !discovered.has(d.id) &&
      Math.abs(deckHeight(d, clamp(p.z, d.z, d.z + d.d)) - p.y) < 3 &&
      Math.hypot(p.x - clamp(p.x, d.x, d.x + d.w), p.z - clamp(p.z, d.z, d.z + d.d)) < 12
    ) {
      discovered.add(d.id);
      learned = true;
    }
  if (support && !discovered.has(support.id)) {
    discovered.add(support.id);
    learned = true;
  }
  if (
    !state['inner-transit'] &&
    p.circulation &&
    p.y <= -39.9 &&
    p.x > 259 &&
    p.x < 273 &&
    p.z < 16
  ) {
    state['inner-transit'] = true;
    world.signalRelease('inner-transit', time);
    audio.event('lever');
    learned = true;
  }
  if (learned) save();
  updateMusic(moving);
}

function updateMusic(moving = false) {
  const region = world.presentation.region,
    area = {
      foundry: 'r1-foundry',
      transit: 'r2-transit',
      garden: 'r3-garden',
      optics: 'r4-optics',
      testworks: 'r5-testworks',
      circulation: 'r6-circulation',
      furnace: 'r7-furnace',
    }[region];
  const musicThreats =
    p.hp <= 0
      ? []
      : world.enemies.filter(
          (e) =>
            e.hp > 0 &&
            e.awake &&
            Math.abs(e.y - p.y) < 5 &&
            (e.alertUntil > time || e.phase !== 'idle') &&
            Math.hypot(e.x - p.x, e.z - p.z) < (e.id === 'keeper' ? 94 : 48),
        );
  const musicBoss = world.enemies.find((e) => e.hp > 0 && e.id === state.combatArena);
  audio.update(time, p, musicThreats.length > 0, area, false, moving, {
    boss: musicBoss?.id,
    quiet: state.keeper && region === 'furnace',
  });
  audio.environment(time, p, region, state, thirdPerson ? follow.yaw : Math.PI * 1.25);
}

function setMap(value) {
  mapOpen = value;
  keys.clear();
  if (value && document.pointerLockElement) document.exitPointerLock();
  if (!value) captureMouse();
  $('region').hidden = !value;
  $('minimap-wrap').hidden = value;
  if (!value) minimapBounds = $('minimap-wrap').getBoundingClientRect();
  if (value) {
    mapped = true;
    mapView.open();
  }
  audio.update(time, p, false, 'r2-transit', true);
}
function hud() {
  $('hud').classList.toggle('ending-active', !!p.endingTime);
  const boss = world.enemies.find((e) => e.hp > 0 && e.id === state.combatArena);
  $('boss-health').style.display = boss && !p.endingTime ? 'flex' : 'none';
  if (boss) $('boss-health').querySelector('span').style.width = `${(boss.hp / boss.max) * 100}%`;
  while (hp.children.length < playerMaxHp(p) / 5) hp.append(document.createElement('i'));
  [...hp.children].forEach(
    (e, i) => (e.className = p.hp <= i * 5 ? 'empty' : p.hp < (i + 1) * 5 ? 'half' : ''),
  );
  $('status').classList.toggle('critical', p.hp > 0 && p.hp <= 15);
  $('heat').style.strokeDashoffset = String(100 - p.heat);
  $('reticle').style.setProperty(
    '--heat-color',
    `hsl(${48 - 40 * (p.overheated ? 1 : p.heat / 100)} 100% ${82 - (15 * p.heat) / 100}%)`,
  );
  $('reticle').classList.toggle('hot', p.overheated);
  $('reticle').classList.toggle('mortar', p.weapon === 'mortar');
  // The cursor expresses intent; only the barrel and shot obey physical aim limits.
  $('reticle').style.left = `${(pointer.x + 1) * 0.5 * innerWidth}px`;
  $('reticle').style.top = `${(1 - pointer.y) * 0.5 * innerHeight}px`;
  $('reticle').style.display =
    controls.pointerOver && !paused && !mapOpen && p.hp > 0 && !p.endingTime ? 'block' : 'none';
  abilityHud.update(p, time, magnetic);
  lookHint.hidden =
    !thirdPerson ||
    controls.looked ||
    !!document.pointerLockElement ||
    paused ||
    mapOpen ||
    p.hp <= 0 ||
    !!p.endingTime;
  const cursorX = (pointer.x + 1) * 0.5 * innerWidth,
    cursorY = (1 - pointer.y) * 0.5 * innerHeight;
  $('minimap-wrap').classList.toggle(
    'aim-through',
    !thirdPerson &&
      controls.pointerOver &&
      !paused &&
      !mapOpen &&
      !!minimapBounds &&
      cursorX > minimapBounds.left - 28 &&
      cursorX < minimapBounds.right + 28 &&
      cursorY > minimapBounds.top - 28 &&
      cursorY < minimapBounds.bottom + 28,
  );
  const warningPhases = ['warn', 'charge', 'burst', 'rail', 'flame', 'sweep'];
  const threats = world.enemies
    .filter(
      (e) => e.hp > 0 && !e.readable && warningPhases.includes(e.phase) && e.type !== 'repairer',
    )
    .map((e) => {
      const dx = e.x - p.x,
        dz = e.z - p.z,
        yaw = thirdPerson ? follow.yaw : Math.PI * 1.25;
      return { angle: yaw - Math.atan2(dx, dz), distance: Math.hypot(dx, dz) };
    })
    .sort((a, b) => a.distance - b.distance);
  threatHud(threats, paused || mapOpen || p.hp <= 0 || !!p.endingTime);
  $('overdrive').style.opacity = p.overdrive ? 1 : 0;
  $('overdrive').querySelector('span').style.width =
    `${((p.speed - 1) / (p.phoenix ? 2.2 : 0.6)) * 100}%`;
  const near = target(),
    v = near ? project(near.x, near.y + 3, near.z) : null;
  $('interaction').style.display =
    near && !paused && !mapOpen && p.hp > 0 && !p.endingTime ? 'block' : 'none';
  if (v && !v.visible) $('interaction').style.display = 'none';
  if (v) {
    $('interaction').style.left = `${v.x}px`;
    $('interaction').style.top = `${v.y}px`;
  }
  dockProgress.style.display = near?.kind === 'dock' ? 'block' : 'none';
  dockProgress.querySelector('.dock-fill').style.strokeDashoffset = String(
    100 - Math.min(1, (p.dockHold || 0) / 2) * 100,
  );
  $('glyphs').hidden = !!boss || paused || mapOpen || !!p.endingTime;
  $('glyphs').style.opacity = moved && fired && mapped ? '0' : '.6';
  $('damage').style.opacity = String(Math.max(0, 1 - (time - hitAt) * 3) * 0.6);
  $('minimap-wrap').hidden = mapOpen;
  if (time - mapAt > 0.15) {
    drawMap();
    mapAt = time;
  }
}
function updateBindingGlyphs() {
  const glyph = $('glyphs');
  keyGlyph(glyph.children[0], bindings.up);
  [bindings.left, bindings.down, bindings.right].forEach((b, i) =>
    keyGlyph(glyph.children[1].children[i], b),
  );
  keyGlyph(glyph.children[3], bindings.map);
  keyGlyph($('interaction').firstElementChild, bindings.repair);
  abilityHud.updateBindings(bindings);
  keyGlyph(cameraToggle.querySelector('kbd'), bindings.camera);
  interfaceView.bindings(bindings, keyGlyph);
}
function setPause(value) {
  if (ending.visible) return;
  $('resume').textContent = p.endingTime ? 'Resume cinematic' : 'Resume';
  paused = value;
  keys.clear();
  controls.stopOrbit();
  if (value && document.pointerLockElement) document.exitPointerLock();
  settings.setPaused(value);
  if (value) interfaceView.open();
  else $('game').focus();
  audio.update(time, p, false, 'r2-transit', true);
}
function input(code, repeat = false) {
  audio.start();
  if (settings.acceptBinding(code)) return;
  if (p.endingTime && !paused && !repeat && (code === bindings.pause || code === bindings.skip)) {
    if (p.endingTime >= 0.75) completeEnding();
    return;
  }
  if (code === bindings.pause && !repeat) {
    if (mapOpen) setMap(false);
    else {
      setPause(!paused);
      if (!paused) captureMouse();
    }
    return;
  }
  if (paused || p.endingTime) return;
  if (deathAt >= 0) {
    if (code === bindings.skip && !repeat) respawn();
    return;
  }
  if (code === bindings.map && !repeat) {
    setMap(!mapOpen);
    return;
  }
  if (mapOpen) return;
  if (code === bindings.camera && !repeat) {
    setCameraView(thirdPerson ? 'overhead' : 'third');
    preferences.save();
    if (thirdPerson) captureMouse();
    return;
  }
  keys.add(code);
  if (repeat) return;
  if (code === bindings.repair) interact();
  if (code === bindings.weapon) {
    const weapons = ['cannon', ...(p.mortar ? ['mortar'] : []), ...(p.laser ? ['laser'] : [])];
    p.weapon = weapons[(weapons.indexOf(p.weapon) + 1) % weapons.length];
  }
  if (code === bindings.flotation) {
    if (toggleFlotation(p, (x, z) => !!foldedSupport(x, z, p.y, false, world.lifts)))
      audio.event('flotation');
    else if (p.flotation) audio.event('blocked');
  }
  if (code === bindings.fire) fire();
}
const controls = installFoldedInput({
  canvas: $('game'),
  settings: $('settings'),
  keys,
  pointer,
  follow,
  status: {
    get thirdPerson() {
      return thirdPerson;
    },
    get paused() {
      return paused;
    },
    get mapOpen() {
      return mapOpen;
    },
    get dead() {
      return p.hp <= 0;
    },
    get endingTime() {
      return p.endingTime;
    },
    get endingVisible() {
      return ending.visible;
    },
    get rebind() {
      return settings.rebind;
    },
    get bindings() {
      return bindings;
    },
  },
  actions: {
    input,
    pause: () => setPause(true),
    updateCamera: (...args) => updateCamera(...args),
    updateAim: () => updateAim(),
    captureUnavailable() {
      settings.captureUnavailable();
    },
  },
});
function captureMouse() {
  return controls.capture();
}
$('settings-button').onclick = () => setPause(true);
$('resume').onclick = () => {
  setPause(false);
  if (!p.endingTime) captureMouse();
};
document.querySelector('.close-map').onclick = () => setMap(false);
const settings = mountFoldedSettings({
  preferences,
  audio,
  renderer,
  camera: {
    get pitch() {
      return follow.pitch;
    },
    set pitch(value) {
      follow.pitch = value;
    },
    select: setCameraView,
    preview() {
      follow.boom = cameraSettings.third.distance;
      follow.height = cameraSettings.third.height;
      follow.shoulder = cameraSettings.third.shoulder;
      follow.sensitivity = cameraSettings.third.sensitivity;
      updateOverheadAngle();
      resize();
      updateCamera(1);
      world.update(0, time, p, camera);
      updateAim();
      renderer.render(scene, camera);
    },
  },
  actions: {
    bindingsChanged: updateBindingGlyphs,
    resume() {
      setPause(false);
      if (!p.endingTime) captureMouse();
    },
    restart() {
      saves.reset();
      location.reload();
    },
  },
});
function setCameraView(value) {
  thirdPerson = value !== 'overhead';
  camera = thirdPerson ? follow.camera : overheadCamera;
  world.setThirdPerson(thirdPerson);
  settings.setView(thirdPerson ? 'third' : 'overhead');
  document.body.classList.toggle('third-person', thirdPerson);
  if (!thirdPerson && document.pointerLockElement) document.exitPointerLock();
  focus.set(p.x, p.y, p.z);
  pointer.set(0, 0);
  keys.clear();
  updateCamera(1);
  world.update(0, time, p, camera);
  updateAim();
  renderer.render(scene, camera);
}
function resize() {
  const size = cameraSettings.overhead.scale,
    w = (size * innerWidth) / innerHeight;
  overheadCamera.left = -w;
  overheadCamera.right = w;
  overheadCamera.top = size;
  overheadCamera.bottom = -size;
  overheadCamera.updateProjectionMatrix();
  follow.camera.aspect = innerWidth / innerHeight;
  follow.camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  if (paused) renderer.render(scene, camera);
  if (mapOpen) drawMap(true);
  else minimapBounds = $('minimap-wrap').getBoundingClientRect();
}
updatePlayerPose(1, true);
setCameraView(thirdPerson ? 'third' : 'overhead');
addEventListener('resize', resize);
resize();
updateCamera(1);
world.update(1, 0, p, camera);
advance(1 / 60);
if (freight || garden) abilityHud.acquire(freight ? 'mortar' : 'magnet', time);
function frame(now) {
  const dt = clamp((now - last) / 1000, 0, 0.05);
  last = now;
  if (!manual && !document.hidden && !paused && !mapOpen) {
    advance(dt);
    renderer.render(scene, camera);
    frames++;
  }
  hud();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
if (import.meta.env.DEV && params.has('test')) {
  const { createFrameProfiler } = await import('./folded-profiler.js');
  const profile = createFrameProfiler(renderer);
  advance = profile.wrap('advance', advance);
  updateCamera = profile.wrap('camera', updateCamera);
  updateAim = profile.wrap('aim', updateAim);
  updateEnemies = profile.wrap('enemies', updateEnemies);
  hud = profile.wrap('hud', hud);
  world.update = profile.wrap('world', world.update);
  window.__game = {
    // Diagnostic access is development-only; normal checks use snapshot/input/step.
    // Explicit access replaces browser scripts appending code to this module.
    debug: {
      profile,
      frames: () => frames,
      T,
      p,
      state,
      world,
      scene,
      renderer,
      model,
      follow,
      keys,
      aim,
      shots,
      mines,
      waves: effects.waves,
      audio,
      laserGuide,
      laserEndpoint,
      laserBeam,
      magneticBeam,
      mortarGuide,
      mortarLanding,
      abilityHud,
      ending,
      bossArenas,
      encounterPacing,
      groundPatches,
      traceFoldedLaser,
      weaponOrigin,
      updatePlayerPose,
      updateAim,
      updateLaser,
      updateSorter,
      updateEnemies,
      updateMines,
      moveEnemy,
      shootEnemy,
      updateShots,
      impact,
      hitEnemy,
      castWeapon,
      layMine,
      beginBossAttack,
      hurt,
      resetEnemies,
      clearShots,
      respawn,
      setPause,
      setCameraView,
      input,
      get camera() {
        return camera;
      },
      get time() {
        return time;
      },
      get links() {
        return mapView.links;
      },
      get chosenLayer() {
        return mapView.layer;
      },
      draw() {
        renderer.render(scene, camera);
      },
      magneticActive: () => magneticBeam.visible,
      reveal() {
        for (const d of foldedDecks) discovered.add(d.id);
        setMap(true);
      },
      selectLayer: (y) => mapView.selectLayer(y),
      closeMap: () => setMap(false),
      traceCombat() {
        this.hitLog = [];
        this.enemyShots = [];
        combatEvents.impact = (hit, shot) =>
          this.hitLog.push({
            target: hit.target?.id,
            point: hit.point.toArray(),
            phase: world.enemies.find((e) => e.id === 'foundry').phase,
          });
        combatEvents.shot = (e, lob) => this.enemyShots.push({ id: e.id, lob, time });
      },
    },
    snapshot: () => ({
      music: audio.score
        ? {
            track: audio.score.current?.track.id,
            position: audio.score.current ? audio.score.position(audio.score.current) : null,
            paused: audio.score.paused,
            error: audio.score.error?.message,
            loading: audio.score.loading,
          }
        : null,
      camera: {
        view: thirdPerson ? 'third' : 'overhead',
        position: camera.position.toArray(),
        yaw: follow.yaw,
        pitch: follow.pitch,
        distance: follow.distance,
        locked: document.pointerLockElement === $('game'),
        dragLook: controls.dragLook,
      },
      player: { ...p, height: p.y },
      state: { ...state },
      aim: { x: aim.x, y: aim.y, z: aim.z },
      time,
      frames,
      paused,
      mapOpen,
      chosenLayer: mapView.layer,
      laserSegments: laserBeam.visible
        ? Array.from(
            laserBeam.geometry.attributes.position.array.slice(
              0,
              laserBeam.geometry.drawRange.count * 3,
            ),
          )
        : [],
      bindings: { ...bindings },
      enemies: world.enemies.map((e) => ({
        id: e.id,
        x: e.x,
        y: e.y,
        z: e.z,
        hp: e.hp,
        parts: e.parts.map((p) => ({ x: p.x, y: p.y, z: p.z, hp: p.hp })),
        aim: e.aim,
        phase: e.phase,
        readable: e.readable,
      })),
      lifts: world.lifts.map((l) => ({ id: l.id, y: l.y, destination: l.destination })),
      surfaces: world.surfaces
        .filter((s) => s.opacity < 0.99)
        .map((s) => ({ id: s.id, opacity: s.opacity })),
      drawCalls: renderer.info.render.calls,
      geometries: renderer.info.memory.geometries,
    }),
    step: (seconds, render = true) => {
      for (let t = 0; t < seconds - 1e-7; t += 1 / 60) advance(Math.min(1 / 60, seconds - t));
      if (render) {
        renderer.render(scene, camera);
        hud();
      }
    },
    scenario: (values) => {
      if (values.player) Object.assign(p, values.player);
      if (values.state) Object.assign(state, values.state);
      if (values.enemies)
        for (const [id, hp] of Object.entries(values.enemies)) {
          const e = world.enemies.find((e) => e.id === id);
          e.hp = hp;
          e.model.root.visible = hp > 0;
        }
      updatePlayerPose(1, true);
      focus.set(p.x, p.y, p.z);
      world.update(1, time, p, camera);
      updateCamera(1);
      updateAim();
    },
    manual: (value) => {
      manual = value;
      keys.clear();
    },
    setInput: (list) => {
      keys.clear();
      list.forEach((k) => keys.add(k));
    },
    aimAt: (x, z, y = p.y + 2) => {
      const v = project(x, y, z);
      pointer.set((v.x / innerWidth) * 2 - 1, 1 - (v.y / innerHeight) * 2);
      updateAim();
      return v;
    },
    look: (yaw, pitch) => {
      follow.yaw = yaw;
      follow.pitch = clamp(pitch, -0.65, 0.95);
      updateCamera(1);
      updateAim();
    },
    project: (x, z, y = 0) => project(x, y, z),
    fire,
    interact,
    respawn,
    save,
    toggleFlotation: () =>
      toggleFlotation(p, (x, z) => !!foldedSupport(x, z, p.y, false, world.lifts)),
    pixel: () => {
      renderer.render(scene, camera);
      return $('game').toDataURL();
    },
  };
}

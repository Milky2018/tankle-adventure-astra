import * as T from 'three';
import { C } from './world.js';
import { clamp } from './mechanics.js';

export const DEATH_HOLD = 2.5;
const OPEN_TIME = 0.45;

// A held wreck and a six-sided maintenance iris bridge death and reconstruction.
// Gameplay stays stopped; this view has its own presentation clock.
export function createPlayerDeath({ model, scene, hullMaterials, project, burst, ripple }) {
  const smoke = new T.Group();
  smoke.name = 'player-death-smoke';
  smoke.visible = false;
  scene.add(smoke);
  const geometry = new T.SphereGeometry(1, 7, 5);
  for (let i = 0; i < 8; i++) {
    const material = new T.MeshBasicMaterial({
      color: 0x485450,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    smoke.add(new T.Mesh(geometry, material));
  }
  const ns = 'http://www.w3.org/2000/svg';
  const iris = document.createElementNS(ns, 'svg');
  iris.id = 'death-iris';
  iris.setAttribute('aria-hidden', 'true');
  Object.assign(iris.style, {
    position: 'fixed',
    inset: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: '40',
    display: 'none',
  });
  const shutter = document.createElementNS(ns, 'path');
  shutter.setAttribute('fill', '#091213');
  shutter.setAttribute('fill-rule', 'evenodd');
  shutter.setAttribute('stroke', '#8ba99b');
  shutter.setAttribute('stroke-width', '3');
  iris.append(shutter);
  document.body.append(iris);
  const dark = new T.Color(0x24302e),
    orange = new T.Color(C.orange);
  const rest = {
    body: model.body.rotation.clone(),
    turret: model.turret.position.clone(),
    tilt: model.turret.rotation.z,
  };
  let origin,
    barrelPitch = 0,
    opening = OPEN_TIME;
  const ease = (t) => {
    t = clamp(t, 0, 1);
    return t * t * (3 - 2 * t);
  };
  function aperture(fraction) {
    iris.style.display = fraction >= 1 ? 'none' : 'block';
    const w = innerWidth,
      h = innerHeight;
    iris.setAttribute('viewBox', `0 0 ${w} ${h}`);
    const center = project(model.root.position.x, model.root.position.y + 1, model.root.position.z);
    const x = clamp(center.x, 0, w),
      y = clamp(center.y, 0, h);
    const radius = Math.hypot(w, h) * 1.2 * fraction;
    const points = Array.from({ length: 6 }, (_, i) => {
      const angle = (i * Math.PI) / 3;
      return `${x + Math.cos(angle) * radius},${y + Math.sin(angle) * radius}`;
    });
    shutter.setAttribute('d', `M0,0H${w}V${h}H0Z M${points.join('L')}Z`);
  }
  function begin() {
    origin = model.root.position.clone();
    barrelPitch = model.barrel.rotation.x;
    smoke.visible = true;
    burst(origin.clone().add(new T.Vector3(0, 1.5, 0)), C.orange, 22);
    ripple(origin, 3.8, C.orange, 0.55, 0.5);
  }
  function update(age) {
    const settle = ease(age / 0.65);
    model.body.rotation.z = rest.body.z + settle * 0.09;
    model.body.rotation.x = rest.body.x + Math.sin(age * 24) * Math.exp(-age * 7) * 0.09;
    model.turret.position.y = rest.turret.y - settle * 0.4;
    model.turret.rotation.z = rest.tilt - settle * 0.16;
    model.barrel.rotation.x = T.MathUtils.lerp(barrelPitch, 0.5, settle);
    for (const { m, color } of hullMaterials) m.color.copy(color).lerp(dark, settle * 0.6);
    for (const light of model.headlights) light.material.color.copy(dark);
    model.radiator.material.color.copy(orange).lerp(dark, ease(age / 1.2));
    smoke.children.forEach((puff, i) => {
      const t = age - i * 0.15;
      puff.visible = t >= 0 && t < 2;
      if (!puff.visible) return;
      puff.position
        .copy(origin)
        .add(
          new T.Vector3(
            Math.sin(i * 2.4) * (0.2 + t * 0.4),
            1.3 + t * 1.8,
            -0.35 + Math.cos(i * 2.4) * t * 0.4,
          ),
        );
      puff.scale.setScalar(0.2 + t * 0.65);
      puff.material.opacity = Math.min(1, t * 5) * (1 - t / 2) * 0.5;
    });
    aperture(1 - ease((age - 1.65) / (DEATH_HOLD - 1.65)));
  }
  function reconstruct() {
    model.body.rotation.copy(rest.body);
    model.turret.position.copy(rest.turret);
    model.turret.rotation.z = rest.tilt;
    for (const { m, color } of hullMaterials) m.color.copy(color);
    smoke.visible = false;
    opening = 0;
    aperture(0);
  }
  function reveal(dt) {
    if (opening >= OPEN_TIME) return;
    opening = Math.min(OPEN_TIME, opening + dt);
    aperture(ease(opening / OPEN_TIME));
  }
  return { begin, update, reconstruct, reveal };
}

import * as T from 'three';
import { regionAt } from '../world/architecture.js';

// Keep indirect light in every room; local lamps provide accents, never visibility.
const palettes = {
  foundry: { sky: 0xc4d4df, ground: 0x827568, key: 0xffd5a4, fill: 0x9cbed8, strength: 2.6 },
  transit: { sky: 0xc3dbe8, ground: 0x75848b, key: 0xe5efff, fill: 0xaacddc, strength: 2.5 },
  garden: { sky: 0xcbe5e3, ground: 0x7d8b69, key: 0xffefd0, fill: 0x9bc9d7, strength: 2.9 },
  testworks: { sky: 0xd7dfe5, ground: 0x858780, key: 0xffe8c3, fill: 0xb1c9e4, strength: 2.7 },
  optics: { sky: 0xbccae6, ground: 0x77778a, key: 0xeee3ff, fill: 0x99bfdd, strength: 2.65 },
  circulation: { sky: 0xbcd8d4, ground: 0x7b786d, key: 0xffd4ad, fill: 0x91c7d3, strength: 2.4 },
  furnace: { sky: 0xc8c6d1, ground: 0x906a52, key: 0xffbb85, fill: 0x9eafcd, strength: 2.25 },
};

export function makeFoldedLighting(scene, rooms) {
  const hemisphere = new T.HemisphereLight(0xc4d4df, 0x827568, 1.25);
  const ambient = new T.AmbientLight(0xe2e7ee, 0.65);
  const sun = new T.DirectionalLight(0xffd5a4, 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = sun.shadow.camera.bottom = -45;
  sun.shadow.camera.right = sun.shadow.camera.top = 45;
  sun.shadow.camera.far = 90;
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0001;
  sun.shadow.normalBias = 0.04;
  const fill = new T.DirectionalLight(0x9cbed8, 0.8);
  fill.position.set(20, 12, -30);
  scene.add(hemisphere, ambient, sun, sun.target, fill);
  const lightOffset = new T.Vector3(-18, 55, 16);
  const backward = lightOffset.clone().normalize();
  const right = new T.Vector3().crossVectors(sun.up, backward).normalize();
  const up = new T.Vector3().crossVectors(backward, right);
  function trackShadows(focus) {
    const camera = sun.shadow.camera;
    const texelX = (camera.right - camera.left) / sun.shadow.mapSize.x;
    const texelY = (camera.top - camera.bottom) / sun.shadow.mapSize.y;
    const center = sun.target.position.copy(focus);
    const x = center.dot(right),
      y = center.dot(up);
    // Anchor the sampling grid in light space, including on ramps and other floors.
    center.addScaledVector(right, Math.round(x / texelX) * texelX - x);
    center.addScaledVector(up, Math.round(y / texelY) * texelY - y);
    sun.position.copy(center).add(lightOffset);
    sun.target.updateMatrixWorld();
  }
  const color = new T.Color();
  let initialized = false;
  function update(p, dt) {
    const palette = palettes[regionAt(p, rooms)];
    const blend = initialized ? 1 - Math.exp(-Math.max(0, dt) * 2) : 1;
    initialized = true;
    hemisphere.color.lerp(color.setHex(palette.sky), blend);
    hemisphere.groundColor.lerp(color.setHex(palette.ground), blend);
    sun.color.lerp(color.setHex(palette.key), blend);
    fill.color.lerp(color.setHex(palette.fill), blend);
    sun.intensity = T.MathUtils.lerp(sun.intensity, palette.strength, blend);
  }
  return { sun, update, trackShadows };
}

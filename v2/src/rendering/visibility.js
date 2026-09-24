import * as T from 'three';

export { SIGNAL } from './palette.js';
export const APERTURE_AIM_THRESHOLD = 0.45;
export const STRUCTURE_APERTURE_RADIUS = 36;
const CAMERA_APERTURE = { inner: 1.5, outer: 2, eyeInner: 0.12, eyeOuter: 0.2 };
const direction = new T.Vector3(28, 39.6, 28).normalize();
const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// The camera aperture is continuous across meshes; a point's opacity never depends on a tile ID.
export function supportProtection(point, patches = []) {
  let protection = 0;
  for (const d of patches) {
    if (
      point.x < d.x - 0.02 ||
      point.x > d.x + d.w + 0.02 ||
      point.z < d.z - 0.02 ||
      point.z > d.z + d.d + 0.02
    )
      continue;
    const height = d.y + (d.rise || 0) * Math.max(0, Math.min(1, (point.z - d.z) / d.d));
    protection = Math.max(protection, 1 - smooth(0.12, 0.3, Math.abs(point.y - height)));
  }
  return protection;
}
export function apertureOpacity(
  point,
  player,
  viewDirection = direction,
  outerRadius = 13,
  patches = [],
) {
  const x = point.x - player.x,
    y = point.y - player.y - 1.3,
    z = point.z - player.z;
  const along = x * viewDirection.x + y * viewDirection.y + z * viewDirection.z;
  const radius = Math.hypot(
    x - along * viewDirection.x,
    y - along * viewDirection.y,
    z - along * viewDirection.z,
  );
  const aperture =
    (1 - smooth((outerRadius * 5) / 13, outerRadius, radius)) *
    smooth(1.5, 3.5, y) *
    (1 - smooth(55, 62, along));
  return 1 - 0.84 * aperture * (1 - supportProtection(point, patches));
}

// Perspective sightlines converge at the eye; a fixed-width tunnel fades unrelated surfaces.
export function cameraApertureOpacity(point, p, camera, patches = []) {
  const dx = camera.x - p.x,
    dy = camera.y - p.y - 1.6,
    dz = camera.z - p.z,
    l2 = dx * dx + dy * dy + dz * dz;
  const x = point.x - p.x,
    y = point.y - p.y - 1.6,
    z = point.z - p.z,
    t = (x * dx + y * dy + z * dz) / Math.max(0.001, l2);
  const r = Math.hypot(x - dx * t, y - dy * t, z - dz * t);
  const scale = Math.max(0, Math.min(1, 1 - t)),
    a = CAMERA_APERTURE;
  return (
    1 -
    0.84 *
      (1 - smooth(a.eyeInner + a.inner * scale, a.eyeOuter + a.outer * scale, r)) *
      smooth(0, 0.02, t) *
      (1 - smooth(0.99, 1, t)) *
      smooth(0.2, 1.4, point.y - p.y) *
      (1 - supportProtection(point, patches))
  );
}

export function makeAperture() {
  const player = { value: new T.Vector3() },
    enabled = { value: 1 },
    viewDirection = { value: direction.clone() },
    camera = { value: new T.Vector3() },
    mode = { value: 0 },
    combatFocus = { value: 0 };
  const supportBounds = { value: Array.from({ length: 4 }, () => new T.Vector4()) },
    supportPlanes = { value: Array.from({ length: 4 }, () => new T.Vector4()) };
  function apply(
    material,
    { depthOnly = false, radius = 13, cameraOnly = false, terrain = false } = {},
  ) {
    if (material.userData.aperture) return;
    material.userData.aperture = true;
    const compile = material.onBeforeCompile,
      cacheKey = material.customProgramCacheKey();
    material.onBeforeCompile = (shader, renderer) => {
      compile.call(material, shader, renderer);
      shader.uniforms.supportBounds = supportBounds;
      shader.uniforms.supportPlanes = supportPlanes;
      shader.uniforms.apertureCombatFocus = combatFocus;
      shader.uniforms.apertureCamera = camera;
      shader.uniforms.apertureMode = mode;
      shader.uniforms.aperturePlayer = player;
      shader.uniforms.apertureEnabled = enabled;
      shader.uniforms.apertureDirection = viewDirection;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 apertureWorld;')
        .replace(
          '#include <project_vertex>',
          `#include <project_vertex>
        vec4 aperturePosition = vec4(transformed, 1.0);
        #ifdef USE_BATCHING
          aperturePosition = batchingMatrix * aperturePosition;
        #endif
        #ifdef USE_INSTANCING
          aperturePosition = instanceMatrix * aperturePosition;
        #endif
        apertureWorld = (modelMatrix * aperturePosition).xyz;
      `,
        );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        '#include <common>\nuniform vec4 supportBounds[4];\nuniform vec4 supportPlanes[4];\nuniform float apertureCombatFocus;\nuniform vec3 apertureCamera;\nuniform float apertureMode;\nuniform vec3 aperturePlayer;\nuniform float apertureEnabled;\nuniform vec3 apertureDirection;\nvarying vec3 apertureWorld;',
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <opaque_fragment>',
        `
        vec3 apertureDelta = apertureWorld - aperturePlayer - vec3(0.0, 1.3, 0.0);
        float apertureAlong = dot(apertureDelta, apertureDirection);
        float apertureRadius = length(apertureDelta - apertureDirection * apertureAlong);
        float apertureCut = (1.0 - smoothstep(${((radius * 5) / 13).toFixed(4)}, ${radius.toFixed(4)}, apertureRadius)) * smoothstep(1.5, 3.5, apertureDelta.y) * (1.0 - smoothstep(55.0, 62.0, apertureAlong));
        vec3 eyeDelta = apertureCamera - aperturePlayer - vec3(0.0, 1.6, 0.0);
        vec3 pointDelta = apertureWorld - aperturePlayer - vec3(0.0, 1.6, 0.0);
        float eyeT = dot(pointDelta,eyeDelta) / max(0.001,dot(eyeDelta,eyeDelta));
        float eyeRadius = length(pointDelta-eyeDelta*eyeT);
        float eyeScale = clamp(1.0-eyeT,0.0,1.0);
        float eyeCut = (1.0-smoothstep(${CAMERA_APERTURE.eyeInner.toFixed(2)}+${CAMERA_APERTURE.inner.toFixed(2)}*eyeScale,${CAMERA_APERTURE.eyeOuter.toFixed(2)}+${CAMERA_APERTURE.outer.toFixed(2)}*eyeScale,eyeRadius))*smoothstep(0.0,0.02,eyeT)*(1.0-smoothstep(0.99,1.0,eyeT))*smoothstep(0.2,1.4,apertureWorld.y-aperturePlayer.y);
        float cut = mix(${cameraOnly ? '0.0' : 'apertureCut'},eyeCut,apertureMode);
        ${
          terrain
            ? `float supportKeep = 0.0;
        for (int i = 0; i < 4; i++) {
          vec4 b = supportBounds[i], plane = supportPlanes[i];
          float within = step(b.x-0.02,apertureWorld.x)*step(apertureWorld.x,b.z+0.02)*step(b.y-0.02,apertureWorld.z)*step(apertureWorld.z,b.w+0.02);
          float height = plane.x + plane.y * clamp(apertureWorld.z-b.y,0.0,b.w-b.y);
          supportKeep = max(supportKeep,within*plane.z*(1.0-smoothstep(0.12,0.3,abs(apertureWorld.y-height))));
        }
        cut *= 1.0-supportKeep;`
            : ''
        }
        diffuseColor.a *= 1.0 - 0.84 * cut * apertureEnabled;
        ${depthOnly ? 'if (diffuseColor.a < 0.999) discard;' : ''}
        ${depthOnly ? '' : 'outgoingLight *= 1.0 - apertureCombatFocus * 0.6 * smoothstep(3.0, 8.0, abs(apertureWorld.y-aperturePlayer.y));'}
        ${depthOnly ? '' : 'outgoingLight *= mix(1.0, 0.42, smoothstep(3.0, 12.0, abs(apertureWorld.y - aperturePlayer.y)) * apertureEnabled * (1.0-apertureMode));'}
        #include <opaque_fragment>
      `,
      );
    };
    material.customProgramCacheKey = () =>
      `${cacheKey}/folded-continuous-aperture-v12-${terrain}-${cameraOnly}-${radius}-${depthOnly ? 'depth' : 'color'}`;
  }
  return {
    apply,
    support: (patches) => {
      for (let i = 0; i < 4; i++) {
        const d = patches[i];
        if (d) {
          supportBounds.value[i].set(d.x, d.z, d.x + d.w, d.z + d.d);
          supportPlanes.value[i].set(d.y, (d.rise || 0) / d.d, 1, 0);
        } else supportPlanes.value[i].z = 0;
      }
    },
    setCamera: (p, c) => {
      player.value.set(p.x, p.y, p.z);
      camera.value.copy(c);
    },
    setView: (third) => {
      mode.value = third ? 1 : 0;
    },
    update: (p, d = direction, focus = 0) => {
      combatFocus.value = focus;
      player.value.set(p.x, p.y, p.z);
      viewDirection.value.copy(d);
    },
    enable: (value) => {
      enabled.value = value ? 1 : 0;
    },
  };
}

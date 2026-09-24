import { Sphere, Vector3 } from 'three';

// Fog is complete before the player-centered render boundary.
export const DEFAULT_VIEW_DISTANCE = { fogNear: 200, fogFar: 220, renderDistance: 230 };

export function setViewDistance(scene, camera, settings = DEFAULT_VIEW_DISTANCE, player = new Vector3()) {
  const { fogNear: near, fogFar: far, renderDistance } = settings;
  scene.fog.color.setHex(0xffffff);
  scene.background = scene.fog.color;
  scene.fog.near = near;
  scene.fog.far = far;
  // Enclose the player's entire sphere, including cameras behind or above the tank.
  const clip = renderDistance + camera.position.distanceTo(player);
  if (camera.far !== clip) {
    camera.far = clip;
    camera.updateProjectionMatrix();
  }
}

export function makePlayerHaze(scene, player, settings) {
  const center = { value: new Vector3() }, limit = { value: settings.renderDistance };
  const materials = new WeakSet(), objects = new WeakSet(), batches = new Set(), hidden = [];
  const sphere = new Sphere(), shadowLights = new Set();
  function apply(material) {
    if (!material.fog || materials.has(material)) return;
    materials.add(material);
    const compile = material.onBeforeCompile, cacheKey = material.customProgramCacheKey();
    material.onBeforeCompile = function(shader, renderer) {
      compile.call(this, shader, renderer);
      shader.uniforms.playerFogCenter = center;
      shader.uniforms.playerRenderDistance = limit;
      shader.vertexShader = shader.vertexShader
        .replace('#include <fog_pars_vertex>', '#ifdef USE_FOG\nvarying vec3 playerFogWorld;\n#endif')
        .replace('#include <fog_vertex>', `
          #ifdef USE_FOG
            vec4 fogPosition = vec4(transformed, 1.0);
            #ifdef USE_BATCHING
              fogPosition = batchingMatrix * fogPosition;
            #endif
            #ifdef USE_INSTANCING
              fogPosition = instanceMatrix * fogPosition;
            #endif
            playerFogWorld = (modelMatrix * fogPosition).xyz;
          #endif
        `);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <fog_pars_fragment>', `
          #ifdef USE_FOG
            varying vec3 playerFogWorld;
            uniform vec3 playerFogCenter;
            uniform vec3 fogColor;
            uniform float fogNear, fogFar, playerRenderDistance;
          #endif
        `)
        .replace('#include <fog_fragment>', `
          #ifdef USE_FOG
            float playerDistance = distance(playerFogWorld, playerFogCenter);
            if (playerDistance > playerRenderDistance) discard;
            gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, smoothstep(fogNear, fogFar, playerDistance));
          #endif
        `);
    };
    material.customProgramCacheKey = () => `${cacheKey}/player-fog-v1`;
    material.needsUpdate = true;
  }
  function watch(object) {
    if (object.shadow) shadowLights.add(object);
    if (object.material && object.name.startsWith('static/')) batches.add(object);
    if (objects.has(object)) {
      for (const child of object.children) watch(child);
      return;
    }
    objects.add(object);
    if (object.material) {
      // Materials may be replaced or receive aperture shaders after the mesh is added.
      const before = object.onBeforeRender;
      object.onBeforeRender = function(renderer, scene, camera, geometry, material, group) {
        apply(material);
        before.call(this, renderer, scene, camera, geometry, material, group);
      };
    }
    object.addEventListener('childadded', event => watch(event.child));
    object.addEventListener('childremoved', event => untrack(event.child));
    for (const child of object.children) watch(child);
  }
  function untrack(object) {
    shadowLights.delete(object);
    batches.delete(object);
    for (const child of object.children) untrack(child);
  }
  watch(scene);
  const before = scene.onBeforeRender, after = scene.onAfterRender;
  scene.onBeforeRender = function(...args) {
    before.apply(this, args);
    center.value.set(player.x, player.y, player.z);
    limit.value = settings.renderDistance;
    const shadows = [];
    for (const light of shadowLights) if (light.castShadow) {
      light.shadow.updateMatrices(light);
      shadows.push(light.shadow.getFrustum());
    }
    for (const mesh of batches) {
      if (!mesh.visible) continue;
      const bounds = mesh.boundingSphere ?? mesh.geometry.boundingSphere;
      if (!bounds) continue;
      sphere.copy(bounds).applyMatrix4(mesh.matrixWorld);
      if (sphere.center.distanceTo(center.value) > limit.value + sphere.radius) {
        // An unseen wall can still cast a visible shadow near the boundary.
        if (mesh.castShadow && shadows.some(frustum => frustum.intersectsSphere(sphere))) continue;
        mesh.visible = false;
        hidden.push(mesh);
      }
    }
  };
  scene.onAfterRender = function(...args) {
    for (const mesh of hidden) mesh.visible = true;
    hidden.length = 0;
    after.apply(this, args);
  };
}

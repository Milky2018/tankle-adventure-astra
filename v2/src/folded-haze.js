// Fog finishes before the clip plane; changing either distance keeps that margin.
export const DEFAULT_VIEW_DISTANCE = { fogNear: 40, fogFar: 100, renderDistance: 130 };

export function setViewDistance(scene, camera, settings = DEFAULT_VIEW_DISTANCE) {
  const { fogNear: near, fogFar: far, renderDistance: clip } = settings;
  scene.fog.color.setHex(0xffffff);
  scene.background = scene.fog.color;
  scene.fog.near = near;
  scene.fog.far = far;
  if (camera.far !== clip) {
    camera.far = clip;
    camera.updateProjectionMatrix();
  }
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { Scene, Fog, PerspectiveCamera, OrthographicCamera } from 'three';
import { DEFAULT_VIEW_DISTANCE, setViewDistance } from './folded-haze.js';
import { FollowCamera } from './folded-camera.js';

test('every view fully obscures geometry before its clipping plane, including camera switches', () => {
  const scene = new Scene();
  scene.fog = new Fog(0x1b3032, 65, 105);
  const cameras = {
    third: new FollowCamera(16 / 9).camera,
    overhead: new OrthographicCamera(-30, 30, 17, -17, 0.1, 160),
    ending: new PerspectiveCamera(55, 16 / 9, 0.15, 160),
  };
  for (const view of ['third', 'overhead', 'third', 'ending', 'overhead']) {
    const camera = cameras[view];
    setViewDistance(scene, camera);
    assert.ok(scene.fog.near < scene.fog.far);
    assert.ok(camera.far - scene.fog.far >= 30, view);
    assert.equal(camera.far, DEFAULT_VIEW_DISTANCE.renderDistance);
    const c = camera.clone();
    c.updateProjectionMatrix();
    assert.deepEqual(camera.projectionMatrix.elements, c.projectionMatrix.elements);
  }
});

test('custom fog distances move the clip plane beyond complete fog in both views', () => {
  const scene = new Scene();
  scene.fog = new Fog(0, 40, 100);
  for (const view of ['third', 'overhead']) {
    const camera = view === 'third' ? new PerspectiveCamera() : new OrthographicCamera();
    for (const [fogNear, fogFar] of [
      [10, 30],
      [75, 120],
      [190, 200],
    ]) {
      setViewDistance(scene, camera, { fogNear, fogFar, renderDistance: fogFar + 20 });
      assert.equal(scene.fog.near, fogNear);
      assert.equal(scene.fog.far, fogFar);
      assert.equal(camera.far, fogFar + 20);
      const updated = camera.clone();
      updated.updateProjectionMatrix();
      assert.deepEqual(camera.projectionMatrix.elements, updated.projectionMatrix.elements);
    }
  }
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { tankModel } from './world.js';

test('rolling keeps both rows of wheel axles fixed through hull turns', () => {
  const model = tankModel();
  for (const heading of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    model.body.rotation.y = heading;
    model.root.updateMatrixWorld(true);
    const axles = model.tracks.map(wheel => new Vector3(0, 1, 0).transformDirection(wheel.matrixWorld));
    model.rollWheels(0.2);
    model.root.updateMatrixWorld(true);
    for (const [i, wheel] of model.tracks.entries()) {
      const axle = new Vector3(0, 1, 0).transformDirection(wheel.matrixWorld);
      assert(axle.distanceTo(axles[i]) < 1e-10, 'the axle must not yaw when the wheel rolls');
    }
  }
});

test('wheel contact points roll opposite forward travel, and reverse for backward travel', () => {
  for (const heading of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    for (const direction of [1, -1]) {
      const model = tankModel();
      model.body.rotation.y = heading;
      model.root.updateMatrixWorld(true);
      const before = model.tracks.map(wheel => wheel.localToWorld(new Vector3(-0.3, 0, 0)));
      model.rollWheels(direction * 0.01);
      model.root.updateMatrixWorld(true);
      const travel = new Vector3(Math.sin(heading), 0, Math.cos(heading)).multiplyScalar(direction);
      for (const [i, wheel] of model.tracks.entries()) {
        const movement = wheel.localToWorld(new Vector3(-0.3, 0, 0)).sub(before[i]);
        assert(movement.dot(travel) < -0.0029, 'the bottom of each wheel must move against travel');
      }
    }
  }
});

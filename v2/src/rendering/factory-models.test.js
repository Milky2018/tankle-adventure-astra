import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { tankModel } from './factory-models.js';

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

test('charge telegraphs cover the swept body, including start and end caps', async () => {
  const { chargeWarning } = await import('./factory-models.js');
  const { CHARGE } = await import('../player/mechanics.js');
  for (const type of ['scout', 'elite']) {
    const { root, shape } = chargeWarning(type);
    root.updateMatrixWorld(true);
    shape.geometry.computeBoundingBox();
    const bounds = shape.geometry.boundingBox.clone().applyMatrix4(shape.matrixWorld);
    const { radius, speed, duration } = CHARGE[type];
    assert(bounds.min.x <= -radius + 1e-5 && bounds.max.x >= radius - 1e-5);
    assert(bounds.min.z <= -radius + 1e-5 && bounds.max.z >= speed * duration + radius - 1e-5);
    // The previously invisible Scout hit at 1.6 units must overlap the painted area.
    if (type === 'scout') assert(bounds.max.x > 1.6 - 0.8);
  }
});

test('each factory enemy constructs and animates through its encounter states', () => {
  for (const type of ['scout', 'turret', 'guard', 'elite', 'boss']) {
    const model = tankModel(type);
    for (const state of ['idle', 'warn', 'charge', 'vent', 'idle']) {
      model.animate(state, 0.4, 1, 1 / 60, true);
      model.rollWheels(0.3);
      model.root.updateMatrixWorld(true);
      model.root.traverse(object => assert(object.matrixWorld.elements.every(Number.isFinite), `${type}: ${state}`));
    }
    if (type === 'guard') assert(model.frontArmor.material !== tankModel('guard').frontArmor.material, 'armour impact light must not leak to another guard');
  }
});

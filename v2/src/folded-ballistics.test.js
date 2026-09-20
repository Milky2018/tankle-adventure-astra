import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3, Ray, Box3 } from 'three';
import { predictMortar, mortarPosition, mortarGroundTarget } from './folded-ballistics.js';
import { MORTAR } from './abilities.js';

test('mortar landing prediction agrees with flight, including a ceiling before the aimed floor', () => {
  const origin = new Vector3(0,2,0), target = new Vector3(0,0,20);
  const floor = new Box3(new Vector3(-100,-1,-100),new Vector3(100,0,100));
  const clear = predictMortar(origin,target,(start,dir,range)=>{
    const point = new Ray(start,dir).intersectBox(floor,new Vector3());
    return point&&point.distanceTo(start)<=range?{point,distance:point.distanceTo(start)}:null;
  });
  assert.ok(clear.hit);
  assert.ok(clear.point.distanceTo(target)<.01);
  const ceiling = new Box3(new Vector3(-5,6,-2),new Vector3(5,7,30));
  const cast=(start,dir,range)=>{
    const point = new Ray(start,dir).intersectBox(ceiling,new Vector3());
    return point&&point.distanceTo(start)<=range?{point,distance:point.distanceTo(start)}:null;
  };
  const predicted=predictMortar(origin,target,cast);
  let previous=origin, actual;
  for(let age=1/60;age<=MORTAR.duration+.02;age+=1/60){
    const point=mortarPosition(origin,target,age),delta=point.clone().sub(previous),hit=cast(previous,delta.clone().normalize(),delta.length());
    if(hit){actual=hit.point;break;}previous=point;
  }
  assert.ok(predicted.obstructed);
  assert.ok(actual.distanceTo(predicted.point)<.04);
  assert.ok(predicted.point.distanceTo(target)>10);
});


test('both mortar arcs clear tall mid-lane machinery below an indoor roof', async () => {
  const { BARRAGE } = await import('./folded-attacks.js');
  const origin=new Vector3(0,2,0), target=new Vector3(0,.05,24);
  const cover=new Box3(new Vector3(-3,0,9),new Vector3(3,8.5,15));
  const roof=new Box3(new Vector3(-10,16,-5),new Vector3(10,17,30));
  for(const [duration,height] of [[MORTAR.duration,MORTAR.height],[BARRAGE.duration,BARRAGE.height]]) {
    let previous=origin;
    for(let i=1;i<=240;i++){
      const next=mortarPosition(origin,target,duration*i/240,duration,height);
      const ray=new Ray(previous,next.clone().sub(previous).normalize());
      for(const box of [cover,roof]){
        const hit=ray.intersectBox(box,new Vector3());
        assert.ok(!hit||hit.distanceTo(previous)>next.distanceTo(previous),'Shell intercepted');
      }
      previous=next;
    }
    assert.ok(previous.distanceTo(target)<1e-9);
  }
});


test('mortar prediction continues to a lower floor and makes no impact promise in empty space', () => {
  const origin = new Vector3(0, 2, 0), target = new Vector3(0, 0, 20);
  const floor = new Box3(new Vector3(-100, -11, -100), new Vector3(100, -10, 100));
  const cast = (start, dir, range) => {
    const point = new Ray(start, dir).intersectBox(floor, new Vector3());
    return point && point.distanceTo(start) <= range ? { point, distance: point.distanceTo(start) } : null;
  };
  const predicted = predictMortar(origin, target, cast);
  assert.ok(predicted.hit);
  assert.equal(predicted.point.y, -10);
  assert.ok(predicted.point.z > target.z);
  let previous = origin, actual;
  for (let age = 1 / 120; age < 4; age += 1 / 120) {
    const next = mortarPosition(origin, target, age), delta = next.clone().sub(previous);
    const hit = cast(previous, delta.clone().normalize(), delta.length());
    if (hit) { actual = hit.point; break; }
    previous = next;
  }
  assert.ok(actual.distanceTo(predicted.point) < .02);
  const empty = predictMortar(origin, target, () => null);
  assert.equal(empty.hit, undefined);
  assert.ok(empty.point.y < -100);
});

test('mortar launch intent uses ground below a target, with a frozen point after launch', () => {
  const aim = new Vector3(3, 1.2, 10), surface = new Vector3(3, 0, 10);
  const target = mortarGroundTarget(aim, (start, direction, range) => {
    assert.ok(start.y > aim.y && direction.y === -1 && range > 100);
    return { point: surface };
  });
  assert.deepEqual(target.toArray(), [3, 0, 10]);
  surface.y = -10;
  assert.equal(target.y, 0);
  assert.equal(aim.y, 1.2);
});

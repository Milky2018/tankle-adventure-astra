import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3, Ray, Box3 } from 'three';
import { predictMortar, mortarPosition } from './folded-ballistics.js';
import { MORTAR } from './abilities.js';

test('mortar landing prediction agrees with flight, including a ceiling before the aimed floor', () => {
  const origin = new Vector3(0,2,0), target = new Vector3(0,0,20);
  const clear = predictMortar(origin,target,()=>null);
  assert.ok(clear.point.distanceTo(target)<1e-9);
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

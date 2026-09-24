import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3,Ray,Plane,Sphere} from 'three';
import {traceFoldedLaser} from './laser.js';

const v=(x,y,z)=>new Vector3(x,y,z);
function castScene(objects){
  return (origin,direction,range)=>{
    const ray=new Ray(origin,direction);let hit=null;
    for(const object of objects){
      const point=object.shape instanceof Plane?ray.intersectPlane(object.shape,v()):ray.intersectSphere(object.shape,v());
      if(!point)continue;const distance=point.distanceTo(origin);
      if(distance>.001&&distance<=range&&(!hit||distance<hit.distance))hit={...object,point,distance};
    }
    return hit;
  };
}
test('preview traces a physical reflection without operating or damaging its target',()=>{
  const normal=v(-1,0,1).normalize(),mirror={normal,flash:0},target={id:'receiver',hp:4,open:false};
  const cast=castScene([{shape:new Plane(normal,0),mirror},{shape:new Sphere(v(8,2,0),1.8),target}]);
  const start=v(0,2,-10),direction=v(0,0,1),path=traceFoldedLaser(start,direction,cast);
  assert.equal(path.length,2);assert.equal(path[0].hit.mirror,mirror);assert.equal(path[1].hit.target,target);
  assert.deepEqual(start.toArray(),[0,2,-10]);assert.deepEqual(direction.toArray(),[0,0,1]);
  assert.deepEqual(target,{id:'receiver',hp:4,open:false});assert.equal(mirror.flash,0);
  assert.deepEqual(traceFoldedLaser(start,direction,cast),path,'preview and fire use the same deterministic path');
});
test('walls, nearer bodies and refuge boundaries stop the preview before a receiver',()=>{
  for(const blocker of [{wall:true},{target:{id:'guard'}},{refuge:true}]){
    const cast=castScene([{shape:new Plane(v(0,0,1),-2),...blocker},{shape:new Sphere(v(0,0,8),1),target:{id:'receiver'}}]);
    const path=traceFoldedLaser(v(0,0,0),v(0,0,1),cast);
    assert.equal(path.length,1);assert.equal(path[0].end.z,2);assert.notEqual(path[0].hit.target?.id,'receiver');
  }
});
test('a reflective enemy uses its facing and cannot consume unlimited bounces or range',()=>{
  const target={mirror:true,x:0,z:0,aim:0,hp:5};
  const cast=castScene([{shape:new Sphere(v(0,0,0),1),target}]);
  const path=traceFoldedLaser(v(0,0,5),v(0,0,-1),cast,{range:10});
  assert.equal(path.length,2);assert.equal(path[0].reflected,true);assert.ok(Math.abs(path[1].end.z-7)<1e-8);
  const rear=traceFoldedLaser(v(0,0,-5),v(0,0,1),cast);assert.equal(rear.length,1);assert.equal(rear[0].reflected,undefined);
  const bounded=traceFoldedLaser(v(0,0,5),v(0,0,-1),cast,{bounces:0});assert.equal(bounded.length,1);assert.equal(bounded[0].reflected,true);
  assert.equal(target.hp,5);
});

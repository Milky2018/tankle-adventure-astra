import test from 'node:test';
import {Vector3,Ray,Box3} from 'three';
import {foldedArchitecture} from './folded-layout.js';
import assert from 'node:assert/strict';
import {ENDING_DURATION,endingShot,finaleState} from './folded-finale.js';
import {conveyorVelocity} from './folded-machinery.js';

test('renewal waits for coupling and the opening machine wakes only in its closing shot',()=>{
 assert.deepEqual(finaleState(0),{power:0,wake:0,travel:0});
 assert.deepEqual(finaleState(1,true),{power:0,wake:0,travel:0});
 assert.equal(finaleState(8).power,1);
 assert.equal(finaleState(20).wake,0);assert.equal(finaleState(23).travel,0);
 assert.deepEqual(finaleState(ENDING_DURATION),{power:1,wake:1,travel:1});
 assert.deepEqual(finaleState(0,true),finaleState(ENDING_DURATION));
 assert.equal(endingShot(0).id,'coupling');assert.equal(endingShot(10).id,'rail');
 assert.equal(endingShot(17).id,'garden');assert.equal(endingShot(24).id,'awakening');
});
test('a dead keeper cannot restart feed belts after parts reset on reload',()=>{
 const keeper={id:'keeper',hp:30,parts:[{hp:6},{hp:6}]},left={x:-19,y:-56,z:40},right={x:19,y:-56,z:40};
 assert.equal(conveyorVelocity(left,[keeper]).z,-3.2);
 keeper.parts[0].hp=0;assert.equal(conveyorVelocity(left,[keeper]).z,0);
 assert.equal(conveyorVelocity(right,[keeper]).z,-3.2);
 keeper.hp=0;keeper.parts[0].hp=6;
 assert.deepEqual(conveyorVelocity(left,[keeper]),{x:0,z:0});assert.deepEqual(conveyorVelocity(right,[keeper]),{x:0,z:0});
});

test('the garden renewal shot sees its water channel without crossing the new room envelope',()=>{
 const shot=endingShot(17),eye=new Vector3(...shot.eye),target=new Vector3(...shot.at),ray=new Ray(eye,target.clone().sub(eye).normalize());
 for(const s of foldedArchitecture.solids){
  const hit=ray.intersectBox(new Box3(new Vector3(s.x,s.y,s.z),new Vector3(s.x+s.w,s.y+s.h,s.z+s.d)),new Vector3());
  assert.ok(!hit||hit.distanceTo(eye)>eye.distanceTo(target),s.id);
 }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {foldedHives,foldedEnemies,initialFoldedState} from './terrain.js';
import {refugeAt,refugeRayDistance,REFUGE_CLEARANCE} from './refuges.js';

const hives=[{id:'refuge',x:0,y:0,z:0}];
test('refuges cover the repair approach without protecting other floors or locked Hives',()=>{
  assert.ok(refugeAt({x:4.5,y:0,z:0},hives,{}));
  assert.equal(refugeAt({x:5.1,y:0,z:0},hives,{}),undefined);
  for(const y of [-8,8])assert.equal(refugeAt({x:0,y,z:0},hives,{}),undefined);
  assert.equal(refugeAt({x:0,y:0,z:0},[{...hives[0],requires:'gate'}],{}),undefined);
});
test('refuge boundaries stop incoming, outgoing and overhead fire without blocking other floors',()=>{
  assert.equal(refugeRayDistance({x:20,y:1.2,z:0},{x:-1,y:0,z:0},30,hives,{}),15);
  assert.equal(refugeRayDistance({x:0,y:2,z:0},{x:1,y:0,z:0},30,hives,{}),5);
  assert.equal(refugeRayDistance({x:0,y:20,z:0},{x:0,y:-1,z:0},30,hives,{}),16);
  assert.equal(refugeRayDistance({x:20,y:8,z:0},{x:-1,y:0,z:0},30,hives,{}),Infinity);
  assert.equal(refugeRayDistance({x:20,y:1,z:0},{x:-1,y:0,z:0},14,hives,{}),Infinity);
});
test('all active save points reserve enemy-free spawn surroundings, including persistent enemies',()=>{
  for(const h of foldedHives){
    const state=initialFoldedState(h.requires?{[h.requires]:true}:{});
    for(const e of foldedEnemies){
      if(e.persistent&&state[e.id]||e.reserveFor&&state[e.reserveFor])continue;
      assert.equal(refugeAt(e,[h],state,REFUGE_CLEARANCE+(e.type==='boss'?3.2:e.guardian?2.4:e.type==='guard'?1.75:1.35)),undefined,`${e.id} crowds ${h.id}`);
    }
  }
});

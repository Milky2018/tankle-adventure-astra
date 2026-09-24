import {settleControl} from '../test-fixtures/settled-control.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { initialFoldedState, moveFolded, foldedSupport, foldedControls } from './folded-layout.js';

function walk(p,state,points){
  for(const [x,z]of points){
    for(let i=0;i<4000&&Math.hypot(p.x-x,p.z-z)>.05;i++){
      const dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz);
      moveFolded(p,dx/d*Math.min(.1,d),dz/d*Math.min(.1,d),state);
    }
    assert.ok(Math.hypot(p.x-x,p.z-z)<.1,`Blocked at ${p.x},${p.y},${p.z} toward ${x},${z}`);
  }
}

test('freight return folds at half height and only one supported route continues to the outer ring',()=>{
  const s=initialFoldedState({freight:true}),p={x:59,y:0,z:-34,speed:1};
  for(let i=0;i<90;i++)moveFolded(p,.1,0,s);
  assert.ok(p.x<62.5,'Return must be opened from behind');
  walk(p,s,[[59,-63],[67,-63]]);assert.equal(p.y,4);
  assert.equal(foldedSupport(67,-76,7.2),null,'A second upper ramp remains');
  walk(p,s,[[67,-34],[70,-34]]);
  assert.ok(settleControl('freight-return','cannon',p,s,[]));
  walk(p,s,[[59,-34],[59,-92]]);assert.equal(p.y,8);
  walk(p,s,[[59,-34],[70,-34]]);assert.equal(p.y,0);
});

test('optical frontal and screened routes both reconnect into the open gallery without a redundant shutter',()=>{
  for(const points of [[[271,-88],[290,-88]],[[290,-62],[290,-88]]]){
    const s=initialFoldedState(),p={x:271,y:24,z:-62,speed:1};
    walk(p,s,points);assert.equal(p.y,24);
    assert.equal(foldedControls.find(c=>c.id==='lens-transfer'),undefined);assert.equal(s['lens-return'],false);
    walk(p,s,[[290,-88],[271,-88],[271,-62]]);
  }
});

test('separator offers an exposed outer route and a sheltered close route without trapping either approach',()=>{
  for(const points of [[[292,186],[325,186],[325,164],[340,164],[340,186]],[[312,143],[312,164],[340,164],[340,186]]]){
    const s=initialFoldedState({'coolant-transfer':true}),p={x:292,y:-24,z:143,speed:1};
    walk(p,s,points);assert.equal(p.y,-24);assert.equal(s['coolant-return'],false);
    walk(p,s,[...points.slice(0,-1)].reverse());walk(p,s,[[292,143]]);
  }
});

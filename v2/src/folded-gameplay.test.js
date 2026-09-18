import test from 'node:test';
import assert from 'node:assert/strict';
import {newPlayer,updateHeat,shootHeat} from './mechanics.js';
import {cityBelts} from './folded-city-layout.js';
import {conveyorVelocity,moveWithConveyor} from './folded-machinery.js';
import {initialFoldedState,deckHeight} from './folded-layout.js';

const cool=(p,seconds)=>{for(let i=0;i<seconds*120;i++)updateHeat(p,1/120,(i+1)/120,false,false);};

test('overheat recovery returns control with a usable heat reserve while ordinary cooling continues',()=>{
 const p={...newPlayer(),heat:100,overheated:true,lastHeat:0};cool(p,2.2);
 assert.equal(p.overheated,false);assert.ok(p.heat>10&&p.heat<=30);
 assert.equal(shootHeat(p,2.2),true);
});

test('mastered thermal conveyors carry both enemies and the player toward their exit after reload',()=>{
 for(const [id,flag]of [['return','pressure-return'],['inner','inner-transit']]){
  const b=cityBelts.find(b=>b.id===id),body={x:b.x+b.w/2,z:b.z+b.d/2,y:deckHeight(b,b.z+b.d/2)};
  assert.ok(conveyorVelocity(body,[],{}).z>0);
  const restored=initialFoldedState({[flag]:true});assert.ok(conveyorVelocity(body,[],restored).z<0);
  for(const hp of [50,2,0]){const rider={...body,hp,speed:1};moveWithConveyor(rider,0,0,.1,restored);assert.ok(rider.z<body.z);}
  const returning={...body,speed:1};moveWithConveyor(returning,0,.7,.1,restored);assert.ok(returning.z>body.z,'ordinary return movement stays possible');
 }
});

test('shorter thermal trials still reject a cold Phoenix across repeated cooling attempts',()=>{
 for(const id of ['return','inner']){
  const b=cityBelts.find(b=>b.id===id),s=initialFoldedState({'inner-optics':true});
  const p={...newPlayer(),x:b.x+6,z:b.z+b.d-.95,y:deckHeight(b,b.z+b.d-.95),overdrive:true,phoenix:true,speed:3.2};
  let farthest=p.z;
  for(let i=0;i<120*90;i++){
   updateHeat(p,1/120,i/120,!p.overheated,true);moveWithConveyor(p,0,-7*p.speed/120,1/120,s);farthest=Math.min(farthest,p.z);
  }
  assert.ok(farthest>b.z+2,`${id}: cold engine crossed at ${farthest}`);
  const hot={...newPlayer(),x:b.x+6,z:b.z+b.d-.95,y:deckHeight(b,b.z+b.d-.95),overdrive:true,phoenix:true,circulation:true,speed:3.2};
  let seconds=0;while(hot.z>b.z-1&&seconds<15){seconds+=1/120;updateHeat(hot,1/120,seconds,true,true);moveWithConveyor(hot,0,-7*hot.speed/120,1/120,s);}
  assert.ok(seconds<10,`${id}: trial took ${seconds}s`);assert.equal(hot.overheated,true);
 }
});

test('pulsing a cold engine cannot turn either thermal gate into a repeatable gain',()=>{
 const state=initialFoldedState({'inner-optics':true});
 for(const b of cityBelts.filter(b=>['return','inner'].includes(b.id)))for(const on of [.5,2,4,6])for(const off of [.5,1,2,3]){
  const p={...newPlayer(),x:b.x+6,z:b.z+b.d-.95,y:deckHeight(b,b.z+b.d-.95),overdrive:true,phoenix:true,speed:3.2};
  let farthest=p.z;
  for(let i=0;i<60*60;i++){
   const t=i/60;updateHeat(p,1/60,t,t%(on+off)<on,true);moveWithConveyor(p,0,-7*p.speed/60,1/60,state);farthest=Math.min(farthest,p.z);
  }
  assert.ok(farthest>b.z+2,`${on}s boost / ${off}s cooling bypassed the gate`);
 }
});

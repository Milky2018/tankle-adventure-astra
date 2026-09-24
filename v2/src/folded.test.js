import {settleControl} from '../test-fixtures/settled-control.js';
import {swims} from './folded-aquatic.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newPlayer,updateHeat,BASE_SPEED} from './mechanics.js';
import {initialFoldedState,foldedSupport,moveFolded,foldedDecks,foldedLiftDefs,foldedAimHeight,foldedEnemies,foldedBlocked,foldedControls} from './folded-layout.js';
import {renderDecks} from './hoist-layout.js';

function drive(p,x,z,state,boost=false){
  for(let i=0;i<6000;i++){
    const dx=x-p.x,dz=z-p.z;if(Math.hypot(dx,dz)<.25)return;
    updateHeat(p,1/60,i/60,boost,true);
    const amount=BASE_SPEED*p.speed/60;
    moveFolded(p,Math.abs(dx)>Math.abs(dz)?Math.sign(dx)*Math.min(amount,Math.abs(dx)):0,Math.abs(dx)<=Math.abs(dz)?Math.sign(dz)*Math.min(amount,Math.abs(dz)):0,state);
  }
  assert.fail(`stuck at ${p.x}, ${p.y}, ${p.z} on route to ${x}, ${z}`);
}
const player=()=>Object.assign(newPlayer(),{x:0,y:0,z:27,overdrive:true,magnet:true});

test('the garden dry approach is accessible before Magnet and Mortar',()=>{
 const p={...player(),magnet:false,mortar:false},s=initialFoldedState();
 drive(p,-26,27,s);drive(p,-26,-8,s);drive(p,-46,-8,s);
 assert.equal(p.y,-8);assert.equal(p.afloat,false);assert.equal(s.magnet,false);
});


test('Flotation crosses below the real bridge and reaches the bank without selecting an upper floor',()=>{
  const s=initialFoldedState({magnet:true}),p=Object.assign(player(),{x:-46,y:-8,z:-8,deployed:true,flotation:true});
  for(const [x,z]of [[-46,27],[-36,27],[-36,-4],[0,-4],[30,-7],[36,-7],[36,-16],[46,-16],[46,20],[56,20],[86,20]])drive(p,x,z,s);
  assert.equal(p.y,-8);assert.ok(foldedSupport(0,-4,-16,true));assert.equal(foldedSupport(0,-4,-16,false),null);
  assert.equal(foldedSupport(0,-4,0,false).id,'transport-bridge');
});

test('the pump return reveals its closed gate at the machine and reconnects dry to the ferry',()=>{
  const s=initialFoldedState({magnet:true}),p=Object.assign(player(),{x:58,y:-8,z:20});
  const firstVisit=Object.assign(player(),{x:-26,y:-8,z:-8});
  for(let i=0;i<250;i++)moveFolded(firstVisit,0,-.15,s);
  assert.ok(firstVisit.z>-23,'the ferry-side shutter must prevent bypassing the first Flotation crossing');
  drive(p,58,4,s);
  assert.deepEqual(foldedControls.find(c=>c.id==='pump').facing,[0,0,1]);
  for(let i=0;i<90;i++)moveFolded(p,0,-.15,s);
  assert.ok(p.z>-9,'the closed return is visible before entering the long bridge');
  drive(p,58,4,s);p.pumpPressure=.8;
  assert.ok(settleControl('pump','cannon',p,s,[]));
  drive(p,58,-28,s);drive(p,-26,-28,s);drive(p,-26,-8,s);
  assert.equal(p.y,-8);assert.equal(p.deployed,false);assert.equal(p.afloat,false);
  const restored=initialFoldedState(s);drive(p,-26,-28,restored);drive(p,58,-28,restored);drive(p,58,20,restored);
  assert.equal(restored.pump,true);
});

test('the freight frontage previews the combined grille without giving access to the carrier',()=>{
 const p={...player(),magnet:false,mortar:true},s=initialFoldedState({freight:true,'bridge-crane':true});
 for(const [x,z]of [[0,-34],[59,-34],[59,-63],[67,-63],[67,-34],[74,-34],[74,-26]])drive(p,x,z,s);
 for(let i=0;i<120;i++)moveFolded(p,0,.1,s);
 assert.ok(p.z<-23);assert.equal(s.magnet,false);assert.equal(s.load,false);
 drive(p,74,-34,s);
});


test('ordinary Boost cannot break the original orange bulkhead, while Phoenix resolves it permanently',()=>{
 const s=initialFoldedState(),p={...player(),x:32,y:0,z:6,magnet:false};
 for(let i=0;i<400;i++){updateHeat(p,1/60,i/60,true,true);moveFolded(p,BASE_SPEED*p.speed/60,0,s);}
 assert.equal(s.pressure,false);assert.ok(p.x<92);
 Object.assign(p,{x:32,heat:0,overheated:false,speed:1,phoenix:true});drive(p,140,6,s,true);assert.equal(s.pressure,true);
 p.phoenix=false;drive(p,32,6,s);
});


test('the roof coupling stays covered before Phoenix and preserves its release on reload',()=>{
  const p=player(),s=initialFoldedState();assert.equal(settleControl('cage','cannon',p,s,[]),false);
  Object.assign(p,{y:24,phoenix:true});s.phoenix=true;assert.ok(settleControl('cage','cannon',p,s,[]));
  const restored=initialFoldedState({...s,anchor:'roof',flotation:true,phoenix:true,unknown:true});
  assert.equal(restored.cage,true);assert.equal(restored.anchor,'distribution');assert.equal(restored.unknown,undefined);
  assert.deepEqual(foldedControls.find(c=>c.id==='gangway').facing,[1,0,0]);
  Object.assign(p,{x:86});assert.ok(settleControl('gangway','cannon',p,restored,[]));
});

test('rendered flat surfaces never overlap at the same height and the shared cage is recessed',()=>{
  const decks=renderDecks(foldedDecks,foldedLiftDefs);
  for(let i=0;i<decks.length;i++)for(let j=i+1;j<decks.length;j++){
    const a=decks[i],b=decks[j];if(a.rise||b.rise||a.y!==b.y)continue;
    assert.ok(Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)<=0||Math.min(a.z+a.d,b.z+b.d)-Math.max(a.z,b.z)<=0,`${a.id} overlaps ${b.id}`);
  }
  assert.ok(decks.some(d=>d.id==='turntable'&&d.recess>.55));
});



test('the actual aim point stops at forty degrees while reachable vertical targets remain unchanged',()=>{
  const p={x:0,y:8,z:0};
  for(const sign of [-1,1]){
    const target={x:3,z:4,y:10+sign*100};
    assert.ok(Math.abs(Math.atan2(foldedAimHeight(p,target)-10,5)-sign*40*Math.PI/180)<1e-12);
  }
  assert.equal(foldedAimHeight(p,{x:3,z:4,y:12}),12);
  assert.equal(foldedAimHeight(p,{x:0,z:0,y:100}),10);
});

test('defenders start on supported floor outside machinery and cover',()=>{
  const state=initialFoldedState();
  for(const e of foldedEnemies){assert.ok(foldedSupport(e.x,e.z,e.y,swims(e)));assert.equal(foldedBlocked(e.x,e.y,e.z,state,1),undefined,e.id);}
});

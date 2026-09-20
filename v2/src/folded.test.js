import test from 'node:test';
import assert from 'node:assert/strict';
import {newPlayer,updateHeat,BASE_SPEED} from './mechanics.js';
import {initialFoldedState,foldedSupport,moveFolded,releaseFolded,foldedDecks,foldedLiftDefs,foldedAimHeight,foldedEnemies,foldedBlocked} from './folded-layout.js';
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

test('the garden route descends continuously and acquisition remains on dry ground',()=>{
  const p=player(),s=initialFoldedState();drive(p,-26,27,s);drive(p,-26,-8,s);assert.equal(p.y,-8);
  for(let i=0;i<80;i++)moveFolded(p,-.2,0,s);assert.ok(p.x>-39,'magnetic panel blocks dry access');
  assert.equal(releaseFolded('magnet','cannon',p,s,[]),false);assert.ok(releaseFolded('magnet','magnet',p,s,[]));
  drive(p,-46,-8,s);assert.equal(p.y,-8);assert.equal(p.afloat,false);
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
  assert.equal(releaseFolded('pump','cannon',firstVisit,s,[]),false);
  for(let i=0;i<90;i++)moveFolded(p,0,-.15,s);
  assert.ok(p.z>-9,'the closed return is visible before entering the long bridge');
  drive(p,58,4,s);p.pumpPressure=.8;
  assert.ok(releaseFolded('pump','cannon',p,s,[]));
  drive(p,58,-28,s);drive(p,-26,-28,s);drive(p,-26,-8,s);
  assert.equal(p.y,-8);assert.equal(p.deployed,false);assert.equal(p.afloat,false);
  const restored=initialFoldedState(s);drive(p,-26,-28,restored);drive(p,58,-28,restored);drive(p,58,20,restored);
  assert.equal(restored.pump,true);
});

test('the dry freight approach reaches common benches without Magnet or Flotation',()=>{
  const p=Object.assign(player(),{magnet:false,mortar:true}),s=initialFoldedState({freight:true,'bridge-crane':true});
  for(const [x,z]of [[0,-34],[59,-34],[59,-84],[67,-84],[67,-34],[70,-34],[70,-19],[90,-19]])drive(p,x,z,s);
  assert.equal(p.y,0);assert.equal(p.flotation,false);assert.equal(p.magnet,false);
  s.load=true;drive(p,90,-59,s);assert.equal(p.y,8);
});

test('ordinary Overdrive cannot break the launch shutter, while the supported Phoenix run can',()=>{
  const s=initialFoldedState(),p=Object.assign(player(),{x:85,y:16,z:-86});
  for(let i=0;i<400;i++){updateHeat(p,1/60,i/60,true,true);moveFolded(p,BASE_SPEED*p.speed/60,0,s);}
  assert.equal(s.launch,false);assert.ok(p.x<140);
  Object.assign(p,{x:85,heat:0,overheated:false,speed:1,phoenix:true});drive(p,164,-86,s,true);assert.equal(s.launch,true);
  drive(p,166,-86,s);drive(p,166,-32,s);assert.equal(p.y,24);
});

test('inside releases and saved progression never grant the roof from below',()=>{
  const p=player(),s=initialFoldedState();assert.equal(releaseFolded('cage','cannon',p,s,[]),false);
  Object.assign(p,{y:24,phoenix:true});assert.ok(releaseFolded('cage','cannon',p,s,[]));
  const restored=initialFoldedState({...s,anchor:'roof',flotation:true,phoenix:true,unknown:true});
  assert.equal(restored.cage,true);assert.equal(restored.anchor,'distribution');assert.equal(restored.unknown,undefined);
  Object.assign(p,{x:56,y:-8});assert.equal(releaseFolded('gangway','cannon',p,restored,[]),false);
  Object.assign(p,{x:86});assert.ok(releaseFolded('gangway','cannon',p,restored,[]));
});

test('rendered flat surfaces never overlap at the same height and the shared cage is recessed',()=>{
  const decks=renderDecks(foldedDecks,foldedLiftDefs);
  for(let i=0;i<decks.length;i++)for(let j=i+1;j<decks.length;j++){
    const a=decks[i],b=decks[j];if(a.rise||b.rise||a.y!==b.y)continue;
    assert.ok(Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)<=0||Math.min(a.z+a.d,b.z+b.d)-Math.max(a.z,b.z)<=0,`${a.id} overlaps ${b.id}`);
  }
  assert.ok(decks.some(d=>d.id==='turntable'&&d.recess>.55));
});

test('both onward Phoenix shutters have sufficient supported runup and remain open for ordinary return',()=>{
  const state=initialFoldedState(),p=Object.assign(player(),{x:136,y:24,z:-30,phoenix:true});
  drive(p,190,-30,state,true);assert.equal(p.y,24);p.phoenix=false;drive(p,150,-30,state);
  Object.assign(p,{x:166,y:16,z:-64,phoenix:true,heat:0,overheated:false,speed:1});
  drive(p,166,-3,state,true);assert.ok(state.pressure);p.phoenix=false;drive(p,166,-40,state);
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
  for(const e of foldedEnemies){assert.ok(foldedSupport(e.x,e.z,e.y));assert.equal(foldedBlocked(e.x,e.y,e.z,state,1),undefined,e.id);}
});

test('the shared carrier screen closes the whole ramp before either approach reaches Phoenix',()=>{
  for(const x of [85.2,90,94.8]){
    const p=Object.assign(player(),{x,y:0,z:-18}),s=initialFoldedState();
    for(let i=0;i<300;i++)moveFolded(p,0,-.15,s);
    assert.ok(p.z>-27,'the hull cannot walk around or under the screened load');
    assert.ok(releaseFolded('load','mortar',p,s,[]));
    drive(p,90,p.z,s);drive(p,90,-59,s);assert.equal(p.y,8);
    assert.ok(initialFoldedState(s).load,'the release survives a reload');
  }
});

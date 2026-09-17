import test from 'node:test';
import assert from 'node:assert/strict';
import {expansionRoutes,expansionDecks,expansionPickups,expansionControls} from './folded-expansion-layout.js';
import {foldedDecks,foldedSolids,deckHeight,foldedSupport,foldedBlocked,moveFolded,initialFoldedState,releaseFolded} from './folded-layout.js';
import {cameraApertureOpacity} from './folded-visibility.js';
import {barrageTargets,RAIL} from './folded-attacks.js';
import {renderDecks} from './hoist-layout.js';
import {moveWithConveyor} from './folded-machinery.js';

function walk(p,s,x,z){
  for(let i=0;i<9000&&Math.hypot(x-p.x,z-p.z)>.1;i++){
    const dx=x-p.x,dz=z-p.z,len=Math.hypot(dx,dz);p.speed=3.2;
    moveFolded(p,dx/len*Math.min(.2,len),dz/len*Math.min(.2,len),s);
    if(i===8999)assert.fail(`blocked at ${p.x},${p.y},${p.z} toward ${x},${z}`);
  }
}
for(const route of expansionRoutes)test(`${route.id} has an outward route before its module and a short return afterward`,()=>{
  const p={x:route.approach[0][0],z:route.approach[0][1],y:route.rooms[0].y,speed:1},s=initialFoldedState({ratchet:true});
  const a=route.rooms[0],b=route.rooms[5],probe={x:a.x,y:a.y,z:a.z,speed:1};
  moveFolded(probe,b.x-a.x,b.z-a.z,s);
  assert.ok(Math.hypot(probe.x-b.x,probe.z-b.z)>20,'unearned shortcut must reject passage');
  for(const [x,z]of route.approach)walk(p,s,x,z);
  for(const [i,r]of route.rooms.slice(0,5).entries()){
    walk(p,s,r.x,r.z);
    if(i===1)assert.equal(releaseFolded(route.trial,route.id==='proving'?'mortar':'cannon',p,s,[]),true);
    if(i===2&&['proving','hearth'].includes(route.id))s[`${route.id}-endurance`]=true;
  }
  assert.ok(!s[`${route.id}-return`]);
  if(route.ability){
    const pickup=expansionPickups.find(q=>q.ability===route.ability);assert.ok(Math.hypot(p.x-pickup.x,p.z-pickup.z)<.2);
    p[route.ability]=true;s[pickup.id]=true;
  }
  p.deployed=route.ability==='flotation';p.boosting=true;p.overheated=true;p.heat=100;p.phoenix=true;p.circulation=true;
  const c=expansionControls.find(c=>c.id===`${route.id}-return`);
  if(c)assert.equal(releaseFolded(c.id,c.kind==='shot'?'cannon':c.kind,p,s,[]),true);
  for(const r of [route.rooms[5],route.rooms[0]])walk(p,s,r.x,r.z);
  for(const [x,z]of [...route.approach].reverse())walk(p,s,x,z);
  assert.equal(p.y,route.rooms[0].y);
});
test('new modules sit on accessible dry support and total floor area exceeds three original cities',()=>{
  for(const p of expansionPickups){assert.ok(foldedSupport(p.x,p.z,p.y));assert.equal(!!foldedBlocked(p.x,p.y,p.z,initialFoldedState()),false,p.id);}
  const area=decks=>renderDecks(decks,[]).reduce((n,d)=>n+d.w*d.d,0);
  const original=area(foldedDecks.filter(d=>!expansionDecks.includes(d)));
  assert.ok(area(foldedDecks)>original*3);
});
test('a visible current gives Flotation a quicker downstream return without moving a dry tank',()=>{
  const s=initialFoldedState(),dry={x:-121,y:-8,z:-100,speed:1},float={...dry,deployed:true};
  for(let i=0;i<60;i++){moveWithConveyor(float,0,0,1/60,s);moveWithConveyor(dry,0,0,1/60,s);}
  assert.ok(float.z>dry.z+4);assert.equal(dry.z,-100);
  const refuge={x:-124,y:-8,z:-114,speed:1,deployed:true};
  assert.equal(foldedSupport(refuge.x,refuge.z,refuge.y,true).water,undefined);
  for(let i=0;i<60;i++)moveWithConveyor(refuge,0,0,1/60,s);
  assert.equal(refuge.z,-114);
});
test('camera obstruction opacity is local and continuous across arbitrary mesh boundaries',()=>{
  const p={x:0,y:0,z:0},camera={x:0,y:5,z:-12};
  assert.ok(cameraApertureOpacity({x:0,y:3,z:-6},p,camera)<.3);
  assert.equal(cameraApertureOpacity({x:0,y:0,z:-6},p,camera),1);
  assert.equal(cameraApertureOpacity({x:0,y:3,z:5},p,camera),1);
  assert.ok(Math.abs(cameraApertureOpacity({x:3,y:3,z:-6},p,camera)-cameraApertureOpacity({x:3.001,y:3,z:-6},p,camera))<.002);
});
test('artillery brackets a frozen sighting with staggered impacts and rail shots have travel time',()=>{
  const shots=barrageTargets({x:0,z:0},{x:0,y:0,z:40});
  assert.deepEqual(shots.map(s=>s.x),[-5,0,5]);assert.deepEqual(shots.map(s=>s.delay),[0,.32,.64]);
  assert.ok(RAIL.range>75);assert.ok(60/RAIL.speed>.3&&60/RAIL.speed<.7);
});

test('all ramp lanes support a full hull in both directions',()=>{
  const state=initialFoldedState();for(const s of foldedSolids)if(!s.permanent)state[s.id]=true;
  for(const d of foldedDecks.filter(d=>d.rise))for(const lane of [.25,.5,.75]){
    const z=d.z+1,p={x:d.x+d.w*lane,y:deckHeight(d,z),z,speed:1,deployed:true};
    walk(p,state,p.x,d.z+d.d-1);assert.ok(Math.abs(p.y-deckHeight(d,p.z))<=.45,d.id);
    walk(p,state,p.x,z);assert.ok(Math.abs(p.y-deckHeight(d,p.z))<=.45,d.id);
  }
});

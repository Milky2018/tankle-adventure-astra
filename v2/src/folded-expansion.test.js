import {pullSlide,stepReleasedSlides} from './folded-mechanisms.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {expansionRoutes,expansionPickups,expansionControls} from './folded-expansion-layout.js';
import {foldedDecks,foldedSolids,foldedControls,deckHeight,foldedSupport,foldedBlocked,moveFolded,initialFoldedState,releaseFolded} from './folded-layout.js';
import {cameraApertureOpacity} from './folded-visibility.js';
import {barrageTargets,RAIL} from './folded-attacks.js';
import {moveWithConveyor} from './folded-machinery.js';

function walk(p,s,x,z){
  for(let i=0;i<9000&&Math.hypot(x-p.x,z-p.z)>.1;i++){
    const dx=x-p.x,dz=z-p.z,len=Math.hypot(dx,dz);p.speed=3.2;
    stepReleasedSlides(s.bodies.solids,s,1/60,[p],(x,z,y)=>!!foldedSupport(x,z,y));
    moveFolded(p,dx/len*Math.min(.2,len),dz/len*Math.min(.2,len),s);
    if(i===8999)assert.fail(`blocked at ${p.x},${p.y},${p.z} toward ${x},${z}`);
  }
}
for(const route of expansionRoutes)test(`${route.id} acquisition and onward exit preserve hull support and real locks`,()=>{
  const p={x:route.approach[0][0],z:route.approach[0][1],y:route.y,speed:1,magnet:true,mortar:true,laser:true,overdrive:true},s=initialFoldedState({ratchet:true});
  if(route.ability)p[route.ability]=false;
  for(const [x,z]of route.approach)walk(p,s,x,z);
  for(const [x,z,action]of route.path){
    walk(p,s,x,z);
    if(action==='battle')s[`${route.id}-endurance`]=true;
    else if(action==='pickup'){
      const q=expansionPickups.find(q=>q.id===route.pickup);assert.ok(Math.hypot(p.x-q.x,p.z-q.z)<.2);
      p[q.ability]=true;s[q.id]=true;
    }else if(action&&action!=='repair'){
      const c=expansionControls.find(c=>c.id===action);assert.ok(c,action);
      assert.equal(releaseFolded(c.id,c.surface==='top'?'mortar':c.kind==='shot'?'cannon':c.kind,p,s,[]),true,action);
    }
  }
  p.phoenix=true;p.circulation=true;p.overheated=true;p.heat=100;
  for(const [x,z,action]of route.returns){
    p.boosting=action==='boost';
    walk(p,s,x,z);
    if(action==='float')p.deployed=!p.deployed;
    else if(action&&action!=='boost'){
      const c=foldedControls.find(c=>c.id===action);
      if(c.slide){
        const body=s.bodies.solids.find(b=>b.id===c.slide);
        walk(p,s,-106,-54);
        for(let i=0;i<600;i++){
          moveFolded(p,0,p.z< -30?.05:0,s);
          if(Math.hypot(p.x-body.x-body.w/2,p.z-body.z-body.d/2)<=13)
            pullSlide(body,p,1/60,s.bodies.solids.filter(b=>b!==body&&(b.permanent||b.rail||!s[b.id])),(x,z,y)=>!!foldedSupport(x,z,y));
        }
        assert.equal(body[body.rail.axis],body.rail.max);
        s.slidePositions[body.id]=body[body.rail.axis];
        walk(p,s,-106,-54);walk(p,s,x,z);
      }
      assert.equal(releaseFolded(c.id,c.kind==='shot'?'cannon':c.kind,p,s,[]),true,action);
    }
  }
  assert.equal(p.y,route.returnY??route.y);
});
test('acquisition modules have clear dry support and authored districts have different shapes',()=>{
  for(const p of expansionPickups){assert.ok(foldedSupport(p.x,p.z,p.y));assert.equal(!!foldedBlocked(p.x,p.y,p.z,initialFoldedState()),false,p.id);}
  const shapes=expansionRoutes.map(r=>r.rooms.map(d=>`${d.w}x${d.d}`).join('/'));
  assert.equal(new Set(shapes).size,6);
});
test('a visible current gives Flotation a quicker downstream return without moving a dry tank',()=>{
  const s=initialFoldedState(),dry={x:-94,y:-8,z:85,speed:1},float={...dry,deployed:true};
  for(let i=0;i<60;i++){moveWithConveyor(float,0,0,1/60,s);moveWithConveyor(dry,0,0,1/60,s);}
  assert.ok(float.z<dry.z-4);assert.equal(dry.z,85);
  const refuge={x:-98,y:-8,z:52,speed:1,deployed:true};
  assert.equal(foldedSupport(refuge.x,refuge.z,refuge.y,true).water,undefined);
  for(let i=0;i<60;i++)moveWithConveyor(refuge,0,0,1/60,s);
  assert.equal(refuge.z,52);
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

test('new return routes reject unearned engines, Magnet, Laser and water crossing',()=>{
 for(const [id,ability,kind]of [['arsenal-return','magnet','magnet'],['lens-return','laser','laser']]){
  const c=expansionControls.find(c=>c.id===id),p={x:c.x-5,y:c.y-1.3,z:c.z},s=initialFoldedState();
  assert.equal(releaseFolded(id,'cannon',p,s,[]),false);
  const gate=foldedSolids.find(w=>w.id===id);assert.ok(foldedBlocked(gate.x+gate.w/2,gate.y,gate.z+gate.d/2,s));
  p[ability]=true;assert.equal(releaseFolded(id,kind,p,s,[]),true);
 }
 const ordinary={x:238,y:16,z:-74,speed:1.6,overdrive:true,boosting:true},a=initialFoldedState();
 moveFolded(ordinary,0,12,a);assert.ok(ordinary.z< -70);assert.equal(a['phoenix-departure'],false);
 const phoenix={...ordinary,z:-74,speed:3.2,phoenix:true};moveFolded(phoenix,0,12,a);assert.ok(phoenix.z> -69);assert.equal(a['phoenix-departure'],true);
 const cold={x:330,y:-24,z:106,speed:3.2,phoenix:true,boosting:true,circulation:true,overheated:false},b=initialFoldedState();
 moveFolded(cold,-12,0,b);assert.ok(cold.x>325);assert.equal(b['coolant-return'],false);
 const red={...cold,x:330,speed:3.2,heat:100,overheated:true};moveFolded(red,-12,0,b);assert.ok(red.x<323);assert.equal(b['coolant-return'],true);
 const dry={x:-146,y:-8,z:64,speed:1},c=initialFoldedState({'reservoir-transfer':true,'reservoir-inlet':true});moveFolded(dry,20,0,c);assert.ok(dry.x<-145);
 const floating={x:-146,y:-8,z:64,speed:1,deployed:true};moveFolded(floating,20,0,c);assert.ok(floating.x>-129);
});

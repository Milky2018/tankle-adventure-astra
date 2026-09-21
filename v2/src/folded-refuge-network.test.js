import test from 'node:test';
import assert from 'node:assert/strict';
import {foldedHives,foldedLiftDefs,foldedSupport,foldedBlocked,initialFoldedState,moveFolded,releaseFolded,foldedEnemies,foldedControls} from './folded-layout.js';
import {pullSlide,currentVelocity,stepReleasedSlides} from './folded-mechanisms.js';
import {moveWithConveyor,stepLifts} from './folded-machinery.js';
import {newPlayer,updateHeat,BASE_SPEED} from './mechanics.js';
import {expansionCurrents} from './folded-expansion-layout.js';

function walk(p,s,points,{boost=false,lifts=[]}={}){
  let time=0;
  for(const [x,z]of points){
    let i=0;
    while(Math.hypot(x-p.x,z-p.z)>.12&&i++<2400){
      time+=1/60;const dx=x-p.x,dz=z-p.z,length=Math.hypot(dx,dz);
      updateHeat(p,1/60,time,boost,true);
      const distance=Math.min(length,BASE_SPEED*p.speed/60);
      moveWithConveyor(p,dx/length*distance,dz/length*distance,1/60,s,lifts);
    }
    assert.ok(Math.hypot(x-p.x,z-p.z)<.15,`blocked ${p.x},${p.y},${p.z} toward ${x},${z}`);
  }
  return time;
}

test('exactly four repair rooms have supported, enemy-free reconstruction positions',()=>{
  assert.deepEqual(foldedHives.map(h=>h.id),['awakening','turntable','distribution','last-refuge']);
  for(const h of foldedHives){
    assert.ok(foldedSupport(h.x,h.z,h.y),h.id);
    assert.equal(foldedBlocked(h.x,h.y,h.z,initialFoldedState()),undefined,h.id);
    for(const e of foldedEnemies.filter(e=>Math.abs(e.y-h.y)<4))assert.ok(Math.hypot(e.x-h.x,e.z-h.z)>21.2,`${e.id} crowds ${h.id}`);
  }
});

test('retired anchors migrate to a reachable refuge without losing equipment or completed work',()=>{
  const cases={ 'lower-foundry':'awakening','foundry-exit':'awakening','garden-entry':'turntable','bank':'turntable','loading-entry':'turntable','arsenal-hive-3':'turntable','proving-hive-3':'turntable','roof':'distribution','rig':'distribution','lens-hive-3':'distribution','hearth-hive-3':'last-refuge' };
  for(const [anchor,expected]of Object.entries(cases)){
    const restored=initialFoldedState({anchor,phoenix:true,'cannon-scope':true,'stores-trial':true});
    assert.equal(restored.anchor,expected);assert.equal(restored['cannon-scope'],true);assert.equal(restored['stores-trial'],true);
  }
  assert.equal(initialFoldedState({anchor:'roof'}).anchor,'turntable');
  assert.equal(initialFoldedState().anchor,'awakening');
});

test('the Overseer side release faces its approach and bypasses the opposing belt on retry',()=>{
  const s=initialFoldedState(),p={...newPlayer(),x:-10,y:-8,z:61,overdrive:true};
  assert.ok(foldedControls.find(c=>c.id==='overseer-service').facing); // Physical housing blocks premature rays; exercised in the browser suite.
  assert.ok(releaseFolded('overseer-service','cannon',p,s,[]));
  walk(p,s,[[-10,86],[0,86],[-10,86],[-10,60]]);
  assert.equal(s.foundry,false);
});

test('Phoenix acquisition exits directly through its own breakthrough to the distribution room',()=>{
  const s=initialFoldedState({'proving-endurance':true,phoenix:true}),p={...newPlayer(),x:218,y:16,z:-114,overdrive:true,phoenix:true};
  walk(p,s,[[238,-114]]);
  const seconds=walk(p,s,[[238,-62]],{boost:true});
  assert.ok(s['phoenix-departure']);assert.ok(seconds<10);
  walk(p,s,[[238,-28],[150,-28]]);
  assert.equal(p.y,24);assert.equal(s.cage,false);
  assert.ok(releaseFolded('cage','cannon',p,s,[]));
});

test('the deep maintenance shaft has a housed control and reaches the Foundry',()=>{
  const shaft=foldedLiftDefs.find(l=>l.id==='last-cage'),s=initialFoldedState({foundry:true});
  assert.deepEqual(shaft.stops,[-40,-8]);
  assert.ok(foldedControls.find(c=>c.id==='last-cage').facing); // Physical housing blocks premature rays; exercised in the browser suite.
  assert.ok(releaseFolded('last-cage','cannon',{x:44,y:-40,z:-10},s,[]));
  const p={...newPlayer(),x:22,y:-8,z:-8};
  walk(p,s,[[18,-8],[18,-2],[16,-2],[16,80],[0,86]]);
  assert.equal(p.y,-8);
});

test('a released freight load lands on its supports and stays there after further updates',()=>{
  const d=foldedLiftDefs.find(l=>l.id==='freight-platform'),lift={...d,y:5,destination:5,wait:0},s=initialFoldedState();
  const p={x:0,y:0,z:-14,hp:25};
  stepLifts([lift],s,p,10);assert.equal(lift.y,5);
  assert.equal(foldedSupport(0,-24,0,false,[lift]),null);
  s['bridge-crane']=true;stepLifts([lift],s,p,2);assert.equal(lift.y,0);
  assert.equal(foldedSupport(0,-24,0,false,[lift]).height,0);
  stepLifts([lift],s,p,100);assert.equal(lift.y,0);
});

test('sluice diversion changes the actual force on an afloat tank but never creates dry support',()=>{
  const q=expansionCurrents[0],a={...newPlayer(),x:-94,y:-8,z:85,deployed:true},b={...a};
  const fast=initialFoldedState(),calm=initialFoldedState({'reservoir-inlet':true});
  for(let i=0;i<60;i++){moveWithConveyor(a,0,0,1/60,fast);moveWithConveyor(b,0,0,1/60,calm);}
  assert.ok(b.z-a.z>3);assert.deepEqual(currentVelocity(q,calm),q.diverted);
  assert.equal(foldedSupport(-94,85,-8,false),null);
});

test('magnetic slides remain solid, stop for occupants, and restore an unfinished rail position',()=>{
  const s=initialFoldedState(),body=s.bodies.solids.find(b=>b.id==='bench-cover'),p={x:78.5,y:0,z:-12};
  for(let i=0;i<30;i++)pullSlide(body,p,1/60,[],(x,z,y)=>!!foldedSupport(x,z,y));
  assert.ok(body.z> -25&&body.z< -17);
  s.slidePositions[body.id]=body.z;
  const restored=initialFoldedState(JSON.parse(JSON.stringify(s))).bodies.solids.find(b=>b.id===body.id);
  assert.equal(restored.z,body.z);assert.ok(foldedBlocked(body.x+1,body.y,body.z+1,s));
  const obstacle={x:body.x,y:body.y,z:body.z+body.d+1,w:3,d:2};
  pullSlide(body,p,2,[obstacle],()=>true);assert.ok(body.z+body.d<=obstacle.z);
});

test('both vestibule restorations are required in either order and survive reloading',()=>{
  const d=foldedLiftDefs.find(l=>l.id==='furnace-service-lift');
  for(const order of [['inner-optics','inner-thermal'],['inner-thermal','inner-optics']]){
    const first=initialFoldedState({[order[0]]:true}),lift={...d,y:d.stops[0],destination:d.stops[0],wait:0},p={x:0,y:0,z:0};
    stepLifts([lift],first,p,10);assert.equal(lift.y,d.stops[0]);
    const restored=initialFoldedState(JSON.parse(JSON.stringify(first)));restored[order[1]]=true;
    stepLifts([lift],restored,p,4);assert.equal(lift.y,d.stops[0]+5);
    assert.ok(restored[order[0]]);
  }
});

test('Keeper retry from D is a short supported walk without a lift or repeated feed restoration',()=>{
  const s=initialFoldedState({'core-feed':true}),p={...newPlayer(),x:44,y:-40,z:-10};
  const seconds=walk(p,s,[[34,-10],[34,68],[0,68],[0,61]]);
  assert.ok(seconds>=10&&seconds<=15,`Keeper retry: ${seconds}s`);
  assert.equal(p.y,-56);assert.equal(s.keeper,false);
});

test('no initial combatant prevents a released maintenance load from settling',()=>{
  for(const l of foldedLiftDefs.filter(l=>l.settle))for(const e of foldedEnemies){
    if(Math.abs(e.y-l.stops[0])>2.7)continue;
    assert.ok(e.x+1<=l.x||e.x-1>=l.x+l.w||e.z+1<=l.z||e.z-1>=l.z+l.d,`${e.id} occupies ${l.id}`);
  }
});

test('Sorter releases a bidirectional supported express track without a lift wait',()=>{
  const s=initialFoldedState({sorter:true}),p={...newPlayer(),x:150,y:24,z:-28,overdrive:true,phoenix:true,circulation:true};
  const seconds=walk(p,s,[[150,-32],[76,-32],[76,48],[36,48],[36,30],[0,27]],{boost:true});
  assert.equal(p.y,0);assert.ok(seconds<20,`express return took ${seconds}s`);
  walk(p,s,[[36,30],[36,48],[76,48],[76,-32],[150,-32],[150,-28]],{boost:true});
  assert.equal(p.y,24);
  const closed=initialFoldedState(),q={...newPlayer(),x:76,y:0,z:48};
  moveFolded(q,0,-8,closed);assert.ok(q.z>43);
});

test('each sluice retains its own diversion after saving and loading',()=>{
  const restored=initialFoldedState({'reservoir-transfer':true});
  assert.equal(restored['reservoir-inlet'],false);
  assert.deepEqual(currentVelocity(expansionCurrents[0],restored),expansionCurrents[0].current);
  assert.deepEqual(currentVelocity(expansionCurrents[1],restored),expansionCurrents[1].diverted);
});


test('released screens use the same hull clearance as movement at a waiting player',()=>{
  const body={id:'screen',x:10,y:0,z:0,w:1,d:4,rail:{axis:'z',min:0,max:8,release:'screen'}};
  const state={screen:true,slidePositions:{}},p={x:9.05,y:0,z:2,hp:25};
  stepReleasedSlides([body],state,1,[p],()=>true);assert.equal(body.z,3);
  body.z=0;p.x=9.2;stepReleasedSlides([body],state,1,[p],()=>true);assert.equal(body.z,0);
});


test('legacy collected rewards keep the pull-off access open after progression migration',()=>{
  const s=initialFoldedState({'armor-lens':true,magnetModule:true});
  assert.equal(s['collimator-drawer'],true);
  assert.equal(s.bodies.solids.find(b=>b.id==='collimator-drawer').rail,undefined);
  assert.equal(s.bodies.solids.find(b=>b.id==='arsenal-transfer').x,-128);
});

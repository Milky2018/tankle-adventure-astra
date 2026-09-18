import test from 'node:test';
import assert from 'node:assert/strict';
import {stepTransport,transportSolids} from './folded-transport.js';
import {expansionRoutes,expansionPickups,expansionSolids,expansionHeat} from './folded-expansion-layout.js';
import {initialFoldedState,moveFolded,foldedSupport,foldedBlocked,foldedHives,foldedSolids,foldedArchitecture} from './folded-layout.js';
import {newPlayer,updateHeat,BASE_SPEED} from './mechanics.js';

function walk(p,state,x,z){
 for(let i=0;i<3000&&Math.hypot(p.x-x,p.z-z)>.12;i++){
  const dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz);moveFolded(p,dx/d*.1,dz/d*.1,state);
 }
 assert.ok(Math.hypot(p.x-x,p.z-z)<.15,`blocked at ${p.x},${p.y},${p.z} toward ${x},${z}`);
}
test('moving freight cover stops before occupants and resumes without teleporting or crushing them',()=>{
 const s=structuredClone(transportSolids[1]),p={x:s.x+s.w+2,y:s.y,z:s.z+1,hp:50};
 const initial=s.x;stepTransport([s],2,[p]);assert.ok(s.x>initial);assert.ok(s.x+s.w<=p.x-1);
 const stopped=s.x;stepTransport([s],10,[p]);assert.equal(s.x,stopped);assert.equal(p.hp,50);
 p.z+=10;stepTransport([s],1,[p]);assert.ok(s.x>stopped);
 for(let i=0;i<100;i++){stepTransport([s],1,[]);assert.ok(s.x>=s.motion.min&&s.x<=s.motion.max);}
});
test('the observation gallery is a real alternative at a different height, traversable in both directions',()=>{
 const route=expansionRoutes.find(r=>r.id==='proving'),state=initialFoldedState({'proving-transfer':true}),p={x:112,y:16,z:-176,speed:1};
 const points=[[106,-176],[106,-146],[192,-146],[192,-176],[188,-176]];
 for(const [x,z]of points){walk(p,state,x,z);if(z===-146)assert.equal(p.y,20);}
 assert.ok(Math.abs(p.y-16)<.02);for(const [x,z]of [...points].reverse())walk(p,state,x,z);assert.ok(Math.abs(p.y-16)<.02);
 assert.ok(route.rooms.some(r=>r.y===20));
});
test('Phoenix has physical acceleration distance before the runout shutter and its first defenders',()=>{
 const p={...newPlayer(),x:218,y:16,z:-122,overdrive:true,phoenix:true},s=initialFoldedState({'proving-transfer':true,'proving-endurance':true});
 let time=0;while(p.x>174&&time<10){time+=1/60;updateHeat(p,1/60,time,true,true);moveFolded(p,-BASE_SPEED*p.speed/60,0,s);}
 assert.ok(s['proving-return']);assert.ok(p.x<174);assert.equal(p.overheated,false);
});
test('the coolant runout delivers red contact from a cold start using the unchanged heat rules',()=>{
 const hotFloor=expansionHeat[0],p={...newPlayer(),x:374,y:-24,z:106,overdrive:true,phoenix:true,circulation:true},s=initialFoldedState();
 for(let i=0;i<600&&p.x>320;i++){
  const t=i/60;updateHeat(p,1/60,t,true,true);
  if(p.x>=hotFloor.x&&p.x<=hotFloor.x+hotFloor.w){p.heat=Math.min(100,p.heat+hotFloor.heat/60);p.lastHeat=t;if(p.heat>=100)p.overheated=true;}
  moveFolded(p,-BASE_SPEED*p.speed/60,0,s);
 }
 assert.ok(s['coolant-return']);assert.equal(p.overheated,true);assert.ok(p.x<320);
});
test('relocated acquisition and recovery points remain clear for an old saved anchor',()=>{
 for(const q of [...expansionPickups,...foldedHives.filter(h=>h.id.includes('-hive-'))]){
  const s=initialFoldedState({anchor:q.id});assert.ok(foldedSupport(q.x,q.z,q.y),q.id);assert.equal(foldedBlocked(q.x,q.y,q.z,s),undefined,q.id);
 }
});
// Sweep every cross-section of the route gates; testing only their centre would
// miss a new adjacent floor that lets the player skirt the jamb.
test('full-width transfer and return shutters cover their supporting lane',()=>{
 for(const id of ['arsenal-transfer','arsenal-return','proving-transfer','proving-endurance','proving-return','lens-transfer','lens-return','coolant-transfer','hearth-transfer']){
  const s=initialFoldedState(),gate=expansionSolids.find(g=>g.id===id),alongX=gate.w>gate.d;
  const fixed=alongX?gate.z:gate.x,start=(alongX?gate.x:gate.z)-3,end=start+(alongX?gate.w:gate.d)+6;
  for(let v=start;v<=end;v+=.5){
   const p={x:alongX?v:fixed-2,y:gate.y,z:alongX?fixed-2:v,speed:1};
   if(!foldedSupport(p.x,p.z,p.y)||foldedBlocked(p.x,p.y,p.z,s))continue;
   const support=foldedSupport(alongX?v:fixed+2,alongX?fixed+2:v,gate.y);
   if(!support)continue;
   moveFolded(p,alongX?0:4,alongX?4:0,s);
   assert.ok((alongX?p.z:p.x)<fixed+1,`${id} bypass at ${v}`);
  }
 }
});


test('freight travel never clips fixed machinery or architectural walls',()=>{
 for(const s of transportSolids)for(let x=s.motion.min;x<=s.motion.max;x+=.25){
  const blockers=[...foldedSolids,...foldedArchitecture.solids].filter(b=>b!==s&&!b.motion&&Math.abs(s.y-b.y)<.1&&x<b.x+b.w&&x+s.w>b.x&&s.z<b.z+b.d&&s.z+s.d>b.z);
  assert.equal(blockers.length,0,`${s.id} at ${x}: ${blockers.map(b=>b.id)}`);
 }
});

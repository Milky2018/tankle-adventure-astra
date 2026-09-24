import {settleControl} from '../../tests/fixtures/settled-control.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {foldedPickups,foldedLiftDefs,initialFoldedState,foldedSupport,foldedSolids} from '../world/terrain.js';
import {BOSS_ARENAS,createBossArenas} from '../combat/boss-arenas.js';
import {moveWithConveyor,stepLifts} from '../machinery/motion.js';
import {stepTransport} from '../machinery/transport.js';
import {newPlayer,updateHeat,BASE_SPEED} from '../player/mechanics.js';

function route(p,s,points,boost=false,lifts=[]){
 let time=p.clock||0;
 for(const [x,z]of points){
  let i=0;
  while(Math.hypot(p.x-x,p.z-z)>.2&&i++<3000){
   time+=1/60;const dx=x-p.x,dz=z-p.z;
   updateHeat(p,1/60,time,boost,true);stepTransport(s.bodies.solids,1/60,[p]);
   const step=BASE_SPEED*p.speed/60;
   moveWithConveyor(p,Math.abs(dx)>Math.abs(dz)?Math.sign(dx)*Math.min(step,Math.abs(dx)):0,Math.abs(dx)<=Math.abs(dz)?Math.sign(dz)*Math.min(step,Math.abs(dz)):0,1/60,s,lifts);
  }
  assert.ok(i<3000,`Blocked at ${p.x},${p.y},${p.z} toward ${x},${z}`);
 }
 p.clock=time;return time;
}

test('Boost reaches transit and the cargo installation before encountering Overseer or receiving Mortar',()=>{
 const s=initialFoldedState({prototype:true,overdrive:true}),p={...newPlayer(),x:0,y:-8,z:86,overdrive:true};
 const arenas=createBossArenas([{id:'foundry',hp:14,max:14,timer:0}],s);
 route(p,s,[[0,54]],true);route(p,s,[[24,48],[24,4],[36,4],[36,30],[22,30],[0,27]]);
 arenas.update(p,1);assert.equal(s.combatArena,null);assert.equal(s.foundry,false);assert.equal(p.mortar,false);
 const cradle=foldedPickups.find(p=>p.ability==='mortar');assert.ok(Math.hypot(cradle.x-p.x,cradle.z-p.z)>80);
 route(p,s,[[-12,27],[-12,-8],[-12,-24],[-14,-36],[-12,-40],[-12,-72]]);
 route(p,s,[[6,-72]],true);for(let i=0;i<120;i++)updateHeat(p,1/60,p.clock+=1/60,false,false);
 route(p,s,[[34,-72]],true);route(p,s,[[34,-98],[54,-98],[54,-132]]);assert.equal(cradle.requires,'sorter');assert.equal(s.sorter,false);s.sorter=true;route(p,s,[[56,-146],[32,-146],[cradle.x,cradle.z]]);assert.equal(p.y,cradle.y);assert.equal(s.foundry,false);
});

test('Mortar release opens a real local return, and the cargo lift cycles without another interaction',()=>{
 const s=initialFoldedState(),p={...newPlayer(),x:34,y:-8,z:-72,mortar:true};
 route(p,s,[[28,-66]]);
 for(let i=0;i<120;i++)moveWithConveyor(p,0,.1,1/60,s);assert.ok(p.z<-64,'The lesson screen cannot be driven through');
 assert.ok(settleControl('loading-return','mortar',p,s,[]));route(p,s,[[28,-58],[28,-46]]);
 const l={...foldedLiftDefs.find(l=>l.id==='loading-return'),y:-8,destination:-8,wait:0};
 route(p,s,[[18,-46]],false,[l]);for(let i=0;i<300;i++)stepLifts([l],s,p,1/60);
 assert.equal(p.y,0);route(p,s,[[18,-34],[0,-34]],false,[l]);
 assert.equal(s['bridge-crane'],true);route(p,s,[[0,27]]);assert.equal(s.foundry,false);
});

test('the combined load powers the carrier before Overseer, while victory seals the reward approach',()=>{
 const def=foldedLiftDefs.find(l=>l.id==='carrier'),a=BOSS_ARENAS.find(a=>a.id==='foundry');
 assert.ok(foldedSolids.some(g=>g.id==='foundry'&&g.z>a.z+a.d));
 for(const saved of [{load:true},{foundry:true},{load:true,foundry:true}]){
  const s=initialFoldedState(saved),l={...def,y:8,destination:8,wait:0},p={x:0,y:0,z:0};
  for(let i=0;i<240;i++)stepLifts([l],s,p,1/60);
  assert.equal(l.y>8,!!saved.load);
 }
 assert.equal(foldedSupport(def.x+6,def.z+6,16),null,'the upper floor must not cap the shaft');
 assert.ok(foldedSupport(def.x+6,def.z+6,16,false,[{...def,y:16}]));
});

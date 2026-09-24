import test from 'node:test';
import {MORTAR} from '../player/abilities.js';
import assert from 'node:assert/strict';
import {BOSS_ARENAS,createBossArenas,insideArena,bossReserves,arenaGates} from './boss-arenas.js';
import {initialFoldedState,moveFolded,activeSolid,foldedArchitecture,foldedSupport,foldedBlocked} from '../world/terrain.js';
import {bossPattern,steerSeeker} from './bosses.js';
const fixtures=[['prototype',-47,-16,126,-8,0],['foundry',218,16,-162,0,-10],['guardian',202,16,46,0,-10],['keeper',0,-56,58,0,10],['sorter',54,-8,-130,0,10]];
test('every live boss encounter blocks actual movement through its entrance and reopens after release',()=>{
 for(const [id,x,y,z,dx,dz]of fixtures){
  const state={...initialFoldedState(),relays:true,combatArena:id},p={x,y,z,speed:1};moveFolded(p,dx,dz,state);
  assert.ok(insideArena(BOSS_ARENAS.find(a=>a.id===id),p),`${id} escaped: ${JSON.stringify(p)}`);
  state.combatArena=null;moveFolded(p,dx,dz,state);assert.equal(insideArena(BOSS_ARENAS.find(a=>a.id===id),p),false,id);
 }
});
test('locks begin only after entry, clear on death and victory, and never persist in saves',()=>{
 const state=initialFoldedState(),boss={id:'foundry',hp:14,max:14,timer:0},manager=createBossArenas([boss],state),p={x:218,y:16,z:-163,hp:50};
 manager.update(p,0);assert.equal(state.combatArena,null);p.z=-160;assert.equal(manager.update(p,1)[0].kind,'seal');
 assert.equal(state.combatArena,'foundry');assert.equal(JSON.parse(JSON.stringify(state)).combatArena,undefined);
 p.hp=0;manager.update(p,2);assert.equal(state.combatArena,null);
 p.hp=50;manager.update(p,3);boss.hp=0;assert.equal(manager.update(p,4)[0].kind,'release');assert.equal(state.combatArena,null);
});
test('reinforcements announce entry, are finite, and reset with the encounter',()=>{
 const boss={id:'keeper',hp:48,max:48,timer:0},reserves=bossReserves.filter(e=>e.reserveFor==='keeper').map(e=>({...e,max:e.hp,spawn:{x:e.x,y:e.y,z:e.z}})),state=initialFoldedState(),manager=createBossArenas([boss,...reserves],state),p={x:0,y:-56,z:52,hp:50};
 manager.update(p,0);boss.hp=28;assert.equal(manager.update(p,1).filter(e=>e.kind==='reserve').length,2);assert.equal(reserves.filter(e=>e.awake).length,0);
 manager.update(p,3.01);assert.equal(reserves.filter(e=>e.awake).length,2);boss.hp=12;assert.equal(manager.update(p,4).filter(e=>e.kind==='reserve').length,0);boss.hp=28;for(const e of reserves)e.hp=0;
 assert.equal(manager.update(p,8).filter(e=>e.kind==='reserve').length,0);boss.hp=12;assert.equal(manager.update(p,9).filter(e=>e.kind==='reserve').length,2);
 manager.reset();assert.ok(reserves.every(e=>!e.hp&&!e.awake));assert.ok(arenaGates.every(g=>!activeSolid(g,state)));
});
test('boss patterns retain recovery and readable warnings while changing attack grammar',()=>{
 for(const id of ['foundry','guardian','keeper','sorter']){
  const kinds=new Set();for(let attackCycle=1;attackCycle<=8;attackCycle++){const pattern=bossPattern({id,guardian:id==='guardian',hp:10,max:48,attackCycle,parts:[]});kinds.add(pattern.kind);assert.ok(pattern.warn>=.8&&pattern.recovery>=1);}
  assert.ok(kinds.size>=2,id);
 }
 const s={age:1,homing:true,position:{x:0,z:0},dir:{x:0,y:0,z:1}};steerSeeker(s,{x:20,z:0},.1);assert.ok(Math.abs(Math.atan2(s.dir.x,s.dir.z)-.09)<1e-8);
 s.age=1.7;steerSeeker(s,{x:-20,z:0},.1);assert.equal(s.homing,false);
});
test('most authored rooms are enclosed and provide actual roof geometry',()=>{
 const indoor=foldedArchitecture.rooms.filter(r=>r.roof);assert.ok(indoor.length/foldedArchitecture.rooms.length>=.65);
 for(const room of indoor)assert.ok(foldedArchitecture.solids.some(s=>s.room===room.id&&s.kind==='roof'),room.id);
});

test('no traversable arena boundary can bypass its seal, including earned return routes',()=>{
 for(const a of BOSS_ARENAS){
  const state=initialFoldedState();for(const key of Object.keys(state))if(typeof state[key]==='boolean')state[key]=true;
  state[a.id]=false;state.combatArena=a.id;
  for(let side=0;side<4;side++)for(let t=1;t<(side<2?a.d:a.w)-1;t+=.5){
   const p={x:side<2?a.x+(side===0?1.5:a.w-1.5):a.x+t,y:a.y,z:side>=2?a.z+(side===2?1.5:a.d-1.5):a.z+t,speed:1};
   if(!foldedSupport(p.x,p.z,p.y,false)||foldedBlocked(p.x,p.y,p.z,state))continue;
   moveFolded(p,side<2?(side===0?-4:4):0,side>=2?(side===2?-4:4):0,state);
   assert.ok(p.x>=a.x&&p.x<=a.x+a.w&&p.z>=a.z&&p.z<=a.z+a.d,`${a.id} escaped side ${side} at ${t}`);
  }
 }
});

test('the raised carrier receiver retains its Mortar arc below the workshop roof',()=>{
 for(let i=0;i<=200;i++){
  const t=i/200,x=90,y=2+(7-2)*t+4*MORTAR.height*t*(1-t),z=-23+(-34+23)*t;
  assert.equal(foldedArchitecture.solids.some(s=>s.kind==='roof'&&x>=s.x&&x<=s.x+s.w&&z>=s.z&&z<=s.z+s.d&&y>=s.y&&y<=s.y+s.h),false,`blocked at ${t}`);
 }
});

test('the optical express bridge is independent of the freight Sorter',()=>{
 const state=initialFoldedState(),boss={id:'sorter',hp:12,max:12,timer:0},manager=createBossArenas([boss],state);
 for(let x=110;x<=150;x++)manager.update({x,y:24,z:-98,hp:50},x);
 assert.equal(state.combatArena,null);manager.update({x:54,y:-8,z:-132,hp:50},151);assert.equal(state.combatArena,'sorter');
});

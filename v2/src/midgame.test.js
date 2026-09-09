import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { makeWorld } from './world.js';
import { makeTransit } from './transit.js';
import { makeGardens } from './gardens.js';
import { makeSmallPuzzles } from './small-puzzles.js';
import { makeCombatProps } from './combat-props.js';
import { makeMidgame } from './midgame.js';
import { midgameHives, midgameEnemies, returnLane } from './midgame-layout.js';
import { inside, newPlayer, updateHeat } from './mechanics.js';
import { supportedHull } from './abilities.js';
const scene=new T.Scene(),world=makeWorld(scene),transit=makeTransit(scene,world);
makeCombatProps(scene,world);makeGardens(scene,world,transit);makeSmallPuzzles(scene,world);const mid=makeMidgame(scene,world);
const terrain=new Map();
function blocked(x,z,water=false,hot=false){
  const k=`${x},${z},${water}`;if(!terrain.has(k))terrain.set(k,!supportedHull((x,z)=>world.available(x,z)||(water&&world.waterAvailable(x,z)),x,z,.9));
  return terrain.get(k)||world.obstacles.some(o=>o.active!==false&&inside(x,z,o,.9))||(!hot&&inside(x,z,returnLane));
}
function reach(start,water=false,hot=false){
  const seen=new Set(),queue=[start],key=(x,z)=>`${x},${z}`,steps=new Map([[key(...start),0]]);seen.add(key(...start));
  for(let i=0;i<queue.length;i++){const [x,z]=queue[i];for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,k=key(nx,nz);if(nx<-206||nx>272||nz<-472||nz>-65||seen.has(k)||blocked(nx,nz,water,hot))continue;seen.add(k);steps.set(k,steps.get(key(x,z))+1);queue.push([nx,nz]);}}
  const near=(x,z)=>{for(let a=-2;a<=2;a++)for(let b=-2;b<=2;b++)if(a*a+b*b<=4&&seen.has(key(x+a,z+b)))return true;return false;};near.distance=(x,z)=>steps.get(key(x,z));return near;
}
function close(){mid.opened.clear();for(const g of mid.gates)g.bounds.active=true;}
test('all middle checkpoints and enemy spawns have supported hull clearance',()=>{
  for(const [x,z]of midgameHives)assert.equal(blocked(x,z+2,false,true),false,`hive ${x},${z}`);
  for(const [type,x,z,id]of midgameEnemies)assert.equal(blocked(x,z,false,true),false,`${id} ${type} ${x},${z}`);
});
test('neither dry garden nor ordinary transit reaches the middle modules',()=>{
  close();let path=reach([-163,-335]);assert.equal(path(-15,-412),false,'dry garden -> Phoenix');
  path=reach([100,-174]);assert.equal(path(-15,-412),false,'transit before optical latch -> Phoenix');assert.equal(path(190,-124),false,'transit -> Laser');assert.equal(path(228,-438),false,'transit -> water circulation');
});
test('water and freight approaches independently reach one Phoenix cradle, without opening its two later branches',()=>{
  close();let path=reach([-163,-335],true);assert.ok(path(-15,-412),'water -> Phoenix');assert.equal(path(190,-124),false,'water -> Laser');assert.equal(path(228,-438),false,'water -> circulation');
  transit.open('optical');path=reach([140,-202]);assert.ok(path(-15,-412),'freight -> Phoenix');assert.equal(path(190,-124),false,'freight -> Laser');assert.equal(path(228,-438),false,'freight -> circulation');
});
test('Phoenix opens Laser and circulation as independent branches',()=>{
  close();mid.open(mid.gates.filter(g=>g.kind==='phoenix').map(g=>g.id));
  const path=reach([108,-406]);assert.ok(path(190,-124),'Phoenix -> Laser');assert.ok(path(158,-442),'Phoenix -> pump feed');assert.equal(path(228,-438),false,'feed remains physically closed');
  assert.ok(mid.hitReceiver('feed-receiver','cannon'));assert.ok(reach([108,-406])(228,-438),'Phoenix + Cannon -> circulation');assert.equal(reach([108,-406])(228,-340),false,'cold chassis cannot reach pressure bypass control');
});
test('inside controls and optical receivers open persistent bidirectional return routes',()=>{
  close();assert.equal(mid.hitReceiver('gallery-receiver','cannon'),false);
  for(const r of mid.receivers)mid.hitReceiver(r.id,r.kind);
  for(const c of mid.controls.filter(c=>!c.signal))mid.act(c);
  mid.open(mid.gates.filter(g=>g.kind==='phoenix').map(g=>g.id));
  const path=reach([228,-438],false,true);for(const [x,z]of [[-163,-335],[-86,-374],[108,-406],[173,-118],[140,-202],[146,-389],[228,-340]])assert.ok(path(x,z),`return ${x},${z}`);
  const copy=makeMidgame(new T.Scene(),{obstacles:[],belts:[]},mid.serialize());assert.deepEqual(copy.serialize(),mid.serialize());assert.equal(copy.gates.find(g=>g.id==='inner-future').bounds.active,true);
});
test('only full Phoenix momentum breaks a speed gate; opening never reseals on update',()=>{
  close();const p={...newPlayer(),phoenix:true,speed:1.6};assert.equal(mid.ram(52,-406,p).length,0);p.speed=3.2;assert.equal(mid.ram(52,-406,p).length,1);mid.update(1,1,p);assert.equal(mid.gates.find(g=>g.id==='launch').bounds.active,false);
});
test('long opposing belt cannot be burst crossed cold, while circulation sustains the complete journey',()=>{
  function journey(circulation){const p={...newPlayer(),overdrive:true,phoenix:true,circulation,speed:3.2},dt=1/60;let distance=0,furthest=0;for(let i=0;i<2400;i++){updateHeat(p,dt,i*dt,true,true);distance=Math.max(0,distance+(p.speed*7-returnLane.speed*7)*dt);furthest=Math.max(furthest,distance);if(distance>=returnLane.d)return true;}return furthest;}
  assert.ok(journey(false)<returnLane.d);assert.equal(journey(true),true);
});

test('loading lift removes at least half the old supported return distance',()=>{
  close();transit.open('optical');mid.open(mid.gates.filter(g=>g.kind==='phoenix').map(g=>g.id));
  const before=reach([190,-124]).distance(108,-84);mid.act(mid.controls.find(c=>c.id==='loading-control'));
  const after=reach([190,-124]).distance(108,-84);assert.ok(Number.isFinite(before));assert.ok(after<before*.5,`${before} -> ${after}`);
});

import { makeMidgame } from './midgame.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { makeWorld } from './world.js';
import { makeTransit } from './transit.js';
import { makeGardens } from './gardens.js';
import { makeSmallPuzzles } from './small-puzzles.js';
import { makeCombatProps } from './combat-props.js';
import { gardenEnemies, gardenHives } from '../content/prototypes/garden-layout.js';
import { inside, newPlayer } from '../player/mechanics.js';
import { supportedHull, toggleFlotation } from '../player/abilities.js';

const scene=new T.Scene(),world=makeWorld(scene),transit=makeTransit(scene,world,{opened:['garden','crane-return']});
makeCombatProps(scene,world);const gardens=makeGardens(scene,world,transit);makeSmallPuzzles(scene,world);makeMidgame(scene,world);
const blocked=(x,z,water=false,r=.88)=>!supportedHull((x,z)=>world.available(x,z)||(water&&world.waterAvailable(x,z)),x,z,r)||world.obstacles.some(o=>o.active!==false&&inside(x,z,o,r));
function reach(start,water=false){
  const key=(x,z)=>`${x},${z}`,seen=new Set([key(...start)]),queue=[start];
  for(let i=0;i<queue.length;i++){
    const [x,z]=queue[i];for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx,nz=z+dz,k=key(nx,nz);
      if(nx<-206||nx>113||nz<-350||nz>-65||seen.has(k)||blocked(nx,nz,water))continue;
      seen.add(k);queue.push([nx,nz]);
    }
  }return seen;
}
const near=(seen,x,z)=>[...seen].some(k=>{const [a,b]=k.split(',').map(Number);return Math.hypot(a-x,b-z)<2.5;});
test('garden entrance requires the magnetic panel, then flotation is reachable entirely on dry ground',()=>{
  assert.equal(near(reach([-57,-248]),-154,-208),false);
  const rail=transit.rails.find(r=>r.id==='garden-panel');for(let i=0;i<240;i++)transit.pull(rail,{x:-76,z:-249},1/60);
  assert.ok(transit.opened.has('garden-service'));
  const dry=reach([-57,-248]);assert.ok(near(dry,-154,-208));assert.equal(near(dry,-175,-296),false);assert.equal(near(dry,-119,-318),false);
});
test('flotation opens both the reservoir loop and the original loading rig without Mortar or Laser',()=>{
  const wet=reach([-154,-208],true);
  for(const [x,z] of [[-159,-249],[-175,-296],[-119,-318],[-113,-273],[-163,-335],[54,-78],[-158,-135],[-54,-280]])assert.ok(near(wet,x,z),`missing water route to ${x},${z}`);
  assert.ok(near(wet,-163,-347),'flotation reaches the open testworks water approach');
});
test('the optional tender can be restored before the pump and retains its state',()=>{
  assert.ok(gardens.repairTender());assert.equal(gardens.restored,false);assert.equal(gardens.repairTender(),false);assert.equal(gardens.serialize().tender,true);
});
test('pump needs its counterweight and opens a persistent supported return without removing water routes',()=>{
  assert.equal(gardens.restore(),false);assert.equal(world.available(-90,-276),false);
  const rail=transit.rails.find(r=>r.id==='garden-feed');for(let i=0;i<240;i++)transit.pull(rail,{x:-130,z:-281},1/60);
  assert.ok(gardens.restore());assert.ok(world.available(-90,-276));
  assert.ok(near(reach([-113,-273]),-57,-250));assert.equal(world.available(-160,-233),false);assert.ok(world.waterAvailable(-160,-233));
  const copyWorld=makeWorld(new T.Scene());makeGardens(new T.Scene(),copyWorld,transit,gardens.serialize());assert.ok(copyWorld.available(-90,-276));
});
test('deployment requires ownership, stays available during overheat, and cannot retract an unsupported hull',()=>{
  const p=newPlayer();p.x=-159;p.z=-233;assert.equal(toggleFlotation(p,world.available),false);
  p.flotation=true;p.overheated=true;p.speed=1.6;assert.ok(toggleFlotation(p,world.available));assert.equal(p.speed,1);assert.equal(toggleFlotation(p,world.available),false);assert.ok(p.deployed);
  p.x=-154;p.z=-208;assert.ok(toggleFlotation(p,world.available));assert.equal(p.deployed,false);
});
test('all garden encounters and checkpoints have usable supported clearance',()=>{
  for(const [type,x,z,name] of gardenEnemies)assert.equal(blocked(x,z,false,type==='guard'?1.4:1.1),false,`${name} ${type} at ${x},${z}`);
  for(const [x,z] of gardenHives)assert.equal(blocked(x,z+2),false,`checkpoint ${x},${z}`);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { makeWorld, rooms } from './world.js';
import { makeTransit } from './transit.js';
import { makeSmallPuzzles } from './small-puzzles.js';
import { makeCombatProps } from './combat-props.js';
import { transitRooms, transitModules, transitEnemies } from '../content/prototypes/transit-layout.js';
import { inside, newPlayer, shootHeat } from '../player/mechanics.js';
import { MORTAR, mortarTarget, mortarPosition } from '../player/abilities.js';

test('mortar lands at a fixed bounded target after its flight and shares weapon heat/cooldown',()=>{
  const target=mortarTarget(0,0,100,0);assert.equal(target.x,MORTAR.range);
  const shot={x:0,z:0,y:1.8,target};assert.deepEqual(mortarPosition(shot,10),{x:24,z:0,y:.2});
  assert.ok(mortarPosition(shot,MORTAR.duration/2).y>8);
  const p=newPlayer();assert.ok(shootHeat(p,0,MORTAR.heat,MORTAR.cooldown));assert.equal(p.heat,35);
  assert.equal(shootHeat(p,.6),false);assert.ok(shootHeat(p,1.1));assert.equal(p.heat,55);
});

const scene=new T.Scene(),world=makeWorld(scene),transit=makeTransit(scene,world);
makeCombatProps(scene,world);makeSmallPuzzles(scene,world);
function blocked(x,z,r=.88){return [[r,0],[-r,0],[0,r],[0,-r]].some(([dx,dz])=>!world.available(x+dx,z+dz))||world.obstacles.some(o=>o.active!==false&&inside(x,z,o,r));}
function reachable(start){
  const seen=new Set(),queue=[start];seen.add(start.join(','));
  for(let i=0;i<queue.length;i++){
    const [x,z]=queue[i];for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx,nz=z+dz,key=`${nx},${nz}`;
      if(nx<-114||nx>118||nz<-286||nz>-78||seen.has(key)||blocked(nx,nz))continue;
      seen.add(key);queue.push([nx,nz]);
    }
  }
  return seen;
}
function near(set,x,z){return [...set].some(k=>{const [a,b]=k.split(',').map(Number);return Math.hypot(a-x,b-z)<3.3;});}
test('second region is at least three times the first region floor area',()=>{
  const area=rs=>{let n=0;for(let x=-114;x<118;x++)for(let z=-284;z<82;z++)if(rs.some(r=>inside(x+.5,z+.5,r)))n++;return n;};
  const first=area(rooms.filter(r=>!r.id.startsWith('r'))),second=area(transitRooms);
  assert.ok(second/first>=3,`${second} / ${first} = ${second/first}`);
});
test('both modules are reachable without either ability, while garden and optical court remain gated',()=>{
  const seen=reachable([0,-112]);
  for(const m of transitModules.filter(m=>m.id!=='flotation'))assert.ok(near(seen,m.x,m.z),m.id);
  assert.ok(!near(seen,-57,-250),'garden remains behind magnetic gate');
  assert.ok(!near(seen,66,-240),'optical court remains behind mortar gate');
});
test('counterweights pull toward the player, persist, and open the garden loop',()=>{
  const rail=transit.rails.find(r=>r.id==='crane');
  transit.pull(rail,{x:-90,z:rail.z},1);assert.equal(rail.x,rail.min);
  for(let i=0;i<300;i++)transit.pull(rail,{x:-60,z:rail.z},1/60);
  assert.ok(transit.opened.has('crane-return'));
  const garden=transit.rails.find(r=>r.id==='garden');
  for(let i=0;i<300;i++)transit.pull(garden,{x:-23,z:garden.z},1/60);
  assert.ok(transit.opened.has('garden'));
  const seen=reachable([0,-112]);assert.ok(near(seen,-57,-250));
  const state=transit.serialize(),restored=makeTransit(new T.Scene(),{obstacles:[],belts:[]},state);
  assert.equal(restored.gates.find(g=>g.id==='garden').bounds.active,false);assert.equal(restored.rails.find(r=>r.id==='garden').latched,true);
});
test('mortar latches unlock the optical route independently of magnet ownership',()=>{
  assert.equal(transit.hitLatch(80,-187),false);assert.equal(transit.hitLatch(94,-187),true);
  const seen=reachable([0,-112]);assert.ok(near(seen,66,-240));
  assert.equal(transit.hitLatch(94,-187),false);
});

test('encounters spawn on supported floor outside solid cover',()=>{
  for(const [type,x,z,name] of transitEnemies)assert.equal(blocked(x,z,type==='guard'?1.4:1.1),false,`${name} ${type} at ${x},${z}`);
});

test('movable battle cover can reverse and remains distinct from a permanent latch',()=>{
  const world={obstacles:[],belts:[]},t=makeTransit(new T.Scene(),world),r=t.rails.find(r=>r.id==='loading-cover');
  const start=r.z;t.pull(r,{x:r.x,z:-124},1);assert.ok(r.z>start);
  t.pull(r,{x:r.x,z:-148},1);assert.ok(r.z<=start);assert.equal(r.latched,false);
  const stopped=r.z;t.pull(r,{x:r.x,z:-124},1,[{x:r.x,z:r.z+3.5,r:1,hp:2}]);assert.equal(r.z,stopped);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { makeWorld } from './world.js';
import { makeTransit } from './transit.js';
import { makeGardens } from './gardens.js';
import { makeCombatProps } from './combat-props.js';
import { makeSmallPuzzles } from './small-puzzles.js';
import { inside } from './mechanics.js';
import { supportedHull } from './abilities.js';
const scene=new T.Scene(),world=makeWorld(scene),transit=makeTransit(scene,world);makeGardens(scene,world,transit);makeCombatProps(scene,world);const puzzles=makeSmallPuzzles(scene,world);
const blocked=(x,z)=>!supportedHull(world.available,x,z,.9)||world.obstacles.some(o=>o.active!==false&&inside(x,z,o,.9));
function reach(start){
  const queue=[start],seen=new Set([start.join(',')]);for(let i=0;i<queue.length;i++){
    const [x,z]=queue[i];for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,k=`${nx},${nz}`;if(nx<-206||nx>114||nz<-350||nz>-65||seen.has(k)||blocked(nx,nz))continue;seen.add(k);queue.push([nx,nz]);}
  }return seen;
}
function reachableControl(seen,id){const c=puzzles.controls.find(c=>c.id===id);return [...seen].some(k=>{const [x,z]=k.split(',').map(Number);return Math.hypot(x-c.x,z-c.z)<2.7;});}
let parked={x:-10,z:-117};
const place=(x,z)=>{parked={x,z};puzzles.update(1/60,0,parked);};
const tick=seconds=>{for(let i=0;i<seconds*60;i++)puzzles.update(1/60,i/60,parked);};
test('all rail controls are reachable from the R2 entrance without any module',()=>{
  const seen=reach([-10,-117]);for(const id of ['rail-a','rail-b','rail-signal'])assert.ok(reachableControl(seen,id),id);assert.ok(blocked(-44,-98));
});
test('the garden controls are dry-accessible within the post-Flotation shore loop',()=>{
  const seen=reach([-175,-296]);for(const id of ['basin-valve','basin-lock','gutter-a','gutter-b'])assert.ok(reachableControl(seen,id),id);assert.ok(blocked(-199,-290));
});
test('driving across both treadles and shooting the carrier opens the physical crossing directly',()=>{
  const control=puzzles.controls.find(c=>c.id==='rail-a');assert.equal(puzzles.act(control),false);
  place(-28,-108);tick(1);assert.deepEqual(puzzles.snapshot().rail.switches,[true,false]);place(-20,-104);place(-38,-99);
  assert.ok(puzzles.hit(-38,-104,1.25,parked).changed);tick(7);assert.ok(puzzles.snapshot().rail.solved);assert.equal(blocked(-44,-98),false);assert.equal(blocked(-72,-98),false);
});
test('tank weight holds water while a shot catches the raised deck; walking away opens the underpass',()=>{
  place(-190,-295);assert.equal(puzzles.hit(-190,-286,1.25,parked).changed,false);tick(3.2);assert.ok(blocked(-199,-299));assert.ok(blocked(-199,-281));
  assert.ok(puzzles.hit(-190,-286,1.25,parked).changed);place(-188,-295);tick(3.2);
  for(let z=-301;z<=-277;z++)assert.equal(blocked(-199,z),false,`passage at ${z}`);
});
test('a crank needs a moving hull and rearms only after withdrawing',()=>{
  place(-182,-248);place(-181.7,-248);assert.equal(puzzles.snapshot().gutter.angles[0],1);tick(1);assert.equal(puzzles.snapshot().gutter.angles[0],1);
  place(-181.8,-248);place(-181.6,-248);assert.equal(puzzles.snapshot().gutter.angles[0],1);
  place(-183,-248);place(-182,-248);place(-181.7,-248);assert.equal(puzzles.snapshot().gutter.angles[0],2);
  assert.equal(puzzles.act(puzzles.controls.find(c=>c.id==='gutter-a')),false);
});

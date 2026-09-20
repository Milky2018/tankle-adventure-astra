import test from 'node:test';
import assert from 'node:assert/strict';
import {createDelivery} from './folded-delivery.js';
import {foldedSupport,foldedLiftDefs,initialFoldedState,moveFolded} from './folded-layout.js';
import {cityContact,cityDamage} from './folded-combat.js';

test('maintenance delivery waits for occupants, follows supported banks, and restores its completed berth',()=>{
 const d=createDelivery();d.update(5,false,()=>false);assert.deepEqual(d.position,[110,-24,30]);
 d.update(5,true,()=>true);assert.deepEqual(d.position,[110,-24,30]);
 let arrived=false;
 for(let i=0;i<1800&&!d.complete;i++){arrived=d.update(1/60,true,()=>false)||arrived;assert.ok(foldedSupport(d.position[0],d.position[2],d.position[1],true),JSON.stringify(d.position));}
 assert.equal(arrived,true);assert.deepEqual(d.position,[130,-16,18]);assert.deepEqual(createDelivery(true).position,d.position);
});
test('docking the carrier restores its adjacent inspection bridge and survives an old secured save',()=>{
 const def=foldedLiftDefs.find(l=>l.id==='rail-inspection-bridge'),lift={...def,y:14},p={x:-162,y:8,z:-68,speed:1},s=initialFoldedState();
 moveFolded(p,12,0,s,[lift]);assert.ok(p.x< -160);
 const restored=initialFoldedState({sidePuzzles:{rail:{secured:true}}});assert.equal(restored['rail-crossing'],true);
 lift.y=8;moveFolded(p,12,0,restored,[lift]);assert.ok(p.x> -152);
});
test('garden care side room has a traversable shore entrance',()=>{
 const p={x:46,y:-8,z:24,speed:1};moveFolded(p,0,14,{});assert.ok(Math.abs(p.z-38)<1e-6);
});
test('optional sorting machine protects its drive while working; major elites resist ordinary Phoenix',()=>{
 const e={id:'sorter',type:'boss',hp:12,phase:'warn'};
 assert.equal(cityDamage(e,1,{x:100,z:0}),0);e.phase='vent';assert.equal(cityDamage(e,1,{x:100,z:0}),1);
 assert.equal(cityContact({phoenix:true,speed:3.2},{type:'elite',persistent:true,hp:9}),0);
});

test('the parked shunting carrier leaves the warehouse inspection route reachable',()=>{
 const p={x:-136,y:8,z:-54,speed:1};moveFolded(p,-26,0,{});assert.ok(Math.abs(p.x+162)<1e-6);
 moveFolded(p,0,-12,{});assert.ok(Math.abs(p.z+66)<1e-6);
 moveFolded(p,-14,0,{});assert.ok(Math.abs(p.x+176)<1e-6);
});

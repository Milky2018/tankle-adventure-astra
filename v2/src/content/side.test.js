import test from 'node:test';
import assert from 'node:assert/strict';
import {createDelivery} from '../machinery/delivery.js';
import {foldedSupport,foldedLiftDefs,foldedPickups,initialFoldedState,moveFolded} from '../world/terrain.js';
import {cityContact,cityDamage} from '../combat/damage.js';

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

test('Magnet is a single raised shunting reward with a reachable lowered berth',()=>{
 const rewards=foldedPickups.filter(p=>p.id==='magnetModule');assert.equal(rewards.length,1);
 const reward=rewards[0],lift=foldedLiftDefs.find(l=>l.id===reward.lift);
 assert.equal(lift.lock,'rail-crossing');assert.equal(reward.y,Math.max(...lift.stops));
 assert.ok(reward.x>lift.x&&reward.x<lift.x+lift.w&&reward.z>lift.z&&reward.z<lift.z+lift.d);
 const p={x:-156,y:8,z:-60,speed:1};moveFolded(p,0,-8,{},[{...lift,y:14}]);assert.ok(p.z> -64);
 p.z=-60;moveFolded(p,0,-8,{'rail-crossing':true},[{...lift,y:8}]);assert.ok(Math.abs(p.z-reward.z)<2);
});

test('the flower reveals the relocated armour only after blooming and preserves legacy collections',()=>{
 const reward=foldedPickups.find(p=>p.id==='armor-foundry');
 assert.equal(foldedPickups.filter(p=>p.upgrade==='armor').length,5);
 assert.equal(reward.requires,'garden-bloom');assert.equal(reward.preview,undefined);
 assert.equal(initialFoldedState()[reward.requires],false);
 assert.equal(initialFoldedState({sidePuzzles:{gutter:{fill:.9}}})[reward.requires],false);
 assert.equal(initialFoldedState({sidePuzzles:{gutter:{grown:true}}})[reward.requires],true);
 const collected=initialFoldedState({'armor-foundry':true});assert.equal(collected[reward.id],true);
 const p={x:46,y:-8,z:24,speed:1};moveFolded(p,0,10,initialFoldedState());
 assert.equal(p.x,reward.x);assert.equal(p.z,reward.z);assert.equal(p.y,reward.y);
});

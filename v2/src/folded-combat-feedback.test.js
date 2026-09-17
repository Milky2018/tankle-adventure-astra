import test from 'node:test';
import assert from 'node:assert/strict';
import {cityContact,armorAbsorbs} from './folded-combat.js';
import {foldedEnemyModel} from './folded-enemies.js';

test('ordinary Overdrive rams distinguish light bodies, turrets and shield facing',()=>{
 const p={x:0,z:5,speed:1.6,overdrive:true};
 assert.equal(cityContact(p,{type:'scout',hp:2}),2);
 assert.equal(cityContact(p,{type:'turret',hp:4}),1);
 assert.equal(cityContact(p,{type:'guard',hp:5,x:0,z:0,aim:0}),0);
 assert.equal(cityContact({...p,z:-5},{type:'guard',hp:5,x:0,z:0,aim:0}),1);
 assert.equal(cityContact(p,{type:'elite',hp:9}),0);
 assert.equal(cityContact({...p,speed:1.29},{type:'scout',hp:2}),0);
});

test('warning vibration returns to the authored rest pose after arbitrary durations',()=>{
 for(const type of ['sniper','artillery','welder','repairer','reflector']){
  const model=foldedEnemyModel(type),rest=model.moving.map(m=>m.position.y);
  for(let i=0;i<137;i++)model.animate('warn',1,i/60,1/60,true);
  model.animate('idle',1,3,1/60,true);
  assert.deepEqual(model.moving.map(m=>m.position.y),rest,type);
 }
});

test('health and part depletion do not masquerade as armour absorption',()=>{
 const origin={x:0,z:5};
 assert.equal(armorAbsorbs({type:'scout',hp:.2},1,origin),false);
 const boss={type:'boss',hp:3,phase:'vent',parts:[{hp:.2}]};
 assert.equal(armorAbsorbs(boss,3,origin,'mortar',boss.parts[0]),false);
 assert.equal(boss.parts[0].hp,.2);
 assert.equal(armorAbsorbs({type:'guard',hp:.2,x:0,z:0,aim:0},1,origin),true);
 assert.equal(armorAbsorbs({type:'guard',hp:.2,x:0,z:0,aim:0},12,origin,'ram'),false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {ENEMY_VARIANTS,enemySpec} from './folded-enemy-rules.js';
import {foldedEnemies} from './folded-layout.js';
import {cityDamage} from './folded-combat.js';
import {canTelegraph} from './folded-pacing.js';
import {stepTransport} from './folded-transport.js';

test('all five veterans are placed in real encounters with distinct silhouettes and stronger stats',()=>{
  assert.equal(Object.keys(ENEMY_VARIANTS).length,5);
  for(const [variant,v] of Object.entries(ENEMY_VARIANTS)){
    const units=foldedEnemies.filter(e=>e.variant===variant);
    assert.ok(units.length>0,variant);
    assert.ok(v.health>=2&&v.health<=3);
    for(const e of units){assert.equal(e.type,v.base);assert.ok(e.hp>=12);assert.ok(enemySpec(e).speed>0);}
  }
  for(const id of ['lens-entry','lens-gallery','coolant-service','coolant-separator','hearth-receiving','hearth-intake','hearth-feed']){
    const group=foldedEnemies.filter(e=>e.encounter===id);
    assert.equal(group.length,2,id);
    assert.ok(group.every(e=>!e.wave&&!e.persistent));
  }
});

test('Bastion absorbs a frontal Phoenix impact but exposes rear, Mortar and removed-shield counters',()=>{
  const e={type:'guard',variant:'bastion',x:0,z:0,aim:0,hp:27,phase:'idle'};
  assert.equal(cityDamage(e,12,{x:0,z:10},'ram'),3);
  assert.equal(cityDamage(e,12,{x:0,z:-10},'ram'),12);
  assert.equal(cityDamage(e,4.5,{x:0,z:10},'mortar'),4.5);
  assert.equal(cityDamage(e,24,{x:0,z:10},'red'),24);
  e.shieldRemoved=true;assert.equal(cityDamage(e,12,{x:0,z:10},'ram'),12);
});

test('coordinated squads stagger two different heavy threats and never allow a third',()=>{
  const a={type:'artillery',encounter:'late',hp:20,coordinated:true,phase:'warn',warningAge:.2};
  const b={...a,type:'welder',phase:'idle'},c={...a,type:'scout',phase:'idle'};
  assert.equal(canTelegraph(b,[a,b,c]),false);
  a.warningAge=.6;assert.equal(canTelegraph(b,[a,b,c]),true);
  b.phase='warn';b.warningAge=.6;assert.equal(canTelegraph(c,[a,b,c]),false);
  const twin={...b,type:'artillery',phase:'idle'};
  assert.equal(canTelegraph(twin,[a,twin]),false);
});

test('cargo beside a stopped hull can clear the lane without an oversized safety fringe deadlock',()=>{
  const cargo={x:-16,y:0,z:-4,w:4,d:3,motion:{axis:'x',min:-17,max:-11,speed:2.4}};
  stepTransport([cargo],.1,[{x:-12,y:0,z:-.045,hp:25}]);
  assert.ok(cargo.x>-16);
  const before=cargo.x;
  stepTransport([cargo],.1,[{x:-12,y:0,z:-.2,hp:25}]);
  assert.equal(cargo.x,before,'Actual hull overlap must still stop the carrier');
});

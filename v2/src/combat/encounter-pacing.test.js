import {settleControl} from '../../tests/fixtures/settled-control.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createEncounterPacing,canTelegraph,mechanismReady} from './encounter-pacing.js';
import {expansionRoutes,expansionEnemies,expansionControls,expansionBattles} from '../content/expansion-layout.js';
import {initialFoldedState} from '../world/terrain.js';

test('a finite reserve gives four seconds of breathing room, can be provoked, and resets at rest',()=>{
  const first={battle:'court',wave:0,hp:2,x:0,y:0,z:0,spawn:{x:0,y:0,z:0}},second={...first,wave:1},enemies=[first,second];
  const pacing=createEncounterPacing(enemies),player={x:10,y:0,z:0};
  pacing.update(20,player,false);assert.equal(second.awake,false);
  first.hp=0;pacing.update(3.9,player,false);assert.equal(second.awake,false);assert.ok(second.deploy>.9);
  pacing.update(.11,player,false);assert.equal(second.awake,true);
  pacing.reset();assert.equal(second.awake,false);pacing.wake(second);assert.equal(second.awake,true);
  pacing.reset();pacing.update(3,player,false);pacing.update(1,player,true);pacing.update(1,player,false);assert.equal(second.awake,false);
});
test('heavy telegraphs take turns within a fight while ordinary supporting fire remains possible',()=>{
  const sniper={type:'sniper',encounter:'court',hp:3,phase:'warn'},charger={type:'scout',encounter:'court',hp:2,phase:'idle'},turret={type:'turret',encounter:'court',hp:3,phase:'idle'};
  assert.equal(canTelegraph(charger,[sniper,charger]),false);
  assert.equal(canTelegraph(turret,[sniper,turret]),true);
  sniper.phase='vent';assert.equal(canTelegraph(charger,[sniper,charger]),true);
});
test('pressure mechanisms require the supporting hull and cycling sleeves have a readable open interval',()=>{
  const c={pressure:{x:0,y:0,z:0}},p={...c.pressure};
  assert.equal(mechanismReady(c,p,0),true);
  assert.equal(mechanismReady(c,{...p,x:p.x+5},0),false);
  assert.equal(mechanismReady(c,p,0),true);
  const cycle={cycle:{period:4.5,open:2.1}};
  assert.equal(mechanismReady(cycle,p,1),true);assert.equal(mechanismReady(cycle,p,3),false);

});
test('the proving approach has a single ordinary pair and no compulsory endurance court',()=>{
  for(const b of expansionBattles){
    const enemies=expansionEnemies.filter(e=>e.battle===b.battle);
    assert.ok(enemies.some(e=>e.wave===0));assert.ok(enemies.some(e=>e.wave===1));
  }
  assert.deepEqual(expansionBattles,[]);
  const pair=expansionEnemies.filter(e=>e.encounter==='proving-impact');assert.equal(pair.length,2);assert.ok(pair.every(e=>!e.battle&&!e.wave));
  assert.ok(new Set(expansionRoutes.map(r=>r.rooms.length)).size>1);
});
test('existing earned abilities and far-side saves preserve access across newly added trials',()=>{
  const s=initialFoldedState({phoenix:true,anchor:'hearth-hive-3'});
  assert.equal(s['proving-transfer'],true);assert.equal(s['proving-endurance'],true);
  assert.equal(s['hearth-transfer'],true);assert.equal(s['hearth-endurance'],true);
  assert.equal(initialFoldedState()['proving-endurance'],false);
  assert.equal(initialFoldedState({flotation:true})['reservoir-inlet'],false);
  assert.equal(initialFoldedState()['reservoir-inlet'],false);
});

test('one reservoir inlet changes the flow without a second duplicate rotor',()=>{
 const c=expansionControls.find(c=>c.id==='reservoir-inlet'),p={x:c.x-8,y:-8,z:c.z},s=initialFoldedState();
 assert.equal(settleControl(c.id,'cannon',p,s,[]),true);
 assert.equal(settleControl(c.id,'cannon',p,s,[]),false);
 assert.equal(expansionControls.some(c=>c.id==='reservoir-transfer'),false);
});

test('optional sentries stay dormant on the through route but wake on entry or provocation',()=>{
  const first={battle:'store',wave:0,hp:3,x:0,y:8,z:0,spawn:{x:0,y:8,z:0},activation:{x:0,y:8,z:0,radius:17}},second={...first},reserve={...first,wave:1};
  const pacing=createEncounterPacing([first,second,reserve]);
  pacing.update(10,{x:30,y:8,z:0},false);assert.equal(first.awake,false);
  pacing.update(10,{x:0,y:0,z:0},false);assert.equal(first.awake,false);
  pacing.update(.1,{x:16,y:8,z:0},false);assert.equal(first.awake,true);assert.equal(second.awake,true);assert.equal(reserve.awake,false);
  pacing.reset();pacing.wake(first);assert.equal(first.awake,true);assert.equal(second.awake,true);assert.equal(reserve.awake,false);
});

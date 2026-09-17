import test from 'node:test';
import assert from 'node:assert/strict';
import {createEncounterPacing,canTelegraph,mechanismReady} from './folded-pacing.js';
import {expansionRoutes,expansionEnemies,expansionControls,expansionBattles} from './folded-expansion-layout.js';
import {initialFoldedState,releaseFolded} from './folded-layout.js';

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
  const c=expansionControls.find(c=>c.pressure),p={...c.pressure};
  assert.equal(mechanismReady(c,p,0),true);
  assert.equal(releaseFolded(c.id,'cannon',{...p,x:p.x+5},initialFoldedState(),[]),false);
  assert.equal(releaseFolded(c.id,'cannon',p,initialFoldedState(),[]),true);
  const cycle=expansionControls.find(c=>c.cycle);
  assert.equal(mechanismReady(cycle,p,1),true);assert.equal(mechanismReady(cycle,p,3),false);
  assert.equal(releaseFolded(cycle.id,'cannon',p,initialFoldedState(),[],3),false);
});
test('each acquisition has a quiet puzzle, a recovery bay, and a distinct post-acquisition encounter',()=>{
  for(const r of expansionRoutes){
    for(const i of [1,3,4])assert.ok(!expansionEnemies.some(e=>Math.hypot(e.x-r.rooms[i].x,e.z-r.rooms[i].z)<32&&e.y===r.rooms[i].y),`${r.id} quiet room ${i}`);
    assert.ok(expansionControls.some(c=>c.id===r.trial));
    const waves=expansionEnemies.filter(e=>e.battle===r.rooms[2].id);
    assert.equal(waves.filter(e=>e.wave===0).length,3);assert.equal(waves.filter(e=>e.wave===1).length,3);
    assert.equal(expansionEnemies.filter(e=>e.encounter===r.rooms[5].id).length,r.id==='hearth'?0:3);
  }
  assert.equal(expansionBattles.length,2,'only two courts require defeating both waves');
});
test('existing earned abilities and far-side saves preserve access across newly added trials',()=>{
  const s=initialFoldedState({phoenix:true,anchor:'hearth-hive-3'});
  assert.equal(s['proving-transfer'],true);assert.equal(s['proving-endurance'],true);
  assert.equal(s['hearth-transfer'],true);assert.equal(s['hearth-endurance'],true);
  assert.equal(initialFoldedState()['proving-endurance'],false);
});

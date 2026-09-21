import test from 'node:test';
import assert from 'node:assert/strict';
import { foldedBattles, foldedControls, foldedPickups, foldedSolids, foldedLiftDefs, initialFoldedState, releaseFolded, foldedSupport } from './folded-layout.js';
import { circuitLinks, createCircuitSignals } from './folded-circuits.js';
import { pullSlide } from './folded-mechanisms.js';
import { explorationEnemies } from './folded-exploration-layout.js';

test('one Mortar lesson powers both freight returns only after the cable arrives, including reload',()=>{
  const state=initialFoldedState(),next={...state};
  assert.ok(releaseFolded('loading-return','mortar',{mortar:true},next,[]));
  const links=circuitLinks(foldedControls,foldedSolids,foldedLiftDefs),signals=createCircuitSignals(state,links);
  const changes=Object.fromEntries(Object.entries(next).filter(([k,v])=>v===true&&!state[k]));
  signals.trigger('loading-return',changes);signals.advance(.1);
  assert.equal(state['bridge-crane'],false);assert.equal(state['loading-return'],false);
  const loaded=initialFoldedState(JSON.parse(JSON.stringify(state))),restored=createCircuitSignals(loaded,links);
  restored.advance(signals.duration('loading-return'));
  assert.equal(loaded['bridge-crane'],true);assert.equal(loaded['loading-return'],true);
  const legacy=initialFoldedState({pendingSignals:{'loading-return':{remaining:1,duration:3,changes:{'loading-return':true}}}});
  createCircuitSignals(legacy,links).advance(1);assert.equal(legacy['bridge-crane'],true);
  for(const id of ['bridge-crane','freight','reservoir-transfer','arsenal-transfer','lens-transfer'])assert.equal(foldedControls.some(c=>c.id===id),false,id);
});

test('the separator magnetic screen moves in both directions and persists its physical position',()=>{
 const state=initialFoldedState(),body=state.bodies.solids.find(b=>b.id==='coolant-transfer');
 const obstacles=state.bodies.solids.filter(b=>b!==body&&(b.permanent||b.rail||!state[b.id]));
 const support=(x,z,y)=>!!foldedSupport(x,z,y);
 for(const [direction,expected]of [[-1,166],[1,180]]){
  for(let i=0;i<600;i++){const player={x:340,y:-24,z:body.z+6+direction*9};assert.ok(foldedSupport(player.x,player.z,player.y));pullSlide(body,player,1/60,obstacles,support);}
  assert.ok(Math.abs(body.z-expected)<.01,`${body.z} should reach ${expected}`);
 }
 state.slidePositions[body.id]=170;
 assert.equal(initialFoldedState(JSON.parse(JSON.stringify(state))).bodies.solids.find(b=>b.id===body.id).z,170);
});

test('the finite battery guards a remote reward instead of a through-route pickup',()=>{
 const battery=explorationEnemies.filter(e=>e.battle==='cargo-battery');
 assert.equal(battery.length,4);assert.ok(battery.every(e=>e.emplacement&&e.type==='artillery'));
 assert.equal(battery.filter(e=>e.x<0).length,2);
 const reward=foldedPickups.find(p=>p.id==='cannon-coil');assert.equal(reward.requires,'cargo-battery');
 const links=circuitLinks(foldedBattles,foldedSolids,foldedLiftDefs);
 assert.ok(links.some(l=>l.id==='cargo-battery'&&l.points.at(-1)[2]===reward.z));
 const restored=initialFoldedState({'cannon-coil':true});assert.equal(restored['cargo-battery'],true);
});

test('equipment placements do not cluster around another acquisition',()=>{
 // This catches gross crowding; route fixtures separately prove the detours.
 for(const reward of foldedPickups.filter(p=>p.upgrade))for(const other of foldedPickups){
  if(reward.id===other.id)continue;
  assert.ok(Math.hypot(reward.x-other.x,reward.y-other.y,reward.z-other.z)>45,`${reward.id} crowds ${other.id}`);
 }
});

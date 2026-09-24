import {settleControl} from '../../tests/fixtures/settled-control.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { foldedBattles, foldedControls, foldedPickups, foldedSolids, foldedLiftDefs, initialFoldedState } from '../world/terrain.js';
import { circuitLinks, createCircuitSignals } from '../machinery/circuits.js';
import { explorationEnemies } from './exploration-layout.js';

test('one Mortar lesson powers both freight returns only after the cable arrives, including reload',()=>{
  const state=initialFoldedState(),next={...state};
  assert.ok(settleControl('loading-return','mortar',{mortar:true},next,[]));
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
 // This catches crowding within nearby floors; route fixtures prove separate expeditions.
 for(const reward of foldedPickups.filter(p=>p.upgrade))for(const other of foldedPickups){
  if(reward.id===other.id)continue;
  if(Math.abs(reward.y-other.y)>=24)continue;
  assert.ok(Math.hypot(reward.x-other.x,reward.y-other.y,reward.z-other.z)>45,`${reward.id} crowds ${other.id}`);
 }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {circuitLinks,circuitEventSources,createCircuitSignals} from './folded-circuits.js';
import {foldedDecks,foldedSolids,foldedArchitecture,foldedControls,foldedLiftDefs,foldedBattles,initialFoldedState,activeSolid} from './folded-layout.js';
import {stepLifts} from './folded-machinery.js';
import {orthogonalCircuit} from './folded-circuit-routing.js';
import {Scene,Vector3} from 'three';
import {makeSidePuzzles} from './folded-side-puzzles.js';

const sources=[...foldedControls,...foldedBattles,...circuitEventSources];
const links=circuitLinks(sources,foldedSolids,foldedLiftDefs,foldedDecks,foldedArchitecture.solids);

function square(points,label){for(let i=1;i<points.length;i++)assert.equal(points[i].filter((v,j)=>Math.abs(v-points[i-1][j])>1e-7).length,1,`${label}: ${points[i-1]} -> ${points[i]}`);}
test('all remote and legacy circuit segments use exactly one world axis',()=>{
  for(const l of [...links,...circuitLinks(sources,foldedSolids,foldedLiftDefs)])square(l.points,`${l.id} -> ${l.target}`);
  const input=[[0,0,0],[8,4,10],[8,4,10],[1,-2,-5]],result=orthogonalCircuit(input);
  square(result,'rectangular route');assert.deepEqual(result[0],input[0]);assert.deepEqual(result.at(-1),input.at(-1));
});
test('a change in floor height uses one riser and one long run, never a staircase',()=>{
  for(const input of [[[230,24.28,12],[230,16.28,36]],[[230,16.28,36],[230,24.28,12]]]){
    const result=orthogonalCircuit(input);square(result,'ramp bypass');assert.equal(result.length,3);
  }
});
test('the gallery ramp uses a long edge run with a single full-height riser',()=>{
  const ramp=foldedDecks.find(d=>d.id==='gallery-descent');
  for(const link of links.filter(l=>l.id==='garden-optical')){
    const segments=link.points.slice(1).map((b,i)=>({a:link.points[i],b}));
    const risers=segments.filter(({a,b})=>Math.abs(a[1]-b[1])>.1&&a[2]>ramp.z+2&&a[2]<=ramp.z+ramp.d&&a[0]>=ramp.x&&a[0]<=ramp.x+ramp.w);
    assert.equal(risers.length,1);assert.ok(Math.abs(risers[0].a[1]-risers[0].b[1])>=Math.abs(ramp.rise)-.1);
    assert.ok(segments.some(({a,b})=>Math.abs(a[2]-b[2])>ramp.d-2&&Math.min(Math.abs(a[0]-ramp.x),Math.abs(a[0]-ramp.x-ramp.w))<.5));
  }
  assert.deepEqual(orthogonalCircuit([[0,0,0],[10,0,0],[4,0,0],[4,0,5]]),[[0,0,0],[4,0,0],[4,0,5]]);
});
test('all six rendered side-puzzle wires have square bends',()=>{
  const scene=new Scene();makeSidePuzzles(scene,initialFoldedState());scene.updateMatrixWorld(true);
  const feeds=scene.children.filter(r=>r.name.startsWith('side-circuit:'));assert.equal(feeds.length,6);
  for(const f of feeds)f.traverse(m=>{if(!m.isMesh)return;const a=m.localToWorld(new Vector3(0,0,-.5)),b=m.localToWorld(new Vector3(0,0,.5));square([a.toArray(),b.toArray()],f.name);});
});

test('every lift and every extra switch effect has an incoming circuit',()=>{
  for(const lift of foldedLiftDefs)assert.ok(links.some(l=>l.target===lift.id),lift.id);
  for(const [id,target]of [['coolant-return','coolant-maintenance-bridge'],['coolant-return','coolant-return-lift'],['maintenance','tender-drive']])assert.ok(links.some(l=>l.id===id&&l.target===target),`${id} -> ${target}`);
  for(const c of foldedControls.filter(c=>c.mount&&!c.slide))assert.ok(links.some(l=>l.id===c.id&&l.local),c.id);
  for(const c of foldedControls.filter(c=>c.slide))assert.ok(!links.some(l=>l.id===c.id),'a moved cover is not a remote electrical unlock');
});

test('rendered cable centerlines never enter a closed wall, cabinet or architectural pier',()=>{
  const obstacles=[...foldedSolids,...foldedArchitecture.solids].filter(s=>!s.invisible&&!s.rail&&!s.motion);
  for(const l of links.filter(l=>!l.local))for(let i=1;i<l.points.length;i++){
    const a=l.points[i-1],b=l.points[i],length=Math.hypot(...a.map((v,j)=>v-b[j])),steps=Math.max(1,Math.ceil(length/.3));
    for(let n=0;n<=steps;n++){
      const p=a.map((v,j)=>v+(b[j]-v)*n/steps);
      const inside=obstacles.find(s=>p[0]>s.x+.02&&p[0]<s.x+s.w-.02&&p[2]>s.z+.02&&p[2]<s.z+s.d-.02&&p[1]>s.y+.01&&p[1]<s.y+s.h-.01);
      assert.equal(inside,undefined,`${l.id} -> ${l.target} at ${p} enters ${inside?.id}`);
    }
  }
});

test('external unlocks keep their destroyed barrier open but delay their lift until power arrives',()=>{
  const state=initialFoldedState(),signals=createCircuitSignals(state,links),body=state.bodies.solids.find(s=>s.id==='coolant-return');
  state['coolant-return']=true;assert.ok(signals.trigger('coolant-return',{},true));
  assert.equal(activeSolid(body,state),false,'the destroyed barrier must not reappear');
  const def=foldedLiftDefs.find(l=>l.id==='coolant-maintenance-bridge'),lift={...def,y:def.stops[1],destination:def.stops[0],wait:0},player={x:10000,y:0,z:10000};
  stepLifts([lift],state,player,1);assert.equal(lift.y,def.stops[1]);
  signals.advance(signals.duration('coolant-return'));stepLifts([lift],state,player,1);assert.ok(lift.y<def.stops[1]);
});

test('delivery start uses its cable while completion remains a separate persistent outcome',()=>{
  const state=initialFoldedState(),signals=createCircuitSignals(state,links);
  assert.ok(signals.trigger('maintenance',{'maintenance-started':true}));
  assert.equal(state['maintenance-started'],false);assert.equal(state.maintenance,false);
  signals.advance(signals.duration('maintenance')/2);assert.equal(state['maintenance-started'],false);
  const saved=initialFoldedState(JSON.parse(JSON.stringify(state))),resumed=createCircuitSignals(saved,links);
  resumed.advance(signals.duration('maintenance'));assert.equal(saved['maintenance-started'],true);assert.equal(saved.maintenance,false);
});

test('power routes stay on fixed shaft rims instead of crossing a moving platform',()=>{
  for(const link of links.filter(l=>!l.local))for(let i=1;i<link.points.length;i++){
    const a=link.points[i-1],b=link.points[i],steps=Math.max(1,Math.ceil(Math.hypot(...a.map((v,j)=>v-b[j]))/.3));
    for(let n=0;n<=steps;n++){
      const p=a.map((v,j)=>v+(b[j]-v)*n/steps);
      const shaft=foldedLiftDefs.find(l=>p[0]>l.x+.65&&p[0]<l.x+l.w-.65&&p[2]>l.z+.65&&p[2]<l.z+l.d-.65&&l.stops.some(y=>Math.abs(p[1]-y-.28)<.1));
      assert.equal(shaft,undefined,`${link.id} crosses the unsupported interior of ${shaft?.id}`);
    }
  }
});

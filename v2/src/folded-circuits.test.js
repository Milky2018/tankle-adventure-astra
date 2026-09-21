import test from 'node:test';
import assert from 'node:assert/strict';
import {circuitLinks,circuitColor} from './folded-circuits.js';
import {foldedControls,foldedSolids,foldedLiftDefs,initialFoldedState} from './folded-layout.js';
import {SIGNAL} from './folded-visibility.js';

test('circuits include linked shutters, remote returns, carrier and optical returns',()=>{
  const links=circuitLinks(foldedControls,foldedSolids,foldedLiftDefs);
  assert.equal(links.filter(l=>l.id==='pump').length,1);
  assert.equal(links.filter(l=>l.id==='pressure-return').length,2);
  for(const [source,target]of [['load','inspection-load'],['load','carrier'],['lens-return','lens-return'],['relay-east','relays'],['garden-optical','garden-lift'],['loading-return','freight-platform']])assert.ok(links.some(l=>l.id===source&&l.target===target));
});

test('activation changes the cable behind the traveling front, not the entire cable at once',()=>{
  assert.equal(circuitColor(false,5,.8),SIGNAL.ready);
  assert.equal(circuitColor(true,1,.1),SIGNAL.open);
  assert.equal(circuitColor(true,1,.8),SIGNAL.ready);
  assert.equal(circuitColor(true,4,.8),SIGNAL.open);
  assert.equal(circuitColor(true,Infinity,.8),SIGNAL.open);
});

test('the switch latches immediately but its mechanism waits for every cable endpoint',async()=>{
  const {createCircuitSignals}=await import('./folded-circuits.js');
  const state={gate:false},links=[{id:'gate',points:[[0,0,0],[36,0,0]]},{id:'gate',points:[[0,0,0],[0,0,9]]}];
  const signals=createCircuitSignals(state,links);
  assert.equal(signals.trigger('gate',{gate:true,brake:true}),true);
  assert.equal(signals.active('gate'),true);assert.equal(state.gate,false);
  signals.advance(1);assert.equal(state.gate,false);assert.equal(state.brake,undefined);
  assert.equal(signals.trigger('gate',{gate:true}),false);
  const restored=initialFoldedState(JSON.parse(JSON.stringify(state))),resume=createCircuitSignals(restored,links);
  resume.advance(.99);assert.ok(!restored.gate);
  resume.advance(.01);assert.equal(restored.gate,true);assert.equal(restored.brake,true);
  assert.deepEqual(restored.pendingSignals,{});
});

test('remote magnetic connections retain visible cables outside their closed machinery',()=>{
  const controls=foldedControls.filter(c=>c.kind==='magnet'&&!c.slide);
  for(const c of controls){
    const links=circuitLinks([c],foldedSolids,foldedLiftDefs);
    if(!links.length){assert.ok(c.mount,c.id);continue;}
    for(const link of links){
      let length=0;
      for(let i=1;i<link.points.length;i++){
        const a=link.points[i-1],b=link.points[i],span=Math.hypot(...b.map((v,j)=>v-a[j]));length+=span;
        for(let n=0;n<=Math.ceil(span/.2);n++){
          const t=n/Math.max(1,Math.ceil(span/.2)),p=a.map((v,j)=>v+(b[j]-v)*t);
          const inside=foldedSolids.find(s=>p[0]>s.x-.07&&p[0]<s.x+s.w+.07&&p[2]>s.z-.07&&p[2]<s.z+s.d+.07&&p[1]>s.y&&p[1]<s.y+s.h+.07);
          assert.equal(inside,undefined,`${c.id} cable enters its closed actuator at ${p}`);
        }
      }
      assert.ok(length>=2,`${c.id} has no readable connection`);
    }
  }
});

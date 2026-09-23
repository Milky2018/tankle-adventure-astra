import test from 'node:test';
import assert from 'node:assert/strict';
import {circuitLinks,circuitColor} from './folded-circuits.js';
import {foldedControls,foldedSolids,foldedLiftDefs,initialFoldedState} from './folded-layout.js';
import {SIGNAL} from './folded-visibility.js';

test('circuits include linked shutters, remote returns, carrier and optical returns',()=>{
  const links=circuitLinks(foldedControls,foldedSolids,foldedLiftDefs);
  assert.equal(links.filter(l=>l.id==='pump'&&!l.local).length,1);
  assert.equal(links.filter(l=>l.id==='pressure-return').length,2);
  for(const [source,target]of [['load','inspection-load'],['load','carrier'],['lens-return','lens-return'],['relay-east','relays'],['garden-optical','garden-lift'],['loading-return','freight-platform']])assert.ok(links.some(l=>l.id===source&&l.target===target));
});

test('activation changes the cable behind the traveling front, not the entire cable at once',()=>{
  assert.equal(circuitColor(false,5,.8),SIGNAL.ready);
  assert.equal(circuitColor(true,1,.1),SIGNAL.open);
  assert.equal(circuitColor(true,1,.8),SIGNAL.ready);
  assert.equal(circuitColor(true,4,.8),SIGNAL.open);
  assert.equal(circuitColor(true,Infinity,.8),SIGNAL.open);
  assert.equal(circuitColor(true,1.4-Number.EPSILON,1,1.4),SIGNAL.open);
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
    for(const link of links.filter(l=>!l.local)){
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

test('the sequential Foundry doors have independent switches and no redundant cross-feed',async()=>{
  const {releaseFolded}=await import('./folded-layout.js');
  const links=circuitLinks(foldedControls,foldedSolids,foldedLiftDefs);
  assert.equal(links.some(l=>l.id==='relay-west'&&l.target==='relays'),false);
  const state=initialFoldedState(),next={...state};
  assert.ok(releaseFolded('relay-east','cannon',{},next,[]));
  assert.equal(next.relays,true);assert.equal(next['relay-west'],false);
  const {createCircuitSignals}=await import('./folded-circuits.js');
  const signals=createCircuitSignals(state,links);
  signals.trigger('relay-east',{'relay-east':true,relays:next.relays});
  signals.advance(signals.duration('relay-east')-.01);assert.equal(state.relays,false);
  signals.advance(.01);assert.equal(state.relays,true);assert.equal(state['relay-west'],false);
  assert.equal(initialFoldedState({'relay-east':true}).relays,true);
  const old=initialFoldedState({pendingSignals:{'relay-east':{remaining:.2,duration:1.4,changes:{'relay-east':true}}}});
  createCircuitSignals(old,links).advance(.2);assert.equal(old.relays,true);
});

test('the first Foundry switch opens only its door onto a permanently level passage',async()=>{
  const {foldedSupport,moveFolded,releaseFolded}=await import('./folded-layout.js');
  assert.equal(foldedLiftDefs.some(l=>l.id==='foundry-loading-frame'),false);
  const links=circuitLinks(foldedControls,foldedSolids,foldedLiftDefs);
  assert.deepEqual(links.filter(l=>l.id==='relay-west').map(l=>l.target),['relay-west']);
  for(const x of [-60,-55,-50])for(const z of [45,50,55])assert.equal(foldedSupport(x,z,-16)?.height,-16);
  const state=initialFoldedState(),p={x:-44,y:-16,z:50,speed:1};
  for(let i=0;i<80;i++)moveFolded(p,-.15,0,state);
  assert.ok(p.x>-47,'first door must still block the passage');
  releaseFolded('relay-west','cannon',p,state,[]);
  for(let i=0;i<80;i++)moveFolded(p,-.15,0,state);
  assert.ok(p.x<-55);assert.equal(p.y,-16);
});

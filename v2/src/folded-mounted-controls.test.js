import test from 'node:test';
import assert from 'node:assert/strict';
import {foldedControls,foldedSolids,foldedLiftDefs,initialFoldedState,activeSolid} from './folded-layout.js';
import {circuitLinks,createCircuitSignals} from './folded-circuits.js';

test('redundant loose cover locks and the same-side rig gate are absent',()=>{
  for(const id of ['dock-cover','rig-cover','yard-cover','rig']){
    assert.ok(!foldedControls.some(c=>c.id===id),id);
    assert.ok(!foldedSolids.some(s=>s.id===id),id);
  }
});
test('local releases sit on the actuator face and have no artificial local power delay',()=>{
  const links=circuitLinks(foldedControls,foldedSolids,foldedLiftDefs);
  for(const c of foldedControls.filter(c=>c.mount)){
    const b=foldedSolids.find(b=>b.id===c.mount),[nx,,nz]=c.facing;
    assert.equal(b.localControl,c.id);
    assert.ok(c.y>b.y&&c.y<b.y+b.h,c.id);
    assert.ok(Math.abs(c.x-(b.x+b.w*(nz?(c.mountAlong??.5):.5)+nx*(b.w/2+.1)))<1e-6,c.id);
    assert.ok(Math.abs(c.z-(b.z+b.d*(nx?(c.mountAlong??.5):.5)+nz*(b.d/2+.1)))<1e-6,c.id);
    assert.equal(links.filter(l=>l.id===c.id).length,['arsenal-return','pump'].includes(c.id)?1:0,c.id);
  }
});
test('a mounted lock releases its own door immediately while the remote gate waits for power',()=>{
  for(const id of ['arsenal-return','pump']){
    const s=initialFoldedState(),links=circuitLinks(foldedControls,foldedSolids,foldedLiftDefs),signals=createCircuitSignals(s,links);
    const local=s.bodies.solids.find(b=>b.localControl===id),remote=s.bodies.solids.find(b=>b.id===id&&!b.localControl);
    assert.ok(activeSolid(local,s));assert.ok(activeSolid(remote,s));
    signals.trigger(id,{[id]:true});
    assert.equal(activeSolid(local,s),false);assert.ok(activeSolid(remote,s));
    const restored=initialFoldedState(JSON.parse(JSON.stringify(s)));
    assert.equal(activeSolid(local,restored),false);assert.ok(activeSolid(remote,restored));
    signals.advance(signals.duration(id));assert.equal(activeSolid(remote,s),false);
  }
});

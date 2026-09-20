import test from 'node:test';
import assert from 'node:assert/strict';
import {foldedControls,initialFoldedState,releaseFolded,activeSolid} from './folded-layout.js';

const locks=['rail-repair','magnet','arsenal-return','collimator-drawer'];
test('ordinary magnetic locks release once without a rail or a pulling-side requirement',()=>{
  for(const id of locks){
    const c=foldedControls.find(c=>c.id===id),state=initialFoldedState();
    assert.equal(c.slide,undefined,id);
    assert.equal(releaseFolded(id,'cannon',{magnet:true},state,[]),false,id);
    assert.equal(releaseFolded(id,'magnet',{magnet:false},state,[]),false,id);
    assert.equal(releaseFolded(id,'magnet',{magnet:true,x:0,y:0,z:0},state,[]),true,id);
    assert.equal(releaseFolded(id,'magnet',{magnet:true},state,[]),false,id);
    const restored=initialFoldedState(JSON.parse(JSON.stringify(state)));
    assert.equal(restored[id],true,id);
    for(const b of restored.bodies.solids.filter(b=>b.id===id)){assert.equal(b.rail,undefined,id);assert.equal(activeSolid(b,restored),false,id);}
  }
});
test('completed legacy magnetic locks survive obsolete rail coordinates',()=>{
  const state=initialFoldedState({'arsenal-return':true,'collimator-drawer':true,slidePositions:{'arsenal-return':-44,'collimator-drawer':-70}});
  for(const id of ['arsenal-return','collimator-drawer']){
    assert.equal(state[id],true);assert.equal(state.slidePositions[id],undefined);
    assert.equal(activeSolid(state.bodies.solids.find(b=>b.id===id),state),false);
  }
  assert.equal(foldedControls.find(c=>c.id==='bench-cover').slide,'bench-cover');
});

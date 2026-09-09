import test from 'node:test';
import assert from 'node:assert/strict';
import { createRailPuzzle, createBasinPuzzle, createGutterPuzzle } from './puzzle-rules.js';
const tick=(p,seconds)=>{for(let i=0;i<seconds*60;i++)p.update(1/60);};
test('every incorrect rail setting returns to the signal and can be retried',()=>{
  for(const switches of [[false,false],[false,true],[true,false]]){
    const p=createRailPuzzle({switches});assert.ok(p.act('rail-carrier'));tick(p,15);
    assert.equal(p.state.secured,false);assert.equal(p.state.moving,false);assert.deepEqual(p.position(),{x:-38,z:-104});assert.ok(p.act('rail-a'));
  }
});
test('docking opens the crossing immediately and migrates an already secured carrier',()=>{
  const p=createRailPuzzle();p.act('rail-a');p.act('rail-b');p.act('rail-carrier');assert.equal(p.act('rail-a'),false);assert.equal(p.act('rail-carrier'),false);tick(p,7);
  assert.ok(p.state.secured);assert.ok(p.state.solved);assert.equal(p.act('rail-a'),false);
  const restored=createRailPuzzle({secured:true,solved:false});assert.ok(restored.state.solved);assert.deepEqual(restored.position(),{x:-24,z:-94});
});
test('a carrier waits for an occupant, can be recalled, and resumes at the signal after an interrupted trip',()=>{
  const p=createRailPuzzle();p.act('rail-a');p.act('rail-b');p.act('rail-carrier');p.update(1,()=>true);assert.deepEqual(p.position(),{x:-38,z:-104});
  tick(p,2);assert.notEqual(p.position().x,-38);assert.deepEqual(createRailPuzzle(p.serialize()).position(),{x:-38,z:-104});p.act('rail-signal');tick(p,3);assert.equal(p.state.moving,false);assert.deepEqual(p.position(),{x:-38,z:-104});
});
test('leaving the pump plate lowers an unsecured pontoon and permits another attempt',()=>{
  const p=createBasinPuzzle();assert.equal(p.act('basin-lock'),false);p.press(true);tick(p,3.1);assert.equal(p.state.level,1);p.press(false);tick(p,3.1);assert.equal(p.state.level,0);assert.equal(p.state.solved,false);assert.equal(p.state.locked,false);
});
test('shooting the raised catch persists, while reload never preserves phantom weight on the pump',()=>{
  let p=createBasinPuzzle();p.press(true);tick(p,3.1);assert.ok(p.act('basin-lock'));p=createBasinPuzzle(p.serialize());assert.ok(p.state.locked);assert.equal(p.state.filling,false);tick(p,3.1);assert.ok(p.state.solved);assert.ok(createBasinPuzzle(p.serialize()).state.solved);
  const unfinished=createBasinPuzzle({level:1,filling:true});tick(unfinished,3.1);assert.equal(unfinished.state.level,0);assert.equal(unfinished.state.locked,false);
});
test('the pressure pump and retaining pin reject an occupied passage',()=>{
  const p=createBasinPuzzle();p.press(true,true);assert.equal(p.state.filling,false);p.press(true);tick(p,3.1);assert.equal(p.act('basin-lock',true),false);
});
test('both gutters must feed the planter; wrong alignments remain retryable without rewards',()=>{
  for(let a=0;a<3;a++)for(let b=0;b<3;b++){
    const p=createGutterPuzzle({angles:[a,b],unplugged:true});tick(p,2.1);assert.equal(p.state.grown,a===1&&b===2);
  }
  const p=createGutterPuzzle({unplugged:true});p.act('gutter-a');p.act('gutter-b');p.act('gutter-b');tick(p,1);assert.ok(p.state.fill>0&&p.state.fill<1);p.act('gutter-a');tick(p,1.1);assert.equal(p.state.fill,0);
});
test('a restored plant keeps its pose and cannot be accidentally undone',()=>{
  const p=createGutterPuzzle({angles:[1,2],unplugged:true});tick(p,2.1);assert.equal(p.act('gutter-a'),false);const restored=createGutterPuzzle(p.serialize());assert.ok(restored.state.grown);assert.deepEqual(restored.state.angles,[1,2]);assert.equal(restored.state.fill,1);
});
test('alignment needs an open pipe and a settled gutter, while an old restored plant keeps its water',()=>{
  const p=createGutterPuzzle({angles:[1,2]});tick(p,3);assert.equal(p.state.fill,0);assert.ok(p.unplug());assert.equal(p.unplug(),false);p.update(3,false);assert.equal(p.state.fill,0);tick(p,2.1);assert.ok(p.state.grown);
  assert.ok(createGutterPuzzle({grown:true}).state.unplugged);
});

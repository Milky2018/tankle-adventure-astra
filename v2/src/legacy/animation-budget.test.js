import { test } from 'node:test';
import assert from 'node:assert/strict';
import { animationDelta } from './animation-budget.js';

test('distant animation keeps elapsed time and updates immediately on approach', () => {
  const far={},near={};let total=0,updates=0;
  for(let i=0;i<60;i++){
    const dt=animationDelta(far,1/60,false);total+=dt;if(dt)updates++;
    assert.equal(animationDelta(near,1/60,true),1/60);
  }
  total+=animationDelta(far,1/60,true);
  assert(Math.abs(total-61/60)<1e-9);
  assert(updates>=8&&updates<=10);
  assert.equal(animationDelta(far,1/60,true),1/60);
});

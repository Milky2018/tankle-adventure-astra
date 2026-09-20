import test from 'node:test';
import assert from 'node:assert/strict';
import {beginPlayerHit,hitDisplacement,hitOpacity,playerStunned} from './folded-combat.js';
import {damagePlayer,newPlayer} from './mechanics.js';
import {initialFoldedState,moveFolded,foldedSupport} from './folded-layout.js';

function struck(values={}){
  const p={...newPlayer(),x:0,z:0,...values};
  damagePlayer(p,5,1);beginPlayerHit(p,1,{x:p.x-5,z:p.z});return p;
}
test('hit recoil is brief, frame independent, and ends before control recovery',()=>{
  for(const dt of [1/30,1/60,1/120]){
    const p=struck();let distance=0;
    for(let i=1;i<=Math.round(.6/dt);i++)distance+=hitDisplacement(p,1+i*dt,dt).x;
    assert.ok(Math.abs(distance-1.2)<1e-9);
    assert.equal(hitDisplacement(p,1.3,.01).x,0);
    assert.ok(playerStunned(p,1.59));assert.equal(playerStunned(p,1.6),false);
    assert.equal(hitOpacity(p,1.01),.3);assert.equal(hitOpacity(p,1.09),1);
    assert.equal(hitOpacity(p,1.6),1);
  }
});
test('knockback resolves against the actual closed ferry wall without losing support',()=>{
  const p=struck({x:-42.6,y:-8,z:-8}),s=initialFoldedState();
  for(let i=1;i<=36;i++){const d=hitDisplacement(p,1+i/60,1/60);moveFolded(p,d.x,d.z,s);}
  assert.ok(p.x>-42.6&&p.x<=-41.4);
  assert.ok(foldedSupport(p.x,p.z,p.y));
});

test('a hit preserves the driver speed while supplying an independent directional impulse',()=>{
 const p=struck({speed:3.2});
 assert.equal(p.speed,3.2);assert.ok(hitDisplacement(p,1.05,.05).x>0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { makeCombatProps, VOLATILE } from './combat-props.js';

test('pressure vessels warn before exploding and repeated hits do not shorten the fuse',()=>{
  const c=makeCombatProps(new T.Scene(),{obstacles:[]}),p=c.props.find(p=>p.kind==='tank');
  assert.equal(c.hit(p,1),'fuse');assert.equal(p.bounds.active,true);assert.equal(p.warning.visible,true);
  c.update(.3,0);const remaining=p.fuse;assert.equal(c.hit(p,10),null);assert.equal(p.fuse,remaining);
  assert.equal(c.update(.3,.3).length,0);assert.deepEqual(c.update(VOLATILE.fuse,.6),[p]);assert.equal(p.bounds.active,false);assert.equal(p.warning.visible,false);
  assert.equal(c.update(1,2).length,0);
});
test('crates open a physical passage and resting rebuilds combat cover without retaining a lit fuse',()=>{
  const c=makeCombatProps(new T.Scene(),{obstacles:[]}),crate=c.props.find(p=>p.kind==='crate'),tank=c.props.find(p=>p.kind==='tank');
  assert.equal(c.hit(crate,1),'hit');assert.equal(crate.bounds.active,true);assert.equal(c.hit(crate,1),'break');assert.equal(crate.bounds.active,false);
  c.hit(tank,1);c.reset();assert.equal(crate.bounds.active,true);assert.equal(crate.hp,2);assert.equal(tank.fuse,-1);assert.equal(tank.warning.visible,false);
});

import {settleControl} from '../../tests/fixtures/settled-control.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {foldedControls,initialFoldedState} from '../world/terrain.js';
import {controlHousingParts,controlCoverPart} from './control-housing.js';

test('resolved hits on exposed controls do not depend on shooter position or floor',()=>{
  for(const c of foldedControls.filter(c=>c.facing)){
    const state=initialFoldedState(c.requires?{[c.requires]:true}:{});
    assert.ok(controlHousingParts(c).length,c.id);
    assert.ok(settleControl(c.id,c.kind==='magnet'?'magnet':'cannon',{x:900,y:900,z:900,phoenix:false,magnet:true},state,[]),c.id);
  }
});
test('every prerequisite has a physical cover and unavailable controls stay closed',()=>{
  for(const c of foldedControls.filter(c=>c.requires)){
    assert.ok(controlCoverPart(c),c.id);
    assert.equal(settleControl(c.id,c.kind==='laser'?'laser':'cannon',{},initialFoldedState(),[]),false,c.id);
  }
  for(const c of foldedControls)assert.equal(c.approach,undefined,c.id);
});

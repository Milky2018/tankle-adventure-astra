import test from 'node:test';
import assert from 'node:assert/strict';
import {foldedControls} from './folded-layout.js';
import {explorationSolids} from './folded-exploration-layout.js';

test('all indirect-impact mechanisms present horizontal collecting trays',()=>{
  const ids=['loading-return','load','hearth-transfer','mortar-cache'];
  assert.deepEqual(foldedControls.filter(c=>c.surface==='top').map(c=>c.id).sort(),ids.sort());
  for(const c of foldedControls.filter(c=>c.kind==='shot'&&!c.mount&&c.ground!==undefined&&c.y-c.ground>3))assert.equal(c.surface,'top',c.id);
  const cache=foldedControls.find(c=>c.id==='mortar-cache');
  const cabinet=explorationSolids.find(s=>s.id==='mortar-cache-cabinet');
  assert.ok(cache.y-(cabinet.y+cabinet.h)<.5,'The optional tray rests on its cabinet rather than a tall target post');
});

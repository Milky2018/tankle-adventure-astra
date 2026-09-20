import test from 'node:test';
import assert from 'node:assert/strict';
import {circuitLinks,circuitColor} from './folded-circuits.js';
import {foldedControls,foldedSolids,foldedLiftDefs} from './folded-layout.js';
import {cityMirrors} from './folded-city-layout.js';
import {SIGNAL} from './folded-visibility.js';

test('circuits include linked shutters, remote returns, carrier and rotating mirror',()=>{
  const links=circuitLinks(foldedControls,foldedSolids,foldedLiftDefs,cityMirrors);
  assert.equal(links.filter(l=>l.id==='pump').length,2);
  assert.equal(links.filter(l=>l.id==='pressure-return').length,4);
  for(const [source,target]of [['load','carrier'],['relay-east','relays'],['mirror-index','return-index'],['garden-optical','garden-lift'],['bridge-crane','freight-platform']])assert.ok(links.some(l=>l.id===source&&l.target===target));
});

test('activation changes the cable behind the traveling front, not the entire cable at once',()=>{
  assert.equal(circuitColor(false,5,.8),SIGNAL.ready);
  assert.equal(circuitColor(true,1,.1),SIGNAL.open);
  assert.equal(circuitColor(true,1,.8),SIGNAL.ready);
  assert.equal(circuitColor(true,4,.8),SIGNAL.open);
  assert.equal(circuitColor(true,Infinity,.8),SIGNAL.open);
});

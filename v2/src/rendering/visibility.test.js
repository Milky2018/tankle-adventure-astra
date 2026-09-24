import test from 'node:test';
import assert from 'node:assert/strict';
import { cameraApertureOpacity } from './visibility.js';

test('freight overhead ramp stays opaque outside the tank sightline',()=>{
  const p={x:-17,y:0,z:-35},camera={x:-17,y:8.169000801966748,z:-48.80890396753294};
  for(const z of [-44,-43,-42,-41,-40]){
    const point={x:-17,y:16-(z+68)*.25-.325,z};
    assert.equal(cameraApertureOpacity(point,p,camera),1,`unobstructing ramp at ${z}`);
  }
});

test('camera cutaway narrows toward the eye and stops behind the tank',()=>{
  const p={x:0,y:0,z:0},camera={x:0,y:5,z:-12};
  for(const t of [.25,.5,.75,.95]){
    const point={x:0,y:1.6+(camera.y-1.6)*t,z:camera.z*t};
    assert.ok(cameraApertureOpacity(point,p,camera)<.3,`blocker at ${t}`);
    assert.equal(cameraApertureOpacity({...point,x:2.3},p,camera),1,`beside sightline at ${t}`);
  }
  assert.equal(cameraApertureOpacity({x:0,y:2.6,z:.4},p,camera),1);
  assert.equal(cameraApertureOpacity({x:0,y:5.1,z:-12.4},p,camera),1);
});

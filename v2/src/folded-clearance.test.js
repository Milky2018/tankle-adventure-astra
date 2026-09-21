import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { foldedArchitecture, foldedControls, foldedSolids } from './folded-layout.js';
import { sideObstacles } from './folded-side-layout.js';
import { carrierRoute } from './puzzle-layout.js';
import { BARRAGE } from './folded-attacks.js';
import { mortarPosition } from './folded-ballistics.js';

const solids = [...foldedSolids, ...sideObstacles, ...foldedArchitecture.solids];
const intersects = (x,y,z,s,r=0) => x+r>s.x && x-r<s.x+s.w && z+r>s.z && z-r<s.z+s.d && y>s.y && y<s.y+s.h;

test('switch faces and rail treadles stay outside unrelated scenery', () => {
  const rail=[{id:'rail-a',x:-166,y:9.3,z:-80},{id:'rail-b',x:-158,y:9.3,z:-76},{id:'rail-signal',x:-176,y:9.3,z:-71}];
  for(const c of [...foldedControls,...rail])for(const s of solids)
    if(s.id!==c.id)assert.ok(!intersects(c.x,c.y,c.z,s),`${c.id} embedded in ${s.id}`);
  for(const c of rail.slice(0,2))for(const s of solids)
    assert.ok(!intersects(c.x,8.5,c.z,s,1.5),`${c.id} treadle obstructed by ${s.id}`);
  // Sample all three cart branches, including the unsuccessful return loops.
  for(const switches of [[false,false],[true,false],[true,true]]){
    const route=carrierRoute(switches);
    for(let i=1;i<route.length;i++)for(let t=0;t<=1;t+=.025){
      const x=route[i-1][0]*(1-t)+route[i][0]*t-138,z=route[i-1][1]*(1-t)+route[i][1]*t+28;
      for(const s of solids.filter(s=>s.id!=='rail-cart'))assert.ok(!intersects(x,8.7,z,s,1.1),`Cart branch intersects ${s.id}`);
    }
  }
});

test('hostile lob clears low cover with a lower launch speed and gravity', () => {
  const origin=new Vector3(0,1.5,0),target=new Vector3(24,.05,0),points=Array.from({length:121},(_,i)=>mortarPosition(origin,target,i*BARRAGE.duration/120,BARRAGE.duration,BARRAGE.height));
  const peak=Math.max(...points.map(p=>p.y));
  assert.ok(peak>9 && peak<11,'Clear tall machinery without climbing into ceilings');
  assert.ok(points.at(-1).distanceTo(target)<1e-9);
  assert.ok((target.y-origin.y+4*BARRAGE.height)/BARRAGE.duration<20);
  assert.ok(8*BARRAGE.height/BARRAGE.duration**2<21);
  assert.ok(24/BARRAGE.duration<24/1.65);
  // The non-combat return underpass fits below the original entrance floor.
  for(const r of foldedArchitecture.rooms.filter(r=>r.roof))assert.ok(r.h>=(r.id==='prototype-return'?6:16),`${r.id} needs headroom`);
});

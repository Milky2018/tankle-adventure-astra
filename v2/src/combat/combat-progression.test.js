import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3, Ray, Box3 } from 'three';
import { foldedEnemies, foldedArchitecture, foldedSupport, foldedBlocked, initialFoldedState } from '../world/terrain.js';
import { createEncounterPacing } from './encounter-pacing.js';
import { mortarPosition } from './ballistics.js';
import { MORTAR } from '../player/abilities.js';
import { BARRAGE } from './attacks.js';
import { FollowCamera } from '../rendering/camera.js';

const squad = id => foldedEnemies.filter(e => e.encounter === id);

test('veteran introductions are separate pairs before the final familiar combination', () => {
  for (const id of ['lens-entry', 'lens-gallery', 'coolant-service', 'coolant-separator', 'hearth-receiving']) {
    const group = squad(id);
    assert.equal(group.length, 2, id);
    assert.equal(group.filter(e => e.variant).length, 1, id);
    assert.ok(group.reduce((sum,e) => sum+e.hp,0) <= 29, id);
  }
  assert.deepEqual(new Set(squad('hearth-intake').map(e => e.variant)), new Set(['flanker','interceptor']));
  assert.equal(squad('hearth-intake').reduce((n,e)=>n+e.hp,0),30);
  assert.equal(squad('hearth-feed').reduce((n,e)=>n+e.hp,0),33);
  for (const e of foldedEnemies.filter(e => e.variant)) {
    assert.ok(!e.wave && !e.persistent && e.patrol, e.id);
    assert.equal(foldedSupport(e.x,e.z,e.y)?.height,e.y,e.id);
    assert.equal(foldedBlocked(e.x,e.y,e.z,initialFoldedState(),1.75),undefined,e.id);
  }
});

test('later batteries wait for their own approach but can be provoked without a kill-count gate', () => {
  for (const [id,before,inside] of [
    ['arsenal-dispatch',[-84,8,24],[-126,8,2]],
    ['lens-entry',[276,24,5],[276,24,-24]],
    ['lens-gallery',[276,24,-24],[310,24,-89]],
    ['coolant-separator',[292,-24,153],[340,-24,177]],
    ['hearth-intake',[68,-40,60],[48,-40,91]],
    ['hearth-feed',[48,-40,91],[20,-40,91]],
  ]) {
    const enemies=squad(id).map(e=>({...e,spawn:{...e}}));
    const pacing=createEncounterPacing(enemies);
    const at=q=>({x:q[0],y:q[1],z:q[2]});
    pacing.update(.1,at(before),false);
    assert.ok(enemies.every(e=>!e.awake),id);
    pacing.update(.1,at(inside),false);
    assert.ok(enemies.every(e=>e.awake),id);
    pacing.reset();pacing.wake(enemies[0]);
    assert.ok(enemies.every(e=>e.awake),id);
  }
});

function roofHit(origin,target,duration=MORTAR.duration,height=MORTAR.height) {
  const roofs=foldedArchitecture.solids.filter(s=>s.kind==='roof').map(s=>({s,box:new Box3(new Vector3(s.x,s.y,s.z),new Vector3(s.x+s.w,s.y+s.h,s.z+s.d))}));
  let previous=origin;
  for(let i=1;i<=120;i++) {
    const next=mortarPosition(origin,target,duration*i/120,duration,height),delta=next.clone().sub(previous),length=delta.length();
    const ray=new Ray(previous,delta.normalize());
    for(const {s,box} of roofs) {
      const p=ray.intersectBox(box,new Vector3());
      if(p&&p.distanceTo(previous)<=length)return s;
    }
    previous=next;
  }
  return null;
}

test('low service ceilings stop real arcs while the Siege position and mandatory tray stay open', () => {
  for(const [a,b] of [
    [[-130,10,6],[-116,8,8]],
    [[276,26,-28],[284,24,-16]],
    [[290,-22,145],[294,-24,164]],
    [[12,-38,89],[16,-40,100]],
  ]) assert.ok(roofHit(new Vector3(...a),new Vector3(...b)),`${a} must block high lobs`);
  assert.equal(roofHit(new Vector3(348,-22.5,185),new Vector3(326,-23.95,186),1.1,BARRAGE.height),null);
  assert.equal(roofHit(new Vector3(48,-38,88),new Vector3(42,-37.4,96)),null,'Keep the collecting tray usable');
  assert.equal(roofHit(new Vector3(308,26,-89),new Vector3(324,24,-89)),null,'The mirror gallery remains a lob counter');
});


test('direct-fire roofs leave default third-person camera clearance and block ordinary enemy lobs', () => {
  const camera=new FollowCamera(16/9);
  camera.update({x:0,y:0,z:0},1);
  for(const id of ['arsenal-dispatch','lens-vestibule','coolant-west-service','hearth-mounts','hearth-feed']) {
    const room=foldedArchitecture.rooms.find(r=>r.id===id);
    assert.ok(room.h>camera.camera.position.y+.5,`${id} must leave room above the default camera`);
  }
  assert.ok(roofHit(new Vector3(276,25.5,-28),new Vector3(284,24.05,-16),1.9,BARRAGE.height));
});

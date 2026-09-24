import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {foldedDecks,deckHeight} from './terrain.js';
import {groundPatches,groundHeight,createGroundPose,groundAim} from './ground.js';
import {cameraApertureOpacity,apertureOpacity} from '../rendering/visibility.js';
const ramp=foldedDecks.find(d=>d.id==='signal-ascent');
const player=z=>({x:186,y:deckHeight(ramp,z),z,heading:0});
test('uphill support stays opaque while an overhead floor still fades',()=>{
 const p=player(110),camera={x:p.x,y:p.y+5,z:p.z+12},patches=groundPatches(p);
 for(const dz of [1,2,4,6,8,12]){const point={x:p.x,y:deckHeight(ramp,p.z+dz),z:p.z+dz};assert.equal(cameraApertureOpacity(point,p,camera,patches),1);assert.equal(apertureOpacity(point,p,undefined,13,patches),1);}
 assert.ok(cameraApertureOpacity({x:p.x,y:p.y+1.6+(5-1.6)/3,z:p.z+4},p,camera,patches)<.3);
 const point={x:p.x,y:deckHeight(ramp,118),z:118};
 assert.ok(cameraApertureOpacity(point,p,camera,[])<.3,'the same ramp can fade when it is no longer the supporting surface');
});
test('a pitched hull clears the steep ramp in forward, reverse and cross-slope headings',()=>{
 for(const heading of [0,Math.PI,Math.PI/2,-Math.PI/2,.7]){
  const p={...player(110),heading},patches=groundPatches(p),pose=createGroundPose().update(p,patches,1,true);
  const normal=new T.Vector3(0,1,0).applyQuaternion(pose.orientation);
  assert.ok(normal.distanceTo(new T.Vector3(0,1,-.5).normalize())<1e-6);
  for(const side of [-1,1])for(let i=0;i<6;i++){
   const wheel=new T.Vector3(side*1.52,.5,-1.03+i*.41).applyAxisAngle(new T.Vector3(0,1,0),heading).applyQuaternion(pose.orientation);
   const distance=(pose.y+wheel.y-deckHeight(ramp,p.z+wheel.z))/Math.sqrt(1.25);
   assert.ok(distance>=.3-.001,`${heading}: wheel inside ramp ${distance}`);
  }
 }
});
test('crest and foot contact selection is continuous and excludes other layers',()=>{
 for(const z of [89.8,90,90.2,137.8,138,138.2]){
  const p={x:186,z,y:z<90?16:z>138?40:deckHeight(ramp,z),heading:0},patches=groundPatches(p);
  assert.ok(patches.length);assert.ok(patches.every(d=>Math.abs(deckHeight(d,Math.max(d.z,Math.min(d.z+d.d,z)))-p.y)<3));
  const a=groundHeight(186,z-.01,p,patches),b=groundHeight(186,z+.01,p,patches);assert.ok(Math.abs(a-b)<.02);
 }
});
test('aim follows the tilted barrel and clamps elevation relative to the hull',()=>{
 const pose=createGroundPose(),p=player(110);pose.update(p,groundPatches(p),1,true);
 const origin=new T.Vector3(p.x,p.y+2,p.z);
 for(const target of [new T.Vector3(p.x+12,p.y+4,p.z+15),new T.Vector3(p.x,p.y+100,p.z+1)]){
  const aim=groundAim(origin,target,pose.orientation);
  const barrel=new T.Vector3(0,0,1).applyEuler(new T.Euler(-aim.pitch,aim.yaw,0,'YXZ')).applyQuaternion(pose.orientation);
  assert.ok(barrel.distanceTo(aim.direction)<1e-6);assert.ok(Math.abs(aim.pitch)<=40*Math.PI/180+1e-9);
 }
});
test('both ramp gradients, lift support and water produce the expected hull normal',()=>{
 for(const d of foldedDecks.filter(d=>d.rise)){
  const p={x:d.x+d.w/2,y:deckHeight(d,d.z+d.d/2),z:d.z+d.d/2,heading:.7};
  const patches=groundPatches(p),pose=createGroundPose().update(p,patches,1,true);
  const normal=new T.Vector3(0,1,0).applyQuaternion(pose.orientation);
  assert.ok(normal.distanceTo(new T.Vector3(0,1,-d.rise/d.d).normalize())<1e-6,d.id);
 }
 const pose=createGroundPose(),p=player(110);pose.update(p,groundPatches(p),1,true);
 const water=pose.update({...p,afloat:true},[],1,true);
 assert.ok(water.orientation.angleTo(new T.Quaternion())<1e-6);assert.equal(water.y,p.y-.12);
 const lift={id:'test-lift',x:999,z:999,w:6,d:6,y:12,stops:[0,24]},rider={x:1002,z:1002,y:12,heading:0};
 const patches=groundPatches(rider,[lift]);assert.equal(patches[0],lift);
 assert.equal(pose.update(rider,patches,1,true).y,12);
});

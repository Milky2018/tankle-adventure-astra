import {settleControl} from '../test-fixtures/settled-control.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {Ray,Vector3,Box3} from 'three';
import {foldedArchitecture,foldedDecks,foldedLiftDefs,foldedControls,initialFoldedState,deckHeight} from './folded-layout.js';
import {architectureIndex,regionAt} from './folded-architecture.js';

test('seven regional envelopes preserve walkable floors and lift travel',()=>{
  assert.equal(new Set(foldedArchitecture.rooms.map(r=>r.region)).size,7);
  for(const s of foldedArchitecture.solids){
    const overlap=f=>s.x<f.x+f.w&&s.x+s.w>f.x&&s.z<f.z+f.d&&s.z+s.d>f.z;
    for(const f of foldedDecks.filter(overlap)){
      const a=deckHeight(f,Math.max(f.z,s.z)),b=deckHeight(f,Math.min(f.z+f.d,s.z+s.d));
      assert.ok(s.y+s.h<=Math.min(a,b)||s.y>=Math.max(a,b)+3.3,`${s.room}/${s.kind} intrudes on ${f.id}`);
    }
    for(const l of foldedLiftDefs.filter(overlap))assert.ok(s.y+s.h<=l.stops[0]||s.y>=l.stops.at(-1)+3.3,`${s.room} blocks ${l.id}`);
  }
});

test('structural ray index covers diagonal, vertical and reverse rays',()=>{
  const solids=foldedArchitecture.solids,index=architectureIndex(solids);
  const bounds=solids.map(s=>new Box3(new Vector3(s.x,s.y,s.z),new Vector3(s.x+s.w,s.y+s.h,s.z+s.d)));
  const origins=[new Vector3(0,-6,86),new Vector3(0,4,27),new Vector3(225,27,-20),new Vector3(231,-20,125),new Vector3(0,-50,53)];
  for(const origin of origins)for(const dir of [[1,.1,1],[-1,-.1,-1],[0,1,0],[0,-1,0],[.2,.1,-1],[-1,0,.2]]){
    const ray=new Ray(origin,new Vector3(...dir).normalize()),candidates=index.ray(origin,ray.direction,320);
    for(let i=0;i<solids.length;i++){
      const hit=ray.intersectBox(bounds[i],new Vector3());
      if(hit&&hit.distanceTo(origin)<=320)assert.ok(candidates.has(solids[i]),`missed ${solids[i].id}`);
    }
  }
});

test('optional rail restoration responds to Magnet and survives reload',()=>{
  const control=foldedControls.find(c=>c.id==='rail-repair'),state=initialFoldedState();assert.ok(control);
  assert.equal(settleControl(control.id,'cannon',{magnet:true},state,[]),false);
  assert.equal(settleControl(control.id,'magnet',{magnet:false},state,[]),false);
  assert.equal(settleControl(control.id,'magnet',{magnet:true},state,[]),true);
  assert.equal(initialFoldedState(state)['rail-repair'],true);
  assert.equal(state.magnet,false);
});

test('regional sound follows the building, not just elevation',()=>{
  for(const room of foldedArchitecture.rooms){
    const p={x:room.x+room.w/2,y:room.y,z:room.z+room.d/2};assert.equal(regionAt(p,foldedArchitecture.rooms),room.region);
  }
});

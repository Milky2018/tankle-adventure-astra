import {settleControl} from '../../tests/fixtures/settled-control.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {Ray,Vector3,Box3} from 'three';
import {foldedArchitecture,foldedDecks,foldedLiftDefs,foldedControls,initialFoldedState,deckHeight} from './terrain.js';
import {architectureIndex,regionAt} from './architecture.js';

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

test('the Foundry return tunnel shields its latch from the entry ramp without blocking the working side',()=>{
  const c=foldedControls.find(c=>c.id==='prototype-shortcut'),ramp=foldedDecks.find(d=>d.id==='foundry-west-ramp');
  const target=new Vector3(c.x,c.y,c.z+.5),point=new Vector3();
  const bounds=foldedArchitecture.solids.map(s=>new Box3(new Vector3(s.x,s.y,s.z),new Vector3(s.x+s.w,s.y+s.h,s.z+s.d)));
  const blocked=origin=>{
    const delta=target.clone().sub(origin),ray=new Ray(origin,delta.clone().normalize());
    return bounds.some(b=>ray.intersectBox(b,point)&&point.distanceTo(origin)<delta.length());
  };
  for(let x=ramp.x+1;x<ramp.x+ramp.w-1;x+=1)for(let z=ramp.z+1;z<ramp.z+ramp.d;z+=1)
    for(const height of [1.5,2,2.5])assert.ok(blocked(new Vector3(x,deckHeight(ramp,z)+height,z)),`Exposed latch from ramp ${x}/${z}/${height}`);
  for(const x of [-30,-28,-26])assert.ok(!blocked(new Vector3(x,-14,66)),'The return-side shot must remain clear');
});

test('the Foundry return ceiling is continuous, level and supported by both side walls',()=>{
  const room=foldedArchitecture.rooms.find(r=>r.id==='prototype-return');
  const solids=foldedArchitecture.solids.filter(s=>s.room===room.id),roofs=solids.filter(s=>s.kind==='roof');
  for(let z=room.z+.5;z<room.z+room.d;z+=1){
    for(let x=room.x+.5;x<room.x+room.w;x+=1)
      assert.ok(roofs.some(s=>s.y===room.y+room.h&&x>=s.x&&x<=s.x+s.w&&z>=s.z&&z<=s.z+s.d),`Missing level ceiling at ${x}/${z}`);
    for(const x of [room.x-.5,room.x+room.w+.5])
      assert.ok(solids.some(s=>s.kind==='wall'&&s.y===room.y&&s.h===room.h&&x>=s.x&&x<=s.x+s.w&&z>=s.z&&z<=s.z+s.d),'Roof needs a continuous supporting side wall');
  }
});

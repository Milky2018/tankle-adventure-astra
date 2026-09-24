import test from 'node:test';
import assert from 'node:assert/strict';
import {pullSlide} from './mechanisms.js';
import {foldedSolids,foldedControls} from '../world/terrain.js';
import {refugeSolids,refugeDecks} from '../content/refuge-network.js';
import {cityBelts} from '../content/city-layout.js';
import {makeSlideMarkers} from '../rendering/slide-view.js';
import {Scene} from 'three';

test('the entire thermal corridor is heated and sealed without a remote bypass',()=>{
 const heat=cityBelts.find(b=>b.id==='vestibule-heat'),gate=refugeSolids.find(s=>s.id==='inner-thermal');
 assert.equal(foldedControls.some(c=>c.id==='inner-transit'),false);
 assert.equal(refugeDecks.some(d=>d.id==='vestibule-cool-lane'),false);
 assert.ok(heat.w>=28&&gate.w>=28);
});
test('the bench is ordinary fixed cover; physical slides have no powered destinations',()=>{
 const bench=foldedSolids.find(b=>b.id==='bench-cover');
 assert.ok(bench.permanent&&!bench.magnetic&&!bench.rail);
 assert.equal(foldedControls.some(c=>c.id===bench.id),false);
 const scene=new Scene(),body={x:0,z:0,y:0,w:3,d:12,rail:{axis:'z',min:0,max:14}};
 const view=makeSlideMarkers(scene,[body]);view.update();
 assert.equal(view.markers.length,0);
});
test('manual dragging keeps pace with walking and works from either end without overlapping the player',()=>{
 const body={x:0,z:0,y:0,w:3,d:12,rail:{axis:'z',min:-20,max:20}};
 assert.ok(pullSlide(body,{x:4,z:24},.5,[],()=>true));assert.ok(body.z>=5);
 assert.ok(pullSlide(body,{x:4,z:-12},.5,[],()=>true));assert.ok(body.z<=0);
 const p={x:1.5,z:17};pullSlide(body,p,2,[],()=>true);
 assert.ok(body.z+body.d<=p.z-.9);
 assert.equal(pullSlide(body,p,.1,[],()=>true),false);
});

test('neither edge of the full-width thermal barrier can bypass red contact',async()=>{
 const {initialFoldedState,moveFolded}=await import('../world/terrain.js');
 const {newPlayer}=await import('../player/mechanics.js');
 for(const x of [149,154,162,170,175]){
  const state=initialFoldedState(),p={...newPlayer(),x,y:-8,z:90,phoenix:true,speed:3.2};
  for(let i=0;i<150;i++)moveFolded(p,0,.15,state);
  assert.ok(p.z<96,`cold crossing at x=${x}`);
  p.circulation=true;p.overheated=true;p.speed=3.2;
  for(let i=0;i<150;i++)moveFolded(p,0,.15,state);
  assert.ok(state['inner-thermal']&&p.z>102,`red crossing blocked at x=${x}`);
 }
});

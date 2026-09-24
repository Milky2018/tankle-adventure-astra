import {settleControl} from '../../tests/fixtures/settled-control.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {openLiftShafts} from '../world/shafts.js';
import {foldedDecks,foldedLiftDefs,foldedControls,foldedSolids,deckHeight,initialFoldedState} from '../world/terrain.js';
import {pullSlide} from '../machinery/mechanisms.js';
import {circuitLinks} from '../machinery/circuits.js';
import {Scene} from 'three';
import {makeSidePuzzles} from '../machinery/side-puzzles.js';
import {makeThermalFloors} from '../rendering/thermal-view.js';

test('every lift has an open shaft through upper floors and rider headroom',()=>{
  for(const l of foldedLiftDefs)for(const d of foldedDecks){
    const near=Math.max(d.z,l.z),far=Math.min(d.z+d.d,l.z+l.d);
    if(d.x>=l.x+l.w||d.x+d.w<=l.x||near>=far)continue;
    assert.ok(Math.max(deckHeight(d,near),deckHeight(d,far))<=l.stops[0]+.01||Math.min(deckHeight(d,near),deckHeight(d,far))>=l.stops.at(-1)+3.4,`${l.id} intersects ${d.id}`);
  }
  const d={x:0,z:0,w:12,d:12,y:4,rise:12},l={x:4,z:4,w:4,d:4,stops:[0,20]};
  for(const p of openLiftShafts([d],[l]))assert.equal(deckHeight(p,p.z+p.d/2),deckHeight(d,p.z+p.d/2));
});

test('a slide can retreat from an overlapping blocker instead of staying wedged',()=>{
  const box={x:0,y:0,z:0,w:3,d:3,rail:{axis:'x',min:-4,max:4}};
  assert.ok(pullSlide(box,{x:-8,z:1},.5,[{x:2.9,y:0,z:0,w:2,d:3}],()=>true));
  assert.ok(box.x<0);
});

test('a magnetic crate pushes a living occupant but stops if the occupant cannot move',()=>{
  const box={x:0,y:0,z:0,w:3,d:3,rail:{axis:'x',min:0,max:8}},enemy={x:4,y:0,z:1.5,hp:2,radius:1};
  const move=(p,dx,dz)=>{p.x+=dx;p.z+=dz;};
  assert.ok(pullSlide(box,{x:12,z:1.5},.25,[],()=>true,[enemy],move));
  assert.ok(enemy.x>=box.x+box.w+enemy.radius-.001);
  const before=box.x;
  pullSlide(box,{x:12,z:1.5},1,[],()=>true,[enemy],()=>{});
  assert.equal(box.x,before);
  assert.ok(pullSlide(box,{x:-12,z:1.5},.5,[],()=>true,[enemy],()=>{}));
});

test('every remote switch has a cable and gameplay switches require weapons',()=>{
  const links=circuitLinks(foldedControls,foldedSolids,foldedLiftDefs);
  for(const c of foldedControls){
    if(c.kind==='dock')continue;
    assert.ok(['shot','laser','magnet'].includes(c.kind),c.id);
    assert.ok(!c.pressure,c.id);
    if(c.kind==='shot')assert.equal(settleControl(c.id,'use',{},initialFoldedState(),[]),false,c.id);
    if(!c.mount)assert.ok(links.some(l=>l.id===c.id),`${c.id} has no cable`);
  }
});

test('walking over rail and garden controls never operates them',()=>{
  const side=makeSidePuzzles(new Scene(),initialFoldedState());
  for(const p of [{x:-166,y:8,z:-80},{x:-158,y:8,z:-76},{x:-176,y:8,z:-76},{x:37,y:-8,z:35},{x:49,y:-8,z:39}])side.update(.5,p,[]);
  assert.deepEqual(side.rail.state.switches,[false,false]);assert.equal(side.rail.state.moving,false);
  assert.deepEqual(side.gutter.state.angles,[0,0]);
  assert.ok(side.act('rail-a'));assert.ok(side.act('gutter-a'));
  assert.deepEqual(side.rail.state.switches,[false,false],'track waits for its cable');
  side.update(1,{x:0,y:0,z:0},[]);
  assert.deepEqual(side.rail.state.switches,[true,false]);assert.deepEqual(side.gutter.state.angles,[1,0]);
});

test('thermal floors batch their grilles and stop glowing when cooling is restored',()=>{
  const view=makeThermalFloors(new Scene(),[{id:'hot',x:0,y:0,z:0,w:96,d:12,stop:'cooled'}]),q=view.items[0];
  assert.equal(q.root.children.length,3,'two material batches and one particle system');
  view.update(1,{});assert.ok(q.particles.visible);
  view.update(2,{cooled:true});assert.equal(q.particles.visible,false);assert.equal(q.plates.color.getHex(),0x3e504a);
});

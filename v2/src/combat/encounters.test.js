import test from 'node:test';
import assert from 'node:assert/strict';
import {foldedEnemies,foldedHives,initialFoldedState,moveFolded} from '../world/terrain.js';
import {ENEMY_KINDS} from '../rendering/enemy-models.js';

function sail(p,state,points){
  for(const [x,z] of points){
    for(let i=0;i<2000&&Math.hypot(x-p.x,z-p.z)>.1;i++){
      const dx=x-p.x,dz=z-p.z,length=Math.hypot(dx,dz);
      moveFolded(p,dx/length*Math.min(.15,length),dz/length*Math.min(.15,length),state);
    }
    assert.ok(Math.hypot(x-p.x,z-p.z)<.1,`blocked return at ${p.x},${p.y},${p.z}`);
    assert.equal(p.y,-16);
  }
}

test('the press canal remains navigable and requires deployed Flotation',()=>{
  const state=initialFoldedState(),p={x:-72,y:-16,z:50,speed:1,deployed:true};
  sail(p,state,[[-72,28],[-46,28],[-36,28],[-36,-4],[-72,-4],[-72,28]]);
  assert.equal(state.foundry,false);
  const dry={x:-72,y:-16,z:50,speed:1,deployed:false};
  moveFolded(dry,0,-22,state);
  assert.ok(dry.z>44,'the return still requires Flotation');
});

test('ordinary encounters mix close pressure and ranged support outside Hive recovery pockets',()=>{
  const groups=Map.groupBy(foldedEnemies.filter(e=>e.encounter),e=>e.encounter);
  for(const [id,enemies] of groups){
    assert.ok(enemies.length>=2&&enemies.length<=4,`${id} remains a small squad`);
    assert.ok(enemies.every(e=>e.emplacement)||enemies.some(e=>ENEMY_KINDS[e.type].role==='pressure')||(enemies.some(e=>e.type==='reflector')&&enemies.some(e=>e.type==='sniper')),`${id} has movement pressure or a protected firing line`);
    assert.ok(enemies.some(e=>['shot','shield-shot','burst','rail','lob','reflect','mine','torpedoes'].includes(ENEMY_KINDS[e.type].attack)),`${id} has ranged support`);
    for(const a of enemies)for(const b of enemies){
      assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<=Math.max(...enemies.map(e=>ENEMY_KINDS[e.type].reach))+8,`${id} can support its own members`);
      assert.equal(a.y,b.y,`${id} starts on one readable floor`);
    }
  }
  for(const e of foldedEnemies.filter(e=>!e.persistent))for(const h of foldedHives){
    if(Math.abs(e.y-h.y)<.5)assert.ok(Math.hypot(e.x-h.x,e.z-h.z)>=15,`${e.id} crowds ${h.id}`);
  }
});

test('the opened relay corridor has room to turn beside the overlapping return ramp',()=>{
  const state=initialFoldedState({'relay-west':true}),p={x:-48,y:-16,z:55,speed:1,deployed:false};
  moveFolded(p,0,14,state);
  assert.ok(p.z>68.9,'the visible corridor shoulder must support the turn');
  sail(p,state,[[-55,69],[-55,108]]);
  moveFolded(p,10,0,state);
  assert.ok(p.x<-50,'the wider entrance does not extend into a prototype-lock bypass');
});

test('every repair unit starts within acquisition range of an ally it can support',()=>{
 for(const e of foldedEnemies.filter(e=>e.type==='repairer')){
  const allies=foldedEnemies.filter(a=>a!==e&&a.encounter===e.encounter&&Math.abs(a.y-e.y)<2&&Math.hypot(a.x-e.x,a.z-e.z)<18);
  assert.ok(allies.length,`${e.id} has no repairable ally within acquisition range`);
 }
});

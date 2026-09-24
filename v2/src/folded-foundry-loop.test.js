import {settleControl} from '../test-fixtures/settled-control.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newPlayer,updateHeat,BASE_SPEED} from './mechanics.js';
import {moveWithConveyor} from './folded-machinery.js';
import {initialFoldedState,foldedSupport,foldedControls,foldedDecks,foldedEnemies,foldedBlocked,foldedSolids,moveFolded} from './folded-layout.js';

const tank=(x,y,z,overdrive=false)=>({...newPlayer(),x,y,z,overdrive});
function drive(p,s,x,z,seconds,boost=false){
  for(let i=0;i<seconds*60;i++){
    p.clock=(p.clock||0)+1/60;updateHeat(p,1/60,p.clock,boost,!!(x||z));
    moveWithConveyor(p,x*BASE_SPEED*p.speed/60,z*BASE_SPEED*p.speed/60,1/60,s);
  }
}
function walk(p,s,points,boost=false){
  for(const [x,z] of points){
    for(let i=0;i<1800&&Math.hypot(p.x-x,p.z-z)>.3;i++){
      const dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz);
      drive(p,s,dx/d,dz/d,1/60,boost);
    }
    assert.ok(Math.hypot(p.x-x,p.z-z)<.35,`blocked ${p.x},${p.y},${p.z} toward ${x},${z}`);
  }
}

test('the shared ramp carries a passive Tank down, then rejects ordinary uphill movement',()=>{
  const s=initialFoldedState({'prototype-inspection':true,'overdrive-bypass':true});
  const p=tank(-40,-16+14/3,70);drive(p,s,0,0,1);
  assert.ok(p.z<64&&p.y<-13.3,'The entrance must carry the Tank down into the Foundry');
  for(let x=-45.05;x<-34.9;x+=.5)for(const angle of [-Math.PI/4,0,Math.PI/4]){
    const p=tank(x,-16+7/3,63);drive(p,s,Math.sin(angle),Math.cos(angle),3);
    assert.ok(p.z<64.5,`ordinary return escaped at ${p.x},${p.z}`);
  }
  walk(tank(0,-8,86),s,[[-40,86],[-40,52]]);
});

test('the opening has one shared ramp and a flat lower return without retired controls',()=>{
  for(const id of ['prototype-inspection','overdrive-bypass'])assert.ok(!foldedControls.some(c=>c.id===id));
  assert.ok(!foldedDecks.some(d=>d.id.startsWith('prototype-inspection')));
  const route=foldedDecks.find(d=>d.id==='prototype-return');
  assert.equal(route.rise||0,0);assert.equal(route.y,-16);
  for(let z=60;z<116;z+=.5)assert.equal(foldedSupport(-28,z,-16)?.height,-16);
  for(let z=93;z<115;z+=.5)assert.equal(foldedSupport(-40,z,-8-(z-92)/3),null);
});

test('the flat shortcut is sealed before victory and the shared ramp rails cannot be crossed',()=>{
  const s=initialFoldedState();
  for(let x=-32.5;x<=-23.5;x+=.5){
    const p=tank(x,-16,52);drive(p,s,0,1,8);
    assert.ok(p.z<58,'The shortcut entrance must block early access to the return belt');
    drive(p,s,0,-1,2);
    assert.ok(p.z<56,'An early visitor must be able to retreat without Boost');
  }
  const d=foldedDecks.find(d=>d.id==='foundry-west-ramp');
  for(let z=d.z+2;z<d.z+d.d-2;z+=1)for(const side of [-1,1]){
    const p=tank(d.x+d.w/2,d.y+d.rise*(z-d.z)/d.d,z);
    moveFolded(p,side*d.w,0,s);
    assert.ok(p.x>d.x+.9&&p.x<d.x+d.w-.9,'Shared ramp rail is only scenery');
  }
});

test('victory teaches Boost on level ground, rejoins the foot, then reverses the original ramp',()=>{
  const s=initialFoldedState({prototype:true,relays:true,pendingSignals:{'prototype-inspection':{elapsed:0},'overdrive-bypass':{elapsed:0}}});
  assert.equal(s['overdrive-return'],true);assert.deepEqual(s.pendingSignals,{});
  const ordinary=tank(-28,-16,122);drive(ordinary,s,0,-1,8);
  assert.ok(ordinary.z>103,'The short lesson must require Boost');
  for(const state of [s,initialFoldedState(JSON.parse(JSON.stringify(s)))]){
    const p=tank(-28,-16,122,true);
    walk(p,state,[[-28,100]],true);assert.equal(p.y,-16);
    walk(p,state,[[-28,64]]);
    if(!state['prototype-shortcut'])assert.ok(settleControl('prototype-shortcut','cannon',p,state,[]));
    const restored=initialFoldedState(JSON.parse(JSON.stringify(state)));
    assert.equal(restored['prototype-shortcut'],true);
    walk(p,restored,[[-28,52],[-40,52]]);assert.equal(p.y,-16);
    walk(p,state,[[-40,86]],true);assert.equal(p.y,-8);assert.ok(p.heat<100);
    walk(p,state,[[0,86]]);
    const unboosted=tank(-40,-16,52,true);drive(unboosted,state,0,1,3);
    assert.ok(unboosted.z<64.5,'Victory must not stop the original conveyor');
  }
});

test('the remembered water channel replaces the press return door and rejects dry hulls',()=>{
  const s=initialFoldedState({'relay-west':true});
  assert.ok(!foldedSolids.some(w=>['press-return','scrap-inspection-north-wall'].includes(w.id)));
  assert.ok(!foldedControls.some(c=>c.id==='press-return'));
  for(const overdrive of [false,true])for(let x=-63;x<=-49;x+=.5){
    const p=tank(x,-16,37,overdrive);drive(p,s,0,-1,5,overdrive);
    assert.ok(p.z>34&&p.y===-16,`Dry tank crossed the channel at ${p.x},${p.z}`);
  }
  const p=tank(-55,-16,50);
  walk(p,s,[[-60,44],[-60,37],[-60,44],[-55,50]]);
  assert.equal(s.prototype,false);assert.equal(s.overdrive,false);
});

test('Flotation alone makes the remembered channel a bidirectional Foundry shortcut',()=>{
  for(const saved of [{},{'press-return':true,pendingSignals:{'press-return':{duration:1,remaining:.5,changes:{}}}}]){
    const s=initialFoldedState(saved),p={...tank(0,0,27),flotation:true,deployed:true};
    walk(p,s,[[-26,28],[-26,-8],[-46,-8],[-46,20],[-46,30],[-60,30],[-60,37],[-60,44],[-55,50]]);
    assert.equal(p.y,-16);
    walk(p,s,[[-60,44],[-60,37],[-60,30],[-46,30],[-46,20],[-46,-8],[-26,-8],[-26,28],[0,27]]);
    assert.equal(p.y,0);assert.equal(s.prototype,false);
    assert.equal(s.pendingSignals['press-return'],undefined);
  }
});

test('the return adds an inward-facing entrance latch and preserves the Boss exit shutter',()=>{
  const bossExit=foldedSolids.find(w=>w.id==='overdrive-return');
  assert.equal(bossExit.z,114);assert.equal(bossExit.h,5);
  const c=foldedControls.find(c=>c.id==='prototype-shortcut');
  assert.equal(c.mount,'prototype-shortcut');assert.deepEqual(c.facing,[0,0,1]);
  const state=initialFoldedState({prototype:true,overdrive:true});
  assert.equal(state['overdrive-return'],true);assert.equal(state['prototype-shortcut'],false);
});


test('the post-Boost workroom contains an ordinary squad on the actual belt landing floor',()=>{
  const room=foldedDecks.find(d=>d.id==='recycling-furnace');
  const squad=foldedEnemies.filter(e=>e.y===room.y&&e.x>room.x&&e.x<room.x+room.w&&e.z>room.z&&e.z<room.z+room.d);
  assert.equal(squad.length,3,'Moving Overseer must not leave the original workroom empty');
  assert.deepEqual(new Set(squad.map(e=>e.type)),new Set(['turret','skirmisher','guard']));
  const state=initialFoldedState({prototype:true,overdrive:true,foundry:true});
  for(const e of squad){
    assert.equal(e.encounter,'foundry-workroom');
    assert.ok(!e.persistent&&!e.activation&&!e.battle&&!e.reserveFor);
    assert.equal(foldedSupport(e.x,e.z,e.y)?.height,room.y);
    assert.equal(foldedBlocked(e.x,e.y,e.z,state),undefined,e.id);
    assert.ok(e.patrol.z+e.patrol.d<=56,'Pursuit must end before the belt');
    for(const [dx,dz] of [[1.75,0],[-1.75,0],[0,1.75],[0,-1.75]])
      assert.equal(foldedBlocked(e.x+dx,e.y,e.z+dz,state,.05),undefined,e.id);
  }
});

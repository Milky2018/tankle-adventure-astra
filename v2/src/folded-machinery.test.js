import test from 'node:test';
import assert from 'node:assert/strict';
import {moveWithConveyor,stepLifts,conveyorVelocity} from './folded-machinery.js';
import {initialFoldedState,foldedLiftDefs,foldedEnemies,foldedSupport,moveFolded} from './folded-layout.js';
import {newPlayer,BASE_SPEED,updateHeat} from './mechanics.js';
import {apertureOpacity,APERTURE_AIM_THRESHOLD} from './folded-visibility.js';
import {ENEMY_KINDS,foldedEnemyModel,woundedAlly} from './folded-enemies.js';
import {cityDamage} from './folded-combat.js';

test('the same conveyor transports player, live enemy and wreck without crossing floors',()=>{
  const state=initialFoldedState(),bodies=[{hp:50},{hp:2},{hp:0}].map(extra=>({x:0,y:-8,z:67,speed:1,...extra}));
  for(let i=0;i<20;i++)for(const body of bodies)moveWithConveyor(body,0,0,1/60,state);
  for(const body of bodies)assert.ok(Math.abs(body.z-(67+9.95/3))<.001);
  assert.deepEqual(conveyorVelocity({x:0,z:67,y:0}),{x:0,z:0});
});

test('ordinary walking cannot reverse the Foundry belt; a cold Overdrive crosses it',()=>{
  for(const boost of [false,true]){
    const p=Object.assign(newPlayer(),{x:0,y:-8,z:74,overdrive:boost});
    for(let i=0;i<300;i++){updateHeat(p,1/60,i/60,boost,true);moveWithConveyor(p,0,-BASE_SPEED*p.speed/60,1/60,initialFoldedState());}
    assert.equal(p.z<63,boost);if(boost)assert.equal(p.overheated,false);
  }
});

test('released lifts cycle repeatedly with endpoint dwell and no second input',()=>{
  for(const def of foldedLiftDefs){
    const lift={...def,y:def.stops[0],destination:def.stops[0],wait:0};
    const state={[def.lock||def.id]:true,brake:true},p={x:def.x+def.w/2,y:lift.y,z:def.z+def.d/2};
    let visits=0,lastStop=null,dwell=0;
    for(let i=0;i<4800;i++){
      stepLifts([lift],state,p,1/60);
      assert.ok(Math.abs(p.y-lift.y)<.001);
      const stop=def.stops.find(y=>Math.abs(lift.y-y)<.01);
      if(stop!==undefined){dwell++;if(lastStop!==stop){visits++;lastStop=stop;}}
    }
    assert.ok(visits>=5,def.id);assert.ok(dwell>600,`${def.id} leaves time to disembark`);
  }
});

test('an automatic lift waits for a straddling hull and carries a fully boarded enemy',()=>{
  const lift={...foldedLiftDefs[0],y:8,destination:16,wait:0},p={x:78,y:8,z:-66.6},s={load:true};
  stepLifts([lift],s,p,1);assert.equal(lift.y,8);
  p.z=-64;const enemy={hp:2,x:78,y:8,z:-71};stepLifts([lift],s,p,1,[enemy]);assert.equal(lift.y,13);assert.equal(enemy.y,13);
  enemy.x=lift.x+.94;stepLifts([lift],s,p,.2,[enemy]);assert.equal(lift.y,14,'driving to a supported edge must not freeze a lift between floors');
});

test('an absent lift leaves no walkable shaft bottom; holding movement boards its returning platform',()=>{
  const lift={...foldedLiftDefs.find(l=>l.id==='cage'),y:24,destination:0,wait:0},state={cage:true},p={x:10,y:0,z:25,speed:1};
  assert.equal(foldedSupport(10,18,0,false,[lift]),null);
  for(let i=0;i<840;i++){moveFolded(p,0,p.z>18?-7/60:0,state,[lift]);stepLifts([lift],state,p,1/60);}
  assert.ok(p.z<18.2);assert.equal(p.y,24,'boarded hull reaches the upper landing without another input');
});

test('the aperture changes continuously inside one floor mesh and leaves distant floor opaque',()=>{
  const p={x:0,y:0,z:0},point={x:28/39.6*8,y:9.3,z:28/39.6*8};
  assert.ok(apertureOpacity(point,p)<.2);
  assert.equal(apertureOpacity({...point,x:point.x+20},p),1);
  for(let x=-10;x<10;x+=.01)assert.ok(Math.abs(apertureOpacity(point,{...p,x})-apertureOpacity(point,{...p,x:x+.01}))<.01);
  assert.equal(apertureOpacity({x:0,y:0,z:0},p),1);
  assert.ok(apertureOpacity({x:102.16162,y:24,z:-28.73838},{x:90.32,y:1.9678,z:-33.9033})<APERTURE_AIM_THRESHOLD,'the visible load receiver stays selectable from the side of its ramp');
});

test('ten ordinary archetypes exist in the world with distinct attack rules and models',()=>{
  const ordinary=[...new Set(foldedEnemies.filter(e=>!e.persistent).map(e=>e.type))];
  assert.equal(ordinary.length,10);assert.equal(new Set(ordinary.map(t=>ENEMY_KINDS[t].attack)).size,10);
  for(const type of ordinary){const model=foldedEnemyModel(type);assert.ok(model.root.children.length);model.animate('warn',.5,1,1/60,true);model.rollWheels(.1);assert.ok(Number.isFinite(model.body.position.y));}
});

test('a stripped shield stays vulnerable while a repairer cannot revive dead allies',()=>{
  const guard={type:'guard',x:0,z:0,aim:0,hp:3,phase:'idle',parts:[]},front={x:0,z:5};
  assert.equal(cityDamage(guard,1,front),.4);guard.shieldRemoved=true;assert.equal(cityDamage(guard,1,front),1);
  const medic={x:0,y:0,z:0,encounter:'pair'},dead={x:1,y:0,z:0,hp:0,max:3,encounter:'pair'},hurt={x:2,y:0,z:0,hp:1,max:3,encounter:'pair'};
  assert.equal(woundedAlly(medic,[medic,dead,hurt]),hurt);assert.equal(woundedAlly(medic,[dead]),undefined);
});

test('the released carrier runs empty without boarding or a brake interaction',()=>{
  const def=foldedLiftDefs.find(l=>l.id==='carrier');
  const lift={...def,y:8,destination:8,wait:0},p={x:90,y:8,z:-59};
  for(let i=0;i<600;i++)stepLifts([lift],{},p,1/60);
  assert.equal(lift.y,8,'locked carrier stays parked');
  for(let i=0;i<240;i++)stepLifts([lift],{load:true},p,1/60);
  assert.ok(lift.y>8,'releasing the screened load starts the empty carrier');
});

test('unlocked lifts dwell for three seconds at both endpoints without a passenger',()=>{
  for(const def of foldedLiftDefs){
    const lift={...def,y:def.stops[0],destination:def.stops[0],wait:0},state={load:true,[def.lock||def.id]:true},p={x:1000,y:0,z:1000};
    for(let i=0;i<180;i++)stepLifts([lift],state,p,1/60);
    assert.equal(lift.y,def.stops[0],`${def.id}: initial landing dwell`);
    stepLifts([lift],state,p,1/60);assert.ok(lift.y>def.stops[0],`${def.id}: starts without input`);
    for(let i=0;i<2000&&lift.y!==def.stops.at(-1);i++)stepLifts([lift],state,p,1/60);
    assert.equal(lift.y,def.stops.at(-1));
    for(let i=0;i<179;i++)stepLifts([lift],state,p,1/60);
    assert.equal(lift.y,def.stops.at(-1),`${def.id}: upper landing dwell`);
    for(let i=0;i<2;i++)stepLifts([lift],state,p,1/60);
    assert.ok(lift.y<def.stops.at(-1),`${def.id}: returns without input`);
  }
});

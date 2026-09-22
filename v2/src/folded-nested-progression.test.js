import test from 'node:test';
import assert from 'node:assert/strict';
import {initialFoldedState,foldedControls,foldedPickups,foldedLiftDefs,foldedSupport,moveFolded,releaseFolded,foldedBlocked} from './folded-layout.js';
import {stepTransport} from './folded-transport.js';
import {stepReleasedSlides} from './folded-mechanisms.js';
import {stepLifts,moveWithConveyor,applyFloorHeat} from './folded-machinery.js';
import {newPlayer,updateHeat,BASE_SPEED} from './mechanics.js';
import {expansionRoutes} from './folded-expansion-layout.js';

function fixtures(saved={},position={x:0,y:0,z:27}){
 const s=initialFoldedState({prototype:true,overdrive:true,...saved}),p={...newPlayer(),overdrive:true,...position};
 const lifts=foldedLiftDefs.map(l=>({...l,y:l.settle&&!s[l.lock]?l.stops[1]:l.stops[0],destination:l.stops[0],wait:0}));
 let time=0;
 function tick(boost,dx=0,dz=0){
  time+=1/60;stepTransport(s.bodies.solids,1/60,[p]);updateHeat(p,1/60,time,boost,!!(dx||dz));applyFloorHeat(p,1/60,time,s);
  stepReleasedSlides(s.bodies.solids,s,1/60,[p],(x,z,y)=>!!foldedSupport(x,z,y));stepLifts(lifts,s,p,1/60);
  const d=Math.hypot(dx,dz),step=Math.min(d,BASE_SPEED*p.speed/60);
  moveWithConveyor(p,d?dx/d*step:0,d?dz/d*step:0,1/60,s,lifts);
 }
 function walk(points,boost=false){
  for(const [x,z]of points){let n=0;while(Math.hypot(x-p.x,z-p.z)>.15&&n++<2400)tick(boost,x-p.x,z-p.z);
   assert.ok(n<2400,`stuck ${p.x},${p.y},${p.z} -> ${x},${z}; ${foldedBlocked(p.x,p.y,p.z,s)?.id}`);}
 }
 function wait(seconds){for(let n=0;n<seconds*60;n++)tick(false);}
 function release(id){const c=foldedControls.find(c=>c.id===id);assert.ok(c,id);assert.ok(releaseFolded(id,c.surface==='top'?'mortar':c.kind==='shot'?'cannon':c.kind,p,s,lifts),id);wait(3);}
 return {s,p,lifts,walk,wait,release,get time(){return time;}};
}

test('all six middle acquisition orders retain independent approaches and escapable local loops',()=>{
 const orders=[['magnet','mortar','flotation'],['magnet','flotation','mortar'],['mortar','magnet','flotation'],['mortar','flotation','magnet'],['flotation','magnet','mortar'],['flotation','mortar','magnet']];
 for(const order of orders){
  const f=fixtures(),{p,s,walk,wait,release}=f;
  for(const ability of order){
   assert.equal(p[ability],false);
   if(ability==='flotation'){
    walk([[-26,27],[-26,-8],[-52,-8],[-76,-8],[-76,58]]);
    const r=expansionRoutes.find(r=>r.id==='reservoir');
    for(const [x,z,action]of r.path){walk([[x,z]]);if(action?.startsWith('reservoir'))release(action);}
    const item=foldedPickups.find(q=>q.ability===ability);assert.ok(Math.hypot(item.x-p.x,item.z-p.z)<.2);p.flotation=true;s.flotation=true;p.deployed=true;
    walk(r.returns);p.deployed=false;walk([[-26,-8],[-26,27],[0,27]]);
   }else if(ability==='magnet'){
    walk([[-26,27]]);release('ballast');walk([[-38,27]]);wait(6);assert.equal(p.y,8);walk([[-50,31],[-76,31]]);
    const r=expansionRoutes.find(r=>r.id==='arsenal');
    for(const [x,z,action]of r.path){if(action==='pickup'){s['rail-crossing']=true;wait(3);}walk([[x,z]]);if(action==='arsenal-transfer')release(action);}
    // The separate shunting interaction suite verifies the cart. This route
    // fixture lowers the actual reward platform, without granting equipment.
    s['rail-crossing']=true;wait(3);assert.equal(f.lifts.find(l=>l.id==='rail-inspection-bridge').y,8);
    const item=foldedPickups.find(q=>q.ability===ability);assert.ok(Math.hypot(item.x-p.x,item.z-p.z)<.2);p.magnet=true;s.magnetModule=true;
    for(const [x,z,action]of r.returns){walk([[x,z]]);if(action==='arsenal-return')release(action);}
   }else{
    walk([[-12,27],[-12,-8],[-12,-24],[-14,-36],[-12,-40],[-12,-72]]);walk([[6,-72]],true);wait(2);walk([[34,-72]],true);
    walk([[34,-98],[54,-98],[54,-132]]);
    assert.equal(s.sorter,false);assert.equal(foldedPickups.find(q=>q.ability==='mortar').requires,'sorter');
    // Combat is covered by the browser fight; this fixture verifies every legal route order.
    s.sorter=true;walk([[56,-146],[32,-146],[32,-178]]);p.mortar=true;s.mortarModule=true;
    walk([[32,-146],[59,-146],[59,-124],[54,-124],[54,-98],[34,-98],[34,-72]]);release('loading-return');walk([[28,-58],[28,-46],[18,-46]]);
    for(let n=0;p.y<0&&n<20;n++)wait(1);assert.equal(p.y,0);
    walk([[18,-34],[0,-34]]);assert.equal(s['bridge-crane'],true);walk([[0,27]]);
   }
   assert.equal(s.foundry,false);assert.equal(s.phoenix,false);assert.equal(p.y,0);wait(2);
  }
 }
});

test('the combined inspection route uses a grille, unsupported water and a real suspended load',()=>{
 const f=fixtures({freight:true,'bridge-crane':true},{x:74,y:0,z:-26,magnet:true,mortar:true,flotation:true}),{p,s,walk,release,wait,lifts}=f;
 for(let i=0;i<60;i++)moveFolded(p,0,.1,s,lifts);assert.ok(p.z< -23);
 release('magnet');for(let i=0;i<120;i++)moveFolded(p,0,.1,s,lifts);assert.ok(p.z< -22,'ordinary tracks cannot cross');
 p.deployed=true;walk([[74,-16],[98,-16],[98,-5],[110,-5]]);p.deployed=false;
 for(let i=0;i<100;i++)moveFolded(p,0,-.1,s,lifts);assert.ok(p.z> -10,'the raised load leaves a real gap');
 walk([[110,-5]]);release('load');wait(2);walk([[110,-24],[110,-48],[110,-62],[78,-62],[78,-84]]);wait(6);
 assert.equal(p.y,16);assert.equal(s.foundry,false);walk([[78,-94],[77,-124]]);
 const restored=initialFoldedState(JSON.parse(JSON.stringify(s)));assert.equal(restored.load,true);assert.equal(restored.magnet,true);
});

test('Phoenix teaches impact, then returns to the starting side of the orange bulkhead',()=>{
 const f=fixtures({foundry:true,'proving-endurance':true,phoenix:true},{x:218,y:16,z:-114,phoenix:true}),{p,s,walk,wait}=f;
 walk([[238,-114],[238,-82]]);walk([[180,-82]],true);assert.ok(s['phoenix-departure']);wait(2);
 walk([[96,-82],[96,-74],[62,-74],[-22,-74],[-22,2],[38,2],[38,6]]);assert.equal(p.y,0);assert.equal(s.pressure,false);wait(2);
 walk([[140,6]],true);assert.ok(s.pressure);walk([[154,6],[154,-98],[126,-98],[126,-32],[150,-28]]);assert.equal(p.y,24);
});

test('Guardian opens the internal descent; the later thermal boundary only opens with red contact',()=>{
 const f=fixtures({phoenix:true,pressure:true},{x:162,y:24,z:-26,phoenix:true}),{p,s,walk,release,wait}=f;
 for(let i=0;i<120;i++)moveFolded(p,0,.1,s);assert.ok(p.z< -16.5);assert.equal(s['lens-return'],false);
 p.laser=true;release('lens-return');for(let i=0;i<120;i++)moveFolded(p,0,.1,s);assert.ok(p.z< -16.5,'Laser alone cannot bypass Guardian');s.guardian=true;walk([[162,30],[174,30],[174,-18],[190,-18],[190,46],[154,46]]);
 assert.equal(p.y,-8);walk([[154,90]],true);assert.equal(s['inner-thermal'],false);
 p.circulation=true;wait(3);walk([[154,108]],true);assert.equal(s['inner-thermal'],true);
 release('inner-transit');walk([[170,108],[170,46]]);assert.equal(p.y,-8);
 walk([[170,108],[154,108],[106,108],[94,108]]);for(let i=0;i<120&&p.y>-40;i++)wait(1);assert.equal(p.y,-40);
 walk([[82,108],[82,6],[44,6],[44,-10]]);assert.equal(p.y,-40);
});

test('partial inspection progress remains reversible and cannot skirt the grille or load',()=>{
 for(const magnet of [false,true]){
  const f=fixtures({freight:true,'bridge-crane':true,magnet},{x:74,y:0,z:-26,flotation:true,deployed:true}),{p,s,walk,lifts}=f;
  if(magnet){walk([[74,-16],[98,-16],[98,-5],[110,-5],[98,-5],[98,-16],[74,-16],[74,-26]]);}
  else for(const x of [69.2,72,75,78.8]){Object.assign(p,{x,y:0,z:-26});for(let i=0;i<100;i++)moveFolded(p,0,.1,s,lifts);assert.ok(p.z< -23);}
 }
 const f=fixtures({magnet:true},{x:98,y:0,z:-16,deployed:true,flotation:true}),{p,s,lifts}=f;
 for(const z of [-21,-19]){Object.assign(p,{x:98,y:0,z});for(let i=0;i<180;i++)moveFolded(p,.1,0,s,lifts);assert.ok(p.x<104,'water must not permit side boarding the ascent');}
 // The runway and inspection landing are separated; neither can bypass the other.
 for(const x of [98,110,122]){Object.assign(p,{x,y:0,z:6});for(let i=0;i<160;i++)moveFolded(p,0,-.1,s,lifts);assert.ok(p.z>2);}
});

test('the workshop water return opens from the garden side and reconnects without B',()=>{
 const f=fixtures({flotation:true},{x:-148,y:-8,z:29,deployed:true,flotation:true}),{p,walk,release}=f;
 walk([[-180,29],[-180,-37]]);release('workshop-water');walk([[-180,-48]]);assert.equal(p.y,8);p.deployed=false;
 p.deployed=true;walk([[-180,-38],[-180,29]]);assert.equal(p.y,-8);
});

test('legacy late saves retain earned access without granting missing middle abilities',()=>{
 for(const saved of [{anchor:'distribution',phoenix:true},{anchor:'industrial',phoenix:true,circulation:true},{anchor:'last-refuge',phoenix:true,circulation:true,laser:true}]){
  const s=initialFoldedState(saved);assert.equal(s.progressionRevision,2);assert.equal(s.pressure,true);assert.equal(s['phoenix-departure'],true);
  assert.equal(s.magnetModule,false);assert.equal(s.mortarModule,false);assert.equal(s.flotation,false);
  if(saved.circulation)assert.equal(s['lens-return'],true);
  const again=initialFoldedState(JSON.parse(JSON.stringify(s)));assert.deepEqual(again,s);
 }
 const current=initialFoldedState({progressionRevision:2,anchor:'turntable',phoenix:true});assert.equal(current.pressure,false);
});

test('the earned inspection return reaches Overseer without a lift wait or another court',()=>{
 const f=fixtures({'proving-inspection':true,'proving-endurance':true,'proving-transfer':true,load:true,'bridge-crane':true}),{p,walk}=f;
 walk([[0,0]],true);walk([[0,-34],[3,-34]]);walk([[3,-146]],true);walk([[3,-154.5],[198,-154.5]]);walk([[198,-182],[218,-182],[218,-174]],true);
 assert.equal(p.y,16);assert.ok(f.time<=25,`Overseer retry took ${f.time}s`);
 walk([[218,-182],[198,-182],[198,-152],[9,-152],[9,-34],[0,-34],[0,27]]);
 assert.equal(p.y,0);
});

test('the original orange run retains clearance beside service machinery',()=>{
 for(const z of [5.6,6,6.4]){
  const {s,walk}=fixtures({phoenix:true},{x:38,y:0,z,phoenix:true});
  walk([[140,z]],true);assert.equal(s.pressure,true);
 }
});

test('the cargo retry is earned before Sorter and skips the artillery corridor in both directions',()=>{
 const f=fixtures({}, {x:54,y:-8,z:-118}),{s,p,walk,release,wait}=f;
 function cargoCross(){walk([[-7.1,-8]]);while(s.bodies.solids.find(b=>b.id==='intro-cargo').x>-16.8)wait(.05);walk([[-7.1,3],[-12,3],[-12,27],[0,27]]);}
 walk([[32,-118]]);release('sorter-retry');walk([[18,-118]]);
 for(let n=0;p.y<0&&n<20;n++)wait(1);assert.equal(p.y,0);
 walk([[18,-108],[40,-108],[40,-36],[18,-36],[-14,-36],[-12,-24],[-12,-8]]);
 cargoCross();assert.equal(s.sorter,false);assert.equal(p.mortar,false);const start=f.time;
 walk([[-12,27],[-12,3],[-7.1,3]],true);while(s.bodies.solids.find(b=>b.id==='intro-cargo').x>-16.8)wait(.05);walk([[-7.1,-8],[-12,-8],[-12,-24],[-14,-36],[18,-36],[40,-36],[40,-108],[18,-108],[18,-118]],true);
 for(let n=0;p.y>-8&&n<20;n++)wait(1);assert.equal(p.y,-8);
 walk([[32,-118],[54,-118],[54,-132]]);assert.ok(f.time-start<30,`Sorter retry took ${f.time-start}s`);
});

test('Guardian guards its actual downward exit and all earlier lower access',()=>{
 const f=fixtures({phoenix:true,laser:true,gallery:true,'garden-optical':true,'lens-return':true},{x:222,y:16,z:70,phoenix:true,laser:true}),{p,s,walk,lifts}=f;
 for(let n=0;n<100;n++)moveFolded(p,.1,0,s,lifts);assert.ok(p.x<228);
 assert.equal(lifts.find(l=>l.id==='yard-lift').lock,'guardian');
 s.guardian=true;walk([[254,70],[254,12],[242,12],[242,48],[242,120]]);assert.equal(p.y,-24);
 const restored=initialFoldedState(JSON.parse(JSON.stringify(s)));assert.equal(restored.guardian,true);
});

test('Sorter cannot unlock the late roof express on a new journey',()=>{
 const fresh=fixtures().s;fresh.sorter=true;
 const restored=initialFoldedState(JSON.parse(JSON.stringify(fresh)));
 assert.equal(restored['roof-express'],false);
 const saved={sorter:true,phoenix:true,sidePuzzles:{coverX:128}},old=initialFoldedState(saved);assert.equal(old['roof-express'],true);
 assert.equal(old.sidePuzzles.coverX,undefined);assert.equal(saved.sidePuzzles.coverX,128);
 assert.equal(initialFoldedState({bossRouteRevision:1,sidePuzzles:{coverX:36}}).sidePuzzles.coverX,36);
 assert.equal(foldedControls.find(c=>c.id==='roof-express').ground,24);
});

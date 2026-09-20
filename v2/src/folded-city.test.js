import test from 'node:test';
import assert from 'node:assert/strict';
import {applyFloorHeat} from './folded-machinery.js';
import {newPlayer,updateHeat,BASE_SPEED} from './mechanics.js';
import {initialFoldedState,moveFolded,foldedSupport,foldedBlocked,foldedDecks,foldedEnemies,foldedPickups,foldedLiftDefs,foldedHives,releaseFolded,inRect,deckHeight} from './folded-layout.js';
import {cameraMovement} from './folded-camera.js';
import {cityBelts,cityControls,citySolids} from './folded-city-layout.js';
import {cityDamage,cityContact} from './folded-combat.js';

const player=(x,y,z,abilities={})=>Object.assign(newPlayer(),{x,y,z,...abilities});
function travel(p,state,points,{boost=false,lifts=[]}={}){
  for(const [x,z]of points){
    let stuck=0;
    for(let i=0;i<15000;i++){
      const dx=x-p.x,dz=z-p.z;if(Math.hypot(dx,dz)<.23)break;
      const ox=p.x,oz=p.z;updateHeat(p,1/60,(p.clock||0)+1/60,boost,true);p.clock=(p.clock||0)+1/60;applyFloorHeat(p,1/60,p.clock,state);
      const b=cityBelts.find(b=>inRect(p.x,p.z,b)&&Math.abs(deckHeight(b,p.z)-p.y)<.5);
      const step=BASE_SPEED*p.speed/60,ax=Math.abs(dx)>Math.abs(dz)?Math.sign(dx)*Math.min(step,Math.abs(dx)):0,az=Math.abs(dx)<=Math.abs(dz)?Math.sign(dz)*Math.min(step,Math.abs(dz)):0;
      moveFolded(p,ax+(b?.vx||0)/60,az+(b?.vz||0)/60,state,lifts);
      stuck=Math.hypot(p.x-ox,p.z-oz)<.001?stuck+1:0;
      assert.ok(stuck<120,`stuck at ${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)} toward ${x},${z}`);
      assert.ok(i<14999,`unreachable ${x},${z}: ${p.x},${p.y},${p.z}`);
    }
  }
}

test('awakening faces its open approach before the player learns camera rotation',()=>{
  const p={...newPlayer(),...foldedHives.find(h=>h.id==='awakening')},state=initialFoldedState();
  const forward=cameraMovement(0,-1,p.heading);
  for(let i=0;i<180;i++)moveFolded(p,forward.x*BASE_SPEED/60,forward.z*BASE_SPEED/60,state);
  assert.equal(foldedSupport(p.x,p.z,p.y).id,'foundry-west');
  assert.ok(p.x<-20,'holding forward enters the opening corridor instead of a wall');
});

test('awakening, local relay sequence, Overdrive return and foundry exit connect continuously',()=>{
  const p=player(0,-8,86),s=initialFoldedState();
  travel(p,s,[[-40,86],[-40,49],[-35,49]]);assert.equal(p.y,-16);
  releaseFolded('relay-west','cannon',p,s,[]);
  travel(p,s,[[-57,52],[-57,118]]);releaseFolded('relay-east','cannon',p,s,[]);s.relays=true;
  travel(p,s,[[-57,128],[-30,128]]);assert.equal(p.y,-16);
  s.prototype=s['overdrive-return']=true;p.overdrive=true;
  travel(p,s,[[-20,128],[-20,86],[0,86]],{boost:true});assert.equal(p.y,-8);
  for(let i=0;i<240;i++){p.clock+=1/60;updateHeat(p,1/60,p.clock,false,false);}
  travel(p,s,[[0,49]],{boost:true});s.foundry=true;
  travel(p,s,[[24,49],[24,4],[10,4],[10,27]]);assert.equal(p.y,0);
});

test('the Prototype entrance cannot be skirted before its local relay opens',()=>{
  const state=initialFoldedState({'relay-west':true});
  for(let z=115;z<=141;z+=.5){
    const p=player(-53,-16,z);
    if(!foldedSupport(p.x,p.z,p.y))continue;
    for(let i=0;i<80;i++)moveFolded(p,.15,0,state);
    assert.ok(p.x<-50,`closed enclosure bypassed at ${p.x},${p.z}`);
  }
  state.relays=true;const p=player(-57,-16,126);
  travel(p,state,[[-43,126]]);assert.ok(p.x>-44);
});

test('old lower-Hive saves cannot resume behind the relocated workshop lock',()=>{
  const saved={anchor:'lower-foundry','relay-east':true,discovered:['foundry-relay-east','foundry-awakening']};
  const restored=initialFoldedState(saved);
  assert.equal(restored.anchor,'awakening');assert.equal(restored['relay-east'],true);assert.equal(restored['relay-west'],false);
  assert.deepEqual(restored.discovered,['foundry-awakening']);
  assert.equal(initialFoldedState({...saved,'relay-west':true}).anchor,'awakening');
});

test('Foundry controls have local consequences and unobstructed overhead target silhouettes',()=>{
  const q=28/39.6;
  for(const [id,gateId]of [['relay-west','relay-west'],['relay-east','relays']]){
    const c=cityControls.find(c=>c.id===id),gate=citySolids.find(s=>s.id===gateId);
    assert.ok(Math.hypot(c.x-gate.x-gate.w/2,c.z-gate.z-gate.d/2)<20);
    for(let y=c.y+.2;y<c.y+30;y+=.2){
      const x=c.x+(y-c.y)*q,z=c.z+(y-c.y)*q;
      for(const s of citySolids.filter(s=>s.permanent&&!s.invisible))assert.ok(!(y>s.y&&y<s.y+s.h&&inRect(x,z,s)),`${id} hidden behind ${s.id}`);
    }
  }
});

test('the transit side entrance bypasses the locked roof cage and clears the Foundry ramp',()=>{
  const state=initialFoldedState({foundry:true}),p=player(24,-8,48);
  travel(p,state,[[24,4],[36,4],[36,30],[22,30],[0,27]]);assert.equal(p.y,0);
  assert.equal(state.cage,false);assert.equal(state.phoenix,false);
  travel(p,state,[[22,30],[36,30],[36,4],[24,4],[24,48]]);assert.equal(p.y,-8);
});

test('Magnet training and the unassisted Mortar route preserve dry access',()=>{
  const s=initialFoldedState({'bridge-crane':true}),p=player(0,0,27,{overdrive:true});
  const lift={...foldedLiftDefs.find(l=>l.id==='training'),y:0};
  travel(p,s,[[-38,27]],{lifts:[lift]});p.y=lift.y=8;s.ratchet=true;
  travel(p,s,[[-50,27],[-50,33],[-50,27],[-38,27]],{lifts:[lift]});
  p.y=lift.y=0;travel(p,s,[[-26,27],[0,27]],{lifts:[lift]});
  assert.equal(p.y,0);
  travel(p,s,[[0,-34],[-12,-34],[-12,-72],[-8,-72]],{boost:false});
  travel(p,s,[[34,-72]],{boost:true});assert.equal(p.y,-8);
});

test('Mortar opens the outer ring and its inside return without giving the emitter before Phoenix',()=>{
  const s=initialFoldedState({freight:true,'bridge-crane':true}),p=player(0,0,-34,{overdrive:true,mortar:true});
  travel(p,s,[[59,-34],[59,-63],[67,-63],[67,-34],[70,-34],[70,-18],[90,-18]]);
  assert.equal(p.y,0);assert.ok(releaseFolded('freight-return','cannon',p,s,[]));
  travel(p,s,[[70,-18],[70,-34],[59,-34],[59,-106],[76,-106]]);
  for(let i=0;i<300;i++){updateHeat(p,1/60,i/60,true,true);moveFolded(p,BASE_SPEED*p.speed/60,0,s);}
  assert.ok(p.x<104,'the Phoenix lock is visible near the entrance, before the long span');
  assert.equal(s['optics-outer'],false);
  travel(p,s,[[59,-106]]);p.phoenix=true;p.heat=0;p.overheated=false;
  travel(p,s,[[206,-106]],{boost:true});
  assert.equal(s['optics-outer'],true);
  travel(p,s,[[206,-90],[218,-90],[218,-84],[218,-50]]);
  assert.ok(p.y>16&&p.y<24);
});

test('Phoenix opens independent optical and circulation paths and all pre-guardian optical returns',()=>{
  const s=initialFoldedState(),p=player(136,24,-30,{overdrive:true,phoenix:true});
  travel(p,s,[[228,-30]],{boost:true});assert.equal(p.y,24);
  travel(p,s,[[242,-20],[242,-30],[254,-30],[254,-98],[64,-98],[64,-86]]);assert.equal(p.y,24);
  assert.ok(releaseFolded('emitter-cage','cannon',p,s,[]));assert.equal(s.guardian,false);
  travel(p,s,[[64,-98],[254,-98],[254,-30],[242,-30],[242,-20],[228,-20]]);s.gallery=true;assert.ok(releaseFolded('garden-optical','laser',p,s,[]));assert.ok(releaseFolded('yard-optical','laser',p,s,[]));
  travel(p,s,[[242,-20],[242,6],[230,6],[230,38],[202,38],[202,6],[110,6]]);assert.equal(p.y,16);
  assert.ok(s['garden-optical']&&s['yard-optical']);assert.equal(s.guardian,false);
});

test('Phoenix alone reaches the dry circulation rig from its roof branch',()=>{
  const s=initialFoldedState(),p=player(166,16,-64,{overdrive:true,phoenix:true});
  travel(p,s,[[166,30]],{boost:true});
  travel(p,s,[[174,30],[174,-18],[190,-18],[190,30],[190,48],[242,48],[242,95]]);
  assert.ok(s.pressure);
  travel(p,s,[[242,120],[222,120]]);assert.equal(p.y,-24);assert.equal(p.mortar,false);assert.equal(p.flotation,false);assert.equal(p.laser,false);
});

test('Circulation opens its industrial return and the vestibule preserves the optical requirement',()=>{
  const s=initialFoldedState(),p=player(214,-24,128,{overdrive:true,phoenix:true,circulation:true});
  travel(p,s,[[211,128],[211,25],[211,13],[218,13]],{boost:true});
  assert.ok(releaseFolded('pressure-return','cannon',p,s,[]));
  const upper=player(122,24,-28,{overdrive:true,phoenix:true,circulation:true});
  assert.equal(releaseFolded('inner-optics','cannon',upper,s,[]),false);
  assert.equal(releaseFolded('inner-optics','mortar',upper,s,[]),false);
  travel(upper,s,[[122,32]],{boost:true});assert.ok(s['inner-thermal']);
  assert.ok(releaseFolded('inner-transit','cannon',upper,s,[]));
  assert.equal(s['inner-optics'],false);
  assert.ok(releaseFolded('inner-optics','laser',upper,s,[]));
});

test('the ordinary Phoenix heat budget cannot cross the industrial sustained belt even with repeated cooling',()=>{
  for(const [x,z,y,end]of [[211,128,-24,28]]){
    const p=player(x,y,z,{overdrive:true,phoenix:true}),s=initialFoldedState({'inner-optics':true});let farthest=z;
    for(let i=0;i<60*90;i++){
      updateHeat(p,1/60,i/60,!p.overheated,true);applyFloorHeat(p,1/60,i/60,s);
      const b=cityBelts.find(b=>inRect(p.x,p.z,b)&&Math.abs(deckHeight(b,p.z)-p.y)<.5);
      moveFolded(p,0,(-BASE_SPEED*p.speed+(b?.vz||0))/60,s);farthest=Math.min(farthest,p.z);
    }
    assert.ok(farthest>end+15,`${x}: cold Phoenix reached ${farthest}`);
  }
});

test('compact predecessor rooms link the furnace landing, quiet bays and refuge',()=>{
  const s=initialFoldedState(),p=player(82,-40,46,{overdrive:true,phoenix:true,circulation:true});
  travel(p,s,[[82,56],[70,56],[70,46],[82,46],[82,30],[102,30],[102,20],[82,20],[82,6],[76,6],[76,-8],[76,6],[44,6],[44,-10]]);
  assert.equal(p.y,-40);assert.equal(s.keeper,false);
  assert.ok(releaseFolded('last-cage','cannon',p,s,[]));
  s['core-feed']=true;
  travel(p,s,[[34,-10],[34,68],[0,68],[0,48]]);assert.equal(p.y,-56);
});

test('the steep signal ascent supports the entire hull in both directions',()=>{
  const state=initialFoldedState({guardian:true});
  const p=player(186,16,89);
  travel(p,state,[[186,144]]);assert.equal(p.y,40);
  travel(p,state,[[186,89]]);assert.equal(p.y,16);
});

test('armoured cores expose physical parts, reflected rear hits and red contact have no per-round quota',()=>{
  const e={x:0,z:0,aim:0,hp:48,type:'boss',parts:[{hp:12},{hp:12}]};
  assert.equal(cityDamage(e,3,{x:0,z:10}),0);
  assert.equal(cityDamage(e,9,{x:0,z:10},'mortar',e.parts[0]),9);
  assert.equal(e.parts[0].hp,3);assert.equal(cityDamage(e,24,{x:0,z:10},'red'),24);
  assert.equal(cityDamage(e,24,{x:0,z:10},'red'),24);
  assert.equal(cityDamage(e,24,{x:0,z:10},'red'),24);
  const g={x:0,z:0,aim:0,hp:36,type:'guard',guardian:true};
  assert.equal(cityDamage(g,2.5,{x:0,z:8},'laser'),0);assert.equal(cityDamage(g,2.5,{x:0,z:-8},'laser'),2.5);
  assert.equal(cityContact(player(0,0,0,{phoenix:true,speed:3.2}),g),0);
  assert.equal(cityContact(player(0,0,0,{phoenix:true,speed:3.2,circulation:true,overheated:true}),g),24);
});

test('full-speed Phoenix contact crushes ordinary armor without bypassing boss armor',()=>{
  const p=player(0,0,8,{phoenix:true,speed:3.2});
  for(const type of ['guard','reflector']){
    const enemy={x:0,z:0,aim:0,hp:5,type,phase:'idle'};
    assert.ok(cityDamage(enemy,1,p,'cannon')<1);
    assert.equal(cityDamage(enemy,cityContact(p,enemy),p,'ram'),5);
  }
  assert.equal(cityContact(p,{type:'boss'}),0);
});

test('the water route reaches the same Mortar apron and the pressure loop returns to both old layers',()=>{
  const s=initialFoldedState({'pressure-return':true,pump:true,pressure:true}),p=player(6,-16,-4,{flotation:true,deployed:true});
  travel(p,s,[[6,-34],[14,-34],[14,-78],[34,-78],[34,-70]]);assert.equal(p.y,-8);
  const q=player(200,-16,18,{overdrive:true,circulation:true});
  travel(q,s,[[134,18],[134,30],[110,30],[110,18],[70,18],[70,-28],[56,-28],[-26,-28],[-26,-8]]);assert.equal(q.y,-8);
  const r=player(134,-16,30);travel(r,s,[[122,30],[122,-30],[110,-30],[110,4],[10,4],[10,27]]);assert.equal(r.y,0);
});

test('every lift has an unobstructed shaft between its stops',()=>{
  for(const l of foldedLiftDefs)for(const d of foldedDecks){
    const overlap=Math.min(l.x+l.w,d.x+d.w)>Math.max(l.x,d.x)+.1&&Math.min(l.z+l.d,d.z+d.d)>Math.max(l.z,d.z)+.1;
    if(overlap)assert.ok(d.y<=l.stops[0]||d.y>=l.stops[1],`${l.id} intersects ${d.id}`);
  }
});

test('the southern canal return opens into an already completed foundry',()=>{
  const p=player(-72,-16,-4,{flotation:true,deployed:true}),s=initialFoldedState();
  travel(p,s,[[-72,50]]);assert.equal(releaseFolded('press-return','cannon',p,s,[]),false);
  s.foundry=true;assert.ok(releaseFolded('press-return','cannon',p,s,[]));travel(p,s,[[-55,50]]);assert.equal(p.y,-16);
});

test('overlapping ramp landings work in both directions and do not admit the hull underneath',()=>{
  const s=initialFoldedState({gallery:true}),p=player(230,16,38);
  travel(p,s,[[230,6],[242,6],[242,-20],[242,6],[230,6],[230,38]]);assert.equal(p.y,16);
  assert.equal(foldedBlocked(230,16,30,s).id,'gallery-descent');
});

test('the early industrial spur exposes its Phoenix lock before the long approach',()=>{
  const s=initialFoldedState(),p=player(30,0,4,{overdrive:true});
  for(let i=0;i<600;i++){updateHeat(p,1/60,i/60,true,true);moveFolded(p,BASE_SPEED*p.speed/60,0,s);}
  assert.ok(p.x<76);assert.equal(s.pressure,false);
  travel(p,s,[[30,4]]);p.phoenix=true;p.heat=0;p.overheated=false;
  travel(p,s,[[88,4]],{boost:true});assert.equal(s.pressure,true);
});


test('combat spawns and ability cradles have a clear camera view without floor cutaways',()=>{
  // Intersect the real orthographic camera direction with flat and sloped decks.
  // Sample a four-unit cross around each machine, not just its center pixel.
  const q=28/39.6;
  for(const target of [...foldedEnemies,...foldedPickups])for(const [ox,oz]of [[0,0],[-2,0],[2,0],[0,-2],[0,2]]){
    for(const d of foldedDecks){
      if(d.water)continue;
      const slope=(d.rise||0)/d.d;
      const dy=(d.y+slope*(target.z+oz-d.z)-target.y-1.5)/(1-q*slope);
      if(dy<=3)continue;
      assert.equal(inRect(target.x+ox+dy*q,target.z+oz+dy*q,d),false,`${target.id} is screened by ${d.id}`);
    }
  }
});

test('the relocated freight ramps do not allow boarding the carrier behind the Mortar lock',()=>{
  const s=initialFoldedState({freight:true,'bridge-crane':true}),p=player(67,8,-84);
  const carrier={...foldedLiftDefs.find(l=>l.id==='carrier'),y:8};
  for(let i=0;i<130;i++){
    const z=-78+i*.2,spawn=foldedSupport(67,z,8-(z+78)*8/38);
    if(!spawn)continue;
    Object.assign(p,{x:67,y:spawn.height,z});
    for(let step=0;step<120;step++)moveFolded(p,.15,0,s,[carrier]);
    assert.ok(p.x<72,`ramp reached the carrier at ${p.x},${p.y},${p.z}`);
  }
});

test('Prototype front armour rewards flanking and recovery without a damage quota',()=>{
 const e={id:'prototype',type:'elite',hp:9,x:0,z:0,aim:0,phase:'warn'};
 assert.equal(cityDamage(e,1,{x:0,z:8}),.4);
 assert.equal(cityDamage(e,4,{x:0,z:-8}),4);
 e.phase='vent';assert.equal(cityDamage(e,5,{x:0,z:8}),5);
 assert.equal(cityDamage(e,9,{x:0,z:8}),9);
 e.phase='charge';assert.equal(cityDamage(e,20,{x:0,z:8},'red'),9);
});

test('mirror turntable has a Mortar landing floor and a sill that prevents driving into the optical housing',()=>{
  const state=initialFoldedState();
  assert.equal(foldedSupport(232,-4,24,false,[])?.height,24);
  assert.equal(foldedBlocked(235.75,24,-4,state,.8)?.id,'receiver-east-sill');
});

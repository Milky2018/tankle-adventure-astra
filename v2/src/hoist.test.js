import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {box,C} from './world.js';
import {makeHoist} from './hoist.js';
import {hoistDecks,supportAt} from './hoist-layout.js';
const callbacks={save(){},hurt(){},visible(){return false;}};
const player=(x,z,y=0)=>({x,z,hoistY:y,hp:50,speed:1,deployed:false});

test('overlapping floors preserve the supporting layer and cannot be selected by walking into a void',()=>{
  assert.equal(supportAt(hoistDecks,[],300,-126,0).height,0);
  assert.equal(supportAt(hoistDecks,[],300,-126,8).height,8);
  assert.equal(supportAt(hoistDecks,[],300,-126,24).height,24);
  assert.equal(supportAt(hoistDecks,[],310,-145,8),null);
  assert.equal(supportAt(hoistDecks,[],283,-146,20).height,20);
});

test('water support requires deployment and does not grant access to the overlapping bridge',()=>{
  assert.equal(supportAt(hoistDecks,[],300,-104,-8),null);
  assert.equal(supportAt(hoistDecks,[],300,-104,-8,true).height,-8);
  assert.equal(supportAt(hoistDecks,[],305,-104,8,true),null);
});

test('balance lift rejects missing ballast, carries the hull, and remains callable after departure',()=>{
  const h=makeHoist(new T.Scene()),p=player(284,-110);
  assert.equal(h.act(h.target(p),p),false);
  p.x=282;p.z=-88;
  for(let i=0;i<130;i++)h.pull(p,{x:282,y:1,z:-99+Math.min(6,i*.05)},1/60);
  assert.equal(h.serialize().ballast,6);
  p.x=284;p.z=-110;assert.equal(h.act(h.target(p),p),true);
  for(let i=0;i<150;i++)h.update(1/60,p,callbacks);
  assert.equal(p.hoistY,8);
  p.z=-119;assert.ok(h.move(p,0,-.1));
  h.act({id:'balance-lock'},p);
  p.hoistY=0;p.z=-102;
  const t=h.target(p);assert.equal(t.id,'call-balance-0');h.act(t,p);
  for(let i=0;i<150;i++)h.update(1/60,p,callbacks);
  assert.equal(h.snapshot().lifts[0].y,0);
  const restored=makeHoist(new T.Scene(),h.serialize());assert.equal(restored.serialize().balance,true);assert.equal(restored.snapshot().lifts[0].y,0);
});

test('solid floors block both ascending and descending shots while leaving the underpass open',()=>{
  const h=makeHoist(new T.Scene());
  const down=h.rayHit(new T.Vector3(300,12,-128),new T.Vector3(0,-1,0),20,false);
  assert.ok(down);assert.ok(Math.abs(down.point.y-8)<.05);
  const up=h.rayHit(new T.Vector3(300,5,-128),new T.Vector3(0,1,0),20,false);
  assert.ok(up);assert.ok(Math.abs(up.point.y-7.55)<.05);
  assert.equal(h.rayHit(new T.Vector3(300,1.5,-120),new T.Vector3(0,0,-1),10,false),null);
});

test('lift motion waits for a hull straddling the edge instead of trapping or dropping it',()=>{
  const h=makeHoist(new T.Scene(),{ballast:6,balance:true}),p=player(284,-103.5);
  h.act({id:'call-balance-8'},p);
  for(let i=0;i<120;i++)h.update(1/60,p,callbacks);
  assert.equal(h.snapshot().lifts[0].y,0);
  p.z=-101;
  for(let i=0;i<120;i++)h.update(1/60,p,callbacks);
  assert.ok(h.snapshot().lifts[0].y>7);
});

test('rendered ramps agree with hull support at both ends and the midpoint',()=>{
  const h=makeHoist(new T.Scene());
  for(const z of [-155,-146,-137]){
    const support=h.support(283,z,16+(z+158)/3);
    assert.ok(support);
    const hit=h.rayHit(new T.Vector3(283,support.height+2,z),new T.Vector3(0,-1,0),4,false);
    assert.ok(hit);assert.ok(Math.abs(hit.point.y-support.height)<.03);
  }
});

test('shooting the brake from the carrier clears its safety rail and persists across reset',()=>{
  const h=makeHoist(new T.Scene()),p=player(330,-164,8);
  for(let i=0;i<160;i++)h.update(1/60,p,callbacks);
  assert.ok(p.hoistY>15.5);
  h.shoot(p,new T.Vector3(330,17.1,-173));
  for(let i=0;i<30;i++)h.update(1/60,p,callbacks);
  assert.equal(h.serialize().carrier,true);
  const restored=makeHoist(new T.Scene(),h.serialize());assert.equal(restored.serialize().carrier,true);
});

test('finite tilted mirrors reflect the laser between heights into the optical receiver',()=>{
  const h=makeHoist(new T.Scene()),p=player(305,-171,16);
  h.laser(p,new T.Vector3(305,17.5,-176),.1);
  assert.equal(h.serialize().optical,true);
});

test('an exposed lower hull receives descending shots while the bridge blocks shots under its deck',()=>{
  const h=makeHoist(new T.Scene()),p=player(307,-140);let hits=0;
  for(let i=0;i<600;i++)h.update(1/60,p,{...callbacks,visible:()=>true,hurt:()=>hits++});
  assert.ok(hits>0);
  h.reset();hits=0;p.z=-127;
  for(let i=0;i<600;i++)h.update(1/60,p,{...callbacks,visible:()=>true,hurt:()=>hits++});
  assert.equal(hits,0);
});

test('ground exits allow a hull to straddle the regional seam before handing movement back',()=>{
  const h=makeHoist(new T.Scene()),p=player(135,-221);
  h.connectCombat([],[],()=>{},(x,z)=>x>=124&&x<=158&&z>=-260&&z<=-192);
  assert.equal(h.move(p,.2,0),true);assert.ok(p.x>135.1);
  while(p.x<135.9)assert.equal(h.move(p,.1,0),true);
  const before=p.x;assert.equal(h.move(p,.3,0),false);assert.equal(p.x,before);
});

test('a mortar cannot launch through the maintenance roof but can fire from the upper bridge',()=>{
  const h=makeHoist(new T.Scene());
  assert.equal(h.mortarClear(player(300,-128),new T.Vector3(300,0,-140)),false);
  assert.equal(h.mortarClear(player(296,-126,8),new T.Vector3(302,8,-126)),true);
});

test('a direct mortar impact applies one explosion rather than double damage',()=>{
  const h=makeHoist(new T.Scene()),p=player(320,-130,24);
  h.pull(p,{x:332,y:25.3,z:-131},1/60);
  h.shoot(p,new T.Vector3(332,25.3,-131),'mortar');
  for(let i=0;i<85;i++)h.update(1/60,p,callbacks);
  assert.equal(h.snapshot().enemies.find(e=>e.id==='sorter').hp,9);
});

test('the balanced platform rises under tank weight without requiring an interaction button',()=>{
  const h=makeHoist(new T.Scene(),{ballast:6}),p=player(284,-110);
  for(let i=0;i<120;i++)h.update(1/60,p,callbacks);
  assert.equal(p.hoistY,8);
  p.z=-120;
  for(let i=0;i<120;i++)h.update(1/60,p,callbacks);
  assert.equal(h.snapshot().lifts[0].y,0);
  assert.equal(h.support(284,-110,8),null);
});

test('a returning main lift stops above a hull underneath and resumes after it leaves',()=>{
  const h=makeHoist(new T.Scene(),{main:true}),p=player(306,-94);
  h.act({id:'call-main-24'},p);
  for(let i=0;i<330;i++)h.update(1/60,p,callbacks);
  assert.equal(p.hoistY,24);
  p.hoistY=0;h.act({id:'call-main-0'},p);
  for(let i=0;i<360;i++)h.update(1/60,p,callbacks);
  const y=h.snapshot().lifts.find(l=>l.id==='main').y;assert.ok(y>3&&y<3.3);assert.equal(p.hoistY,0);
  p.x=290;
  for(let i=0;i<120;i++)h.update(1/60,p,callbacks);
  assert.equal(h.snapshot().lifts.find(l=>l.id==='main').y,0);
});


test('foreground cutaways do not change shared materials elsewhere in the world',()=>{
  const scene=new T.Scene(),sentinel=box(scene,1,1,1,0,0,0,C.dark),h=makeHoist(scene);
  h.update(1/60,player(300,-128),callbacks);
  assert.equal(sentinel.material.opacity,1);assert.equal(sentinel.material.transparent,false);
});

test('visible flat deck surfaces have no positive-area coplanar overlap',()=>{
  const scene=new T.Scene();makeHoist(scene);
  const decks=scene.children.filter(m=>m.isMesh&&m.geometry.type==='BoxGeometry'&&m.geometry.parameters.height===.45&&!m.rotation.x);
  for(let i=0;i<decks.length;i++)for(const b of decks.slice(i+1)){
    const a=decks[i];if(Math.abs(a.position.y-b.position.y)>.001)continue;
    const overlapX=(a.geometry.parameters.width+b.geometry.parameters.width)/2-Math.abs(a.position.x-b.position.x);
    const overlapZ=(a.geometry.parameters.depth+b.geometry.parameters.depth)/2-Math.abs(a.position.z-b.position.z);
    assert.ok(overlapX<.001||overlapZ<.001,`Overlapping deck faces at ${a.position.toArray()} and ${b.position.toArray()}`);
  }
});


test('foreground decks and trim fade together, stay visible, and restore smoothly',()=>{
  const scene=new T.Scene(),h=makeHoist(scene),p=player(296,-126,8);
  const deck=scene.getObjectByName('hoist-deck:crown-bridge'),trim=scene.getObjectByName('hoist-trim:crown-bridge');
  for(let i=0;i<30;i++){
    p.x=296+(i%2?.001:-.001);h.update(1/60,p,callbacks);
    assert.equal(deck.visible,true);assert.equal(trim.visible,true);
    assert.equal(deck.material.transparent,true);assert.ok(deck.material.opacity>=.08);
    trim.traverse(m=>{if(m.isMesh)assert.equal(m.material.opacity,deck.material.opacity);});
    if(i===0)assert.ok(deck.material.opacity>.9&&deck.material.opacity<1);
  }
  assert.equal(deck.material.opacity,.08);assert.equal(deck.material.depthWrite,false);
  // Transparent geometry still blocks weapons through the upper floor.
  const hit=h.rayHit(new T.Vector3(300,20,-128),new T.Vector3(0,1,0),8,false);
  assert.ok(hit);assert.ok(Math.abs(hit.point.y-23.55)<.01);
  p.hoistY=24;h.update(1/60,p,callbacks);
  assert.ok(deck.material.opacity>.08&&deck.material.opacity<1);
  for(let i=0;i<30;i++)h.update(1/60,p,callbacks);
  assert.equal(deck.material.opacity,1);assert.equal(deck.material.depthWrite,true);
  assert.equal(deck.visible,true);assert.equal(trim.visible,true);
});

test('a docked main lift has a recessed slab beneath it instead of coplanar faces',()=>{
  const scene=new T.Scene();makeHoist(scene);scene.updateMatrixWorld(true);
  const ray=new T.Raycaster(new T.Vector3(306,2,-94),new T.Vector3(0,-1,0),0,3);
  const heights=[...new Set(ray.intersectObjects(scene.children,true).map(h=>Math.round(h.point.y*100)/100))];
  assert.ok(heights.includes(0));assert.ok(heights.includes(-.12));
  const floors=scene.children.filter(m=>m.name==='hoist-deck:loading');
  assert.equal(ray.intersectObjects(floors).filter(h=>Math.abs(h.point.y)<.001).length,0);
});

test('an overhead main lift fades in the sump and restores when boarding',()=>{
  const scene=new T.Scene(),h=makeHoist(scene),p=player(300,-106,-8);
  h.update(1/60,p,callbacks);
  const platform=scene.children.find(m=>m.isGroup&&m.position.x===306&&m.position.z===-94);
  assert.ok(platform);assert.equal(platform.visible,true);
  for(let i=0;i<30;i++)h.update(1/60,p,callbacks);
  assert.equal(platform.userData.hoistOpacity,.08);
  p.x=306;p.z=-94;p.hoistY=0;h.update(1/60,p,callbacks);
  for(let i=0;i<30;i++)h.update(1/60,p,callbacks);
  assert.equal(platform.visible,true);assert.equal(platform.userData.hoistOpacity,1);
});

test('fading a defender preserves the depth behavior of its transparent contact shadow',()=>{
  const scene=new T.Scene(),h=makeHoist(scene);
  h.update(1/60,player(326,-140,8),callbacks);
  const defender=scene.children.find(m=>m.isGroup&&m.position.x===326&&m.position.z===-140);
  const shadow=defender.children.find(m=>m.isMesh&&m.geometry.type==='PlaneGeometry');
  assert.ok(shadow);assert.equal(shadow.material.depthWrite,false);
});

const cursorRay=(x,y,z)=>new T.Ray(new T.Vector3(x+28,y+39.6,z+28),new T.Vector3(-28,-39.6,-28).normalize());

test('ordinary aiming at same-level floors stays level while Mortar keeps its ground landing',()=>{
  for(const [x,z,y,tx,tz]of [[290,-84,0,297,-84],[296,-126,8,299,-126]]){
    const h=makeHoist(new T.Scene()),p={...player(x,z,y),weapon:'cannon'};
    h.update(1/60,p,callbacks);
    const ray=cursorRay(tx,y,tz),aim=h.aimAt(ray,p);
    assert.ok(Math.abs(h.direction(p,aim).y)<.001,`Floor aim dives towards ${aim.toArray()}`);
    assert.ok(ray.distanceToPoint(aim)<.001,'Aim stays on the cursor ray');
    p.weapon='mortar';assert.ok(Math.abs(h.aimAt(ray,p).y-y)<.001);
  }
});

test('empty-space aiming stays level and explicit upper and lower targets retain their pitch',()=>{
  const h=makeHoist(new T.Scene()),p={...player(296,-126,8),weapon:'cannon'};
  h.update(1/60,p,callbacks);
  const empty=h.aimAt(cursorRay(500,8,100),p);
  assert.ok(Math.abs(h.direction(p,empty).y)<.001);
  const upper=h.aimAt(cursorRay(310,13.1,-126),p);
  assert.ok(h.direction(p,upper).y>.1);
  const lower=h.aimAt(cursorRay(282,1,-99),p);
  assert.ok(h.direction(p,lower).y<-.1);
});

test('the reticle point and direct-fire direction share the 40-degree limit in both directions',()=>{
  const h=makeHoist(new T.Scene()),p={...player(296,-126,8),weapon:'cannon'};
  for(const sign of [-1,1]){
    const intent=new T.Vector3(306,9.5+sign*30,-126),point=h.aimPoint(p,intent);
    const vector=point.clone().sub(new T.Vector3(p.x,9.5,p.z)).normalize();
    assert.ok(vector.distanceTo(h.direction(p,intent))<1e-10);
    assert.ok(Math.abs(Math.asin(vector.y)-sign*40*Math.PI/180)<1e-10);
    assert.deepEqual(h.aimPoint(p,intent.clone().setY(9.5+sign*60)),point);
    assert.equal(intent.y,9.5+sign*30,'Picking intent remains independent of the displayed reticle');
  }
  const reachable=new T.Vector3(306,11,-126);
  assert.deepEqual(h.aimPoint(p,reachable),reachable);
});

test('one Cannon impact releases the ballast visibly and the saved carriage completes its travel',()=>{
  const h=makeHoist(new T.Scene()),p=player(282,-88),sounds=[];
  h.shoot(p,new T.Vector3(282,1.2,-99));
  for(let i=0;i<45;i++)h.update(1/60,p,{...callbacks,sound:s=>sounds.push(s)});
  const partial=h.serialize();assert.equal(partial.ballastReleased,true);assert.ok(partial.ballast>0&&partial.ballast<6);assert.ok(sounds.includes('lever'));
  const restored=makeHoist(new T.Scene(),partial);
  for(let i=0;i<180;i++)restored.update(1/60,p,callbacks);
  assert.equal(restored.serialize().ballast,6);
  p.x=284;p.z=-110;
  for(let i=0;i<150;i++)restored.update(1/60,p,callbacks);
  assert.equal(p.hoistY,8);
});

test('gallery ratchet and crown drive respond to Cannon without an interaction prompt',()=>{
  const h=makeHoist(new T.Scene()),p=player(284,-123,8);
  h.shoot(p,new T.Vector3(282,9.1,-120));
  for(let i=0;i<30;i++)h.update(1/60,p,callbacks);
  assert.equal(h.serialize().balance,true);
  p.x=323;p.z=-113;p.hoistY=24;
  h.shoot(p,new T.Vector3(324,25.1,-108));
  for(let i=0;i<30;i++)h.update(1/60,p,callbacks);
  assert.equal(h.serialize().main,true);
});

test('an early brake shot gives a metal response and leaves the next cycle available',()=>{
  const h=makeHoist(new T.Scene()),p=player(332,-181,16),sounds=[];
  h.shoot(p,new T.Vector3(330,17.1,-173));
  for(let i=0;i<40;i++)h.update(1/60,p,{...callbacks,sound:s=>sounds.push(s)});
  assert.equal(h.serialize().carrier,false);assert.ok(sounds.includes('armor'));
});

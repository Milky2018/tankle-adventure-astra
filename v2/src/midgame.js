import * as T from 'three';
import { box, cylinder, ring, mat, C, batchStatic } from './world.js';
import { inside, phoenixReady } from './mechanics.js';
import { midgameRooms, midgameGates, midgameModules, midgameControls, midgameReceivers, midgameMirrors, midgameHives, returnLane } from './midgame-layout.js';

export function makeMidgame(scene,world,saved={}){
  const fixed=new T.Group();scene.add(fixed);
  const opened=new Set((saved?.opened||[]).filter(id=>midgameGates.some(g=>g.id===id&&g.kind!=='future')));
  if(opened.has('circulation-bridge'))opened.add('circulation-bridge-south');
  const state={guardianDead:!!saved?.guardianDead,signal:!!saved?.signal};
  const gates=midgameGates.map(def=>{
    const root=new T.Group();scene.add(root);root.position.set(def.x,opened.has(def.id)?-4:0,def.z);
    const w=def.axis==='x'?1:def.span,d=def.axis==='x'?def.span:1;
    box(root,w,3.2,d,0,1.6,0,def.kind==='phoenix'?0x776853:0x55676b);
    for(let a=-def.span/2+1;a<def.span/2;a+=2){
      const x=def.axis==='x'?0:a,z=def.axis==='x'?a:0;
      box(root,def.axis==='x'?1.1:.6,.16,def.axis==='x'?.6:1.1,x,2.3,z,mat(def.kind==='laser'?C.lightYellow:C.orange,true));
      if(def.kind==='phoenix'){const rib=box(root,def.axis==='x'?1.15:.2,2.4,def.axis==='x'?.2:1.15,x,1.4,z,C.yellow);if(def.axis==='x')rib.rotation.x=.25;else rib.rotation.z=.25;}
    }
    const bounds={x:def.x-w/2,z:def.z-d/2,w,d,h:3.2,active:!opened.has(def.id)};world.obstacles.push(bounds);
    return {...def,root,bounds};
  });
  function open(ids){let changed=false;for(const id of ids){const g=gates.find(g=>g.id===id);if(g&&g.kind!=='future'&&!opened.has(id)){opened.add(id);g.bounds.active=false;changed=true;}}return changed;}
  function ram(x,z,p){if(!phoenixReady(p))return [];const hit=gates.filter(g=>g.kind==='phoenix'&&g.bounds.active&&inside(x,z,g.bounds,1));open(hit.map(g=>g.id));return hit;}
  const modules=midgameModules.map(def=>{
    const root=new T.Group(),module=new T.Group();scene.add(root);root.add(module);root.position.set(def.x,0,def.z);
    cylinder(fixed,2.6,.28,def.x,.15,def.z,C.dark,32);ring(fixed,2.1,.08,def.x,.32,def.z,C.yellow);
    if(def.id==='phoenix'){
      for(const x of [-.65,.65]){const jet=cylinder(module,.48,2,x,1.7,0,C.yellow);jet.rotation.x=Math.PI/2;ring(module,.32,.1,x,1.7,-1,mat(C.orange,true)).rotation.x=Math.PI/2;}
      box(module,2,.45,1,0,1.3,0,C.metal);
    }else if(def.id==='laser'){
      const tube=cylinder(module,.45,2.8,0,1.7,0,C.metal);tube.rotation.x=Math.PI/2;
      for(const z of [-1,0,1])ring(module,.55,.12,0,1.7,z,mat(C.lightYellow,true)).rotation.x=Math.PI/2;
    }else{
      for(const x of [-.8,.8])cylinder(module,.5,1.5,x,1.6,0,C.metal);
      for(const y of [1.2,1.7,2.2]){const pipe=ring(module,1,.1,0,y,0,C.yellow);pipe.scale.z=.65;}
    }
    return {...def,root,module};
  });
  const controls=midgameControls.map(def=>{
    cylinder(fixed,.5,1,def.x,.5,def.z,C.dark,12);
    const wheel=ring(scene,.65,.14,def.x,1.35,def.z,C.yellow);wheel.rotation.x=.8;
    return {...def,control:true,wheel};
  });
  const receivers=midgameReceivers.map(def=>{
    cylinder(fixed,.8,.25,def.x,.14,def.z,C.dark,12);
    const recessed=def.id==='gallery-receiver';
    const lamp=box(scene,1.2,recessed?2.8:1.2,.65,def.x,recessed?2:1.2,def.z,mat(def.kind==='laser'?C.lightYellow:C.orange,true));
    ring(fixed,1.25,.08,def.x,.2,def.z,def.kind==='laser'?C.lightYellow:C.orange);
    for(const id of def.opens){const g=gates.find(g=>g.id===id);box(fixed,Math.abs(g.x-def.x)||.08,.04,.08,(g.x+def.x)/2,.15,def.z,C.metal);box(fixed,.08,.04,Math.abs(g.z-def.z)||.08,g.x,.15,(g.z+def.z)/2,C.metal);}
    return {...def,radius:.9,lamp};
  });
  function hitReceiver(id,kind){const r=receivers.find(r=>r.id===id&&r.kind===kind);return r?open(r.opens):false;}
  const mirrors=midgameMirrors.map(def=>{
    const root=new T.Group();scene.add(root);root.position.set(def.x,0,def.z);root.rotation.y=-def.angle;
    cylinder(root,.6,.4,0,.2,0,C.dark);box(root,def.length+.4,2.4,.35,0,1.3,0,C.dark);
    box(root,def.length,1.8,.4,0,1.4,0,new T.MeshStandardMaterial({color:0xd8eceb,metalness:.92,roughness:.13,emissive:0x71837d,emissiveIntensity:.3}));
    box(root,def.length+.4,.15,.5,0,2.5,0,C.lightYellow);
    for(const side of [-1,1])box(root,.15,2,.5,side*def.length/2,1.4,0,C.metal);
    const w=Math.abs(Math.cos(def.angle))*def.length+.4,d=Math.abs(Math.sin(def.angle))*def.length+.4;
    world.obstacles.push({x:def.x-w/2,z:def.z-d/2,w,d,h:2.5,active:true,mirror:true});
    return {...def,root};
  });
  const obstacle=(x,z,w,d,h,color=C.dark)=>{box(fixed,w,h,d,x,h/2,z,color);world.obstacles.push({x:x-w/2,z:z-d/2,w,d,h,active:true});};
  // Recessed repair bays screen the resting hull from the surrounding encounter.
  for(const [x,z,id] of midgameHives.filter(h=>[12,13,14,18,19].includes(h[2]))){
    const entry=id===14||id===19?-1:1;
    for(const side of [-1,1])obstacle(x+side*4.8,z+entry*.5,.8,10.8,3.2,0x607269);
    obstacle(x,z-entry*4.5,10.4,.8,3.2,0x607269);
    for(const side of [-1,1])box(fixed,.35,.12,3,x+side*3.7,.15,z+entry*4,C.lightYellow);
  }
  // Broken test carriages leave a broad, shared Cannon/Overdrive route to the cradle.
  for(const [x,z,w,d] of [[-86,-366,4,8],[-59,-340,9,3],[-7,-400,10,3],[17,-389,6,3],[70,-370,12,3]]){
    obstacle(x,z,w,d,2.3,0x655f51);for(const side of [-1,1])box(fixed,w+.5,.4,.45,x,.5,z+side*d/2,C.metal);
    cylinder(fixed,.8,.4,x,2.6,z,0x928d70,12);
  }
  for(const x of [-30,-18,-6]){
    obstacle(x,-422,3.6,2.8,1.1,0x59645b);box(fixed,2.1,.6,2.2,x,1.3,-422,C.metal);
    for(const side of [-1,1])box(fixed,.55,.65,3.2,x+side*1.5,.5,-422,C.dark);
    const broken=cylinder(fixed,.4,1.2,x,1.9,-422,C.yellow);broken.rotation.z=.55;
  }
  for(const r of midgameRooms.filter(r=>r.id.includes('track')||r.id.includes('express')||r.id.includes('freight-approach'))){
    const alongZ=r.d>r.w;for(const side of [-1,1])box(fixed,alongZ?.16:r.w,.07,alongZ?r.d:.16,r.x+r.w/2+(alongZ?side*2:0),.13,r.z+r.d/2+(alongZ?0:side*2),C.metal);
    for(let a=4;a<(alongZ?r.d:r.w);a+=8)box(fixed,alongZ?3:.25,.06,alongZ?.25:3,alongZ?r.x+r.w/2:r.x+a,.15,alongZ?r.z+a:r.z+r.d/2,C.yellow);
  }
  // Branch landmarks repeat the destination machinery without adding route arrows.
  const junctionDish=new T.Group();fixed.add(junctionDish);junctionDish.position.set(93,4,-324);junctionDish.rotation.x=-.6;
  box(fixed,5,.6,3,94,-.55,-324,C.dark);
  cylinder(fixed,.4,4,93,2,-324,C.dark);
  for(const radius of [1,2,3])ring(junctionDish,radius,.12,0,radius*.15,0,C.metal);
  box(junctionDish,.12,.12,6,0,.4,0,C.lightYellow);box(junctionDish,6,.12,.12,0,.4,0,C.lightYellow);
  box(fixed,8,.6,4,115,-.55,-404,C.dark);
  for(const x of [114,117]){
    cylinder(fixed,1,4,x,2,-404,0x677b72);
    for(const y of [.5,1.5,2.5,3.5])ring(fixed,1.05,.12,x,y,-404,C.metal);
  }
  box(fixed,5,.35,.35,115.5,3.7,-404,C.yellow);
  for(let x=132;x<=164;x+=4)box(fixed,.25,.06,3,x,.15,-256,C.yellow);
  // Offset optical screens make cover and firing angles readable from above.
  for(const [x,z,w,d] of [[140,-209,8,2],[180,-236,3,10],[165,-195,3,12],[199,-158,10,2],[196,-123,1,8]])obstacle(x,z,w,d,2.5,0x687e83);
  // A narrow optical well admits the reflected ray but not the tank hull.
  for(const x of [200.8,203.2])obstacle(x,-124.5,1,17,2.5,0x687e83);
  obstacle(202,-116,3.4,1,2.5,0x687e83);
  for(const [x,z,r] of [[148,-252,4],[205,-201,5],[247,-258,5]]){
    cylinder(fixed,.5,5,x,2.5,z,C.dark);const dish=new T.Group();fixed.add(dish);dish.position.set(x,6,z);dish.rotation.x=-.6;
    for(let i=1;i<=4;i++)ring(dish,r*i/4,.1,0,i*i*.08,0,C.metal);
    for(let i=0;i<8;i++){const a=i*Math.PI/4,spoke=box(dish,.1,.1,r*2,0,.5,0,C.metal);spoke.rotation.y=a;}
    cylinder(dish,.18,3,0,1.5,0,C.yellow);
  }
  // A common feed pipe visibly powers the return conveyor after its pressure plate is shot.
  const pumps=[];
  for(const [x,z] of [[148,-444],[175,-418],[220,-448],[241,-432]]){
    cylinder(fixed,1.3,2.4,x,1.2,z,0x677b72);for(const y of [.4,1.2,2])ring(fixed,1.35,.12,x,y,z,C.metal);
    const fan=new T.Group();scene.add(fan);fan.position.set(x,2.6,z);for(const a of [0,Math.PI/2]){const blade=box(fan,2.1,.13,.3,0,0,0,C.yellow);blade.rotation.y=a;}pumps.push(fan);
    world.obstacles.push({x:x-1.3,z:z-1.3,w:2.6,d:2.6,h:2.5,active:true});
  }
  const belt={...returnLane,parts:[],offset:0,active:true};world.belts.push(belt);
  for(let i=0;i<belt.d/.45;i++)belt.parts.push(box(scene,7.5,.11,.25,belt.x+4,.17,belt.z+i*.45,0x564e42));
  for(const side of [-1,1])box(fixed,.35,.7,belt.d,belt.x+4+side*4,.35,belt.z+belt.d/2,C.metal);
  for(let z=-411;z<-350;z+=6){const arrow=box(fixed,.2,.05,1.5,228,.29,z,C.yellow);arrow.rotation.y=.6;const other=box(fixed,.2,.05,1.5,228.75,.29,z,C.yellow);other.rotation.y=-.6;}
  const signal=new T.Group();scene.add(signal);signal.position.set(244,0,-258);
  const receiverHead=new T.Group();signal.add(receiverHead);receiverHead.position.y=5.5;
  box(receiverHead,2.5,.3,.7,0,0,0,C.metal);box(receiverHead,.4,.6,.5,0,.3,.4,mat(C.lightYellow,true));
  const signalLamp=cylinder(signal,.5,1,0,4.5,0,mat(C.dark,true));
  const echo=ring(scene,1,.05,244,7,-258,mat(C.lightYellow,true));echo.visible=false;
  batchStatic(fixed);
  function target(p){return modules.find(m=>!p[m.id]&&Math.hypot(m.x-p.x,m.z-p.z)<3.2)||controls.find(c=>Math.hypot(c.x-p.x,c.z-p.z)<2.7&&(c.signal?!state.signal&&state.guardianDead:c.opens.some(id=>!opened.has(id))));}
  function act(c){if(c.signal){if(!state.guardianDead||state.signal)return false;state.signal=true;return true;}return open(c.opens);}
  function update(dt,time,p){
    for(const g of gates)g.root.position.y=T.MathUtils.damp(g.root.position.y,g.bounds.active?0:-4,6,dt);
    for(const m of modules){m.module.visible=!p[m.id];m.module.position.y=Math.sin(time*2)*.15;m.module.rotation.y=time*.35;}
    for(const r of receivers)r.lamp.material.color.setHex(r.opens.every(id=>opened.has(id))?C.mint:r.kind==='laser'?C.lightYellow:C.orange);
    for(const c of controls)if(c.opens.length&&c.opens.every(id=>opened.has(id)))c.wheel.rotation.y=Math.PI/2;
    for(const fan of pumps)fan.rotation.y+=dt*(opened.has('rig-feed')?5:.2);
    signalLamp.material.color.setHex(state.signal?C.lightYellow:C.dark);echo.visible=state.signal;
    if(state.signal){const phase=time%8;receiverHead.rotation.y=T.MathUtils.damp(receiverHead.rotation.y,phase<2?-.7:phase<6?.7:0,2,dt);echo.scale.setScalar(1+phase*10);echo.material.transparent=true;echo.material.opacity=Math.max(0,1-phase/4);}
  }
  return {gates,opened,modules,controls,receivers,mirrors,state,open,ram,target,act,hitReceiver,update,serialize:()=>({opened:[...opened],...state})};
}

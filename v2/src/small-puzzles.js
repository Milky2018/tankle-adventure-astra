import * as T from 'three';
import { box, cylinder, ring, mat, C, batchStatic } from './world.js';
import { inside, angleDelta, clamp } from './mechanics.js';
import { puzzleControls, basinBounds, carrierRoute } from './puzzle-layout.js';
import { createRailPuzzle, createBasinPuzzle, createGutterPuzzle } from './puzzle-rules.js';

export function makeSmallPuzzles(scene,world,saved={}){
  const rail=createRailPuzzle(saved.rail),basin=createBasinPuzzle(saved.basin),gutter=createGutterPuzzle(saved.gutter);
  const fixed=new T.Group();scene.add(fixed);
  const bounds=(x,z,w,d,h)=>{const b={x:x-w/2,z:z-d/2,w,d,h,active:true};world.obstacles.push(b);return b;};
  const solid=(x,z,w,d,h,color=C.dark)=>{box(fixed,w,h,d,x,h/2,z,color);return bounds(x,z,w,d,h);};
  function segment(parent,a,b,color=C.metal,width=.12,y=.17){const length=Math.hypot(b[0]-a[0],b[1]-a[1]);const m=box(parent,width,.08,length,(a[0]+b[0])/2,y,(a[1]+b[1])/2,color,.02);m.rotation.y=Math.atan2(b[0]-a[0],b[1]-a[1]);return m;}
  const controls=puzzleControls.map(def=>{
    const root=new T.Group();root.position.set(def.x,0,def.z);scene.add(root);
    const handle=new T.Group();root.add(handle);
    const plate=['treadle','pump'].includes(def.kind);
    if(plate){
      box(root,3.2,.1,3.2,0,.05,0,C.dark);box(handle,2.7,.18,2.7,0,.25,0,C.yellow);
      for(const x of [-.9,.9])for(let z=-.8;z<=.8;z+=.4)box(handle,.3,.04,.16,x,.36,z,C.dark);
      if(def.kind==='pump'){cylinder(root,.3,1.4,1.9,.7,0,C.metal);segment(fixed,[def.x+1.9,def.z],[-192,-298],C.metal,.2);}
    }else{
      cylinder(root,.38,1.2,0,.6,0,C.dark,10);bounds(def.x,def.z,.75,.75,1.4);
      if(def.kind==='lock'){
        box(handle,.9,.65,.7,0,1.25,0,0xc48762);ring(handle,.32,.07,0,1.25,.4,C.yellow).rotation.x=Math.PI/2;
        segment(fixed,[def.x,def.z],[-195,-290],C.metal,.16);
      }else if(def.kind==='crank'){
        cylinder(root,1.65,.1,0,.08,0,C.dark,16);box(handle,2.6,.35,.4,0,.8,0,C.yellow);box(handle,.4,.35,2.6,0,.8,0,C.yellow);box(handle,.45,.12,.45,1.15,1.05,0,C.orange);
      }else{box(handle,.12,1,.12,0,1.4,0,C.metal);box(handle,.6,.15,.25,0,1.9,0,C.yellow);}
    }
    const lamp=box(root,.28,.14,.08,0,plate?.4:.9,plate?1.2:.4,mat(C.orange,true));
    return {...def,puzzle:true,root,handle,lamp,pressed:false,contact:false};
  });
  solid(-29,-115.7,26,.5,3,0x6a7567);
  solid(-168,-262,18,1,2.6,0x738777);
  // All possible routes are visible at once; blades show the currently selected branch.
  const edges=new Map();for(const settings of [[false,false],[true,false],[true,true]]){
    const route=carrierRoute(settings);for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i],key=[a.join(','),b.join(',')].sort().join(':');edges.set(key,[a,b]);}
  }
  for(const [a,b] of edges.values()){
    const alongX=a[1]===b[1];for(const side of [-1,1])segment(fixed,[a[0]+(alongX?0:side*.65),a[1]+(alongX?side*.65:0)],[b[0]+(alongX?0:side*.65),b[1]+(alongX?side*.65:0)]);
    const distance=Math.hypot(b[0]-a[0],b[1]-a[1]);for(let d=0;d<distance;d+=1.5)box(fixed,alongX?.12:1.7,.07,alongX?1.7:.12,a[0]+(b[0]-a[0])*d/distance,.1,a[1]+(b[1]-a[1])*d/distance,0x655d48);
  }
  segment(fixed,[-28,-108],[-32,-108],0xc2ad74,.08);segment(fixed,[-20,-104],[-24,-104],0xc2ad74,.08);segment(fixed,[-38,-99],[-38,-102],0xc2ad74,.08);
  const blades=[-32,-24].map(x=>{const root=new T.Group();root.position.set(x,.2,-104);scene.add(root);box(root,.16,.12,2.4,0,0,1.1,C.yellow);return root;});
  const carrier=new T.Group();carrier.rotation.y=Math.PI/2;scene.add(carrier);box(carrier,1.8,.6,2.1,0,.7,0,0x8baba0);box(carrier,2,.18,2.3,0,.35,0,C.dark);
  for(const x of [-.95,.95])for(const z of [-.7,.7])cylinder(carrier,.32,.2,x,.34,z,C.metal,10).rotation.z=Math.PI/2;
  box(carrier,1.1,.45,1.1,0,1.2,-.25,C.dark);const carLamp=box(carrier,.7,.14,.08,0,1.25,.35,mat(C.lightYellow,true));
  const carBounds=bounds(-38,-104,2.2,2.2,1.5);
  const brake=box(carrier,1.1,.5,.12,0,1.1,-1.1,0xc48762);for(const x of [-.35,.35])box(carrier,.15,.16,.14,x,1.1,-1.18,C.yellow);
  const pad=box(scene,3,.3,3.5,-24,.35,-94,0xb4ac82);ring(fixed,1.8,.055,-24,.12,-94,C.yellow);
  segment(fixed,[-24,-94],[-44,-94],C.metal,.1);segment(fixed,[-44,-94],[-44,-98],C.metal,.1);segment(fixed,[-44,-98],[-72,-98],C.metal,.1);
  const crossingGates=[-44,-72].map(x=>{
    const root=new T.Group();root.position.set(x,0,-98);scene.add(root);
    for(const z of [-3.5,0,3.5])box(root,.6,2.7,.6,0,1.35,z,C.dark);
    for(const y of [.6,1.8,2.5])box(root,.45,.16,8,0,y,0,C.yellow);
    return {root,bounds:bounds(x,-98,.65,8,2.8)};
  });
  for(const z of [-101.5,-94.5])segment(fixed,[-73,z],[-43,z],C.metal,.3);
  // The basin is separated from its supported controls and the existing combat shore.
  const basinWalls=[box(scene,.5,3.6,28,-194,1.8,-289,mat(0x6b877a)),box(scene,.5,3.6,24,-204,1.8,-290,mat(0x6b877a))];
  bounds(-194,-289,.5,28,3.6);bounds(-204,-290,.5,24,3.6);solid(-183,-289,.5,24,3,0x6b877a);
  const deck=new T.Group();deck.position.set(-199,0,-290);scene.add(deck);
  box(deck,9.2,.55,5.5,0,.3,0,0x9d9f7f);for(const x of [-3.5,3.5])box(deck,1,.75,5.2,x,.18,0,0xc7b181,.2);
  for(const z of [-2,0,2])box(deck,9,.1,.16,0,.65,z,C.metal);
  const deckBounds=bounds(-199,-290,10,5.5,1.1);
  const catches=[-203,-195].map(x=>{solid(x,-290,.5,5.8,5.2,C.dark);const m=box(scene,.95,.4,1.2,x,3.65,-290,C.yellow);return m;});
  const basinWater=new T.Mesh(new T.PlaneGeometry(9.2,18),new T.MeshPhongMaterial({color:0x4e8b94,transparent:true,opacity:.8,shininess:65,depthWrite:false}));basinWater.rotation.x=-Math.PI/2;basinWater.position.set(-199,.14,-290);scene.add(basinWater);
  const floodGates=[-299,-281].map(z=>{
    const root=new T.Group();root.position.set(-199,-3.6,z);scene.add(root);
    for(let x=-4;x<=4;x+=1)box(root,.12,3.5,.15,x,1.75,0,C.metal);
    for(const y of [.2,2.9])box(root,10,.25,.3,0,y,0,C.yellow);
    box(root,9.6,3.4,.08,0,1.7,0,new T.MeshPhongMaterial({color:0x79a9a3,transparent:true,opacity:.2,depthWrite:false}));
    box(root,9.6,.6,.6,0,.4,0,0xc7b181);return {root,bounds:bounds(-199,z,10,.4,3.4)};
  });
  for(let i=0;i<5;i++){box(fixed,.08,.08,.9,-203.65,.3+i*.85,-293,C.yellow);}
  const intake=cylinder(fixed,.3,5,-192,2.6,-298,C.metal);intake.rotation.z=Math.PI/2;
  for(const x of [-190.65,-189.35])cylinder(fixed,.07,3.4,x,1.7,-286,C.metal,8);
  const lockCover=box(scene,1.4,1.05,1.4,-190,1.25,-286,C.dark);
  const lockBounds=bounds(-190,-286,1.2,1.2,2);
  const intakeStream=cylinder(scene,.13,2,-195,1.8,-298,mat(0xaad1cf,true),8);
  const drainStream=box(scene,.8,.06,3,-199,.16,-280,mat(0x9fc8c1,true));
  // A visibly descending pair of open gutters leads from a leaking pipe to a dry planter.
  const hinges=[{x:-178,z:-251,y:3.5},{x:-170,z:-251,y:2.35}];
  segment(fixed,[-180,-248],[-178,-251],C.metal,.14);segment(fixed,[-165,-251],[-170,-251],C.metal,.14);
  const trays=hinges.map(h=>{
    const root=new T.Group();root.position.set(h.x,h.y,h.z);scene.add(root);
    box(root,.75,.12,8,0,0,4,0x7c9b89);for(const x of [-.4,.4])box(root,.1,.4,8,x,.12,4,C.metal);
    const flow=box(root,.4,.035,7.6,0,.095,4,mat(0xaad1cf,true));
    cylinder(fixed,.18,h.y,h.x,h.y/2,h.z,C.dark,8);bounds(h.x,h.z,.4,.4,h.y);
    const drip=cylinder(scene,.12,1,0,0,0,mat(0xb6d8cf,true),8);
    const splash=ring(scene,.6,.035,h.x,.13,h.z,new T.MeshBasicMaterial({color:0xb6d8cf,transparent:true,opacity:.3,depthWrite:false}));
    return {root,flow,drip,splash,h};
  });
  const plug=box(scene,1,.85,.7,-181,1.25,-250.7,0xb47752);for(const x of [-.3,.3])box(plug,.12,.12,.12,x,0,.4,C.yellow);
  const plugBounds=bounds(-181,-251,1.1,1.1,2);
  const pipe=cylinder(fixed,.27,5,-181,2.5,-251,C.metal,10);const spout=cylinder(fixed,.27,3,-179.5,4.8,-251,C.metal,10);spout.rotation.z=Math.PI/2;
  cylinder(fixed,.12,1.1,-178,4.15,-251,mat(0xb6d8cf,true),8);bounds(-181,-251,.65,.65,5);
  cylinder(fixed,1.4,.6,-170,.35,-243,C.dark,16);ring(fixed,1.4,.12,-170,.7,-243,C.metal);bounds(-170,-243,2.8,2.8,1.5);
  const plantWater=cylinder(scene,1.2,.06,-170,.15,-243,mat(0x79b3b2,true),16);
  const plant=new T.Group();plant.position.set(-170,.6,-243);scene.add(plant);cylinder(plant,.14,2.4,0,1.2,0,C.metal,10);
  const leaves=[];for(let i=0;i<5;i++){const hinge=new T.Group();hinge.position.set(0,1.7+i*.12,0);hinge.rotation.y=i*2.399;plant.add(hinge);const leaf=box(hinge,.65,.1,1.3,0,0,.7,0xa8b47c);leaves.push(leaf);}
  const bloom=ring(plant,.65,.08,0,2.65,0,mat(C.lightYellow,true));
  batchStatic(fixed);
  const cutaways=[...basinWalls];deck.traverse(m=>{if(m.isMesh){m.material=m.material.clone();cutaways.push(m);}});for(const m of cutaways){m.material.transparent=true;m.material.depthWrite=false;}
  let previousPlayer=null;
  const done=()=>[rail.state.solved,basin.state.solved,gutter.state.grown];let completed=done(),lastLevel=basin.state.level;
  function refreshBounds(){
    crossingGates.forEach(gate=>gate.bounds.active=!rail.state.solved);
    for(const gate of floodGates)gate.bounds.active=basin.state.filling||basin.state.level>.02;
    plugBounds.active=!gutter.state.unplugged;
    deckBounds.active=!basin.state.locked&&basin.state.level<.75;
    const p=rail.position();carBounds.x=p.x-1.1;carBounds.z=p.z-1.1;
  }
  function usable(c){return c.id==='rail-signal'&&rail.state.moving&&!rail.state.secured;}
  function target(player){return controls.find(c=>usable(c)&&Math.hypot(c.x-player.x,c.z-player.z)<2.7);}
  function act(c){return usable(c)&&rail.act(c.id);}
  function occupied(player,enemies){return [player,...enemies.filter(e=>e.hp>0)].some(e=>inside(e.x,e.z,basinBounds,.9));}
  function hit(x,z,y,player,enemies=[]){
    if(y<.4||y>2)return null;
    let id,changed=false;
    if(inside(x,z,carBounds,.08)){id='rail-carrier';changed=rail.act(id);}
    else if(inside(x,z,lockBounds,.08)){id='basin-lock';changed=basin.act(id,occupied(player,enemies));}
    else if(inside(x,z,plugBounds,.08)&&!gutter.state.unplugged){id='gutter-plug';changed=gutter.unplug();}
    if(!id)return null;refreshBounds();return {id,x,z,changed};
  }
  function update(dt,time,player,enemies=[]){
    const touches=[],dx=previousPlayer?player.x-previousPlayer.x:0,dz=previousPlayer?player.z-previousPlayer.z:0;
    const travelled=Math.hypot(dx,dz);previousPlayer={x:player.x,z:player.z};
    for(const c of controls){
      if(c.kind==='treadle'||c.kind==='pump'){
        const pressed=player.hp!==0&&Math.abs(player.x-c.x)<1.25&&Math.abs(player.z-c.z)<1.25;
        if(c.kind==='treadle'&&pressed&&!c.pressed&&rail.act(c.id))touches.push(c);
        if(c.kind==='pump')basin.press(pressed,occupied(player,enemies));
        c.pressed=pressed;
      }else if(c.kind==='crank'){
        const distance=Math.hypot(player.x-c.x,player.z-c.z);
        if(distance>2.2)c.contact=false;
        if(distance<1.75&&!c.contact&&travelled>0&&travelled<.5&&dx*(c.x-player.x)+dz*(c.z-player.z)>0){
          c.contact=true;if(gutter.act(c.id))touches.push(c);
        }
      }
    }
    const settled=rail.update(dt,p=>[player,...enemies.filter(e=>e.hp>0)].some(e=>Math.hypot(e.x-p.x,e.z-p.z)<(e.r??.9)+1.25));
    basin.update(dt);refreshBounds();
    const p=rail.position(),old=carrier.position.clone();carrier.position.set(p.x,0,p.z);if(dt>0&&old.distanceToSquared(carrier.position)>.00001)carrier.rotation.y=Math.atan2(p.x-old.x,p.z-old.z);
    brake.visible=!rail.state.moving&&!rail.state.secured;carLamp.visible=!rail.state.secured;pad.position.y=rail.state.secured?.12:.35;
    blades[0].rotation.y=rail.state.switches[0]?Math.PI/2:Math.PI;blades[1].rotation.y=rail.state.switches[1]?0:Math.PI;
    for(const g of crossingGates)g.root.position.y=T.MathUtils.damp(g.root.position.y,g.bounds.active?0:-3.2,6,dt);
    deck.position.y=basin.state.locked?3.35:basin.state.level*3.35;basinWater.position.y=.14+basin.state.level*3.1;basinWater.visible=basin.state.level>.01;
    const underneath=basin.state.locked&&inside(player.x,player.z,basinBounds,1);for(const m of cutaways){m.material.opacity=T.MathUtils.damp(m.material.opacity,underneath?.2:1,8,dt);m.castShadow=!underneath;}
    lockCover.position.y=1.25+(basin.state.level>=.98||basin.state.locked?1.3:0);plug.visible=!gutter.state.unplugged;
    catches.forEach((m,i)=>m.position.x=[-203,-195][i]+(basin.state.locked?(i?- .4:.4):0));
    for(const g of floodGates)g.root.position.y=T.MathUtils.damp(g.root.position.y,g.bounds.active?0:-3.6,10,dt);
    intakeStream.visible=basin.state.filling&&basin.state.level<1;drainStream.visible=!basin.state.filling&&basin.state.level>0;
    for(const c of controls){
      const on=c.id==='rail-a'?rail.state.switches[0]:c.id==='rail-b'?rail.state.switches[1]:c.id==='rail-signal'?rail.state.moving:c.id==='basin-valve'?c.pressed:c.id==='basin-lock'?basin.state.locked:gutter.state.angles[c.id==='gutter-a'?0:1]!==0;
      if(c.kind==='treadle'||c.kind==='pump')c.handle.position.y=T.MathUtils.damp(c.handle.position.y,c.pressed?-.18:0,12,dt);
      else if(c.kind==='crank'){const angle=gutter.state.angles[c.id==='gutter-a'?0:1]*Math.PI/2;c.handle.rotation.y+=clamp(angleDelta(c.handle.rotation.y,angle),-dt*5,dt*5);}
      else if(c.kind==='lock')c.handle.position.z=on?-.3:0;
      else c.handle.rotation.z=on?.6:-.35;
      c.lamp.material.color.setHex(on?C.mint:C.orange);
    }
    let connected=true;
    trays.forEach((t,i)=>{
      const target=(i?[Math.PI/2,Math.PI,0]:[0,Math.PI/2,Math.PI])[gutter.state.angles[i]];
      if(dt===0)t.root.rotation.y=target;else t.root.rotation.y+=clamp(angleDelta(t.root.rotation.y,target),-dt*2.5,dt*2.5);
      const angle=t.root.rotation.y,aligned=Math.abs(angleDelta(angle,target))<.02;connected&&=aligned;
      const flowing=gutter.state.unplugged&&(i===0||gutter.state.angles[0]===1&&Math.abs(angleDelta(trays[0].root.rotation.y,Math.PI/2))<.02);
      t.flow.visible=flowing;const x=t.h.x+Math.sin(angle)*8,z=t.h.z+Math.cos(angle)*8;
      const receiver=aligned&&i===0&&gutter.state.angles[0]===1?hinges[1].y+.1:aligned&&i===1&&gutter.state.angles[1]===2?.7:.15;
      t.drip.visible=flowing;t.drip.position.set(x,(t.h.y+receiver)/2,z);t.drip.scale.y=t.h.y-receiver;
      t.splash.visible=flowing;t.splash.position.set(x,receiver,z);t.splash.scale.setScalar(.6+(time*.9+i*.4)%1);
    });
    gutter.update(dt,connected);
    plantWater.position.y=.15+gutter.state.fill*.45;plant.scale.y=.3+gutter.state.fill*.7;
    leaves.forEach((leaf,i)=>leaf.rotation.x=T.MathUtils.damp(leaf.rotation.x,gutter.state.grown?Math.sin(time*.6+i)*.06:1.3,3,dt));bloom.visible=gutter.state.grown;
    const next=done(),events=next.map((value,i)=>value&&!completed[i]?['rail','basin','gutter'][i]:null).filter(Boolean);completed=next;
    const waterSettled=lastLevel!==basin.state.level&&(basin.state.level===0||basin.state.level===1);lastLevel=basin.state.level;
    return {events,touches,docked:settled&&rail.state.secured,save:events.length>0||touches.length>0||settled||waterSettled};
  }
  refreshBounds();update(0,0,{x:1e6,z:1e6});
  return {controls,target,act,hit,update,serialize:()=>({rail:rail.serialize(),basin:basin.serialize(),gutter:gutter.serialize()}),snapshot:()=>({rail:{...rail.serialize(),moving:rail.state.moving,position:rail.position()},basin:basin.serialize(),gutter:gutter.serialize()})};
}

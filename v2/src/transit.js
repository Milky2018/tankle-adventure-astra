import * as T from 'three';
import { box, cylinder, ring, mat, C, batchStatic } from './world.js';
import { clamp } from './mechanics.js';
import { magneticRails, transitGateDefs, mortarLatches, transitModules } from './transit-layout.js';

export function makeTransit(scene, world, saved = {}) {
  const fixed = new T.Group(); scene.add(fixed);
  const opened = new Set((saved?.opened || []).filter(id => [...transitGateDefs.map(g => g.id), 'carrier'].includes(id)));
  const obstacle = (x,z,w,d,h=3,color=C.dark) => {
    const bounds={x:x-w/2,z:z-d/2,w,d,h,active:true};world.obstacles.push(bounds);
    box(fixed,w,h,d,x,h/2,z,color,.12);return bounds;
  };
  const gates=transitGateDefs.map(def=>{
    const root=new T.Group();scene.add(root);root.position.set(def.x,0,def.z);
    const vertical=def.axis==='x',w=vertical?.65:def.span,d=vertical?def.span:.65;
    box(root,w,3.7,d,0,1.85,0,0x4c6264,.1);
    for(let n=-def.span/2+.8;n<def.span/2;n+=2){box(root,vertical?.8:1.2,.18,vertical?1.2:.8,vertical?0:n,2.7,vertical?n:0,C.yellow);}
    for(const side of [-1,1])box(fixed,1,4.5,1,def.x+(vertical?0:side*(def.span/2+.3)),2.25,def.z+(vertical?side*(def.span/2+.3):0),C.dark);
    const bounds={x:def.x-w/2,z:def.z-d/2,w,d,h:3.7,active:!opened.has(def.id)};world.obstacles.push(bounds);
    root.position.y=bounds.active?0:-4.2;return {...def,root,bounds};
  });
  function open(id){if(opened.has(id))return false;opened.add(id);const g=gates.find(g=>g.id===id);if(g)g.bounds.active=false;return true;}
  const rails=magneticRails.map(def=>{
    const root=new T.Group();scene.add(root);
    const stored=saved?.rails?.[def.id],position=Number.isFinite(stored)?clamp(stored,def.min,def.max):def[def.axis];
    const rail={w:2.7,d:2.7,...def,[def.axis]:opened.has(def.opens)?def.goal:position,root,latched:opened.has(def.opens)};
    const bounds={x:rail.x-rail.w/2,z:rail.z-rail.d/2,w:rail.w,d:rail.d,h:2.5,active:true};rail.bounds=bounds;world.obstacles.push(bounds);
    root.position.set(rail.x,0,rail.z);
    box(root,rail.w,1.7,rail.d,0,.9,0,C.metal);box(root,rail.w+.2,.3,rail.d+.2,0,.22,0,C.dark);
    const coil=ring(root,.75,.16,0,1.86,0,mat(C.mint,true));rail.coil=coil;
    for(const side of [-1,1])box(root,.22,1.7,2.9,side*.85,.9,0,C.dark);
    const alongX=def.axis==='x',span=def.max-def.min+4;
    for(const offset of [-.75,.75])box(fixed,alongX?span:.16,.08,alongX?.16:span,alongX?(def.max+def.min)/2:def.x+offset,.13,alongX?def.z+offset:(def.max+def.min)/2,C.metal);
    for(const stop of [def.min,def.max])box(fixed,alongX?.25:3.8,.18,alongX?3.8:.25,alongX?stop:def.x,.2,alongX?def.z:stop,C.yellow);
    const gate=transitGateDefs.find(g=>g.id===def.opens);
    if(gate){box(fixed,.12,.07,Math.abs(gate.z-def.z),def.goal,.16,(gate.z+def.z)/2,C.mint);box(fixed,Math.abs(gate.x-def.goal),.07,.12,(gate.x+def.goal)/2,.16,gate.z,C.mint);}
    return rail;
  });
  function pull(rail,player,dt,occupants=[]){
    if(rail.latched)return false;
    const distance=player[rail.axis]-rail[rail.axis],standOff=rail.free?rail[rail.axis==='x'?'w':'d']/2+1.2:2.4;
    if(Math.abs(distance)<standOff)return false;
    const next=clamp(rail[rail.axis]+Math.sign(distance)*Math.min(3*dt,Math.abs(distance)-standOff),rail.min,rail.max);
    const bounds={...rail.bounds,[rail.axis]:next-rail[rail.axis==='x'?'w':'d']/2};
    if(rail.free&&(world.obstacles.some(o=>o!==rail.bounds&&o.active!==false&&bounds.x<o.x+o.w&&bounds.x+bounds.w>o.x&&bounds.z<o.z+o.d&&bounds.z+bounds.d>o.z)||occupants.some(e=>e.hp>0&&e.x>bounds.x-e.r&&e.x<bounds.x+bounds.w+e.r&&e.z>bounds.z-e.r&&e.z<bounds.z+bounds.d+e.r)))return false;
    rail[rail.axis]=next;Object.assign(rail.bounds,bounds);rail.root.position.set(rail.x,0,rail.z);
    if(!rail.free&&Math.abs(rail[rail.axis]-rail.goal)<.22){rail.latched=true;return open(rail.opens);}
    return false;
  }
  const modules=transitModules.map(def=>{
    const root=new T.Group();scene.add(root);root.position.set(def.x,0,def.z);
    cylinder(root,2.2,.35,0,.2,0,C.dark,12);ring(root,1.7,.06,0,.4,0,C.yellow);
    const module=new T.Group();root.add(module);
    if(def.id==='magnet'){
      for(const x of [-.65,.65]){box(module,.5,1.1,.5,x,1.5,0,C.metal);box(module,.55,.35,.55,x,2.15,0,mat(C.mint,true));}box(module,1.8,.4,.55,0,1,0,C.metal);
    }else{const barrel=cylinder(module,.5,1.9,0,1.7,0,C.yellow);barrel.rotation.z=-.4;box(module,1.7,.4,1.7,0,.9,0,C.dark);}
    for(const x of [-2.3,2.3])box(fixed,.18,2.4,.18,def.x+x,1.2,def.z,C.dark);
    return {...def,root,module};
  });
  const latches=mortarLatches.map(def=>{
    // Open-topped enclosure: a shell can descend inside; a flat cannon shot cannot enter.
    for(const side of [-1,1]){obstacle(def.x+side*3,def.z,.6,6.6,2.7,0x889799);obstacle(def.x,def.z+side*3,6,.6,2.7,0x889799);}
    const root=new T.Group();scene.add(root);root.position.set(def.x,0,def.z);
    cylinder(root,1.45,.35,0,.2,0,C.dark,12);
    const core=cylinder(root,.85,1.2,0,1,0,mat(C.orange,true),8);
    ring(root,1.8,.05,0,.12,0,C.yellow);
    return {...def,root,core};
  });
  function hitLatch(x,z){let changed=false;for(const l of latches)if(Math.hypot(x-l.x,z-l.z)<1.7)changed=open(l.opens)||changed;return changed;}
  const lever={x:61,z:-230,opens:'observatory-return'};
  cylinder(fixed,.5,1.4,lever.x,.7,lever.z,C.dark);box(fixed,.8,.3,.6,lever.x,1.6,lever.z,C.mint);

  // The hub's broken turntable, with tracks running into each of its old districts.
  cylinder(fixed,15,.22,0,.05,-131,0x515b57,64);ring(fixed,14.6,.12,0,.2,-131,C.metal);
  ring(fixed,10.5,.05,0,.2,-131,0x9b9271);
  for(const x of [-1.6,1.6])box(fixed,.16,.12,34,x,.23,-131,C.metal);
  for(const z of [-133,-129])box(fixed,38,.12,.16,0,.22,z,C.metal);
  obstacle(0,-131,5,5,2,0x62756e);
  for(let i=0;i<12;i++){const a=i*Math.PI/6;box(fixed,.6,.1,.6,Math.sin(a)*13,.23,-131+Math.cos(a)*13,C.yellow);}
  const signal=new T.Group();scene.add(signal);signal.position.set(0,0,-131);
  cylinder(signal,.48,4,0,3,0,C.dark,12);cylinder(signal,1.5,.22,0,4.8,0,C.metal,20);
  const signalLamp=box(signal,1.3,.8,1.3,0,5.35,0,mat(0xa48552,true));
  for(const side of [-1,1])box(signal,2.8,.15,.65,side*1.5,4.1,0,C.yellow);
  // Cargo banks shape combat and provide cover without sealing the freight loop.
  // Parked freight bodies divide each yard into a firing lane and a driveable flank.
  for(const [x,z,w,d,h] of [[-96,-143,5,15,3],[-83,-156,8,4,2.8],[-61,-137,8,3,2.6],[-92,-178,6,13,3],[-61,-172,10,4,3],[42,-137,8,3,2.8],[84,-128,10,4,3],[105,-154,8,3,3],[91,-107,6,4,2.6],[80,-89,5,8,3],[47,-91,4,6,3]]){
    obstacle(x,z,w,d,h,0x756a54);
    box(fixed,w+.3,.3,d+.3,x,h+.15,z,0x958a68);
    for(let a=-w/2+.7;a<w/2;a+=1.5)box(fixed,.09,h+.05,d+.05,x+a,h/2,z,0x4a514a);
    for(const side of [-1,1])for(const end of [-1,1])cylinder(fixed,.45,.2,x+side*(w/2-.4),.38,z+end*(d/2-.8),C.dark,8).rotation.z=Math.PI/2;
  }
  // A gantry spans the crane hall. Supports sit at its edges; the suspended arm stays overhead.
  for(const x of [-102,-54]){obstacle(x,-199,1.4,1.4,7,C.dark);box(fixed,1,1,19,x,7,-196,C.metal);}
  box(fixed,49,1.3,1.4,-78,8,-196,C.metal);
  for(const x of [-86,-82])box(fixed,.13,4,.13,x,5.6,-196,C.dark);
  box(fixed,5,.7,3,-84,3.5,-196,C.dark);
  // Archive shelves repeat empty cradle silhouettes: this railway once carried living machines.
  for(const x of [-18,18])for(const z of [-202,-187]){
    obstacle(x,z,3,7,3.3,0x697775);
    for(let j=0;j<3;j++)box(fixed,3.1,.08,6.6,x,1+j*.9,z,C.metal);
  }
  for(const x of [7,39]){obstacle(x,-237,3,14,3.5,0x5b737c);}
  // The old works hold a long belt with refuge on both sides. Boosting is useful, never a prerequisite here.
  const belt={x:43,z:-99,w:27,d:5,dx:-1,dz:0,parts:[],offset:0,active:true};
  box(fixed,belt.w,.16,belt.d,belt.x+belt.w/2,.1,belt.z+belt.d/2,C.dark);
  for(let i=0;i<60;i++)belt.parts.push(box(scene,.23,.08,4.7,belt.x+i*.45,.23,belt.z+2.5,0x999375));world.belts.push(belt);
  // A future high-speed freight spine is physically obstructed by a reinforced wreck.
  obstacle(20,-268,16,5,4.4,0x615c50);
  for(const x of [14,18,22,26])box(fixed,.3,4.7,5.1,x,2.35,-268,C.dark);
  for(const x of [15,25])box(fixed,.15,.06,15,x,.2,-258,C.yellow);
  // Water and a distant garden make the next capability boundary legible without a text wall.
  const water=new T.Mesh(new T.PlaneGeometry(76,50),new T.MeshPhongMaterial({color:0x315c68,specular:0x8baeb1,shininess:65}));
  water.rotation.x=-Math.PI/2;water.position.set(-54,-.4,-291);scene.add(water);
  for(let i=0;i<7;i++){box(fixed,2,.18,6,-59+i*5,.05,-262,0x7b8880);}
  const ripples=[];
  for(const [x,z] of [[-64,-278],[-40,-278],[-25,-285],[-72,-291]]){
    const ripple=ring(scene,2.4,.025,x,-.34,z,new T.MeshBasicMaterial({color:0x90b7b6,transparent:true,opacity:.25,depthWrite:false}));ripples.push(ripple);
  }
  for(const [x,z] of [[-82,-292],[-68,-306],[-31,-303]]){
    cylinder(fixed,5,2,x,-1,z,0x334e4c,16);
    for(let i=0;i<5;i++){const a=i*2.4;const stem=cylinder(fixed,.16,5+i*.4,x+Math.sin(a)*2,2,z+Math.cos(a)*2,0x789b89,8);stem.rotation.z=Math.sin(a)*.3;ring(fixed,1.1,.1,stem.position.x,4+i*.4,stem.position.z,0x91aa8a);}
  }
  // The observatory is a quiet outer court; a mirror points into the unbuilt interior.
  obstacle(108,-249,4,4,6,0x6d8491);
  const dish=new T.Group();scene.add(dish);dish.position.set(107,6,-249);dish.rotation.z=.65;
  cylinder(dish,4,.35,0,0,0,0xb2b9ac,32);ring(dish,3.8,.2,0,.25,0,C.metal);box(dish,.12,3,.12,0,1.5,0,C.dark);
  for(const x of [80,86,92])box(fixed,1,.3,5,x,.12,-249,C.metal);
  const mirror=box(fixed,3.4,3,.18,87,1.6,-246,0xc1d4cf);mirror.rotation.y=.65;world.obstacles.push({x:85.35,z:-247.1,w:3.3,d:2.2,h:3.1,active:true});
  // Maintenance dock: restoring the counterweight revives a carrier instead of awarding a collectible.
  const carrier=new T.Group();scene.add(carrier);carrier.position.set(-88,0,-96);
  box(carrier,4,.65,3,0,.55,0,C.dark);box(carrier,3.2,.65,2.6,0,1.2,0,0x8c9986);
  for(const x of [-1.6,1.6])for(const z of [-1,1])cylinder(carrier,.5,.4,x,.35,z,C.metal,10).rotation.z=Math.PI/2;
  const carrierBounds={x:-90,z:-97.5,w:4,d:3,h:1.7,active:true};world.obstacles.push(carrierBounds);
  const lamp=box(carrier,1,.3,.15,0,1.4,1.4,mat(C.mint,true));
  // Few lights, long spaces of silence, and one repeated skyline landmark.
  for(const [x,z] of [[-4,-99],[-19,-116],[20,-149],[-65,-128],[-100,-155],[-100,-201],[-28,-200],[-35,-235],[-60,-256],[43,-247],[110,-156],[46,-68],[109,-89],[59,-237]]){
    box(fixed,.16,4,.16,x,2,z,C.dark);box(fixed,1.4,.3,.65,x,4,z,C.metal);box(fixed,1.1,.1,.5,x,3.8,z,mat(0xffdf9d,true));
    const pool=new T.Mesh(new T.CircleGeometry(3.5,20),new T.MeshBasicMaterial({color:0xffdb9a,transparent:true,opacity:.06,depthWrite:false}));pool.rotation.x=-Math.PI/2;pool.position.set(x,.14,z);fixed.add(pool);
  }
  for(const x of [-125,130]){box(fixed,8,35,10,x,12,-202,0x30464a);box(fixed,3,47,4,x,19,-202,0x30464a);}
  batchStatic(fixed);
  function update(dt,time,player,restored=false){
    signal.rotation.y=restored?time*.18:Math.PI/4;signalLamp.material.color.setHex(restored?C.mint:0xa48552);
    for(const g of gates)g.root.position.y=T.MathUtils.damp(g.root.position.y,opened.has(g.id)?-4.2:0,5,dt);
    for(const r of rails){r.coil.material.color.setHex(r.latched?0xc8d5ba:C.mint);r.coil.rotation.z=Math.sin(time*2)*.03;}
    for(const m of modules){m.module.visible=!player[m.id];m.module.position.y=.2+Math.sin(time*2)*.15;m.module.rotation.y=time*.5;}
    for(const l of latches){l.core.scale.y=opened.has(l.opens)?.2:1;l.core.material.color.setHex(opened.has(l.opens)?C.mint:C.orange);}
    const carrierX=T.MathUtils.damp(carrier.position.x,-88+(opened.has('carrier')?Math.sin(time*.3)*5:0),.7,dt);
    if(Math.abs(player.z+96)>2.6||Math.abs(player.x-carrierX)>3)carrier.position.x=carrierX;
    lamp.visible=opened.has('carrier');carrierBounds.x=carrier.position.x-2;
    ripples.forEach((r,i)=>{const phase=(time*.18+i*.25)%1;r.scale.setScalar(1+phase*2);r.material.opacity=Math.sin(phase*Math.PI)*.2;});dish.rotation.y=Math.sin(time*.05)*.05;
  }
  function serialize(){return {opened:[...opened],rails:Object.fromEntries(rails.map(r=>[r.id,r[r.axis]]))};}
  return {gates,rails,modules,latches,lever,open,pull,hitLatch,opened,update,serialize};
}

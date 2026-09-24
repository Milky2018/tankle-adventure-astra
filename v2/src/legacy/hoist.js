import * as T from 'three';
import { box, cylinder, ring, mat, C, tankModel, batchStatic } from '../rendering/factory-models.js';
import { elevation } from './world.js';
import { hoistDecks, hoistLiftDefs } from '../content/prototypes/hoist-layout.js';
import { renderDecks, inRect, deckHeight, supportAt } from '../world/deck-geometry.js';
import {clamp,phoenixReady,contactDamage,redContact,PLAYER_HURT_RADIUS} from '../player/mechanics.js';

export function makeHoist(scene,saved={}){
  const state={ballast:0,ballastReleased:false,balance:false,bridge:false,carrier:false,main:false,optical:false,hot:false,cart:false,sorter:false,...saved};
  const fixed=new T.Group();scene.add(fixed);
  const solids=[],floors=[],targets=[],foes=[],shots=[],controls=[],mirrors=[];
  const ray=new T.Raycaster();
  let externalEnemies=[],externalWalls=[],externalDamage=null,externalAvailable=null;
  let clock=0,dirty=false,sound=null,deliveryTime=-1;
  function solid(x,y,z,w,h,d,color=C.dark,parent=scene){
    const mesh=box(parent,w,h,d,x,y+h/2,z,color,0);
    const item={x:x-w/2,z:z-d/2,w,d,y,h,visualGround:y,mesh};solids.push(item);return item;
  }
  let floorTexture=null;
  if(typeof document!=='undefined'){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');
    ctx.fillStyle='#d5d9d1';ctx.fillRect(0,0,128,128);ctx.fillStyle='#c2ccc3';ctx.fillRect(1,1,126,2);ctx.fillRect(1,1,2,126);
    floorTexture=new T.CanvasTexture(canvas);floorTexture.wrapS=floorTexture.wrapT=T.RepeatWrapping;floorTexture.colorSpace=T.SRGBColorSpace;
  }
  const deckViews=hoistDecks.map(d=>{
    const trim=new T.Group();trim.name=`hoist-trim:${d.id}`;scene.add(trim);
    return {...d,trim,meshes:[],hidden:false};
  });
  for(const d of renderDecks(hoistDecks,hoistLiftDefs)){
    const color=d.id==='hot-lane'?0x92664b:d.water?0x356872:d.y===24?0xb2ad90:d.y===16?0x9b9d8b:d.y===8?0x748e86:0x797d70;
    const mesh=box(scene,d.w,.45,Math.hypot(d.d,d.rise||0),d.x+d.w/2,d.y+(d.rise||0)/2-.225-(d.recess||0),d.z+d.d/2,mat(color),0);
    mesh.name=`hoist-deck:${d.id}`;
    if(d.rise)mesh.rotation.x=-Math.atan2(d.rise,d.d);
    if(floorTexture&&!d.water){
      // World-aligned panel seams stay continuous across the disjoint patches.
      mesh.geometry=mesh.geometry.clone();const pos=mesh.geometry.attributes.position,uv=mesh.geometry.attributes.uv;
      for(let i=0;i<pos.count;i++)uv.setXY(i,(pos.getX(i)+mesh.position.x)/8,-(pos.getZ(i)+mesh.position.z)/8);
      mesh.material.map=floorTexture;
    }
    mesh.updateMatrixWorld();floors.push({...d,mesh});deckViews.find(v=>v.id===d.id).meshes.push(mesh);
  }
  // Only exposed boundaries get rails. No posts or stripes at internal room seams.
  const railEdges=new Set();
  for(const d of deckViews.filter(d=>!d.water))for(const side of ['left','right','front','back']){
    const alongX=side==='front'||side==='back',length=alongX?d.w:d.d;
    for(let t=.5;t<length;t+=1){
      const x=alongX?d.x+t:side==='left'?d.x:d.x+d.w,z=alongX?(side==='front'?d.z:d.z+d.d):d.z+t,y=deckHeight(d,z);
      const ox=alongX?0:side==='left'?-.2:.2,oz=alongX?(side==='front'?-.2:.2):0;
      if(hoistDecks.some(o=>o.id!==d.id&&inRect(x+ox,z+oz,o)&&Math.abs(deckHeight(o,z)-y)<.5)||hoistLiftDefs.some(o=>inRect(x+ox,z+oz,o)&&o.stops.includes(y)))continue;
      const key=[x,y,z,alongX].join('/');if(railEdges.has(key))continue;railEdges.add(key);
      box(d.trim,alongX?1:.14,.12,alongX?.14:1,x,y+.08,z,C.yellow,0);
      if(d.y>=8&&!d.rise){
        box(d.trim,alongX?1:.1,.1,alongX?.1:1,x,y+.8,z,C.metal,0);
        if(t%6===.5)box(d.trim,.16,.8,.16,x,y+.4,z,C.metal,0);
      }
    }
  }
  // Trim can become transparent, so retain per-instance depth sorting.
  for(const d of deckViews){
    const materials=new Map();
    d.trim.traverse(m=>{if(m.isMesh){if(!materials.has(m.material)){const material=m.material.clone();material.transparent=true;materials.set(m.material,material);}m.material=materials.get(m.material);}});
    batchStatic(d.trim);
  }
  // The rear wall anchors the height. Foreground gantries obscured the route.
  for(const x of [273,343]){
    box(fixed,1.1,42,1.1,x,9,-184,C.dark,0);
    for(let y=-6;y<32;y+=8)box(fixed,2,.5,2,x,y,-184,C.metal,0);
  }
  box(fixed,62,.5,70,310,-13,-141,0x0e292c,0);
  function control(id,x,y,z,kind='switch'){
    const root=new T.Group();scene.add(root);root.position.set(x,y,z);
    box(root,1.4,.65,1.4,0,.32,0,C.dark,0);
    const lamp=box(root,.8,.3,.8,0,1.1,0,mat(kind==='use'?C.mint:C.orange,true),0);
    const t={id,x,y:y+1.1,z,ground:y,root,lamp,kind,flash:0,radius:1.1,hoist:true};controls.push(t);targets.push(t);
    if(kind!=='use'&&kind!=='laser'){const paddle=box(root,1.2,.7,.18,0,1.1,.45,C.orange,0);ring(paddle,.38,.05,0,0,.1,C.yellow).rotation.x=Math.PI/2;t.paddle=paddle;}
    return t;
  }
  const ballast=solid(282,0,-99,3,2,3,C.metal,scene);ballast.mesh.material=ballast.mesh.material.clone();
  ring(ballast.mesh,.8,.12,0,1.05,0,mat(C.mint,true));
  for(const x of [281,283])box(fixed,.12,.04,12,x,.08,-99,C.metal,0);
  const ballastPaddle=box(ballast.mesh,1.25,.8,.18,0,.2,1.6,mat(C.orange,true),0);
  ring(ballastPaddle,.4,.06,0,0,.1,C.yellow).rotation.x=Math.PI/2;
  const ballastTarget={id:'ballast',x:282,y:1,z:-99,kind:'magnet',radius:1.8};targets.push(ballastTarget);
  const pallet=solid(309,8,-126,2,4,12,C.dark,scene);
  const latch=control('latch',310,12,-126,'shot');
  const latchShield=solid(310,11,-124.5,3,2,.6,C.metal,scene);
  control('balance-lock',282,8,-120);
  const carrierRail=solid(330,16,-170,12,.75,.35,C.yellow,scene);
  control('brake',330,16,-173,'shot');
  control('restore',324,24,-108);
  control('cart',285,-8,-109,'use');
  control('hot',384,24,-184);
  control('optical',300,18,-196,'laser');
  const opticalGate=solid(294,16,-186,36,4,.6,C.teal,scene);
  // Two finite tilted mirrors form a visible rising path into the inspection room.
  for(const [x,y,z,n]of [[305,17.5,-176,[0,Math.SQRT1_2,Math.SQRT1_2]],[305,22,-176,[Math.SQRT1_2,Math.SQRT1_2,0]]]){
    const mesh=new T.Mesh(new T.PlaneGeometry(4,4),new T.MeshStandardMaterial({color:0xe0f2e9,metalness:.85,roughness:.12,side:T.DoubleSide}));
    mesh.position.set(x,y,z);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(...n));scene.add(mesh);mirrors.push(mesh);
    const frame=new T.LineSegments(new T.EdgesGeometry(mesh.geometry),new T.LineBasicMaterial({color:C.yellow}));mesh.add(frame);
  }
  for(const x of [282,294,306]){solid(x,16,-198,2.5,1.2,2.5,C.dark);cylinder(deckViews.find(d=>d.id==='optical-room').trim,.65,2,x,18,-198,C.metal,12);ring(deckViews.find(d=>d.id==='optical-room').trim,.9,.12,x,19.2,-198,C.yellow);}
  const opticLamp=ring(deckViews.find(d=>d.id==='optical-room').trim,.7,.1,294,19.4,-198,mat(C.dark,true));
  // The receiver sits on the upper reflected path; its armored housing rejects Cannon fire.
  const receiver=controls.find(c=>c.id==='optical');receiver.root.position.set(294,20.9,-176);Object.assign(receiver,{x:294,y:22,z:-176,ground:16,radius:.45});
  solid(297,20.8,-176,6,.6,2,C.dark);solid(297,22.6,-176,6,.6,2,C.dark);
  solid(294,21.4,-174.8,6,1.2,.4,C.dark);solid(294,21.4,-177.2,6,1.2,.4,C.dark);
  for(const o of solids)if(o.y>=20.8&&o.y<=22.6&&o.z<-170)o.visualGround=16;
  const expressGates=[solid(354,24,-148,12,4,.7,C.teal,scene),solid(130,0,-230,12,4,.7,C.teal,scene),solid(168,0,-374,12,4,.7,C.teal,scene)];
  const hotGate=solid(384,24,-116,8,3,.7,C.teal,scene);
  const beltSlats=new T.InstancedMesh(new T.BoxGeometry(10,.06,.5),mat(C.yellow),32),beltMatrix=new T.Matrix4();scene.add(beltSlats);
  for(let i=0;i<32;i++){beltMatrix.makeTranslation(370,24.08,-178+i*2);beltSlats.setMatrixAt(i,beltMatrix);}beltSlats.computeBoundingSphere();
  for(const x of [364.3,375.7])box(deckViews.find(d=>d.id==='hot-lane').trim,.2,.25,64,x,24.2,-146,C.orange,0);
  for(let z=-170;z<-114;z+=10)for(const side of [-1,1]){const arrow=box(deckViews.find(d=>d.id==='hot-lane').trim,.18,.05,2,370+side*.65,24.15,z,C.lightYellow,0);arrow.rotation.y=-side*Math.PI/4;}
  // Short roofed refuge: shells and beams strike the roof rather than the lower hull.
  const roof=solid(308,3.8,-130,24,.7,16,C.dark,scene);roof.mesh.material=roof.mesh.material.clone();
  for(const [x,z,y]of [[278,-151,8],[336,-142,8],[294,-180,16],[335,-112,24]])solid(x,y,z,3,1.3,3,C.teal);
  const lifts=hoistLiftDefs.map(d=>{
    const root=new T.Group();scene.add(root);root.position.set(d.x+d.w/2,0,d.z+d.d/2);
    const mesh=box(root,d.w,.5,d.d,0,-.25,0,mat(C.yellow),0);
    for(const x of [-d.w/2+.3,d.w/2-.3])box(root,.12,.15,d.d,x,.15,0,C.dark,0);
    const cables=[-1,1].map(side=>cylinder(scene,.065,1,d.x+d.w/2+side*(d.w/2-.35),20,d.z+d.d/2,C.dark,6));
    const lift={...d,root,mesh,cables,y:d.stops[0],destination:d.stops[0],wait:0,cycling:false};
    for(const y of d.stops){
      // Calls are at the adjacent landing; the onboard switch uses the same interact action.
      const cx=['balance','carrier'].includes(d.id)&&y===d.stops.at(-1)?d.x+d.w-2:d.id==='main'?(y===24?314:d.x-2):d.x+d.w/2,cz=d.id==='main'?(y===24?-102:d.z+4):d.id==='balance'?(y===8?d.z-2:d.z+d.d+2):d.id==='carrier'?(y===16?d.z-2:d.z+d.d+2):d.id==='optical'?d.z+14:d.z-2;
      control(`call-${d.id}-${y}`,cx,y,cz);
    }
    return lift;
  });
  function enemy(id,x,y,z,hp,shield=false){
    const model=tankModel(shield?'guard':'turret');scene.add(model.root);model.root.position.set(x,y,z);
    const materials=[];model.root.traverse(m=>{if(m.isMesh){m.material=m.material.clone();materials.push({m:m.material,color:m.material.color.clone()});}});
    const e={materials,id,x,y:y+1.3,z,ground:y,hp,max:hp,model,radius:shield?1.8:1.3,shield,heading:Math.PI,timer:1.5,phase:'idle',ramAt:-10};
    const warning=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3()]),new T.LineBasicMaterial({color:C.orange,transparent:true,opacity:.8}));scene.add(warning);e.warning=warning;
    foes.push(e);targets.push(e);return e;
  }
  enemy('balcony',326,8,-140,3);enemy('bridge-guard',334,8,-116,4,true);
  enemy('upper-gunner',311,16,-179,3);enemy('crown-gunner',337,24,-118,3);
  const sorter=enemy('sorter',332,24,-131,state.sorter?0:12,true);sorter.optional=true;
  const sortingCrate=solid(322,24,-124,3,2.8,3,C.teal,scene);

  const sortingCable=cylinder(scene,.08,1,322,30,-124,C.metal,6);
  const weight=new T.Group();scene.add(weight);for(let i=0;i<5;i++)box(weight,3,.65,3,0,i*.7,0,C.metal,.05);weight.position.set(273,8,-110);
  box(fixed,12,.3,.3,278.5,14,-110,C.metal,0);
  const weightCable=cylinder(scene,.07,1,273,12,-110,C.metal,6);
  for(const x of [273,284])cylinder(fixed,.65,.3,x,14,-110,C.yellow,12).rotation.x=Math.PI/2;
  const maintenance=tankModel('scout');scene.add(maintenance.root);maintenance.root.position.set(286,-8,-110);
  const cartPark=solid(342,24,-116,2.8,1.8,2.8,C.dark,scene);cartPark.mesh.visible=false;cartPark.active=!!state.cart;
  const deliveryBasket=box(scene,3.7,.3,3.7,286,-8.3,-110,C.dark,0),deliveryCable=cylinder(scene,.045,1,286,10,-110,C.metal,6);deliveryBasket.visible=deliveryCable.visible=false;
  const deliveryPath=[[286,-8,-110],[312,-8,-146],[312,28,-146],[342,28,-116],[342,24,-116]].map(p=>new T.Vector3(...p));
  const crownLamp=box(deckViews.find(d=>d.id==='express-entry').trim,1,1,1,342,27,-116,mat(C.dark,true));
  batchStatic(fixed);
  const fadeMeshes=new WeakMap();
  function fade(root,obscured,dt,owned=false){
    let meshes=fadeMeshes.get(root);
    if(!meshes){
      meshes=[];root.traverse(m=>{if(m.isMesh){if(!owned)m.material=m.material.clone();m.material.transparent=true;meshes.push({mesh:m,shadow:m.castShadow,opacity:m.material.opacity,depthWrite:m.material.depthWrite});}});
      fadeMeshes.set(root,meshes);
    }
    const target=obscured?.08:1,previous=root.userData.hoistOpacity??1;
    const opacity=previous+clamp(target-previous,-dt*4,dt*4);
    root.userData.hoistOpacity=opacity;root.userData.hoistCutaway=obscured;
    for(const {mesh,shadow,opacity:baseOpacity,depthWrite}of meshes){mesh.material.opacity=baseOpacity*opacity;mesh.material.depthWrite=depthWrite&&opacity===1;mesh.castShadow=shadow&&!obscured;}
  }
  const projectileGeometry=new T.SphereGeometry(.22,8,6),projectileMaterial=mat(C.orange,true);
  const beamMaterial=new T.LineBasicMaterial({color:C.lightYellow});
  const beams=Array.from({length:6},()=>{const m=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3()]),beamMaterial);scene.add(m);m.visible=false;return m;});
  function core(x,z){return x>=274&&x<=390&&z>=-204&&z<=-60;}
  function support(x,z,y,water=false){return supportAt(hoistDecks,lifts,x,z,y,water);}
  function owns(x,z,y=0){return core(x,z)||!!support(x,z,y,true);}
  function active(p){return owns(p.x,p.z,p.hoistY||0);}
  function blocked(x,y,z,r=.88){return solids.some(o=>o.active!==false&&y+2>o.y+.12&&y<o.y+o.h-.1&&inRect(x,z,o,r))||y<3&&externalWalls.some(o=>o.active!==false&&inRect(x,z,o,r));}
  function move(p,dx,dz,r=.88){
    const old=p.hoistY||0;
    if(!core(p.x+dx,p.z+dz)&&Math.abs(old)<.1&&!support(p.x+dx,p.z+dz,old,!!p.deployed))return false;
    for(const [ax,az]of [[dx,0],[0,dz]]){
      const x=p.x+ax,z=p.z+az;
      const floor=support(x,z,old,!!p.deployed);
      if(!floor){
        // Only ground-level endpoint landings can leave this region.
        if(!core(x,z)&&Math.abs(old)<.1&&!hoistDecks.some(d=>inRect(x,z,d)&&Math.abs(deckHeight(d,z))<.45)&&!lifts.some(l=>inRect(x,z,l)))return false;
        if(ax||az)p.speed=1;continue;
      }
      if(blocked(x,floor.height,z,r)){if(ax||az)p.speed=1;continue;}
      if(![[r,0],[-r,0],[0,r],[0,-r]].every(([ox,oz])=>support(x+ox,z+oz,floor.height,!!p.deployed)||Math.abs(floor.height)<.1&&!core(x+ox,z+oz)&&externalAvailable?.(x+ox,z+oz))){if(ax||az)p.speed=1;continue;}
      p.x=x;p.z=z;p.hoistY=floor.height;
    }
    return true;
  }
  function sync(){
    carrierRail.active=!state.carrier;carrierRail.mesh.visible=!state.carrier;
    pallet.active=latchShield.active=!state.bridge;pallet.mesh.visible=latchShield.mesh.visible=!state.bridge;latch.root.visible=!state.bridge;
    opticLamp.material.color.setHex(state.optical?C.mint:C.dark);
    opticalGate.active=!state.optical;opticalGate.mesh.visible=!state.optical;
    expressGates.forEach((g,i)=>{g.active=!state.express0&&!state[`express${i}`];g.mesh.visible=g.active;});
    hotGate.active=!state.hot;hotGate.mesh.visible=!state.hot;
    ballast.mesh.position.z=-99+state.ballast;ballast.z=ballast.mesh.position.z-1.5;ballastTarget.z=ballast.mesh.position.z;
    crownLamp.material.color.setHex(state.cart?C.mint:C.dark);
  }
  function set(id,value=true){state[id]=value;dirty=true;sync();}
  function target(p){
    if(!active(p))return null;
    const y=p.hoistY||0;
    const lift=lifts.find(l=>inRect(p.x,p.z,l,-1)&&Math.abs(l.y-y)<.4);
    if(lift)return {id:`ride-${lift.id}`,x:lift.x+lift.w/2,y:lift.y+2,z:lift.z+lift.d/2,hoist:true};
    return controls.find(c=>(c.kind==='use'||c.kind==='switch')&&Math.abs(c.ground-y)<.5&&Math.hypot(c.x-p.x,c.z-p.z)<3.5)||null;
  }
  function act(t,p){
    if(!t)return false;
    t.flash=.18;sound='lever';
    if(t.id==='balance-lock'){set('balance');lifts.find(l=>l.id==='balance').destination=8;return true;}
    if(t.id==='restore'){set('main');return true;}
    if(t.id==='cart'){if(!state.cart)deliveryTime=0;set('cart');return true;}
    if(t.id==='hot'){set('hot');return true;}
    if(t.id.startsWith('ride-')||t.id.startsWith('call-')){
      const id=t.id.split('-')[1],l=lifts.find(l=>l.id===id);
      if(id==='balance'&&state.ballast<5.8){ballastTarget.flash=.25;sound='blocked';return false;}
      if(id==='main'&&!state.balance&&!state.main){sound='blocked';return false;}
      if(['optical','works'].includes(id)&&!state.express0&&!state[`express${id==='optical'?1:2}`]){sound='blocked';return false;}
      const stops=id==='main'&&!state.main?[0,8]:l.stops;
      l.destination=t.id.startsWith('call-')?Number(t.id.split('-')[2]):stops[(stops.indexOf(l.destination)+1)%stops.length];
      if(id==='carrier'&&!state.carrier){l.cycling=true;l.destination=16;}
      if(id==='balance'&&!state.balance)l.destination=8;
      l.wait=.35;return true;
    }
    return false;
  }
  function pull(p,aim,dt,retained=null){
    if(!active(p))return null;
    const candidates=[ballastTarget,...foes.filter(e=>e.shield&&e.hp>0)];
    const t=candidates.find(t=>Math.hypot(t.x-p.x,t.z-p.z)<13&&Math.abs(t.y-(p.hoistY||0)-1)<3&&(t===retained||Math.hypot(t.x-aim.x,t.z-aim.z)<3.5));
    if(!t)return null;
    const from=new T.Vector3(p.x,(p.hoistY||0)+1.5,p.z),to=new T.Vector3(t.x,t.y,t.z);
    if(rayHit(from,to.clone().sub(from).normalize(),Math.max(0,from.distanceTo(to)-2),false))return null;
    if(t===ballastTarget){if(p.z>t.z+2.6){const old=state.ballast;state.ballast=Math.min(6,state.ballast+dt*3);sync();if(old<6&&state.ballast===6){dirty=true;}}}
    else t.disarmed=3;
    return t;
  }
  function rayHit(origin,direction,distance,includeTargets=true,aiming=false){
    ray.set(origin,direction);ray.far=distance;
    const objects=[...floors.filter(f=>!aiming||!f.mesh.userData.hoistCutaway).map(f=>f.mesh),...lifts.filter(l=>!aiming||!l.mesh.userData.hoistCutaway).map(l=>l.mesh),...solids.filter(o=>o.active!==false&&(!aiming||!o.mesh.userData.hoistCutaway)).map(o=>o.mesh),...mirrors];
    for(const m of objects)m.updateWorldMatrix(true,false);
    let hit=ray.intersectObjects(objects,false)[0]||null;
    for(const o of externalWalls){
      if(o.active===false||Math.hypot(o.x-origin.x,o.z-origin.z)>distance+Math.max(o.w,o.d))continue;
      const point=ray.ray.intersectBox(new T.Box3(new T.Vector3(o.x,0,o.z),new T.Vector3(o.x+o.w,o.h??3,o.z+o.d)),new T.Vector3());
      if(point){const d=point.distanceTo(origin);if(d<distance&&(!hit||d<hit.distance))hit={point,distance:d};}
    }
    if(hit&&mirrors.includes(hit.object))hit.mirror=true;
    if(includeTargets)for(const t of [...targets,...externalEnemies.filter(e=>e.hp>0&&Math.hypot(e.x-origin.x,e.z-origin.z)<distance+5).map(e=>({external:e,x:e.x,y:elevation(e.x,e.z)+1.2,z:e.z,hp:e.hp,radius:e.hurtRadius}))]){
      if(aiming&&(t.model?.root.userData.hoistCutaway||t.root?.userData.hoistCutaway))continue;
      if(t.kind==='use'||t.hp!==undefined&&t.hp<=0||t.root&&!t.root.visible)continue;
      const point=ray.ray.intersectSphere(new T.Sphere(new T.Vector3(t.x,t.y,t.z),t.radius),new T.Vector3());
      if(point){const d=point.distanceTo(origin);if(d<distance&&(!hit||d<hit.distance))hit={point,distance:d,target:t};}
    }
    return hit;
  }
  function aimAt(r,p){
    const hit=rayHit(r.origin,r.direction,220,true,true);
    if(hit){
      // A floor selects the supporting level, not a point to bury the shell in.
      // Keep direct fire at barrel height while leaving real bodies and mirrors
      // at their hit height. Mortar still selects a landing on the surface.
      if(p.weapon!=='mortar'&&!hit.target&&hit.face?.normal.y>.5){
        const surface=floors.find(f=>f.mesh===hit.object)||lifts.find(l=>l.mesh===hit.object);
        if(surface)return r.intersectPlane(new T.Plane(new T.Vector3(0,1,0),-deckHeight(surface,hit.point.z)-1.5),new T.Vector3());
      }
      const point=hit.target?new T.Vector3(hit.target.x,p.weapon==='mortar'?(hit.target.ground??hit.target.y):hit.target.y,hit.target.z):hit.point;
      if(p.weapon==='mortar'){const distance=Math.hypot(point.x-p.x,point.z-p.z);if(distance>24){point.x=p.x+(point.x-p.x)*24/distance;point.z=p.z+(point.z-p.z)*24/distance;const floorsHere=hoistDecks.filter(d=>inRect(point.x,point.z,d));const surface=floorsHere.sort((a,b)=>Math.abs(deckHeight(a,point.z)-point.y)-Math.abs(deckHeight(b,point.z)-point.y))[0];point.y=surface?deckHeight(surface,point.z):(p.hoistY||0);}}
      return point;
    }
    return r.intersectPlane(new T.Plane(new T.Vector3(0,1,0),-(p.hoistY||0)-(p.weapon==='mortar'?0:1.5)),new T.Vector3());
  }
  function damage(t,amount,origin,kind){
    if(t===ballastTarget){
      t.flash=.2;
      if((kind==='cannon'||kind==='mortar')&&!state.ballastReleased&&state.ballast<6){set('ballastReleased');sound='lever';}else sound='armor';
      return;
    }
    if(t.kind==='switch'){
      if(kind==='cannon'||kind==='mortar')act(t);else {t.flash=.18;sound='armor';}
      return;
    }
    if(t.kind==='shot'||t.kind==='laser'){t.flash=.18;sound='armor';}
    if(t.external){externalDamage(t.external,amount,origin,kind);return;}
    if(t.hp!==undefined){
      if(t.shield&&!t.disarmed&&kind!=='red'&&kind!=='ram'&&Math.cos(Math.atan2(origin.x-t.x,origin.z-t.z)-t.heading)>.25){t.armorFlash=.15;sound='armor';return;}
      t.hp=Math.max(0,t.hp-amount);t.flash=.15;sound=t.hp===0?'explode':'hit';t.model.root.visible=t.hp>0;
      if(t.hp===0){t.warning.visible=false;if(t===sorter)set('sorter');}return;
    }
    if(t.id==='latch'){set('bridge');sound='lever';}
    if(t.id==='brake'){
      const l=lifts.find(l=>l.id==='carrier');
      if(Math.abs(l.y-16)<.5){set('carrier');l.cycling=false;l.destination=16;sound='lever';}
    }
    if(t.id==='optical'&&kind==='laser'){set('optical');sound='ready';}
  }
  function aimPoint(p,a){
    const height=(p.hoistY||0)+1.5,limit=Math.hypot(a.x-p.x,a.z-p.z)*Math.tan(40*Math.PI/180);
    return new T.Vector3(a.x,height+clamp(a.y-height,-limit,limit),a.z);
  }
  function direction(p,a){return aimPoint(p,a).sub(new T.Vector3(p.x,(p.hoistY||0)+1.5,p.z)).normalize();}
  function mortarClear(p,target){
    const origin=new T.Vector3(p.x,(p.hoistY||0)+1.5,p.z);let previous=origin;
    for(let i=1;i<=24;i++){const t=i/24,point=origin.clone().lerp(target,t);point.y+=32*t*(1-t);const d=point.clone().sub(previous);if(rayHit(previous,d.clone().normalize(),Math.max(0,d.length()-(i===24?.25:0)),false))return false;previous=point;}return true;
  }
  function shoot(p,a,kind='cannon'){
    const origin=new T.Vector3(p.x,(p.hoistY||0)+1.5,p.z),dir=direction(p,a);
    const mesh=new T.Mesh(projectileGeometry,projectileMaterial);scene.add(mesh);mesh.position.copy(origin);
    const target=a.clone(),distance=Math.hypot(target.x-p.x,target.z-p.z);if(kind==='mortar'&&distance>24){target.x=p.x+(target.x-p.x)*24/distance;target.z=p.z+(target.z-p.z)*24/distance;}
    shots.push({origin:origin.clone(),position:origin.clone(),dir,mesh,age:0,kind,target,owner:'player'});
  }
  function laser(p,a,dt){
    let origin=new T.Vector3(p.x,(p.hoistY||0)+1.5,p.z),dir=direction(p,a),left=90;
    for(let i=0;i<beams.length&&left>0;i++){
      const hit=rayHit(origin,dir,left),end=hit?hit.point:origin.clone().addScaledVector(dir,left);
      const b=beams[i];b.visible=true;b.geometry.setFromPoints([origin,end]);b.geometry.computeBoundingSphere();
      if(hit?.target)damage(hit.target,dt*2.5,origin,'laser');
      if(!hit?.mirror)break;
      left-=hit.distance;const n=new T.Vector3(0,0,1).applyQuaternion(hit.object.quaternion);dir=dir.clone().reflect(n);origin=end.clone().addScaledVector(dir,.03);
    }
  }
  function update(dt,p,callbacks){
    clock+=dt;
    if(state.ballastReleased&&state.ballast<6){state.ballast=Math.min(6,state.ballast+dt*3);sync();if(state.ballast===6){dirty=true;sound='ready';}}
    beams.forEach(b=>b.visible=false);
    const y=p.hoistY||0,here=active(p);
    for(const l of lifts){
      const riding=here&&inRect(p.x,p.z,l,-.9)&&Math.abs(y-l.y)<.45;
      const edge=here&&inRect(p.x,p.z,l,1)&&!inRect(p.x,p.z,l,-.9)&&Math.abs(y-l.y)<2;
      const underneath=here&&inRect(p.x,p.z,l,.88)&&y+3.2>l.y&&y<l.y-.45&&l.destination<l.y;
      if(l.id==='balance'&&state.ballast>=5.8&&!state.balance)l.destination=riding?8:0;
      l.wait=Math.max(0,l.wait-dt);
      if(!edge&&!underneath&&l.wait===0){
        const step=clamp(l.destination-l.y,-dt*5,dt*5);l.y+=step;if(riding)p.hoistY=l.y;
        if(Math.abs(l.y-l.destination)<.01&&l.cycling){l.wait=2;l.destination=l.destination===16?8:16;}
      }
      l.root.position.y=l.y;
      for(const cable of l.cables){cable.position.y=(l.y+32)/2;cable.scale.y=32-l.y;}
      if(l.id==='carrier'&&!state.carrier&&!l.cycling&&riding){l.cycling=true;l.destination=16;l.wait=1;}
    }
    if(here){
      // Each entrance shutter is broken by a real supported run-up on either side.
      for(const [i,g]of expressGates.entries())if(g.active&&Math.abs(y-24*(i===0))<.5&&inRect(p.x,p.z,g,3)&&phoenixReady(p)){set(`express${i}`);}
      if(y>23&&p.x>=364&&p.x<=376&&p.z>-178&&p.z<-114)move(p,0,dt*18.2);
      if(p.deployed&&support(p.x,p.z,y,true)?.water)p.afloat=true;
    }
    if(here&&Math.hypot(p.x-370,p.z+146)<80){for(let i=0;i<32;i++){beltMatrix.makeTranslation(370,24.08,-178+(i*2+clock*18.2)%64);beltSlats.setMatrixAt(i,beltMatrix);}beltSlats.instanceMatrix.needsUpdate=true;}
    weight.position.y=8-lifts[0].y;
    weightCable.position.y=(17.5+weight.position.y)/2;weightCable.scale.y=10.5-weight.position.y;
    ballastTarget.flash=Math.max(0,(ballastTarget.flash||0)-dt);
    ballastPaddle.material.color.setHex(ballastTarget.flash?C.lightYellow:state.ballast>=5.8?C.mint:C.orange);
    for(const c of controls){
      c.flash=Math.max(0,c.flash-dt);
      const lift=c.id.startsWith('call-')?lifts.find(l=>l.id===c.id.split('-')[1]):null;
      const engaged=lift?Math.abs(lift.y-c.ground)<.1:c.id==='balance-lock'?state.balance:c.id==='restore'?state.main:c.id==='latch'?state.bridge:c.id==='brake'?state.carrier:!!state[c.id];
      const aligned=c.id==='brake'&&Math.abs(lifts.find(l=>l.id==='carrier').y-16)<.5;
      c.lamp.material.color.setHex(c.flash||aligned&&!state.carrier?C.lightYellow:engaged?C.mint:c.kind==='use'?C.mint:C.orange);
      if(c.paddle)c.paddle.position.z=.45-c.flash;
    }
    // Fade the complete foreground structure while keeping its silhouette.
    // Project the hull towards the camera at each deck height; hysteresis keeps
    // a boundary from toggling as the hull or camera settles by a few pixels.
    const cutaway=(rect,height,hidden)=>{
      const dy=height-y;
      return here&&dy>(hidden?2:3)&&inRect(p.x+dy*28/39.6,p.z+dy*28/39.6,rect,hidden?14:10);
    };
    for(const d of deckViews){
      d.hidden=cutaway(d,deckHeight(d,p.z),d.hidden);
      fade(d.trim,d.hidden,dt);
      for(const mesh of d.meshes)fade(mesh,d.hidden,dt);
    }
    for(const l of lifts){
      const hidden=cutaway(l,l.y,l.mesh.userData.hoistCutaway);
      fade(l.root,hidden,dt);l.mesh.userData.hoistCutaway=hidden;
      for(const cable of l.cables)fade(cable,hidden,dt);
    }
    const hiddenAt=(x,z,height)=>deckViews.some(d=>d.hidden&&inRect(x,z,d)&&Math.abs(deckHeight(d,z)-height)<.5);
    for(const o of solids){const hide=o===roof?here&&y<3&&inRect(p.x+3,p.z+3,o,o.mesh.userData.hoistCutaway?10:8):hiddenAt(o.x+o.w/2,o.z+o.d/2,o.visualGround);if(o!==cartPark){o.mesh.visible=o.active!==false||[pallet,latchShield,carrierRail].includes(o);fade(o.mesh,hide,dt);}}
    for(const c of controls){c.root.visible=c!==latch||!state.bridge;fade(c.root,hiddenAt(c.x,c.z,c.ground),dt);}
    for(const e of foes){e.model.root.visible=e.hp>0;fade(e.model.root,hiddenAt(e.x,e.z,e.ground),dt,true);}
    fade(beltSlats,deckViews.find(d=>d.id==='hot-lane').hidden,dt);
    for(const e of foes){
      e.flash=Math.max(0,(e.flash||0)-dt);e.armorFlash=Math.max(0,(e.armorFlash||0)-dt);
      for(const {m,color}of e.materials){m.color.copy(color);if(e.flash)m.color.lerp(new T.Color(C.orange),.7);else if(e.armorFlash)m.color.lerp(new T.Color(C.metal),.8);}
      e.warning.visible=false;e.disarmed=Math.max(0,(e.disarmed||0)-dt);if(e.hp<=0)continue;
      const distance=Math.hypot(e.x-p.x,e.z-p.z),origin=new T.Vector3(e.x,e.y,e.z),destination=new T.Vector3(p.x,(p.hoistY||0)+1.2,p.z),dir=destination.clone().sub(origin).normalize();
      const visible=here&&!e.model.root.userData.hoistCutaway&&callbacks.visible(e)&&distance<25&&Math.abs(destination.y-e.y)<15;
      const obstruction=visible?rayHit(origin,dir,origin.distanceTo(destination),false):null;
      if(visible&&!obstruction){
        e.timer-=dt;
        if(e.phase==='idle'&&e.timer<=0){e.phase='warning';e.timer=1.5;e.lock=destination.clone();}
        if(e.phase==='warning'){
          e.warning.visible=true;e.warning.geometry.setFromPoints([origin,e.lock]);e.warning.geometry.computeBoundingSphere();
          if(e.timer<=0){const mesh=new T.Mesh(projectileGeometry,projectileMaterial);scene.add(mesh);shots.push({position:origin.clone(),origin:origin.clone(),dir:e.lock.clone().sub(origin).normalize(),mesh,age:0,kind:'cannon',owner:'enemy'});e.phase='idle';e.timer=2.5;sound='welder-shot';}
        }
      }else{e.phase='idle';e.timer=Math.max(.8,e.timer);}
      if(e.phase==='idle')e.heading=Math.atan2(p.x-e.x,p.z-e.z);
      e.model.turret.rotation.y=e.heading;e.model.body.rotation.y=e.heading;e.model.barrel.rotation.x=-Math.atan2(destination.y-e.y,distance);
      if(e.shield&&e.model.frontArmor)e.model.frontArmor.rotation.y=e.disarmed?1.1:0;
      if(here&&Math.abs(y-e.ground)<1.5&&distance<2.8&&clock-e.ramAt>.6){
        e.ramAt=clock;const hot=redContact(p);const amount=hot?contactDamage(p):phoenixReady(p)&&!e.optional?12:0;
        if(amount)damage(e,amount,new T.Vector3(p.x,y,p.z),hot?'red':'ram');
        if(e.hp>0){move(p,(p.x-e.x)/(distance||1)*.5,(p.z-e.z)/(distance||1)*.5);p.speed=1;}
      }
    }
    for(let i=shots.length-1;i>=0;i--){
      const s=shots[i];s.age+=dt;let end=s.position.clone().addScaledVector(s.dir,dt*(s.owner==='enemy'?14:38));
      if(s.kind==='mortar'){
        const t=clamp(s.age/1.15,0,1);end=s.origin.clone().lerp(s.target,t);end.y+=32*t*(1-t);
      }
      const delta=end.clone().sub(s.position),length=delta.length(),hit=rayHit(s.position,delta.normalize(),length,s.owner==='player');
      let done=!!hit||s.age>(s.kind==='mortar'?1.15:s.owner==='enemy'?3:24/38);
      if(hit){callbacks.impact?.(hit.point,!!hit.target);if(!hit.target)sound='armor';}
      if(hit?.target)damage(hit.target,s.kind==='mortar'?3:1,s.origin,s.kind);
      if(s.kind==='mortar'&&done){const at=hit?.point||end;for(const e of foes)if(e!==hit?.target&&e.hp>0&&new T.Vector3(e.x,e.y,e.z).distanceTo(at)<4&&!rayHit(at.clone().add(new T.Vector3(0,.1,0)),new T.Vector3(e.x,e.y,e.z).sub(at).normalize(),Math.max(0,new T.Vector3(e.x,e.y,e.z).distanceTo(at)-1.5),false))damage(e,3,at,'mortar');}
      if(s.owner==='enemy'){
        const sphere=new T.Sphere(new T.Vector3(p.x,(p.hoistY||0)+1.2,p.z),PLAYER_HURT_RADIUS),line=new T.Ray(s.position,delta);
        const contact=line.intersectSphere(sphere,new T.Vector3());
        if(contact&&contact.distanceTo(s.position)<=length&&(!hit||contact.distanceTo(s.position)<hit.distance)){callbacks.hurt(5,s.position.x,s.position.z);done=true;}
      }
      s.position.copy(end);s.mesh.position.copy(end);
      if(done){scene.remove(s.mesh);shots.splice(i,1);}
    }
    pallet.mesh.position.y=T.MathUtils.damp(pallet.mesh.position.y,state.bridge?-5:10,5,dt);
    latchShield.mesh.position.y=pallet.mesh.position.y+2;
    carrierRail.mesh.position.y=T.MathUtils.damp(carrierRail.mesh.position.y,state.carrier?14.8:16.375,7,dt);
    const crateX=sorter.hp>0?322+Math.sin(clock*.45)*3:322;
    const occupied=here&&Math.abs(y-24)<2&&Math.hypot(p.x-crateX,p.z+124)<4;
    const crateY=sorter.hp>0&&sorter.phase==='idle'||occupied?27.5:24;
    fade(sortingCable,hiddenAt(crateX,-124,24),dt);
    sortingCrate.x=crateX-1.5;sortingCrate.y=crateY;sortingCrate.mesh.position.set(crateX,crateY+1.4,-124);sortingCable.position.set(crateX,(33+crateY+2.8)/2,-124);sortingCable.scale.y=33-crateY-2.8;
    if(deliveryTime>=0){if(deliveryTime>=12&&here&&Math.abs(y-24)<2&&Math.hypot(p.x-342,p.z+116)<3)deliveryTime=12;else deliveryTime+=dt;const progress=Math.min(3.999,deliveryTime/4),index=Math.floor(progress);maintenance.root.position.copy(deliveryPath[index]).lerp(deliveryPath[index+1],progress-index);if(deliveryTime>=16)deliveryTime=-1;}
    else maintenance.root.position.set(state.cart?342:286,state.cart?24:-8,state.cart?-116:-110);
    cartPark.active=state.cart&&deliveryTime<0;
    deliveryBasket.visible=deliveryCable.visible=deliveryTime>=0;deliveryBasket.position.copy(maintenance.root.position);deliveryBasket.position.y-=.3;deliveryCable.position.copy(maintenance.root.position);deliveryCable.position.y=(34+maintenance.root.position.y+2.5)/2;deliveryCable.scale.y=34-maintenance.root.position.y-2.5;
    crownLamp.material.color.setHex(state.cart&&deliveryTime<0?C.mint:C.dark);
    if(sound){callbacks.sound?.(sound);sound=null;}
    if(dirty){callbacks.save();dirty=false;}
  }
  function reset(){for(const s of shots)scene.remove(s.mesh);shots.length=0;for(const e of foes){e.hp=e===sorter&&state.sorter?0:e.max;e.model.root.visible=e.hp>0;e.phase='idle';e.timer=2;e.warning.visible=false;}for(const l of lifts){l.y=l.destination=l.stops[0];l.cycling=false;l.root.position.y=l.y;}}
  function drawMap(ctx,px,pz,scale,p,large=false){
    if(!active(p))return;
    for(const d of hoistDecks){ctx.globalAlpha=Math.abs(deckHeight(d,d.z+d.d/2)-(p.hoistY||0))<4?1:.2;ctx.fillStyle=d.water?'#3c8791':'#c1b990';ctx.fillRect(px(d.x),pz(d.z),d.w*scale,d.d*scale);ctx.strokeStyle='#ffdc85';ctx.strokeRect(px(d.x),pz(d.z),d.w*scale,d.d*scale);}
    ctx.globalAlpha=1;ctx.strokeStyle='#b6f5d2';ctx.lineWidth=1.5;
    for(const l of lifts){
      ctx.strokeRect(px(l.x),pz(l.z),l.w*scale,l.d*scale);
      const x=px(l.x+l.w/2),z=pz(l.z+l.d/2);
      ctx.beginPath();ctx.moveTo(x,z-5);ctx.lineTo(x,z+5);
      ctx.moveTo(x-3,z-2);ctx.lineTo(x,z-5);ctx.lineTo(x+3,z-2);
      ctx.moveTo(x-3,z+2);ctx.lineTo(x,z+5);ctx.lineTo(x+3,z+2);ctx.stroke();
    }
    for(const [i,y]of [24,16,8,0,-8].entries()){
      ctx.fillStyle=Math.abs(y-(p.hoistY||0))<4?'#ffe6a4':'#708d7e';
      ctx.fillRect(12,12+i*9,Math.abs(y-(p.hoistY||0))<4?13:6,4);
    }
  }
  sync();return {active,owns,core,support,move,target,act,pull,aimAt,shoot,laser,update,reset,drawMap,rayHit,aimPoint,direction,mortarClear,
    connectCombat:(enemies,walls,damage,available)=>{externalEnemies=enemies;externalWalls=walls;externalDamage=damage;externalAvailable=available;},
    serialize:()=>({...state}),snapshot:()=>({state:{...state},lifts:lifts.map(({id,y,destination,cycling})=>({id,y,destination,cycling})),enemies:foes.map(({id,x,y,z,hp,phase})=>({id,x,y,z,hp,phase})),shots:shots.length}),
    decks:hoistDecks};
}

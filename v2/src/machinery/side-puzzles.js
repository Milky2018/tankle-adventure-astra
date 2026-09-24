import {recordPuzzleState,completeProgress} from '../app/state.js';
import {pullSlide} from './mechanisms.js';
import {foldedSupport,moveFolded,foldedArchitecture,activeSolid} from '../world/terrain.js';
import {createDelivery} from './delivery.js';
import {batchRigidParts} from '../rendering/rigid-batching.js';
import * as T from 'three';
import {box,cylinder,ring,mat,C,batchStatic} from '../rendering/factory-models.js';
import {createRailPuzzle,createGutterPuzzle} from './puzzle-rules.js';
import {carrierRoute} from '../content/prototypes/puzzle-layout.js';
import {railOffset as offset,gutterControls} from '../content/side-layout.js';
import {SIGNAL} from '../rendering/visibility.js';
import {orthogonalCircuit} from './circuit-routing.js';

export function makeSidePuzzles(scene,state){
 const sideObstacles=state.bodies.obstacles;
 const delivery=createDelivery(state.maintenance);
 const pending=structuredClone(state.sidePuzzles?.pending||{});
 const rail=createRailPuzzle(state.sidePuzzles?.rail),gutter=createGutterPuzzle(state.sidePuzzles?.gutter);
 const owners=new Map(),roots=[],targets=[],solids=[],feeds=[],fixed=new T.Group();scene.add(fixed);roots.push(fixed);
 const railPoint=p=>({x:p.x+offset.x,y:offset.y,z:p.z+offset.z});
 const carBounds=sideObstacles[0];
 function segment(parent,a,b,width=.12,color=C.metal){const delta=new T.Vector3(...b).sub(new T.Vector3(...a)),m=box(parent,width,width,delta.length(),...(new T.Vector3(...a).addScaledVector(delta,.5).toArray()),color,0);m.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),delta.normalize());return m;}
 function paddle(id,x,y,z){
  const root=new T.Group();root.position.set(x,y,z);scene.add(root);roots.push(root);
  box(root,.35,1.3,.35,0,.65,0,C.dark,0);
  const handle=box(root,1.1,.65,.25,0,1.3,0,C.orange);ring(handle,.27,.05,0,0,.16,C.yellow).rotation.x=0;
  const lamp=box(root,.3,.12,.2,0,.8,.23,mat(SIGNAL.ready,true),0);
  const t={id,x,y:y+1.3,z,radius:.7,sidePuzzle:true,root,handle,lamp,flash:0};targets.push(t);return t;
 }
 const a=paddle('rail-a',-166,8,-80),b=paddle('rail-b',-158,8,-76);paddle('rail-signal',-176,8,-71);
 const edges=new Map();for(const switches of [[false,false],[true,false],[true,true]]){const route=carrierRoute(switches);for(let i=1;i<route.length;i++){const points=[route[i-1],route[i]],key=points.map(p=>p.join(',')).sort().join(':');edges.set(key,points);}}
 for(const [a,b]of edges.values())for(const side of [-.65,.65]){const horizontal=a[1]===b[1];segment(fixed,[a[0]+offset.x+(horizontal?0:side),8.08,a[1]+offset.z+(horizontal?side:0)],[b[0]+offset.x+(horizontal?0:side),8.08,b[1]+offset.z+(horizontal?side:0)]);}
 const blades=[-170,-162].map((x,i)=>{
  box(fixed,2.6,.08,2.6,x,8.04,-76,C.dark,0);
  ring(fixed,.3,.06,x,8.2,-76,C.yellow);
  const root=new T.Group();root.name=`rail-switch-${i}`;root.position.set(x,8.18,-76);scene.add(root);roots.push(root);
  for(const side of [-.65,.65])box(root,.2,.14,2.2,side,0,-1.1,C.metal,0);
  return root;
 });
 function feed(id,points,active){
  points=orthogonalCircuit(points);
  const root=new T.Group();root.name=`side-circuit:${id}`;scene.add(root);roots.push(root);
  const lamps=[];let length=0;
  for(let i=1;i<points.length;i++)length+=Math.hypot(...points[i].map((v,j)=>v-points[i-1][j]));
  let traveled=0;
  for(let i=1;i<points.length;i++){
   const a=new T.Vector3(...points[i-1]),b=new T.Vector3(...points[i]),delta=b.clone().sub(a),span=delta.length();if(span<.01)continue;
   segment(root,points[i-1],points[i],.16,C.dark);delta.normalize();
   for(let t=0;t<span;t+=.8){const end=Math.min(span,t+.65),color=mat(SIGNAL.ready,true),start=a.clone().addScaledVector(delta,t),finish=a.clone().addScaledVector(delta,end);start.y+=.11;finish.y+=.11;segment(root,start.toArray(),finish.toArray(),.07,color);lamps.push({mesh:root.children.at(-1),progress:(traveled+end)/length});}
   traveled+=span;
  }
  feeds.push({id,lamps,active,duration:Math.max(.35,length/18)});
 }
 for(const [i,[t,x]]of [[a,-170],[b,-162]].entries())feed(t.id,[[t.x,8.8,t.z+.3],[t.x,8.3,t.z+.3],[x,8.3,-76]],()=>rail.state.switches[i]);
 feed('rail-signal',[[-176,8.8,-70.7],[-176,8.4,-70.7],[-178,8.4,-71.2],[-178,8.4,-76]],()=>rail.state.moving||rail.state.solved);
 const recallDrive=new T.Group();scene.add(recallDrive);roots.push(recallDrive);
 box(recallDrive,1.1,.65,1.1,-178,8.325,-76,C.dark,0);
 cylinder(recallDrive,.35,.2,-178,8.75,-76,C.metal,8);
 segment(recallDrive,[-178,8.2,-76],[-176.65,8.2,-76],.22,C.metal);
 const cart=new T.Group();scene.add(cart);roots.push(cart);owners.set(cart,carBounds);box(cart,2,.6,2,0,.65,0,C.metal);const wheels=[];for(const x of [-1,1])for(const z of [-.7,.7]){const wheel=cylinder(cart,.3,.2,x,.3,z,C.dark,8);wheel.rotation.z=Math.PI/2;wheels.push(wheel);}
 const brake=paddle('rail-carrier',-176,8,-76);scene.remove(brake.root);cart.add(brake.root);brake.root.position.set(0,.6,0);roots.splice(roots.indexOf(brake.root),1);brake.root=cart;
 const cartBody=box(cart,2.1,1.5,2.1,0,.75,0,new T.MeshBasicMaterial({visible:false}),0);solids.push(cartBody);
 ring(fixed,1.7,.07,-162,8.12,-66,C.yellow);
 const hinges=[{x:38,z:40,y:-5,length:5,goal:Math.PI/2},{x:43,z:40,y:-6,length:6,goal:Math.PI}];
 const trays=hinges.map(h=>{const root=new T.Group();root.position.set(h.x,h.y,h.z);scene.add(root);roots.push(root);box(root,.7,.1,h.length,0,0,h.length/2,C.metal,0);for(const x of [-.4,.4])box(root,.1,.3,h.length,x,.1,h.length/2,C.dark,0);const flow=box(root,.45,.035,h.length,0,.09,h.length/2,mat(0x97dbdc,true),0);const drip=cylinder(root,.12,1,0,-.5,h.length,mat(0x97dbdc,true),8);cylinder(fixed,.14,h.y+8,h.x,(h.y-8)/2,h.z,C.dark,8);return {...h,root,flow,drip};});
 for(const q of gutterControls)paddle(q.id,q.x,-8,q.z);
 for(const [i,t]of gutterControls.slice(0,2).entries())feed(t.id,[[t.x,-7.2,t.z+.3],[t.x,-7.7,t.z+.3],[hinges[i].x,-7.7,t.z],[hinges[i].x,-7.85,hinges[i].z],[hinges[i].x,hinges[i].y,hinges[i].z]],()=>gutter.state.angles[i]===i+1);
 feed('gutter-plug',[[36,-6.7,44.5],[35.5,-6.7,44.5],[35.5,-7.7,44.5],[35.5,-3.6,44.5],[37.55,-3.6,40],[37.55,-4,40]],()=>gutter.state.unplugged);
 cylinder(fixed,.3,4,36,-6,44,C.metal,10);segment(fixed,[36,-4,44],[38,-4,40],.35,C.metal);
 const inlet=cylinder(fixed,.1,1,38,-4.5,40,mat(0x97dbdc,true),8);
 for(const s of sideObstacles.slice(1,3)){const mesh=box(fixed,s.w,s.h,s.d,s.x+s.w/2,s.y+s.h/2,s.z+s.d/2,s.id==='care-planter'?0x667d55:C.teal,0);solids.push(mesh);}
 const plant=new T.Group();plant.position.set(43,-7,34);scene.add(plant);roots.push(plant);cylinder(plant,.13,1.6,0,.8,0,C.metal,8);
 const leaves=Array.from({length:5},(_,i)=>{const pivot=new T.Group();pivot.position.y=.3+i*.25;pivot.rotation.y=i*2.4;plant.add(pivot);box(pivot,.45,.12,1.1,0,0,.5,0x93b67a,.04);return pivot;});
 const bloom=cylinder(plant,.35,.25,0,1.75,0,mat(C.lightYellow,true),6);
 let coverHeldUntil=0,coverFlash=0;
 const coverBounds=sideObstacles.find(s=>s.id==='sorter-cover'),cover=new T.Group();scene.add(cover);roots.push(cover);owners.set(cover,coverBounds);
 coverBounds.x=Math.max(coverBounds.railMin,Math.min(coverBounds.railMax,state.sidePuzzles?.coverX??coverBounds.railMin));
 const coverMesh=box(cover,5,2.8,2,2.5,1.4,1,C.dark);coverMesh.userData.sortingCover=true;solids.push(coverMesh);
 const shieldPlates=[];
 for(const z of [-.06,2.06]){
  shieldPlates.push(box(cover,4.5,2.2,.18,2.5,1.5,z,mat(C.metal),0));
  for(const x of [.5,1.5,2.5,3.5,4.5])box(cover,.2,2.6,.3,x,1.4,z,C.teal,0);
 }
 for(const x of [-.12,5.12])box(cover,.2,.9,1.4,x,1.5,1,mat(SIGNAL.magnet),0);
 const coverTarget={id:'sorting-cover',kind:'magnet',sidePuzzle:true,root:cover,x:coverBounds.x+2.5,y:coverBounds.y+1.6,z:coverBounds.z+2.2,radius:.75};targets.push(coverTarget);
 for(const z of [0,2]){box(cover,5,.2,.12,2.5,2.4,z,C.yellow,0);segment(fixed,[coverBounds.railMin,coverBounds.y+.1,coverBounds.z+z],[coverBounds.railMax+5,coverBounds.y+.1,coverBounds.z+z],.14,C.metal);}
 for(const x of [.5,4.5])for(const z of [0,2])cylinder(cover,.3,.18,x,.3,z,C.dark,8).rotation.x=Math.PI/2;
 // Keep the obstructing chunk local even when the rail and garden are far apart.
 batchStatic(fixed);roots.splice(roots.indexOf(fixed),1,...fixed.children);
 for(const root of [cart,...targets.filter(t=>t!==brake&&t.handle).map(t=>t.root)])batchRigidParts(root,[...wheels,...targets.flatMap(t=>[t.handle,t.lamp].filter(Boolean))]);

 function persist(){recordPuzzleState(state,{rail:rail.serialize(),gutter:gutter.serialize(),coverX:coverBounds.x,pending});}
 function operate(id){const changed=id.startsWith('rail-')?rail.act(id):id==='gutter-plug'?gutter.unplug():gutter.act(id);const t=targets.find(t=>t.id===id);if(t?.handle)t.flash=.22;if(changed)persist();return changed;}
 function act(id){
  const feed=feeds.find(f=>f.id===id);
  if(!feed)return operate(id);
  if(id==='gutter-plug'&&gutter.state.unplugged)return false;
  if(pending[id]||id.startsWith('rail-')&&(rail.state.solved||(id==='rail-signal'?!rail.state.moving:rail.state.moving))||id.startsWith('gutter-')&&gutter.state.grown)return false;
  const index=id.endsWith('-b')?1:0;
  const to=id==='rail-a'||id==='rail-b'?!rail.state.switches[index]:id==='gutter-a'||id==='gutter-b'?(gutter.state.angles[index]+1)%3===index+1:true;
  pending[id]={remaining:feed.duration,duration:feed.duration,from:feed.active(),to};persist();return true;
 }
 function pullCover(dt,p,enemies,time){
  const body={...coverBounds,rail:{axis:'x',min:coverBounds.railMin,max:coverBounds.railMax}};
  coverHeldUntil=time+.2;
  if(!pullSlide(body,p,dt,[...state.bodies.solids.filter(s=>activeSolid(s,state)),...foldedArchitecture.solids],(x,z,y)=>!!foldedSupport(x,z,y),enemies,(e,dx,dz)=>moveFolded(e,dx,dz,state)))return;
  coverBounds.x=body.x;coverTarget.x=body.x+2.5;cover.position.x=body.x;cover.updateWorldMatrix(true,true);coverHeldUntil=time+.2;persist();return true;
 }

 function update(dt,p,enemies){
  coverFlash=Math.max(0,coverFlash-dt);
  for(const plate of shieldPlates){plate.material.emissive.setHex(0xffdf93);plate.material.emissiveIntensity=coverFlash*4;}
  const occupied=position=>[p,...enemies.filter(e=>e.hp>0)].some(b=>Math.abs(b.y-position[1])<2&&Math.hypot(b.x-position[0],b.z-position[2])<2.3);
  let changed=delivery.update(dt,state['maintenance-started'],occupied);
  if(changed)completeProgress(state,'maintenance');
  for(const [id,signal]of Object.entries(pending)){signal.remaining-=dt;if(signal.remaining<=0){delete pending[id];operate(id);changed=true;}}
  const tenderBounds=sideObstacles.find(s=>s.id==='maintenance-cart');Object.assign(tenderBounds,{x:delivery.position[0]-1,y:delivery.position[1],z:delivery.position[2]-1});
  cover.position.set(coverBounds.x,coverBounds.y,coverBounds.z);coverTarget.x=coverBounds.x+2.5;

  changed=rail.update(dt,pos=>{const q=railPoint(pos),before=railPoint(rail.position());return [p,...enemies.filter(e=>e.hp>0)].some(b=>Math.abs(b.y-q.y)<2&&Math.hypot(b.x-q.x,b.z-q.z)<2.3&&Math.hypot(b.x-q.x,b.z-q.z)<Math.hypot(b.x-before.x,b.z-before.z));})||changed;
  const aligned=trays.every((t,i)=>Math.abs(t.root.rotation.y-(gutter.state.angles[i]*Math.PI/2))<.02);
  changed=gutter.update(dt,aligned)||changed;
  if(changed)persist();
  const position=railPoint(rail.position()),dx=position.x-cart.position.x,dz=position.z-cart.position.z,travel=Math.hypot(dx,dz);if(dt>0&&travel>.0001){cart.rotation.y=Math.atan2(dx,dz);for(const wheel of wheels)wheel.rotateY(-travel/.3);}cart.position.set(position.x,position.y,position.z);Object.assign(carBounds,{x:position.x-1.1,z:position.z-1.1});Object.assign(brake,{x:position.x,y:position.y+1.9,z:position.z});
  for(const [i,t]of trays.entries()){t.root.rotation.y=T.MathUtils.damp(t.root.rotation.y,gutter.state.angles[i]*Math.PI/2,8,dt);t.flow.visible=i===0||Math.abs(trays[0].root.rotation.y-Math.PI/2)<.02;t.drip.visible=t.flow.visible;t.drip.scale.set(gutter.state.unplugged?1:.35,i===0?1:2,1);}
  inlet.scale.x=inlet.scale.z=gutter.state.unplugged?1:.35;
  for(const [i,blade]of blades.entries()){const angle=rail.state.switches[i]?(i===0?-Math.PI/2:Math.PI):0;blade.rotation.y=dt>0?T.MathUtils.damp(blade.rotation.y,angle,14,dt):angle;}
  for(const t of targets){if(!t.handle)continue;t.flash=Math.max(0,t.flash-dt);t.handle.rotation.x=-t.flash*1.4;const lit=t.id==='rail-a'?rail.state.switches[0]:t.id==='rail-b'?rail.state.switches[1]:t.id.startsWith('rail')?rail.state.solved:t.id==='gutter-plug'?gutter.state.unplugged:gutter.state.grown;t.lamp.material.color.setHex(lit?SIGNAL.open:SIGNAL.ready);if(t.id==='gutter-plug')t.handle.visible=!gutter.state.unplugged;}
  plant.scale.y=.12+.88*gutter.state.fill;for(const leaf of leaves)leaf.rotation.x=(1-gutter.state.fill)*1.3;bloom.visible=gutter.state.grown;
  for(const f of feeds){const signal=pending[f.id];for(const lamp of f.lamps)lamp.mesh.material.color.setHex((signal?(lamp.progress<=1-signal.remaining/signal.duration?signal.to!==false:!!signal.from):f.active())?SIGNAL.open:SIGNAL.ready);}
  for(const root of roots)root.updateWorldMatrix(true,true);
  return changed;
 }
 function cast(raycaster,targetsAllowed){let hit=raycaster.intersectObjects(solids,false)[0]||null;if(targetsAllowed)for(const t of targets){if(t.id==='gutter-plug'&&gutter.state.unplugged)continue;const q=raycaster.ray.intersectSphere(new T.Sphere(new T.Vector3(t.x,t.y,t.z),t.radius),new T.Vector3());if(q){const distance=q.distanceTo(raycaster.ray.origin);if(distance<=raycaster.far&&(!hit||distance<hit.distance))hit={point:q,distance,target:t};}}return hit;}
 update(0,{x:Infinity,y:0,z:0},[]);return {owners,roots,targets,act,update,cast,rail,gutter,delivery,persist,pullCover,flashCover(){coverFlash=.3;},get coverHeldUntil(){return coverHeldUntil;}};
}

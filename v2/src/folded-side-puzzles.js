import {createDelivery} from './folded-delivery.js';
import {batchRigidParts} from './rigid-batching.js';
import * as T from 'three';
import {box,cylinder,ring,mat,C,batchStatic} from './world.js';
import {createRailPuzzle,createGutterPuzzle} from './puzzle-rules.js';
import {carrierRoute} from './puzzle-layout.js';
import {railOffset as offset,gutterControls,sideObstacles} from './folded-side-layout.js';
import {SIGNAL} from './folded-visibility.js';

export function makeSidePuzzles(scene,state){
 const delivery=createDelivery(state.maintenance);
 const rail=createRailPuzzle(state.sidePuzzles?.rail),gutter=createGutterPuzzle(state.sidePuzzles?.gutter);
 const owners=new Map(),roots=[],targets=[],solids=[],fixed=new T.Group();scene.add(fixed);roots.push(fixed);
 const railPoint=p=>({x:p.x+offset.x,y:offset.y,z:p.z+offset.z});
 const carBounds=sideObstacles[0];
 function segment(parent,a,b,width=.12,color=C.metal){const delta=new T.Vector3(...b).sub(new T.Vector3(...a)),m=box(parent,width,width,delta.length(),...(new T.Vector3(...a).addScaledVector(delta,.5).toArray()),color,0);m.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),delta.normalize());return m;}
 function paddle(id,x,y,z,treadle=false){
  const root=new T.Group();root.position.set(x,y,z);scene.add(root);roots.push(root);
  box(root,.35,1.3,.35,0,.65,0,C.dark,0);
  const handle=box(root,1.1,.65,.25,0,1.3,0,C.orange);ring(handle,.27,.05,0,0,.16,C.yellow).rotation.x=Math.PI/2;
  const lamp=box(root,.3,.12,.2,0,.8,.23,mat(SIGNAL.ready,true),0);
  const plate=treadle?box(root,2.6,.16,2.6,0,.1,0,C.yellow,0):null;
  if(plate)for(const x of [-.8,.8])for(const z of [-.7,0,.7])box(root,.3,.025,.2,x,.19,z,C.dark,0);
  const t={id,x,y:y+1.3,z,radius:.7,sidePuzzle:true,root,handle,lamp,plate,contact:false,flash:0};targets.push(t);return t;
 }
 const a=paddle('rail-a',-166,8,-80,true),b=paddle('rail-b',-158,8,-76,true);paddle('rail-signal',-176,8,-71);
 const edges=new Map();for(const switches of [[false,false],[true,false],[true,true]]){const route=carrierRoute(switches);for(let i=1;i<route.length;i++){const points=[route[i-1],route[i]],key=points.map(p=>p.join(',')).sort().join(':');edges.set(key,points);}}
 for(const [a,b]of edges.values())for(const side of [-.65,.65]){const horizontal=a[1]===b[1];segment(fixed,[a[0]+offset.x+(horizontal?0:side),8.08,a[1]+offset.z+(horizontal?side:0)],[b[0]+offset.x+(horizontal?0:side),8.08,b[1]+offset.z+(horizontal?side:0)]);}
 const blades=[-170,-162].map(x=>{const root=new T.Group();root.position.set(x,8.2,-76);scene.add(root);roots.push(root);box(root,.2,.1,3,0,0,-1.5,C.yellow,0);return root;});
 for(const [t,x]of [[a,-170],[b,-162]])segment(fixed,[t.x,8.15,t.z],[x,8.15,-76],.09,C.yellow);
 const cart=new T.Group();scene.add(cart);roots.push(cart);owners.set(cart,carBounds);box(cart,2,.6,2,0,.65,0,C.metal);const wheels=[];for(const x of [-1,1])for(const z of [-.7,.7]){const wheel=cylinder(cart,.3,.2,x,.3,z,C.dark,8);wheel.rotation.z=Math.PI/2;wheels.push(wheel);}
 const brake=paddle('rail-carrier',-176,8,-76);scene.remove(brake.root);cart.add(brake.root);brake.root.position.set(0,.6,0);roots.splice(roots.indexOf(brake.root),1);brake.root=cart;
 const cartBody=box(cart,2.1,1.5,2.1,0,.75,0,new T.MeshBasicMaterial({visible:false}),0);solids.push(cartBody);
 ring(fixed,1.7,.07,-162,8.12,-66,C.yellow);
 const hinges=[{x:38,z:40,y:-5,length:5,goal:Math.PI/2},{x:43,z:40,y:-6,length:6,goal:Math.PI}];
 const trays=hinges.map(h=>{const root=new T.Group();root.position.set(h.x,h.y,h.z);scene.add(root);roots.push(root);box(root,.7,.1,h.length,0,0,h.length/2,C.metal,0);for(const x of [-.4,.4])box(root,.1,.3,h.length,x,.1,h.length/2,C.dark,0);const flow=box(root,.45,.035,h.length,0,.09,h.length/2,mat(0x97dbdc,true),0);const drip=cylinder(root,.12,1,0,-.5,h.length,mat(0x97dbdc,true),8);cylinder(fixed,.14,h.y+8,h.x,(h.y-8)/2,h.z,C.dark,8);return {...h,root,flow,drip};});
 for(const q of gutterControls)paddle(q.id,q.x,-8,q.z,q.id!=='gutter-plug');
 for(const [i,t]of gutterControls.slice(0,2).entries())segment(fixed,[t.x,-7.85,t.z],[hinges[i].x,-7.85,hinges[i].z],.12,C.yellow);
 cylinder(fixed,.3,4,36,-6,44,C.metal,10);segment(fixed,[36,-4,44],[38,-4,40],.35,C.metal);
 const inlet=cylinder(fixed,.1,1,38,-4.5,40,mat(0x97dbdc,true),8);
 for(const s of sideObstacles.slice(1,3)){const mesh=box(fixed,s.w,s.h,s.d,s.x+s.w/2,s.y+s.h/2,s.z+s.d/2,s.id==='care-planter'?0x667d55:C.teal,0);solids.push(mesh);}
 const plant=new T.Group();plant.position.set(43,-7,34);scene.add(plant);roots.push(plant);cylinder(plant,.13,1.6,0,.8,0,C.metal,8);
 const leaves=Array.from({length:5},(_,i)=>{const pivot=new T.Group();pivot.position.y=.3+i*.25;pivot.rotation.y=i*2.4;plant.add(pivot);box(pivot,.45,.12,1.1,0,0,.5,0x93b67a,.04);return pivot;});
 const bloom=cylinder(plant,.35,.25,0,1.75,0,mat(C.lightYellow,true),6);
 let coverHeldUntil=0;
 const coverBounds=sideObstacles.find(s=>s.id==='sorter-cover'),cover=new T.Group();scene.add(cover);roots.push(cover);owners.set(cover,coverBounds);
 coverBounds.x=Math.max(116,Math.min(138,state.sidePuzzles?.coverX??116));
 const coverMesh=box(cover,5,2.8,2,2.5,1.4,1,C.metal);coverMesh.userData.sortingCover=true;solids.push(coverMesh);
 box(cover,1.4,.8,.2,2.5,1.6,2.2,mat(SIGNAL.magnet),0);
 const coverTarget={id:'sorting-cover',kind:'magnet',sidePuzzle:true,root:cover,x:coverBounds.x+2.5,y:25.6,z:-105.8,radius:.75};targets.push(coverTarget);
 for(const z of [0,2]){box(cover,5,.2,.12,2.5,2.4,z,C.yellow,0);segment(fixed,[116,24.1,-108+z],[143,24.1,-108+z],.14,C.metal);}
 for(const x of [.5,4.5])for(const z of [0,2])cylinder(cover,.3,.18,x,.3,z,C.dark,8).rotation.x=Math.PI/2;
 // Keep the obstructing chunk local even when the rail and garden are far apart.
 batchStatic(fixed);roots.splice(roots.indexOf(fixed),1,...fixed.children);
 for(const root of [cart,...targets.filter(t=>t!==brake&&t.handle).map(t=>t.root)])batchRigidParts(root,[...wheels,...targets.flatMap(t=>[t.handle,t.lamp,t.plate].filter(Boolean))]);

 function persist(){state.sidePuzzles={rail:rail.serialize(),gutter:gutter.serialize(),coverX:coverBounds.x};state['rail-crossing']=rail.state.solved;}
 function act(id){const changed=id.startsWith('rail-')?rail.act(id):id==='gutter-plug'?gutter.unplug():gutter.act(id);const t=targets.find(t=>t.id===id);if(t?.handle)t.flash=.22;if(changed)persist();return changed;}
 function pullCover(dt,p,enemies,time){
  const desired=Math.max(116,Math.min(138,p.x-2.5)),next=T.MathUtils.damp(coverBounds.x,desired,2,dt);
  if([p,...enemies.filter(e=>e.hp>0)].some(b=>Math.abs(b.y-24)<3&&b.x>next-1&&b.x<next+6&&b.z>-109&&b.z<-105))return;
  coverBounds.x=next;coverTarget.x=next+2.5;cover.position.x=next;cover.updateWorldMatrix(true,true);coverHeldUntil=time+.2;persist();
 }
 function pushCarrier(p,speed){if(speed<1.3||p.deployed||Math.abs(p.y-8)>.5||Math.hypot(p.x-brake.x,p.z-brake.z)>2.2)return false;return act('rail-carrier');}
 function update(dt,p,enemies){
  const occupied=position=>[p,...enemies.filter(e=>e.hp>0)].some(b=>Math.abs(b.y-position[1])<2&&Math.hypot(b.x-position[0],b.z-position[2])<2.3);
  let changed=delivery.update(dt,state['maintenance-started'],occupied);
  if(changed)state.maintenance=true;
  const tenderBounds=sideObstacles.find(s=>s.id==='maintenance-cart');Object.assign(tenderBounds,{x:delivery.position[0]-1,y:delivery.position[1],z:delivery.position[2]-1});
  cover.position.set(coverBounds.x,coverBounds.y,coverBounds.z);coverTarget.x=coverBounds.x+2.5;

  for(const t of targets){if(!t.plate)continue;const touching=Math.abs(p.y-(t.y-1.3))<.5&&Math.hypot(p.x-t.x,p.z-t.z)<1.65;if(touching&&!t.contact)changed=act(t.id)||changed;t.contact=touching;}
  changed=rail.update(dt,pos=>{const q=railPoint(pos),before=railPoint(rail.position());return [p,...enemies.filter(e=>e.hp>0)].some(b=>Math.abs(b.y-q.y)<2&&Math.hypot(b.x-q.x,b.z-q.z)<2.3&&Math.hypot(b.x-q.x,b.z-q.z)<Math.hypot(b.x-before.x,b.z-before.z));})||changed;
  const aligned=trays.every((t,i)=>Math.abs(t.root.rotation.y-(gutter.state.angles[i]*Math.PI/2))<.02);
  changed=gutter.update(dt,aligned)||changed;
  if(changed)persist();
  const position=railPoint(rail.position()),dx=position.x-cart.position.x,dz=position.z-cart.position.z,travel=Math.hypot(dx,dz);if(dt>0&&travel>.0001){cart.rotation.y=Math.atan2(dx,dz);for(const wheel of wheels)wheel.rotateY(-travel/.3);}cart.position.set(position.x,position.y,position.z);Object.assign(carBounds,{x:position.x-1.1,z:position.z-1.1});Object.assign(brake,{x:position.x,y:position.y+1.9,z:position.z});
  for(const [i,t]of trays.entries()){t.root.rotation.y=T.MathUtils.damp(t.root.rotation.y,gutter.state.angles[i]*Math.PI/2,8,dt);t.flow.visible=i===0||Math.abs(trays[0].root.rotation.y-Math.PI/2)<.02;t.drip.visible=t.flow.visible;t.drip.scale.set(gutter.state.unplugged?1:.35,i===0?1:2,1);}
  inlet.scale.x=inlet.scale.z=gutter.state.unplugged?1:.35;
  for(const [i,blade]of blades.entries())blade.rotation.y=rail.state.switches[i]?-Math.PI/2:0;
  for(const t of targets){if(!t.handle)continue;t.flash=Math.max(0,t.flash-dt);t.handle.rotation.x=-t.flash*1.4;if(t.plate)t.plate.position.y=t.contact?.025:.1;const lit=t.id==='rail-a'?rail.state.switches[0]:t.id==='rail-b'?rail.state.switches[1]:t.id.startsWith('rail')?rail.state.solved:t.id==='gutter-plug'?gutter.state.unplugged:gutter.state.grown;t.lamp.material.color.setHex(lit?SIGNAL.open:SIGNAL.ready);if(t.id==='gutter-plug')t.handle.visible=!gutter.state.unplugged;}
  plant.scale.y=.12+.88*gutter.state.fill;for(const leaf of leaves)leaf.rotation.x=(1-gutter.state.fill)*1.3;bloom.visible=gutter.state.grown;
  for(const root of roots)root.updateWorldMatrix(true,true);
  return changed;
 }
 function cast(raycaster,targetsAllowed){let hit=raycaster.intersectObjects(solids,false)[0]||null;if(targetsAllowed)for(const t of targets){if(t.id==='gutter-plug'&&gutter.state.unplugged)continue;const q=raycaster.ray.intersectSphere(new T.Sphere(new T.Vector3(t.x,t.y,t.z),t.radius),new T.Vector3());if(q){const distance=q.distanceTo(raycaster.ray.origin);if(distance<=raycaster.far&&(!hit||distance<hit.distance))hit={point:q,distance,target:t};}}return hit;}
 update(0,{x:Infinity,y:0,z:0},[]);return {owners,roots,targets,act,update,cast,rail,gutter,delivery,persist,pullCover,pushCarrier,get coverHeldUntil(){return coverHeldUntil;}};
}

import {cameraPropOpacity} from './folded-camera.js';
import {makeCityPresentation} from './folded-presentation.js';
import {abilityIcon} from './folded-hud.js';
import {SIGNAL,makeAperture,apertureOpacity,APERTURE_AIM_THRESHOLD} from './folded-visibility.js';
import {foldedEnemyModel} from './folded-enemies.js';
import {batchRigidParts} from './rigid-batching.js';
import {cityBelts,cityMirrors} from './folded-city-layout.js';
import * as T from 'three';
import {box,cylinder,ring,mat,C,tankModel,batchStatic,chargeWarning} from './world.js';
import {renderDecks} from './hoist-layout.js';
import {foldedDecks,foldedLiftDefs,foldedSolids,foldedControls,foldedHives,foldedPickups,foldedEnemies,activeSolid,inRect,deckHeight} from './folded-layout.js';

export function makeFoldedWorld(scene,state){
  const aperture=makeAperture(),viewPlayer={x:0,y:0,z:0};
  const presentation=makeCityPresentation(scene,aperture);
  let thirdPerson=false;
  const fixed=new T.Group();scene.add(fixed);
  const surfaces=[],walls=[],controls=[],hives=[],pickups=[],lifts=[],enemies=[],pillars=[],floorDetails=[],mirrors=[],belts=[];
  const raycaster=new T.Raycaster();
  const foundryFloor=d=>d.id.startsWith('foundry')||['press-working-floor','press-service-link','reclaim-entry-verge','prototype-court','prototype-return','recycling-furnace','exit-terrace'].includes(d.id);
  const palette=d=>d.water?0x477a7b:foundryFloor(d)?0x566365:d.y<=-40?0x394e50:d.y<=-24?0x485b5e:d.y<0?0x5b7069:d.y>=16?0x7c7c70:0x647572;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#d8dad0';ctx.fillRect(0,0,128,128);
  ctx.fillStyle='#cdd0c7';ctx.fillRect(0,0,128,1);ctx.fillRect(0,0,2,128);
  const texture=new T.CanvasTexture(canvas);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.colorSpace=T.SRGBColorSpace;
  const waterCanvas=document.createElement('canvas');waterCanvas.width=waterCanvas.height=128;
  const waterCtx=waterCanvas.getContext('2d');waterCtx.fillStyle='#bed8df';waterCtx.fillRect(0,0,128,128);waterCtx.strokeStyle='#f0f5dc';waterCtx.lineWidth=2;waterCtx.globalAlpha=.5;
  for(let y=12;y<128;y+=24)for(let x=(y%48)/2;x<128;x+=55){waterCtx.beginPath();waterCtx.moveTo(x,y);waterCtx.bezierCurveTo(x+9,y-9,x+20,y+9,x+34,y);waterCtx.stroke();}
  const waterTexture=new T.CanvasTexture(waterCanvas);waterTexture.wrapS=waterTexture.wrapT=T.RepeatWrapping;waterTexture.colorSpace=T.SRGBColorSpace;
  const trims=new Map(foldedDecks.map(d=>{const g=new T.Group();scene.add(g);return [d.id,g];}));
  const patches=renderDecks(foldedDecks,foldedLiftDefs.map(l=>({...l,recess:Math.max(.6,l.recess||0)}))).flatMap(d=>{
    if(d.rise)return [d];
    const pieces=[];for(let x=d.x;x<d.x+d.w;x+=12)for(let z=d.z;z<d.z+d.d;z+=12)pieces.push({...d,x,z,w:Math.min(12,d.x+d.w-x),d:Math.min(12,d.z+d.d-z)});
    return pieces;
  });
  const floorDepthMaterial=new T.MeshBasicMaterial();aperture.apply(floorDepthMaterial,{depthOnly:true});
  const floorMeshes=new T.Group(),floorBatches=new T.Group(),floorMaterials=new Map();
  scene.add(floorMeshes,floorBatches);
  for(const d of patches){
    const key=d.water?'water':palette(d);
    if(!floorMaterials.has(key))floorMaterials.set(key,d.water?new T.MeshPhongMaterial({color:0x397d9d,specular:0xa6dce8,shininess:65}):mat(key));
    const mesh=box(floorMeshes,d.w,.65,Math.hypot(d.d,d.rise||0),d.x+d.w/2,d.y+(d.rise||0)/2-.325-(d.recess||0),d.z+d.d/2,floorMaterials.get(key),0);
    aperture.apply(mesh.material);mesh.userData.aperture=true;
    mesh.name=`folded-floor:${d.id}`;if(d.rise)mesh.rotation.x=-Math.atan2(d.rise,d.d);
    {
      mesh.geometry=mesh.geometry.clone();const pos=mesh.geometry.attributes.position,uv=mesh.geometry.attributes.uv;
      for(let i=0;i<pos.count;i++)uv.setXY(i,(pos.getX(i)+mesh.position.x)/8,-(pos.getZ(i)+mesh.position.z)/8);
      mesh.material.map=d.water?waterTexture:texture;
    }
    // Opaque floor fragments must occlude lower structures regardless of transparent sorting.
    // Leave the camera aperture out of this depth pass so the lower room remains visible.
    floorBatches.add(mesh.clone());
    const depth=new T.Mesh(mesh.geometry,floorDepthMaterial);depth.name=`folded-floor-depth:${d.id}`;mesh.add(depth);
    surfaces.push({...d,mesh,opacity:1});
  }
  // Opaque third-person floors can batch; overhead patches must sort among other transparent props.
  // Collision and aim queries keep using the original patches in both views.
  batchStatic(floorBatches,{preserveGeometry:true});floorBatches.visible=false;
  // Quiet edge markings, with taller structure on the far side of each space.
  const edges=new Set();
  for(const d of foldedDecks)for(const side of ['left','right','front','back']){
    const along=side==='front'||side==='back',length=along?d.w:d.d,trim=trims.get(d.id);
    for(let t=1;t<length;t+=2){
      const x=along?d.x+t:side==='left'?d.x:d.x+d.w,z=along?(side==='front'?d.z:d.z+d.d):d.z+t,y=deckHeight(d,z);
      const ox=along?0:side==='left'?-.1:.1,oz=along?(side==='front'?-.1:.1):0;
      if(foldedDecks.some(o=>o!==d&&inRect(x+ox,z+oz,o)&&Math.abs(deckHeight(o,z+oz)-y)<.5)||foldedLiftDefs.some(l=>inRect(x+ox,z+oz,l)&&l.stops.includes(y)))continue;
      const key=[x,y,z,along].join('/');if(edges.has(key))continue;edges.add(key);
      box(trim,along?1.7:.12,.09,along?.12:1.7,x,y+.08,z,d.water?0x709389:0x89978f,0);
      if(d.id==='roof-return'&&along||d.id==='roof-walk'&&!along)box(trim,along?2:.12,.12,along?.12:2,x,y+.8,z,C.metal,0);
      if(!d.rise&&!d.water&&t%8===1&&['left','front'].includes(side)){
        box(trim,.25,1.3,.25,x,y+.65,z,C.dark,0);
        box(trim,.35,.12,.35,x,y+1.32,z,C.metal,0);
      }
    }
  }
  const trimMaterials=new Map(),floorTrimMeshes=new T.Group(),floorTrimBatches=new T.Group();scene.add(floorTrimMeshes,floorTrimBatches);
  for(const [id,g]of trims){
    const parts=surfaces.filter(s=>s.id===id);
    for(const s of parts){s.trim=new T.Group();floorTrimMeshes.add(s.trim);}
    for(const mesh of [...g.children]){
      const s=parts.find(s=>inRect(mesh.position.x,mesh.position.z,s,.01))||parts[0];s.trim.add(mesh);
    }
    scene.remove(g);
    for(const s of parts){
      if(s.rise){
        const length=Math.hypot(s.d,s.rise),pitch=-Math.atan2(s.rise,s.d);
        // Continuous side rails and cross seams make the climb readable in projection.
        for(const side of [-1,1]){
          const x=s.x+s.w/2+side*(s.w/2-.2);
          const rail=box(s.trim,.16,.16,length,x,s.y+s.rise/2+1,s.z+s.d/2,C.metal,0);rail.rotation.x=pitch;
          for(let z=s.z+.3;z<s.z+s.d;z+=6)box(s.trim,.15,1,.15,x,deckHeight(s,z)+.5,z,C.dark,0);
        }
        for(let z=s.z+2;z<s.z+s.d;z+=4){const seam=box(s.trim,s.w-.8,.045,.16,s.x+s.w/2,deckHeight(s,z)+.045,z,0xb5b99a,0);seam.rotation.x=pitch;}
      }
      s.trim.traverse(m=>{if(m.isMesh){if(!trimMaterials.has(m.material)){const material=m.material.clone();aperture.apply(material);trimMaterials.set(m.material,material);}m.material=trimMaterials.get(m.material);}});
      for(const mesh of s.trim.children)floorTrimBatches.add(mesh.clone());
      batchStatic(s.trim);
    }
  }
  batchStatic(floorTrimBatches);floorTrimBatches.visible=false;
  // These transforms never change. Freeze both view representations, including the inactive one.
  for(const root of [floorMeshes,floorBatches,floorTrimMeshes,floorTrimBatches]){
    root.updateWorldMatrix(true,true);root.traverse(object=>{object.matrixAutoUpdate=false;object.matrixWorldAutoUpdate=false;});
  }
  const phoenixCanvas=document.createElement('canvas');phoenixCanvas.width=phoenixCanvas.height=96;
  const phoenixCtx=phoenixCanvas.getContext('2d');phoenixCtx.scale(2,2);phoenixCtx.strokeStyle='#ffe19b';phoenixCtx.lineWidth=2.8;phoenixCtx.lineJoin='round';phoenixCtx.stroke(new Path2D(abilityIcon('phoenix')));
  const phoenixTexture=new T.CanvasTexture(phoenixCanvas);phoenixTexture.colorSpace=T.SRGBColorSpace;
  const phoenixMark=new T.MeshBasicMaterial({map:phoenixTexture,transparent:true,depthWrite:false,side:T.DoubleSide});
  for(const d of foldedSolids){
    const mesh=box(scene,d.w,d.h,d.d,d.x+d.w/2,d.y+d.h/2,d.z+d.d/2,mat(d.magnetic?SIGNAL.magnet:d.mass?0x294b48:d.permanent?C.teal:['launch','optics','pressure'].includes(d.id)?C.orange:C.dark),.08);
    if(!d.permanent)box(mesh,d.w>2?d.w*.85:.12,.18,d.d>2?d.d*.85:.12,0,.1,0,C.metal,0);
    if(!d.permanent){
      for(const side of [-1,1])box(mesh,d.w>d.d?.24:d.w+.12,d.h+.3,d.w>d.d?d.d+.12:.24,d.w>d.d?side*(d.w/2-.15):0,0,d.w>d.d?0:side*(d.d/2-.15),C.metal,0);
    }
    if(d.phoenix||['launch','optics','pressure'].includes(d.id)){
      for(const side of [-1,1]){const emblem=new T.Mesh(new T.PlaneGeometry(2.2,2.2),phoenixMark);emblem.position.set(d.d>d.w?side*(d.w/2+.04):0,.1,d.d>d.w?0:side*(d.d/2+.04));if(d.d>d.w)emblem.rotation.y=Math.PI/2;mesh.add(emblem);}
    }
    mesh.material.transparent=true;walls.push({...d,mesh,opacity:1,open:state[d.id]?1:0});
  }
  // Status stays on the fixed jambs when a shutter retracts into its floor pocket.
  const gateSignals=[];
  for(const d of foldedSolids.filter(d=>!d.permanent&&!d.magnetic)){
    const across=d.w>d.d,root=new T.Group();root.position.set(d.x+d.w/2,d.y,d.z+d.d/2);scene.add(root);
    const lamps=[];
    for(const side of [-1,1]){
      const x=across?side*(d.w/2+.25):0,z=across?0:side*(d.d/2+.25);
      box(root,.55,1.1,.55,x,.55,z,C.dark,0);
      lamps.push(box(root,.38,.18,.38,x,1.15,z,mat(SIGNAL.ready,true),0));
    }
    gateSignals.push({id:d.id,root,lamps});floorDetails.push({root,x:root.position.x,y:d.y,z:root.position.z,radius:Math.max(d.w,d.d)/2});
  }
  function makeControl(c){
    const root=new T.Group();root.name=`folded-control:${c.id}`;root.position.set(c.x,c.y,c.z);scene.add(root);
    root.rotation.y=c.kind==='laser'||c.kind==='magnet'?Math.PI/2:Math.PI/4;
    const ground=c.ground??c.y-1.3,height=c.y-ground;
    box(root,.42,height,.48,0,-height/2,0,C.dark);
    box(root,1.6,.16,1.2,0,-height+.08,0,C.metal);
    const moving=new T.Group();root.add(moving);
    let lamp;
    if(c.kind==='magnet'){
      box(root,1.7,.32,.55,0,-.6,0,C.metal);
      for(const x of [-.68,.68]){box(root,.36,1.4,.55,x,0,0,SIGNAL.magnet);box(root,.38,.35,.58,x,.55,0,0xa9dcff);}
      lamp=box(moving,.85,.55,.42,0,-.2,.12,mat(SIGNAL.magnet,true));
      box(moving,.22,.65,.2,0,.2,.08,C.dark);
    }else if(c.kind==='laser'){
      const casing=cylinder(root,1,.5,0,0,-.15,C.dark,12);casing.rotation.x=Math.PI/2;
      for(const r of [.9,.62])ring(root,r,.09,0,0,.15,C.metal);
      lamp=cylinder(moving,.38,.12,0,0,.23,mat(C.lightYellow,true),12);lamp.rotation.x=Math.PI/2;
      for(let i=0;i<3;i++){const a=i*Math.PI*2/3,fin=box(moving,.25,.45,.16,Math.sin(a)*.72,Math.cos(a)*.72,.25,C.yellow,0);fin.rotation.z=-a;}
    }else if(c.kind==='use'){
      box(root,1.4,.95,.5,0,0,0,C.dark);
      lamp=box(root,.4,.22,.08,0,.3,.3,mat(SIGNAL.ready,true));
      ring(moving,.62,.12,0,-.15,.44,C.yellow);
      for(const angle of [0,Math.PI/2]){const spoke=box(moving,1,.12,.12,0,-.15,.44,C.metal);spoke.rotation.z=angle;}
    }else if(c.kind==='dock'){
      for(const x of [-1,1])box(root,.35,1.6,.8,x,-.2,0,C.metal);
      lamp=box(moving,1.3,.35,.65,0,-.6,.25,mat(C.mint,true));
      for(const x of [-.75,.75])box(moving,.4,.4,1.4,x,-.4,.4,C.yellow);
    }else{
      box(root,1.65,1.65,.5,0,0,-.1,C.dark);
      for(const x of [-.67,.67])for(const y of [-.67,.67])box(root,.2,.2,.12,x,y,.22,C.metal,0);
      ring(root,.64,.14,0,0,.26,C.metal);
      lamp=cylinder(moving,.48,.22,0,0,.34,mat(SIGNAL.ready,true),12);lamp.rotation.x=Math.PI/2;
      ring(moving,.27,.055,0,0,.49,C.lightYellow);
      const core=cylinder(moving,.09,.08,0,0,.5,C.lightYellow,8);core.rotation.x=Math.PI/2;
      // The target is a sprung machine paddle, with a visible travel slot.
      for(const x of [-.95,.95])box(root,.12,1.15,.9,x,0,-.18,C.metal,0);
      box(root,2.1,.22,.95,0,-.88,-.18,C.dark,0);
    }
    // Rings here stand upright, facing the same direction as their mechanism.
    root.traverse(m=>{if(m.geometry?.type==='TorusGeometry')m.rotation.x=0;});
    const casing=new T.Group();root.add(casing);
    for(const child of [...root.children])if(child!==moving&&child!==lamp&&child!==casing)casing.add(child);
    batchStatic(casing);
    const cover=c.id==='brake'?box(root,1.2,1.2,.12,0,0,.64,C.dark,0):null;
    const control={...c,root,lamp,moving,cover,radius:.95,flash:0,engaged:state[c.id]?1:0};controls.push(control);return control;
  }
  for(const c of foldedControls)makeControl(c);
  const controlFeeds=[];
  for(const id of ['bridge-crane','freight','load','gangway','magnet']){
    const c=foldedControls.find(c=>c.id===id),gate=foldedSolids.find(d=>d.id===id);
    const end={x:gate.x+gate.w/2,z:gate.z+gate.d/2},ground=c.ground??c.y-1.3;
    const points=[new T.Vector3(c.x,ground+.1,c.z),new T.Vector3(c.x,gate.y+.1,end.z),new T.Vector3(end.x,gate.y+.1,end.z)];
    const root=new T.Group();scene.add(root);const lamps=[];
    for(let i=1;i<points.length;i++){
      const delta=points[i].clone().sub(points[i-1]),length=delta.length();if(length<.01)continue;
      const cable=box(root,.14,.14,length,0,0,0,C.dark,0);cable.position.copy(points[i-1]).addScaledVector(delta,.5);cable.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),delta.normalize());
      for(let t=.4;t<length;t+=1.5){const light=box(root,.22,.12,.22,0,0,0,mat(SIGNAL.ready,true),0);light.position.copy(points[i-1]).addScaledVector(delta,t);lamps.push(light);}
    }
    controlFeeds.push({id,root,lamps});floorDetails.push({root,x:c.x,y:ground,z:c.z,radius:8,floorMark:true});
  }
  for(const d of foldedLiftDefs){
    const root=new T.Group();scene.add(root);
    const mesh=box(root,d.w,.55,d.d,d.x+d.w/2,-.275,d.z+d.d/2,mat(0x657770),0);
    const markings=new T.Group();root.add(markings);
    for(const sx of [-1,1])for(const sz of [-1,1]){
      const x=d.x+d.w/2+sx*(d.w/2-.35),z=d.z+d.d/2+sz*(d.d/2-1.3);
      box(markings,.28,.035,2,x,.025,z,C.yellow,0);
    }
    for(const direction of [-1,1])for(const side of [-1,1]){
      const arrow=box(markings,1.3,.035,.18,d.x+d.w/2+side*.45,.025,d.z+d.d/2+direction*.9,C.yellow,0);
      arrow.rotation.y=side*direction*Math.PI/4;
    }
    batchStatic(markings);
    for(const x of [d.x+.3,d.x+d.w-.3]){
      const h=d.stops.at(-1)-d.stops[0]+6,mesh=box(scene,.45,h,.45,x,d.stops[0]+h/2,d.z,mat(C.dark),0);mesh.material.transparent=true;
      pillars.push({mesh,x:x-.225,z:d.z-.225,w:.45,d:.45,y:d.stops[0],h});
      box(root,.18,1,.18,x,.5,d.z,C.dark,0);
    }
    const l={...d,root,mesh,y:d.stops[0],destination:d.stops[0],wait:0};lifts.push(l);
  }
  for(const h of foldedHives){
    const root=new T.Group();root.name=`folded-hive:${h.id}`;root.position.set(h.x,h.y,h.z);scene.add(root);
    cylinder(root,2.8,.18,0,.08,0,C.dark,6);
    const halo=ring(root,2.1,.12,0,.2,0,mat(C.mint,true)),scan=ring(root,1.7,.065,0,.25,0,mat(C.mint,true));
    const arms=[],lamps=[];
    for(const side of [-1,1]){
      box(root,.65,2.8,.8,side*2.4,1.4,-.8,C.dark);
      lamps.push(box(root,.32,1.5,.14,side*2.4,1.5,-.33,mat(C.mint,true)));
      const pivot=new T.Group();pivot.position.set(side*2.4,2.7,-.8);root.add(pivot);
      cylinder(pivot,.3,.6,0,0,0,C.metal,10).rotation.x=Math.PI/2;
      box(pivot,1.45,.22,.28,-side*.6,0,0,C.metal);
      box(pivot,.38,.6,.5,-side*1.2,-.22,0,C.yellow);
      lamps.push(box(pivot,.25,.1,.3,-side*1.2,-.56,0,mat(C.mint,true)));
      arms.push({pivot,side});
    }
    hives.push({...h,root,halo,scan,arms,lamps,proximity:0,pulse:0,pulseKind:'repair'});
  }
  for(const p of foldedPickups){
    const root=new T.Group();root.position.set(p.x,p.y,p.z);scene.add(root);
    cylinder(root,2.2,.4,0,.2,0,C.dark,8);const halo=ring(root,1.7,.12,0,.6,0,mat(C.yellow,true));
    const item=new T.Group();root.add(item);
    if(p.id==='flotation')for(const x of [-.8,.8])box(item,.6,.6,2.2,x,1.4,0,C.lightYellow,.2);
    else if(p.ability==='magnet'){const arc=new T.Mesh(new T.TorusGeometry(.8,.2,8,16,Math.PI*1.4),mat(SIGNAL.magnet));arc.position.y=1.5;item.add(arc);}
    else if(p.ability==='mortar'){
      box(item,1.7,.25,1.5,0,.85,.25,C.metal,.1);
      const tube=cylinder(item,.55,2.2,0,1.8,0,C.metal,12);tube.rotation.x=.5;
      cylinder(tube,.65,.18,0,1.1,0,C.yellow,12);cylinder(tube,.43,.05,0,1.21,0,C.dark,12);
      for(const x of [-.65,.65])box(item,.18,1,.18,x,1.3,.4,C.lightYellow,.03).rotation.z=-x*.6;
    }
    else if(p.id==='laser'){box(item,.5,.5,2.4,0,1.5,0,C.lightYellow);for(const z of [-.6,.6])ring(item,.6,.1,0,1.5,z,C.metal).rotation.x=Math.PI/2;}
    else if(p.id==='circulation'){for(const x of [-.7,.7]){cylinder(item,.45,1.6,x,1.5,0,C.mint,8);ring(item,.45,.1,x,1,0,C.metal);}}
    else {cylinder(item,.65,1.4,0,1.5,0,C.orange,8);for(const x of [-1,1])box(item,.6,.25,1.5,x,1.5,0,C.yellow,.12);}
    pickups.push({...p,root,item,halo});
  }
  for(const e of foldedEnemies){
    const model=foldedEnemyModel(e.type);scene.add(model.root);model.root.position.set(e.x,e.y,e.z);
    if(e.magneticShield&&model.frontArmor){model.frontArmor.material=mat(SIGNAL.magnet);for(const x of [-.7,.7])box(model.frontArmor,.3,.55,.12,x,0,.34,mat(0xa9dcff,true));}
    batchRigidParts(model.root,[...model.tracks,...(model.moving||[]),model.frontArmor,model.radiator]);
    const materials=[];model.root.traverse(m=>{if(m.isMesh&&m.material.color){m.material=m.material.clone();materials.push({m:m.material,color:m.material.color.clone()});}});
    const warningGeometry=new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(new Float32Array(e.type==='welder'?45:6),3).setUsage(T.DynamicDrawUsage));warningGeometry.setDrawRange(0,2);
    const warning=new T.Line(warningGeometry,new T.LineBasicMaterial({color:C.orange,transparent:true,opacity:.85}));scene.add(warning);warning.visible=false;warning.frustumCulled=false;
    if(e.type==='boss')model.root.scale.setScalar(1.8);
    const charge=['scout','elite'].includes(e.type)?chargeWarning(e.type):null;if(charge)scene.add(charge.root);
    const zone=ring(scene,3,.1,e.x,e.y+.1,e.z,mat(C.orange,true));zone.visible=false;
    const flame=e.type==='welder'?new T.Mesh(new T.ConeGeometry(1,1,10,1,true),new T.MeshBasicMaterial({color:C.orange,transparent:true,opacity:.32,depthWrite:false,side:T.DoubleSide})):null;
    if(flame){scene.add(flame);flame.visible=false;}
    const supportBeam=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3()]),new T.LineBasicMaterial({color:SIGNAL.open}));scene.add(supportBeam);supportBeam.visible=false;supportBeam.frustumCulled=false;
    const enemy={charge,zone,flame,supportBeam,spawn:{x:e.x,y:e.y,z:e.z},...e,hp:e.persistent&&state[e.id]?0:e.hp,max:e.hp,model,materials,warning,phase:'idle',timer:1.5,aim:Math.PI/2,flash:0,armor:0,ramAt:-10,shieldPull:0,shieldRemoved:false,radius:e.type==='boss'?3.2:e.guardian?2.4:e.type==='guard'?1.75:1.35};
    enemy.parts=(e.parts||[]).map((hp,i)=>{
      const root=new T.Group();root.position.set(e.x+(i?4:-4),e.y,e.z);scene.add(root);
      box(root,2.4,1.6,2.8,0,.8,0,C.dark);const lamp=box(root,1.5,1.1,1.8,0,1.7,0,mat(C.orange,true));
      const shutter=e.id==='foundry'?box(root,1.8,1.3,.2,0,1.7,1.05,C.metal):null;
      const part={shutter,x:root.position.x,y:e.y+1.7,z:e.z,hp,max:hp,root,lamp,radius:1.45,enemy};return part;
    });
    if(e.mirror&&e.type!=='reflector'){const plate=box(model.body,1.65,1.25,.1,0,1.4,1.52,mat(0xd3eee4,true));plate.name='mirror-plate';}
    if(e.guardian){model.root.scale.setScalar(1.35);const weak=box(model.body,1.2,1,.15,0,1.3,-1.8,mat(C.orange,true));weak.name='rear-aperture';}
    enemy.baseScale=model.root.scale.clone();
    model.root.visible=enemy.hp>0;for(const part of enemy.parts)part.root.visible=enemy.hp>0;
    enemies.push(enemy);
  }
  // One split wheel and axle are visible from the bridge, canal and roof.
  const wheel=new T.Group();wheel.position.set(-20,-3,6);wheel.rotation.y=Math.PI/2;scene.add(wheel);
  const rim=new T.Mesh(new T.TorusGeometry(7,.8,8,56,Math.PI*1.7),mat(C.metal));wheel.add(rim);
  for(let i=0;i<7;i++){const a=i*.72;const spoke=box(wheel,.55,6,.6,Math.sin(a)*3,Math.cos(a)*3,0,C.dark,0);spoke.rotation.z=-a;}
  const axle=cylinder(fixed,.8,10,-18,-3,6,C.dark,16);axle.rotation.z=Math.PI/2;
  box(fixed,2,13,3,-24,-8.5,6,C.dark,0);
  const turntableTrim=new T.Group(),bridgeTrim=new T.Group();scene.add(turntableTrim,bridgeTrim);
  for(const r of [7.9,9.2])ring(turntableTrim,r,.13,0,.13,23,C.dark);
  for(const x of [-3,3])box(bridgeTrim,.16,.07,36,x,.08,-8,C.metal,0);
  for(let z=-24;z<10;z+=4)box(bridgeTrim,7,.06,.25,0,.07,z,0x596e62,0);
  floorDetails.push({root:turntableTrim,x:0,y:0,z:23,radius:10,floorMark:true},{root:bridgeTrim,x:0,y:0,z:-8,radius:18,floorMark:true});
  for(const x of [66,100]){
    box(fixed,1.5,18.8,16,x,-10.6,-20,C.dark,0);
    for(const z of [-26,-15])box(fixed,2.4,22.2,2.4,x,-11.9,z,0x38534e,0);
  }
  for(const x of [-8,8])for(const z of [-22,7]){
    const mesh=box(scene,1.8,16,1.8,x,-8,z,mat(C.dark),0);mesh.material.transparent=true;
    pillars.push({mesh,x:x-.9,z:z-.9,w:1.8,d:1.8,y:-16,h:16});
    box(fixed,3,.65,3,x,-15.5,z,C.teal,0);
  }
  // The broken press foot and water-worn ribs are silhouettes, outside the route.
  for(const x of [-58,58])for(let z=-20;z<40;z+=12){box(fixed,3,20,3,x,-14,z,0x294a49,0);box(fixed,6,.6,5,x,-5,z,0x48645b,0);}
  for(const x of [102,108,114]){cylinder(fixed,.8,50,x,-2,-104,C.dark,12);ring(fixed,1,.12,x,20,-104,C.metal);}
  box(fixed,12,64,12,24,-10,-118,0x203e3d,0);box(fixed,10,6,10,24,25,-118,0x765e45,0);
  for(const x of [-49,-44,-35,34,39,58])for(const z of [17,25]){
    const y=x<0?-16:-8;
    for(let i=0;i<3;i++){const reed=box(fixed,.12,1.2+i*.3,.12,x+i*.35,y+.7,z+(i%2)*.3,0x9d9e64,0);reed.rotation.z=(i-1)*.18;}
  }
  // Visible cables connect the shot latch and carrier brake to their machines.
  for(const [x,z,bottom,top]of [[85,-41,6,18],[95,-41,6,18],[73,-78,17,23],[83,-78,17,23]])cylinder(fixed,.06,top-bottom,x,(bottom+top)/2,z,C.metal,6);
  box(fixed,14,.65,1,90,18,-41,C.dark,0);
  box(fixed,14,.65,1,78,23,-78,C.dark,0);
  // An unbroken, supported acceleration lane reads through repeated chevrons.
  for(let x=96;x<154;x+=6)for(const sign of [-1,1]){
    const arrow=box(fixed,1.7,.04,.2,x,16.06,-86+sign*.65,C.lightYellow,0);arrow.rotation.y=sign*Math.PI/4;
  }
  // Short assemblies keep sloped transport readable and cutaways local.
  for(const b of cityBelts){
    const horizontal=!!b.vx,length=horizontal?b.w:b.d,slope=horizontal?0:(b.rise||0)/b.d,stretch=Math.hypot(1,slope),segments=[];
    for(let start=0;start<length;start+=12){
      const span=Math.min(12,length-start),travel=span*stretch,cross=horizontal?b.d:b.w;
      const root=new T.Group(),x=horizontal?b.x+start+span/2:b.x+b.w/2,z=horizontal?b.z+b.d/2:b.z+start+span/2;
      root.name=`folded-belt:${b.id}:${start}`;root.position.set(x,deckHeight(b,z),z);root.rotation.x=-Math.atan(slope);scene.add(root);
      box(root,horizontal?travel:cross-.3,.08,horizontal?cross-.3:travel,0,.02,0,C.track,0);
      const rollers=[];
      for(const side of [-1,1]){
        box(root,horizontal?travel:.2,.22,horizontal?.2:travel,horizontal?0:side*(cross/2-.15),.07,horizontal?side*(cross/2-.15):0,C.metal,0);
        const roller=cylinder(root,.22,cross-.45,horizontal?side*(travel/2-.28):0,-.04,horizontal?0:side*(travel/2-.28),C.metal,12);
        roller.rotation[horizontal?'x':'z']=Math.PI/2;roller.userData.mount=roller.quaternion.clone();rollers.push(roller);
        for(const end of [-1,1])box(root,.4,.16,.4,horizontal?end*(travel/2-.28):side*(cross/2-.15),.22,horizontal?side*(cross/2-.15):end*(travel/2-.28),C.yellow,.04);
      }
      const count=Math.ceil(travel/1.05),geometry=new T.BoxGeometry(horizontal?.62:cross-.65,.1,horizontal?cross-.65:.62),mesh=new T.InstancedMesh(geometry,mat(0xffffff),count);
      mesh.name=`folded-belt-slats:${b.id}:${start}`;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);root.add(mesh);
      const dummy=new T.Object3D();
      for(let i=0;i<count;i++){dummy.position.set(horizontal?i*travel/count-travel/2:0,.15,horizontal?0:i*travel/count-travel/2);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,new T.Color(i%6===0?0xb6a578:0x485956));}
      mesh.boundingBox=new T.Box3(new T.Vector3(horizontal?-travel/2-.32:-(cross-.65)/2,.1,horizontal?-(cross-.65)/2:-travel/2-.32),new T.Vector3(horizontal?travel/2+.32:(cross-.65)/2,.2,horizontal?(cross-.65)/2:travel/2+.32));
      mesh.boundingSphere=mesh.boundingBox.getBoundingSphere(new T.Sphere());
      segments.push({root,mesh,count,travel,rollers});
    }
    belts.push({...b,horizontal,length,stretch,segments,mesh:segments[0].mesh,phase:0});
  }
  for(const d of cityMirrors){
    const normal=new T.Vector3(...(d.index&&state[d.index]?d.rotated:d.n)).normalize(),root=new T.Group();root.position.set(d.x,d.y,d.z);root.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),normal);scene.add(root);
    box(root,d.size+.5,3.5,.5,0,0,-.3,C.dark);
    const mesh=new T.Mesh(new T.PlaneGeometry(d.size,3),new T.MeshBasicMaterial({color:0xd3eee4,side:T.DoubleSide}));root.add(mesh);
    for(const x of [-d.size/2,d.size/2])box(root,.15,3.3,.12,x,0,.08,C.yellow);
    if(d.index){cylinder(root,.7,.3,0,-1.8,0,C.metal,12);for(const x of [-1,1])box(root,.15,1.3,.15,x,-1.9,0,C.dark);}
    const mirror={...d,normal,root,mesh,ground:d.y-2};mesh.userData.mirror=mirror;mirrors.push(mirror);
  }
  // Two independent power feeds end beside the same relay-operated barrier.
  const relayFeeds=[];
  for(const [id,points]of [
    ['relay-west',[[-35,44],[-35,51],[-58,51],[-58,118],[-50,118]]],
    ['relay-east',[[43,44],[43,53],[-56,53],[-56,122],[-50,122]]]
  ]){
    const lamps=[];
    for(let i=1;i<points.length;i++){
      const [ax,az]=points[i-1],[bx,bz]=points[i],length=Math.hypot(bx-ax,bz-az);
      for(let n=0;n<length;n+=8){
        const span=Math.min(8,length-n),t=(n+span/2)/length,x=ax+(bx-ax)*t,z=az+(bz-az)*t;
        box(fixed,bx===ax?.16:span,.13,bx===ax?span:.16,x,-15.88,z,C.dark,0);
        if(n%16===0){const lamp=box(scene,.35,.12,.35,x,-15.75,z,mat(C.orange,true),0);lamps.push(lamp);}
      }
    }
    relayFeeds.push({id,lamps});
  }
  // Service rails lead out of the repair bay; quiet metal never competes with a live target.
  for(const d of foldedDecks.filter(d=>['foundry-west','foundry-east','foundry-west-ramp','foundry-east-ramp','foundry-reclaim-track'].includes(d.id))){
    const root=new T.Group();root.position.set(d.x+d.w/2,d.y+(d.rise||0)/2,d.z+d.d/2);root.rotation.x=-Math.atan2(d.rise||0,d.d);scene.add(root);
    const across=d.w>d.d,length=across?d.w:Math.hypot(d.d,d.rise||0);
    for(const side of [-1,1])box(root,across?length:.1,.045,across?.1:length,across?0:side*2.2,.04,across?side*2.2:0,0x76847d,0);
    floorDetails.push({root,x:root.position.x,y:root.position.y,z:root.position.z,radius:length/2,floorMark:true});
  }
  // Relay lamps belong to recognisable flywheel drives, rather than isolated target posts.
  const relayDrives=[];
  for(const id of ['relay-west','relay-east']){
    const c=foldedControls.find(c=>c.id===id),root=new T.Group();root.position.set(c.x,c.y-1.5,c.z-5.5);scene.add(root);
    box(root,4.6,.5,2.5,0,.25,0,C.dark,.1);
    const axle=cylinder(root,1.35,3.2,0,1.7,0,C.dark,12);axle.rotation.z=Math.PI/2;
    for(const x of [-1.5,1.5]){const flywheel=ring(root,1.4,.22,x,1.7,0,C.metal);flywheel.rotation.z=Math.PI/2;}
    const rotor=new T.Group();rotor.position.set(1.75,1.7,0);root.add(rotor);
    for(const angle of [0,Math.PI/3,Math.PI*2/3]){const spoke=box(rotor,.13,2.4,.14,0,0,0,C.metal,0);spoke.rotation.x=angle;}
    const lamp=box(root,1.3,.16,.5,0,3.15,0,mat(SIGNAL.ready,true),0);
    box(root,.14,.14,4.2,0,.1,3.4,C.dark,0);
    relayDrives.push({id,rotor,lamp});floorDetails.push({root,x:c.x,y:c.y-1.5,z:c.z-5.5,radius:3});
  }
  // Large machines stand beside paths, with a visible common furnace at the bottom.
  const furnace=new T.Group();scene.add(furnace);furnace.position.set(0,-56,-8);
  cylinder(furnace,6,1,0,.5,0,C.dark,16);ring(furnace,5.5,.5,0,6.7,0,C.dark);const firebox=cylinder(furnace,4.8,6,0,3.4,0,mat(C.orange,true),16);
  for(let a=0;a<Math.PI*2;a+=Math.PI/4)box(furnace,.65,8,.65,Math.sin(a)*5.3,4,Math.cos(a)*5.3,C.metal);
  floorDetails.push({root:furnace,x:0,y:-56,z:-8,radius:7});
  const clamps=[];for(const x of [-3,3])clamps.push(box(scene,.5,1,3,x,-55.5,0,mat(C.metal)));
  const pumpPlate=box(scene,4,.15,4,64,-7.88,-28,mat(C.orange,true),0);
  for(const [x,y,z]of [[-40,-16,40],[216,-24,108],[234,-8,40]]){
    cylinder(fixed,1.8,4,x,y+2,z,C.dark,12);for(const yy of [1,3])ring(fixed,1.9,.2,x,y+yy,z,C.metal);
  }
  // Discarded compatible chassis physically lead toward the voluntary docking socket.
  for(const [x,z,y]of [[150,2,-40],[84,2,-40],[50,-18,-40]]){
    const wreck=tankModel();wreck.root.position.set(x,y,z);wreck.root.rotation.y=1.8;
    wreck.turret.rotation.z=.3;scene.add(wreck.root);floorDetails.push({root:wreck.root,x,y,z,radius:3});
    wreck.root.traverse(m=>{if(m.isMesh&&m.material.color){m.material=m.material.clone();m.material.color.lerp(new T.Color(C.dark),.7);}});
  }
  const press=new T.Group();press.position.set(-46,-16,40);scene.add(press);
  for(const x of [-5,5])box(press,1.1,x<0?17:12,1.3,x,x<0?8.5:6,0,C.dark);
  box(press,12,1.3,2,0,17,0,C.metal);const ram=box(press,7,2,3,0,8,0,mat(C.metal));
  floorDetails.push({root:press,x:-46,y:-16,z:40,radius:8});
  const pipeLights=[];
  // The same three vertical mains can be seen from optics, the pump and the rig.
  for(const x of [142,146,150]){
    const pipe=box(scene,1.2,57,1.2,x,3,-42,mat(C.dark),0);pipe.material.transparent=true;
    pillars.push({mesh:pipe,x:x-.6,z:-42.6,w:1.2,d:1.2,y:-25.5,h:57});
    for(const y of [-24,-8,24]){const lamp=ring(scene,.7,.12,x,y,-42,mat(C.orange,true));pipeLights.push({lamp,y});}
  }
  const tender=new T.Group();tender.position.set(110,-24,30);scene.add(tender);
  box(tender,1.8,.8,2,0,.5,0,C.metal);const tenderLamp=box(tender,.65,.22,.1,0,1,1,mat(C.dark,true));
  floorDetails.push({root:tender,x:110,y:-24,z:30,radius:2});
  const dish=new T.Group();dish.position.set(204,42,146);scene.add(dish);
  cylinder(dish,.5,5,0,2.5,0,C.dark,12);
  const bowl=new T.Mesh(new T.SphereGeometry(4,16,8,0,Math.PI*2,0,Math.PI/2),new T.MeshToonMaterial({color:C.metal,side:T.DoubleSide}));bowl.position.y=5;bowl.rotation.z=.5;dish.add(bowl);
  floorDetails.push({root:dish,x:204,y:40,z:146,radius:5});
  // Batch scenery within small 3-D cells, preserving independent fade bounds.
  const cells=new Map();
  for(const mesh of [...fixed.children]){
    const key=[mesh.position.x,mesh.position.y,mesh.position.z].map(v=>Math.floor(v/12)).join('/');
    if(!cells.has(key)){const root=new T.Group();root.name=`folded-scenery:${key}`;cells.set(key,root);}
    cells.get(key).add(mesh);
  }
  for(const root of cells.values()){fixed.add(root);batchStatic(root);}
  scene.updateMatrixWorld(true);
  const occluders=[];
  function registerOccluder(root,owner=null,{clone=true,dynamic=false,layered=false,cameraSoft=false}={}){
    const meshes=[],cache=new Map();
    root.traverse(mesh=>{
      if(!mesh.isMesh)return;
      if(cameraSoft)cache.clear();
      const original=Array.isArray(mesh.material)?mesh.material:[mesh.material];
      const materials=original.map(material=>{
        if(!cache.has(material))cache.set(material,clone?material.clone():material);
        const result=cache.get(material);result.transparent=true;if(owner?.floorMark)aperture.apply(result);return result;
      });
      mesh.material=Array.isArray(mesh.material)?materials:materials[0];
      meshes.push({mesh,cameraOpacity:1,cameraBounds:cameraSoft?new T.Box3():null,shadow:mesh.castShadow,materials:materials.map(material=>({material,opacity:material.opacity,depthWrite:material.depthWrite}))});
    });
    const bounds=new T.Box3().setFromObject(root),local=bounds.clone().applyMatrix4(new T.Matrix4().copy(root.matrixWorld).invert());
    if(owner?.model){
      const radius=Math.hypot(Math.max(Math.abs(local.min.x),Math.abs(local.max.x)),Math.max(Math.abs(local.min.z),Math.abs(local.max.z)));
      local.min.x=local.min.z=-radius;local.max.x=local.max.z=radius;
    }
    if(owner?.shutter)local.max.y+=1.5;
    if(owner?.arms)bounds.max.y+=.7;
    occluders.push({root,owner,meshes,local,bounds,dynamic,layered,cameraSoft,opacity:1});
  }
  for(const wall of walls)registerOccluder(wall.mesh,wall,{dynamic:true});
  for(const object of [...controls,...hives,...pickups,...lifts,...floorDetails,...mirrors])registerOccluder(object.root,object,{dynamic:object.stops!==undefined||mirrors.includes(object),cameraSoft:hives.includes(object)||controls.includes(object)||pickups.includes(object),layered:controls.includes(object)||hives.includes(object)||pickups.includes(object)});
  for(const object of pillars)registerOccluder(object.mesh,object);
  for(const root of cells.values())registerOccluder(root);
  for(const b of belts)for(const segment of b.segments)registerOccluder(segment.root,segment);
  for(const mesh of [wheel,pumpPlate,...clamps,...pipeLights.map(p=>p.lamp),...relayFeeds.flatMap(f=>f.lamps)])registerOccluder(mesh,null,{dynamic:true});
  for(const enemy of enemies){
    registerOccluder(enemy.model.root,enemy,{clone:false,dynamic:true,layered:true});
    for(const part of enemy.parts)registerOccluder(part.root,part,{dynamic:true,layered:true});
  }
  const sight=new T.Ray(),sightDirection=new T.Vector3(28,39.6,28).normalize(),sightPoint=new T.Vector3(),sightBounds=new T.Box3();
  function updateOcclusion(dt,p){
    sight.origin.set(p.x,p.y+1.3,p.z);sight.direction.copy(sightDirection);
    for(const object of occluders){
      if(object.dynamic){object.root.updateWorldMatrix(true,false);object.bounds.copy(object.local).applyMatrix4(object.root.matrixWorld);}
      sightBounds.copy(object.bounds);sightBounds.min.x-=1.6;sightBounds.max.x+=1.6;sightBounds.min.z-=1.6;sightBounds.max.z+=1.6;
      // Same-floor enemies remain legible threats; tall scenery can still cover the hull.
      const eligible=object.owner?.model||object.owner?.enemy||object.owner?.arms?Math.abs(object.owner.y-p.y)>3:true;
      const hit=eligible&&sightBounds.max.y>p.y+2.4&&sight.intersectBox(sightBounds,sightPoint);
      const distance=hit?sightPoint.distanceTo(sight.origin):Infinity;
      const obscures=!!hit&&distance>1.8&&distance<58;
      const ground=object.owner?.ground??(object.owner?.kind?object.owner.y-1.3:object.owner?.y);
      const otherFloor=object.layered&&Math.abs(ground-p.y)>3;
      const targetOpacity=thirdPerson?1:obscures?(object.owner?.h&&!object.owner?.mass&&Math.abs(object.owner.y-p.y)<3?.36:.14):otherFloor?.28:1;
      object.opacity=T.MathUtils.damp(object.opacity,targetOpacity,10,dt);if(Math.abs(object.opacity-targetOpacity)<.001)object.opacity=targetOpacity;
      object.root.userData.cutaway=obscures&&object.opacity<.4;if(object.owner)object.owner.opacity=object.opacity;
      if(thirdPerson&&object.cameraSoft)continue;
      if(object.lastOpacity===object.opacity)continue;
      for(const {mesh,shadow,materials}of object.meshes){
        mesh.castShadow=shadow&&object.opacity===1;
        for(const {material,opacity,depthWrite}of materials){material.opacity=opacity*object.opacity;material.depthWrite=depthWrite&&object.opacity===1;}
      }
      object.lastOpacity=object.opacity;
    }
  }
  scene.updateMatrixWorld(true);
  const cameraFloors=surfaces.map(s=>({mesh:s.mesh,bounds:new T.Box3().setFromObject(s.mesh)}));
  function cameraDistance(origin,direction,distance){
    raycaster.set(origin,direction);raycaster.far=distance;
    let nearest=presentation.cast(origin,direction,distance)?.distance??distance;
    const probe=mesh=>{const hit=raycaster.intersectObject(mesh,false)[0];if(hit)nearest=Math.min(nearest,hit.distance);};
    for(const floor of cameraFloors)if(raycaster.ray.intersectsBox(floor.bounds))probe(floor.mesh);
    for(const object of occluders){
      if(object.cameraSoft||object.owner?.model||object.owner?.enemy||!object.root.visible||!raycaster.ray.intersectsBox(object.bounds))continue;
      if(object.owner?.id&&walls.includes(object.owner)&&!activeSolid(object.owner,state))continue;
      for(const {mesh}of object.meshes){
        let visible=true;for(let parent=mesh;parent;parent=parent.parent)if(!parent.visible){visible=false;break;}
        if(visible)probe(mesh);
      }
    }
    return nearest;
  }
  function setThirdPerson(value){
    thirdPerson=value;aperture.enable(!value);presentation.setView(value);
    floorMeshes.visible=!value;floorBatches.visible=value;
    floorTrimMeshes.visible=!value;floorTrimBatches.visible=value;
    for(const material of floorMaterials.values()){material.transparent=!value;material.depthWrite=value;material.needsUpdate=true;}
    for(const object of occluders){object.opacity=1;object.lastOpacity=undefined;}
  }
  const cameraTarget=new T.Vector3();
  function updateCameraOcclusion(camera,p,dt){
    if(!thirdPerson)return;
    cameraTarget.set(p.x,p.y+1.6,p.z);
    for(const object of occluders){
      if(!object.cameraSoft)continue;
      for(const part of object.meshes){
        const {mesh,cameraBounds,materials,shadow}=part;
        cameraBounds.setFromObject(mesh);
        // Keep the floor pad visible; only the actual obstruction fades.
        const target=cameraBounds.max.y<p.y+.5?1:cameraPropOpacity(cameraBounds,camera.position,cameraTarget);
        part.cameraOpacity=p.endingTime>2.5?1:target<part.cameraOpacity?target:T.MathUtils.damp(part.cameraOpacity,target,8,dt);
        if(part.cameraOpacity>.999)part.cameraOpacity=1;
        mesh.castShadow=shadow&&part.cameraOpacity===1;
        for(const {material,opacity,depthWrite}of materials){material.opacity=opacity*part.cameraOpacity;material.depthWrite=depthWrite&&part.cameraOpacity===1;}
      }
    }
  }
  function pulseHive(id,kind='repair'){
    const hive=hives.find(h=>h.id===id);if(!hive)return;
    hive.pulse=kind==='respawn'?2.4:1.8;hive.pulseKind=kind;
  }

  function cast(origin,direction,distance,{targets=true,aiming=false,extras=[]}={}){
    raycaster.set(origin,direction);raycaster.far=distance;
    const meshes=[...surfaces.map(s=>s.mesh),...walls.filter(w=>activeSolid(w,state)&&(!aiming||w.opacity>.4)).map(w=>w.mesh),...lifts.filter(l=>!aiming||!l.root.userData.cutaway).map(l=>l.mesh),...mirrors.filter(m=>!aiming||!m.root.userData.cutaway).map(m=>m.mesh)];
    let hit=raycaster.intersectObjects(meshes,false).find(h=>!aiming||thirdPerson||!h.object.userData.aperture||apertureOpacity(h.point,viewPlayer,sightDirection)>APERTURE_AIM_THRESHOLD)||null;if(hit?.object.userData.mirror)hit.mirror=hit.object.userData.mirror;
    const structure=presentation.cast(origin,direction,distance,aiming);if(structure&&(!hit||structure.distance<hit.distance))hit=structure;
    if(targets)for(const t of [...controls.filter(c=>!['use','dock'].includes(c.kind)&&!state[c.id]),...enemies.filter(e=>e.hp>0),...enemies.filter(e=>e.hp>0).flatMap(e=>e.parts.filter(p=>p.hp>0)),...extras.filter(t=>!t.disarmed)]){
      const point=new T.Vector3(t.x,t.y+(t.model?1.5:0),t.z);
      if(aiming&&(t.root?.userData.cutaway||t.model?.root.userData.cutaway))continue;
      if(aiming&&(t.model&&!t.readable||t.enemy&&!t.enemy.readable))continue;
      const intersection=raycaster.ray.intersectSphere(new T.Sphere(point,t.radius),new T.Vector3());
      if(intersection){const d=intersection.distanceTo(origin);if(d<=distance&&(!hit||d<hit.distance))hit={point:intersection,distance:d,target:t};}
    }
    return hit;
  }
  function update(dt,time,p,camera=null){
    if(camera&&!thirdPerson)camera.getWorldDirection(sightDirection).negate();
    Object.assign(viewPlayer,{x:p.x,y:p.y,z:p.z});aperture.update(p,sightDirection);
    presentation.sight(p,sightDirection);presentation.update(time,p,state);
    for(const s of surfaces)s.opacity=thirdPerson?1:apertureOpacity(s.mesh.position,p,sightDirection);
    for(const w of walls){w.open=T.MathUtils.damp(w.open,activeSolid(w,state)?0:1,9,dt);w.mesh.position.y=w.y+w.h/2-w.open*(w.h+.5);w.mesh.visible=!w.invisible&&w.open<.999;w.mesh.updateMatrixWorld();}
    for(const c of controls){
      c.flash=Math.max(0,c.flash-dt);
      const aligned=state[c.id]||c.id!=='brake'||Math.abs(lifts.find(l=>l.id==='carrier').y-16)<.15,engaged=!!state[c.id];
      c.engaged=T.MathUtils.damp(c.engaged,engaged?1:0,8,dt);
      c.lamp.material.color.setHex(!aligned?C.dark:c.flash?C.lightYellow:engaged?SIGNAL.open:c.kind==='magnet'?SIGNAL.magnet:SIGNAL.ready);
      if(c.cover)c.cover.position.y=T.MathUtils.damp(c.cover.position.y,aligned?1.4:0,12,dt);
      if(c.kind==='magnet'){c.moving.position.y=c.engaged*.55;if(state[c.id])c.moving.position.z=T.MathUtils.damp(c.moving.position.z,0,8,dt);}
      else if(c.kind==='laser'||c.kind==='use')c.moving.rotation.z=c.engaged*Math.PI*.55;
      else c.moving.position.z=-c.engaged*.3-(c.flash?Math.sin(c.flash*24)*.08:0);
    }
    for(const m of mirrors){m.flash=Math.max(0,(m.flash||0)-dt);m.mesh.material.color.setHex(m.flash?C.lightYellow:0xd3eee4);}
    for(const m of mirrors)if(m.index){const desired=new T.Vector3(...(state[m.index]?m.rotated:m.n)).normalize();m.normal.lerp(desired,1-Math.exp(-dt*5)).normalize();m.root.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),m.normal);m.root.updateMatrixWorld();}
    for(const l of lifts){l.root.position.y=l.y;l.root.updateMatrixWorld();}
    for(const p of pickups){p.root.visible=!p.requires||!!state[p.requires];p.item.visible=!state[p.id];p.halo.material.color.setHex(state[p.id]?C.dark:C.yellow);p.item.position.y=Math.sin(time*2)*.15;p.item.rotation.y=time*.35;}
    for(const h of hives){
      h.root.visible=!h.requires||!!state[h.requires];h.pulse=Math.max(0,h.pulse-dt);
      const nearby=Math.abs(p.y-h.y)<2&&Math.hypot(p.x-h.x,p.z-h.z)<6,active=state.anchor===h.id;
      h.proximity=T.MathUtils.damp(h.proximity,nearby?1:0,5,dt);
      const work=h.pulse>0?Math.sin((1-h.pulse/(h.pulseKind==='respawn'?2.4:1.8))*Math.PI):0;
      for(const {pivot,side}of h.arms)pivot.rotation.z=side*(.55-h.proximity*.4-work*.55);
      h.halo.scale.setScalar(1+Math.sin(time*2)*.025+h.proximity*.08);
      h.halo.material.color.setHex(active||nearby?C.mint:C.metal);
      h.scan.position.y=.25+(h.pulse>0?(((h.pulseKind==='respawn'?2.4:1.8)-h.pulse)*1.8%1)*2.4:0);h.scan.scale.setScalar(h.pulse>0?1+work*.3:.95+Math.sin(time*2)*.04);
      h.scan.visible=nearby||h.pulse>0;
      for(const lamp of h.lamps)lamp.material.color.setHex(h.pulse>0?C.lightYellow:active||nearby?C.mint:C.metal);
    }
    const matrix=new T.Matrix4(),rollerSpin=new T.Quaternion(),rollerAxis=new T.Vector3(0,1,0);
    for(const b of belts){
      if(Math.hypot(p.x-b.x-b.w/2,p.z-b.z-b.d/2)>80+b.length/2)continue;
      const part=b.id.includes('feed-')?(b.id.endsWith('left')?0:1):null,owner=b.id.startsWith('foundry')?'foundry':'keeper',working=part===null||enemies.find(e=>e.id===owner).parts[part].hp>0;
      if(working)b.phase+=dt*Math.hypot(b.vx,b.vz)*Math.sign(b.vx||b.vz)*b.stretch;
      for(const segment of b.segments){
        const {mesh,count,travel}=segment;
        for(let i=0;i<count;i++){
          const along=((i*travel/count+b.phase)%travel+travel)%travel-travel/2;
          matrix.makeTranslation(b.horizontal?along:0,.15,b.horizontal?0:along);mesh.setMatrixAt(i,matrix);
        }
        mesh.instanceMatrix.needsUpdate=true;
        rollerSpin.setFromAxisAngle(rollerAxis,-b.phase/.22);
        for(const roller of segment.rollers)roller.quaternion.copy(roller.userData.mount).multiply(rollerSpin);
      }
    }
    for(const feed of relayFeeds)for(const lamp of feed.lamps)lamp.material.color.setHex(state[feed.id]?SIGNAL.open:SIGNAL.ready);
    for(const feed of [...controlFeeds,...gateSignals])for(const lamp of feed.lamps)lamp.material.color.setHex(state[feed.id]?SIGNAL.open:SIGNAL.ready);
    for(const drive of relayDrives){if(state[drive.id])drive.rotor.rotation.x+=dt*1.8;drive.lamp.material.color.setHex(state[drive.id]?SIGNAL.open:SIGNAL.ready);}
    pumpPlate.material.color.setHex(p.pumpPressure>=.8||state.pump?SIGNAL.open:SIGNAL.ready);
    for(const e of enemies)for(const part of e.parts){if(part.shutter)part.shutter.position.y=T.MathUtils.damp(part.shutter.position.y,e.phase==='vent'?3.2:1.7,10,dt);part.lamp.material.color.setHex(part.hp?C.orange:C.dark);part.root.visible=e.hp>0;}
    const glow=p.endingTime?Math.min(1,p.endingTime/7):.08;firebox.material.color.setRGB(.4+glow*.6,.15+glow*.65,.04+glow*.3);
    clamps.forEach((m,i)=>m.position.x=(i?1:-1)*(3-Math.min(1,p.dockHold/2||0)*1.3));
    ram.position.y=8+Math.sin(time*.75)*2.5;
    tenderLamp.material.color.setHex(state.maintenance||p.endingTime?C.mint:C.dark);tender.position.x=110+(state.maintenance?Math.sin(time*.25):0);
    for(const {lamp,y}of pipeLights)lamp.material.color.setHex(p.endingTime||state.pump&&y===-8||state['pressure-return']&&y===-24?C.mint:C.orange);
    const signalPhase=p.endingTime?Math.max(0,p.endingTime-4.8)*2:time%9;
    bowl.rotation.y=state.signal||p.endingTime?signalPhase<.65?0:signalPhase<1.5?(signalPhase-.65)/.85*.35:signalPhase<7.5?.35:(9-signalPhase)/1.5*.35:0;
    wheel.rotation.z=Math.sin(time*.08)*.06;
    waterTexture.offset.x=time*.015;
    updateOcclusion(dt,p);
    scene.updateMatrixWorld();
    if(camera)updateCameraOcclusion(camera,p,dt);
  }
  return {surfaces,walls,controls,hives,pickups,lifts,enemies,wheel,mirrors,belts,occluders,presentation,pulseHive,cast,update,cameraDistance,setThirdPerson,updateCameraOcclusion};
}

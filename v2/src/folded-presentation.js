import {makeRegionalScenery,makeRegionalLights} from './folded-regional-scenery.js';
import {currentVelocity} from './folded-mechanisms.js';
import {makeCityBackdrop} from './folded-backdrop.js';
import {cityMaterials} from './folded-materials.js';
import {makeFinalMachinery} from './folded-final-machinery.js';
import {makeDistrictMachinery,makeWorkingDistricts} from './folded-district-machinery.js';
import {expansionCurrents,expansionDecks} from './folded-expansion-layout.js';
import * as T from 'three';
import {box,cylinder,ring,mat,batchStatic} from './world.js';
import {REGION_STYLE,regionAt} from './folded-architecture.js';
import {foldedArchitecture,architectureGrid,foldedDecks,foldedLiftDefs} from './folded-layout.js';
import {cameraApertureOpacity,apertureOpacity,APERTURE_AIM_THRESHOLD,STRUCTURE_APERTURE_RADIUS as ARCHITECTURE_APERTURE} from './folded-visibility.js';

export function makeCityPresentation(scene,aperture){
  const architecture=new T.Group(),depth=new T.Group(),scenery=new T.Group();
  architecture.name='city-architecture';depth.name='city-architecture-depth';scenery.name='city-history';scene.add(architecture,depth,scenery);
  const materials=new Map(),colliders=new Map(),point=new T.Vector3(),ray=new T.Ray();let third=false;
  const surfaces=cityMaterials();
  const backdrop=makeCityBackdrop(scene,aperture,foldedDecks,foldedLiftDefs);
  // Keep the independently batched color pass in front of its depth prepass.
  const depthMaterial=new T.MeshBasicMaterial({polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});aperture.apply(depthMaterial,{depthOnly:true,radius:ARCHITECTURE_APERTURE});
  function material(region,part){
    const key=`${region}/${part}`;if(materials.has(key))return materials.get(key);
    // Ceilings use a baked ambient colour; avoid lighting each translucent roof layer.
    const m=part==='roof'?new T.MeshBasicMaterial({color:new T.Color(REGION_STYLE[region].roof).multiplyScalar(1.12)}):new T.MeshToonMaterial({color:REGION_STYLE[region][part],shadowSide:T.FrontSide,...(part==='wall'?surfaces[REGION_STYLE[region].surface]:{})});aperture.apply(m,{radius:ARCHITECTURE_APERTURE});materials.set(key,m);return m;
  }
  for(const s of foldedArchitecture.solids){
    const part=['wall','foundation','lintel','buttress'].includes(s.kind)?'wall':s.kind==='roof'?'roof':'frame';
    const mesh=box(architecture,s.w,s.h,s.d,s.x+s.w/2,s.y+s.h/2,s.z+s.d/2,material(s.region,part),0);
    mesh.name=s.id;mesh.castShadow=mesh.receiveShadow=s.kind!=='roof';
    if(part==='wall'){
      const g=mesh.geometry.clone(),pos=g.attributes.position,uv=g.attributes.uv;
      for(let i=0;i<pos.count;i++)uv.setXY(i,(s.w>s.d?pos.getX(i)+s.x:pos.getZ(i)+s.z)/8,(pos.getY(i)+s.y)/4);
      mesh.geometry=g;
    }
    const prepass=new T.Mesh(mesh.geometry,depthMaterial);prepass.position.copy(mesh.position);depth.add(prepass);
    colliders.set(s,new T.Box3(new T.Vector3(s.x,s.y,s.z),new T.Vector3(s.x+s.w,s.y+s.h,s.z+s.d)));
    // Frames, drip caps and foundations give even a cut-away wall its construction.
    if(s.kind==='wall'||s.kind==='lintel')box(architecture,s.w+.12,.12,s.d+.12,s.x+s.w/2,s.y+s.h+.04,s.z+s.d/2,material(s.region,'frame'),0);
    if(s.kind==='roof'){const beam=box(architecture,.22,.45,s.d,s.x+.2,s.y-.2,s.z+s.d/2,material(s.region,'frame'),0);beam.castShadow=beam.receiveShadow=false;}
  }
  batchStatic(architecture,{preserveGeometry:true});batchStatic(depth,{preserveGeometry:true});
  for(const root of [architecture,depth]){root.updateWorldMatrix(true,true);root.traverse(o=>{o.matrixAutoUpdate=false;o.matrixWorldAutoUpdate=false;});}
  // The excavation walls sit beyond every playable floor, anchoring the city in earth.
  const rock=mat(0x53615a),iron=mat(0x384c49),pale=mat(0xa8ada0),copper=mat(0xa98b69);
  const lightSources=makeRegionalScenery(scenery,foldedArchitecture.rooms,foldedArchitecture.solids);
  lightSources.push({x:-4,y:-3,z:38,ground:-8,color:0xffa35c,intensity:110},{x:0,y:-49,z:-8,ground:-56,color:0xffa35c,intensity:150});
  const localLights=makeRegionalLights(scene,lightSources);
  const hot=mat(0xffaf62,true);box(scenery,8,3.4,.12,-4,-5,34.05,hot,0);
  for(const x of [-8,-6,-4,-2,0])box(scenery,.22,3.8,.25,x,-5,34.2,iron,0);
  // District machines occupy authored work positions, rather than the same
  // decorative strip behind every room. Their bounds are in the level layout.
  makeDistrictMachinery(scenery);
  // Supported transit bridge, visible from the water and the later roof route.
  for(const x of [-8,8]){
    box(scenery,.65,2.5,60,x,-2,-2,iron,0);
    for(let z=-26;z<30;z+=10){const brace=box(scenery,.25,3,6,x,-3,z,iron,0);brace.rotation.x=.4;}
  }
  // Greenhouse remnants and waterlines on the basin's retaining face.
  for(let x=33;x<62;x+=7){
    for(const z of [11,29])box(scenery,.18,8,.18,x,-4,z,iron,0);
    const beam=box(scenery,.18,.18,18,x,.1,20,pale,0);beam.rotation.x=x%2?.06:-.03;
  }
  for(const y of [-15.8,-13.2,-10.4])box(scenery,27,.11,.12,46.5,y,29.05,pale,0);
  for(let x=34;x<62;x+=6){
    box(scenery,3,.6,1.4,x,-8.4,29.5,rock,0);
    for(let j=0;j<3;j++){const leaf=box(scenery,.15,.8+j*.2,.55,x+j*.6-1,-7.8,29.5,mat(0x6f8865),0);leaf.rotation.z=(j-1)*.5;}
  }
  // Test failures are large readable assemblies, placed off the supported benches.
  for(const [x,z,kind]of [[71,-29,'mount'],[83,-29,'cooling'],[98,-29,'rail']]){
    const root=new T.Group();root.position.set(x,0,z-1.5);scenery.add(root);
    box(root,4,.6,2.3,0,.3,0,iron,.15);for(const side of [-1,1])box(root,.75,.7,2.8,side*1.6,.65,0,iron,.15);
    const hull=box(root,2.6,1,1.7,0,1.1,0,pale,.2);hull.rotation.z=kind==='mount'?.3:0;
    const engine=cylinder(root,.65,1.5,0,1.8,0,copper,12);engine.rotation.x=Math.PI/2;
    if(kind==='mount'){box(root,.2,2,.2,-2,1.1,0,iron,0).rotation.z=-.5;box(root,.2,1.3,.2,2,.75,0,iron,0).rotation.z=.6;}
    if(kind==='cooling')for(const side of [-1,1])box(root,.4,1.5,.4,side*1.4,1.5,-.3,mat(0x4f625a),0).rotation.z=side*.4;
    if(kind==='rail')for(const side of [-1,1])box(root,.2,.3,5,side*1.4,.1,0,iron,0);
  }
  // Original floor circuitry now belongs to a connected return pipe manifold.
  for(const x of [202,205]){
    box(scenery,.7,.7,106,x,-10,54,iron,0);
    box(scenery,.7,20,.7,x,-17,103,iron,0);
    box(scenery,9,.7,.7,x+4.5,-26,103,iron,0);
    for(let z=6;z<103;z+=9)ring(scenery,.5,.1,x,-10,z,copper).rotation.x=0;
  }
  // Three retired service bays leave the through-rail clear. Their hardware
  // repeats the player's mount, cooling jacket and final docking socket.
  for(const [x,z,kind]of [[76,50,'mount'],[98,25,'cooling'],[82,-6.5,'dock']]){
    const bay=new T.Group();bay.position.z=z+6.5;scenery.add(bay);
    for(const side of [-1,1]){
      box(bay,.22,.08,11,x+side*2,-39.92,-5.5,pale,0);
      box(bay,.8,8,.8,x+side*10.7,-36,-12.5,iron,0);
    }
    box(bay,22,1,1,x,-32,-12.5,rock,0);
    if(kind==='mount')for(const side of [-1,1]){
      box(bay,.45,4,.6,x+side*3,-38,-8,iron,0);
      box(bay,2,.3,.6,x+side*2.2,-36.2,-8,copper,0);
    }
    if(kind==='cooling')for(const side of [-1,1])for(const z of [-9,-7,-5])cylinder(bay,.38,2,x+side*2.5,-38.9,z,copper,8);
    if(kind==='dock')for(const side of [-1,1])box(bay,.5,1,3,x+side*3,-39.5,-6.5,copper,0);
    box(bay,6,.18,.4,x,-34,-12.2,mat(0xbfb69b,true),0);
  }
  for(const x of [-30,30])for(const z of [18,38,58]){box(scenery,3,23,4,x,-45,z,rock,0);box(scenery,4,1,5,x,-33.5,z,copper,0);}
  // Small mechanisms share the same animation clock as their environmental sounds.
  const moving=new T.Group();moving.name='city-working-machines';scene.add(moving);
  const districts=makeWorkingDistricts(scenery,moving);
  const currents=[];
  for(const c of expansionCurrents)for(let n=0;n<Math.max(c.w,c.d)/8;n++){
    const m=box(moving,1.4,.035,.15,0,c.y+.08,0,mat(0xc3ded0,true),0);currents.push({m,c,n,phase:n*8});
  }
  const carrier=new T.Group();moving.add(carrier);
  box(carrier,4,.6,5,0,0,0,pale,.2);const jaws=[-1,1].map(s=>box(carrier,.35,1.4,3,s*1.6,.7,0,iron,0));
  for(const x of [-2,2]){
    box(scenery,.35,.35,44,x,9.3,-2,iron,0);
    for(const z of [-1.8,1.8]){box(carrier,.12,2,.12,x,1,z,iron,0);cylinder(carrier,.3,.3,x,2,z,pale,10).rotation.z=Math.PI/2;}
  }
  for(const z of [-17,8]){box(scenery,.5,9,.5,-11,4.5,z,iron,0);box(scenery,.5,9,.5,11,4.5,z,iron,0);box(scenery,23,.6,.7,0,9,z,iron,0);}
  const cargo=new T.Group();carrier.add(cargo);
  box(cargo,2,.6,2,0,.75,0,copper,.1);ring(cargo,.55,.16,0,1.2,0,iron);
  for(const x of [-1.1,1.1])box(cargo,.45,.55,2.4,x,.7,0,iron,.1);
  const repairer=new T.Group();repairer.position.set(-20,0,25);moving.add(repairer);
  box(repairer,2,.6,2,0,.4,0,iron,.2);const repairArm=box(repairer,.18,1.7,.18,.8,1.3,0,pale,0),eye=box(repairer,.6,.2,.1,0,1,1,mat(0xbcbca4,true),0);
  const brokenRail=box(moving,.25,.3,5,-18,.5,25,pale,0);
  const pumpFans=[];
  for(const [x,y,z]of [[67,-3.5,-35.6],[83,-3.5,-35.6],[216,-20,138],[236,-20,138]]){
    const root=new T.Group();root.position.set(x,y,z);moving.add(root);
    if(y===-3.5)box(scenery,4.6,4.6,.3,x,y,z-.25,iron,.15);
    ring(root,1.8,.3,0,0,0,iron).rotation.x=0;
    const rotor=new T.Group();root.add(rotor);for(let i=0;i<4;i++){const vane=box(rotor,.45,2.9,.2,0,0,0,pale,0);vane.rotation.z=i*Math.PI/4;}pumpFans.push(rotor);
  }
  box(scenery,13,.4,1.2,77,-7.8,-35.3,rock,0);
  for(const x of [67,83])box(scenery,.3,.3,2.1,x,-5.2,-36,iron,0);
  const waterFlow=box(moving,12,.08,.6,77,-7.56,-35.3,mat(0xa8b7a0,true),0);
  const waterRipples=Array.from({length:5},()=>box(moving,.12,.025,.48,77,-7.5,-35.3,mat(0xe2ecda,true),0));
  const opticalPulse=box(moving,.18,.18,22,204,48,162,mat(0xe3d1a5,true),0);opticalPulse.visible=false;
  const pipeFlow=[];
  for(const x of [142,146,150])for(let y=-24;y<=24;y+=8){const m=ring(moving,.73,.08,x,y,-42,mat(0x9aaf96,true));pipeFlow.push(m);}
  const oldEye=box(moving,.4,.15,.15,98,-37.8,26.3,mat(0x8c8873,true),0);
  const endingSprout=box(moving,.3,.8,.3,50,-7.4,29.5,mat(0x95aa75),0);
  const finale=makeFinalMachinery(scenery,moving);
  // Static scenery is batched; the small working mechanisms keep their own transforms.
  const visualMaterials=new Set(materials.values()),sceneryMaterials=new Set();
  for(const root of [scenery,moving])root.traverse(m=>{if(m.isMesh){m.castShadow=false;m.receiveShadow=true;aperture.apply(m.material);m.material.depthWrite=true;sceneryMaterials.add(m.material);visualMaterials.add(m.material);}});
  batchStatic(scenery,{preserveGeometry:true});
  const bounds=()=>({solids:colliders.size,rooms:foldedArchitecture.rooms.length});
  let frameRegion='foundry',previousTime=0,signalTime=-Infinity,signalWasOn=false,initialized=false;
  function update(time,p,state){
    districts.update(time,state);backdrop.update(time,p,state);localLights.update(time,p);
    frameRegion=expansionDecks.find(d=>d.region&&Math.abs(d.y-p.y)<.5&&p.x>=d.x&&p.x<=d.x+d.w&&p.z>=d.z&&p.z<=d.z+d.d)?.region||regionAt(p,foldedArchitecture.rooms);
    const flowDt=Math.min(.1,Math.max(0,time-previousTime));previousTime=time;
    for(const item of currents){
      const {m,c,n}=item,v=currentVelocity(c,state),length=v.x?c.w:c.d;
      item.phase=(item.phase+Math.hypot(v.x,v.z)*flowDt)%length;
      m.position.x=v.x?c.x+(v.x>0?item.phase:c.w-item.phase):c.x+c.w/2+Math.sin(n)*4;
      m.position.z=v.z?c.z+(v.z>0?item.phase:c.d-item.phase):c.z+c.d/2;
      m.rotation.y=v.x?Math.PI/2:0;
    }
    const cycle=p.endingTime?4+Math.max(0,p.endingTime-9)/3:time%18,travel=cycle<6?cycle/6:cycle<11?1:(18-cycle)/7;
    carrier.position.set(0,7,-22+travel*40);
    jaws.forEach((m,i)=>m.position.x=(i?1:-1)*(cycle>6&&cycle<11?2.1:1.6));
    cargo.visible=!!state['rail-repair'];
    const repaired=state['rail-repair'];
    repairArm.rotation.z=-.45+Math.sin(time*(repaired?1.4:2.4))*(repaired?.35:.65);
    eye.material.color.setHex(repaired?0xc5c9ac:0x827f6c);brokenRail.rotation.x=repaired?0:.22;
    pumpFans.forEach((m,i)=>m.rotation.z=time*(state[i<2?'pump':'circulation']?2: .22+.08*Math.sin(time*.7+i)));
    hot.color.setHex(state.foundry?0xc77b44:0xffaf62);
    waterFlow.visible=!!state.pump;waterFlow.scale.x=.85+Math.sin(time*2)*.05;waterRipples.forEach((m,i)=>{m.visible=!!state.pump;m.position.x=71+(i*2.4+time*2)%12;});
    if(initialized&&state.signal&&!signalWasOn)signalTime=time;
    signalWasOn=!!state.signal;initialized=true;
    const signalPhase=time-signalTime;
    opticalPulse.visible=!!state.signal&&signalPhase<.65;opticalPulse.scale.z=.8+signalPhase*.4;
    for(let i=0;i<pipeFlow.length;i++){const m=pipeFlow[i],active=state.circulation||state.endingSeen||state.pump&&m.position.y===-8;m.visible=!!active;m.material.color.setHex((time*2+i)%4<1?0xb7c4a3:0x748d80);}
    oldEye.material.color.setHex(state.endingSeen?0xcac5a1:0x575749);endingSprout.visible=!!state.pump;
    carrier.visible=true;
  }
  function cast(origin,direction,distance,aiming=false){
    ray.set(origin,direction);let hit=null;
    for(const s of architectureGrid.ray(origin,direction,distance)){
      const b=colliders.get(s);if(!b||!ray.intersectBox(b,point))continue;
      const d=point.distanceTo(origin);if(d>distance||hit&&d>=hit.distance)continue;
      if(aiming&&(third?cameraApertureOpacity(point,viewPlayer,viewCamera):apertureOpacity(point,viewPlayer,viewDirection,ARCHITECTURE_APERTURE))<=APERTURE_AIM_THRESHOLD)continue;
      hit={point:point.clone(),distance:d,architecture:s};
    }return hit;
  }
  const viewCamera=new T.Vector3(),viewPlayer=new T.Vector3(),viewDirection=new T.Vector3();
  return {update,cast,bounds,carrier,pumpFans,finale,backdrop,localLights,get region(){return frameRegion;},
    setCamera(c){viewCamera.copy(c);},setView(value){third=value;backdrop.setView(value);depth.visible=true;for(const m of visualMaterials){m.transparent=true;m.depthWrite=sceneryMaterials.has(m);m.needsUpdate=true;}},
    sight(p,d){viewPlayer.set(p.x,p.y,p.z);viewDirection.copy(d);}
  };
}

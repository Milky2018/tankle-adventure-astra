import * as T from 'three';
import {tankModel,box,cylinder,ring,mat,C} from './factory-models.js';
import {SIGNAL} from './visibility.js';
import {batchRigidParts} from './rigid-batching.js';
import {ENEMY_VARIANTS} from '../combat/enemy-rules.js';
import {SORTER_REACH} from '../combat/attacks.js';

export function prepareEnemyMaterials(model,{batching=true}={}){
  if(batching)batchRigidParts(model.root,[...model.tracks,...(model.moving||[]),...(model.flow?.children||[]),model.arm,model.frontArmor,model.radiator]);
  const owned=new Set(model.phaseMaterials),copies=new Map(),materials=[];
  model.root.traverse(mesh=>{
    if(!mesh.isMesh||!mesh.material.color)return;
    const source=mesh.material;
    if(!copies.has(source)){
      // Phase materials are already model-local and retained by animation closures.
      const m=owned.has(source)?source:source.clone();
      copies.set(source,m);materials.push({m,color:m.color.clone()});
    }
    mesh.material=copies.get(source);
  });
  return materials;
}

const impactTint=new T.Color();
export function animateEnemy(enemy,view,time,dt,active){
  for(const {m,color}of view.materials)m.color.copy(color);
  view.model.animate(enemy.phase,enemy.timer,time,dt,active);
  if(enemy.flash||enemy.armor){
    impactTint.setHex(enemy.armor?C.lightYellow:0xffffff);
    for(const {m}of view.materials)m.color.lerp(impactTint,.65);
  }
}

export { ENEMY_KINDS, woundedAlly } from '../combat/enemy-rules.js';

export function foldedEnemyModel(type,variant){
  if(variant){
    const model=foldedEnemyModel(type),v=ENEMY_VARIANTS[variant];
    for(const side of [-1,1]){
      box(model.body,.22,.5,1.8,side*1.05,1.1,-.15,v.color,0);
      if(variant==='interceptor')box(model.body,.28,.4,1.1,side*.8,.9,1.5,v.color,0);
      if(variant==='bastion')box(model.body,.4,1.1,2,side*1.4,1.1,0,v.color,0);
      if(variant==='siege'){
        const tube=cylinder(model.turret,.4,1.9,side*.95,1.8,.25,v.color,10);tube.rotation.x=.38;
        ring(model.turret,.43,.1,side*.95,2.65,.55,C.yellow);
      }
      if(variant==='prism')box(model.turret,.25,2.6,.4,side*1.55,1.6,1,v.color,0);
      if(variant==='flanker')box(model.turret,.18,.8,.18,side*.7,1.8,-.5,v.color,0);
    }
    return model;
  }
  if(['scout','turret','guard','elite','boss'].includes(type))return tankModel(type);
  const root=new T.Group(),body=new T.Group(),turret=new T.Group(),barrel=new T.Group();root.add(body,turret);turret.add(barrel);
  const tracks=[],moving=[],lamp=mat(C.orange,true);
  const wheel=(x,z,r=.38)=>{const w=cylinder(body,r,.2,x,.45,z,C.track,10);w.rotation.z=Math.PI/2;tracks.push(w);};
  let arm=null,armSignal=null,driveShutter=null,frontArmor=null,flow=null,wake=null,impeller=null;const jaws=[];
  if(type==='hunter'||type==='dredger'){
    const heavy=type==='dredger',width=heavy?1.35:.95;
    for(const x of [-width,width]){
      box(body,.65,.65,heavy?3.6:3.2,x,.45,0,heavy?0x9c9676:0x587d79,.28);
      for(const z of [-.9,.9])wheel(x,z,.32);
      const jet=cylinder(body,.24,.55,x,.55,-1.7,C.dark,10);jet.rotation.x=Math.PI/2;
    }
    box(body,heavy?2.1:1.5,.6,2.4,0,.95,0,C.metal,.2);
    if(heavy){
      const mouth=cylinder(turret,1.1,.65,0,1.25,1.25,C.dark,16);mouth.rotation.x=Math.PI/2;
      ring(turret,1.1,.16,0,1.25,1.65,C.metal).rotation.x=Math.PI/2;
      impeller=new T.Group();impeller.position.set(0,1.25,1.7);turret.add(impeller);moving.push(impeller);
      for(let i=0;i<4;i++){const tooth=box(impeller,.22,1.5,.12,0,0,0,C.orange,0);tooth.rotation.z=i*Math.PI/4;}
      for(const side of [-1,1]){const jaw=box(turret,.3,1.6,.4,side*1.05,1.25,1.95,C.orange,0);jaws.push(jaw);moving.push(jaw);}
      frontArmor=box(body,1.8,1.4,.12,0,1.25,1.85,SIGNAL.magnet,0);
      for(const x of [-.6,0,.6])box(frontArmor,.08,1.2,.1,x,0,.1,0xa9dcff,0);
      flow=new T.Group();body.add(flow);moving.push(flow);
      for(let i=0;i<12;i++)box(flow,.11,.035,.34,0,.16,0,0xcce5db,0);
    }else{
      cylinder(turret,.65,.6,0,1.35,0,0x7fafa3,12);
      for(const x of [-.65,.65]){const tube=cylinder(turret,.25,1.7,x,.9,.8,C.dark,10);tube.rotation.x=Math.PI/2;ring(turret,.27,.07,x,.9,1.65,SIGNAL.magnet).rotation.x=Math.PI/2;}
      box(turret,.1,.8,.1,0,2,-.3,C.dark,0);box(turret,.5,.12,.12,0,2.4,-.3,lamp,0);
    }
    wake=new T.LineSegments(new T.BufferGeometry().setFromPoints([
      new T.Vector3(-width,.12,-1),new T.Vector3(-width-1,.12,-4),
      new T.Vector3(width,.12,-1),new T.Vector3(width+1,.12,-4),
    ]),new T.LineBasicMaterial({color:0xb6d9d2,transparent:true,opacity:.45}));body.add(wake);moving.push(wake);
  }else if(type==='sorter'){
    cylinder(body,1.5,.6,0,.3,0,C.dark,12);box(body,2,2,1.8,0,1.4,0,C.metal);
    box(body,1.2,.7,.15,0,1.5,1,mat(C.orange,true));
    driveShutter=box(body,1.4,.85,.15,0,1.5,1.13,C.metal);moving.push(driveShutter);
    arm=new T.Group();arm.position.y=1;turret.add(arm);
    const length=SORTER_REACH/1.8;
    armSignal=mat(C.yellow);box(arm,.3,.3,length,0,0,length/2,armSignal,0);box(arm,1,.8,1,0,0,length,C.dark);
    cylinder(body,.4,2,0,2.4,0,C.metal,10);
  }else if(type==='skirmisher'){
    box(body,1.4,.65,2,0,.8,0,0xb67345,.2);
    for(const x of [-1,1])for(const z of [-.85,.85])wheel(x,z);
    for(const x of [-.55,.55]){const gun=cylinder(turret,.16,1.7,x,1.35,.75,C.dark,8);gun.rotation.x=Math.PI/2;}
    box(turret,1.4,.5,.7,0,1.25,0,C.metal);
  }else if(type==='sniper'){
    cylinder(body,.8,.5,0,.55,0,C.dark,8);
    for(let i=0;i<3;i++){const leg=box(body,.25,.35,1.7,Math.sin(i*2.094)*.8,.3,Math.cos(i*2.094)*.8,C.metal);leg.rotation.y=i*2.094;}
    cylinder(turret,.45,1.5,0,1.45,0,C.metal,10);
    const gun=box(turret,.24,.3,3.7,0,2.15,.95,C.dark);moving.push(gun);
    box(turret,.5,.5,.2,0,2.15,2.9,lamp);
  }else if(type==='artillery'){
    box(body,2.5,.75,2.5,0,.7,0,0x876755,.2);
    for(const x of [-1.3,1.3])for(const z of [-.8,.8])wheel(x,z,.45);
    const cup=cylinder(turret,.7,1.7,0,1.7,0,C.dark,12);cup.rotation.x=.38;
    ring(turret,.72,.13,0,2.49,.32,C.yellow);moving.push(cup);
    for(const x of [-.8,.8])cylinder(body,.24,.65,x,1.3,-.6,C.orange,8);
  }else if(type==='miner'){
    box(body,1.4,.55,2.4,0,.7,0,0x756d48,.2);
    for(const x of [-.9,.9])for(const z of [-.85,.85])wheel(x,z);
    for(let i=0;i<3;i++)cylinder(body,.42,.22,0,1.15,-.6+i*.55,SIGNAL.magnet,8);
    box(body,1.6,.2,.9,0,.7,-1.6,C.metal);
  }else if(type==='welder'){
    cylinder(body,1.15,.5,0,.45,0,C.track,12);cylinder(body,.7,1.3,0,1.25,0,0xa96137,10);
    for(const x of [-.85,.85]){cylinder(body,.32,1.6,x,1.2,-.4,C.orange,8);ring(body,.34,.08,x,1.8,-.4,C.dark);}
    const nozzle=cylinder(turret,.34,2,0,1.4,1.15,C.dark,10);nozzle.rotation.x=Math.PI/2;moving.push(nozzle);
    cylinder(turret,.5,.2,0,1.4,2.1,lamp,10).rotation.x=Math.PI/2;
  }else if(type==='repairer'){
    cylinder(body,.9,.55,0,.55,0,C.metal,6);
    for(const x of [-1,1])wheel(x,0,.5);
    for(const x of [-.85,.85]){const arm=box(turret,.22,1.4,.3,x,1.4,0,C.metal);arm.rotation.z=x*.4;moving.push(arm);}
    cylinder(turret,.45,.7,0,1.1,0,mat(SIGNAL.open,true),6);
    ring(turret,.85,.08,0,1.9,0,SIGNAL.open);
  }else if(type==='reflector'){
    cylinder(body,1,.6,0,.55,0,C.track,8);box(body,1.5,.75,1.4,0,1.15,0,C.dark);
    const plate=box(turret,2.7,2.1,.18,0,1.6,1.05,mat(0xd9eeee,true));moving.push(plate);
    for(const x of [-1.45,1.45])box(turret,.17,2.4,.4,x,1.6,1,C.metal);
    box(turret,.7,.15,.3,0,2.1,1.2,lamp);
  }
  box(turret,.45,.18,.15,0,1.5,1.1,lamp);
  const radiator=box(body,.65,.5,.15,0,.9,-1.25,lamp);
  const restHeights=moving.map(m=>m.position.y);
  return {root,body,turret,barrel,tracks,radiator,moving,arm,frontArmor,flow,wake,impeller,jaws,phaseMaterials:armSignal?[lamp,armSignal]:[lamp],rollWheels:a=>tracks.forEach(w=>w.rotateY(-a)),
    animate(phase,timer,time,dt,active){lamp.color.setHex(phase==='warn'?C.lightYellow:phase==='vent'?C.orange:active?C.red:C.dark);if(armSignal)armSignal.color.setHex(phase==='warn'?C.lightYellow:phase==='sweep'?C.red:phase==='vent'?0x8f6854:C.yellow);body.position.y=Math.sin(time*3)*.025;moving.forEach((m,i)=>m.position.y=restHeights[i]+Math.sin(time*20)*(phase==='warn'?.04:0));if(driveShutter)driveShutter.position.y=1.5+(phase==='vent'?1:0);}
  };
}

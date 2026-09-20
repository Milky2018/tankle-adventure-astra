import * as T from 'three';
import {box,cylinder,ring,mat,C} from './world.js';
import {expansionProps,expansionPickups} from './folded-expansion-layout.js';
import {currentVelocity} from './folded-mechanisms.js';
import {expansionCurrents} from './folded-expansion-layout.js';
import {SIGNAL} from './folded-visibility.js';

export function makeDistrictMachinery(parent){
 const iron=mat(C.dark),metal=mat(C.metal),brass=mat(0xbfa16d),blue=mat(SIGNAL.magnet),glass=mat(0x91c7b5,true),warm=mat(0xd39550,true);
 for(const p of expansionProps){
  const g=new T.Group();g.position.set(p.x,p.y,p.z);parent.add(g);
  if(p.kind==='gantry'){
   for(const x of [-7,7])box(g,.6,9,.8,x,4.5,0,metal,0);
   box(g,15,.7,1,0,9,0,brass,0);cylinder(g,.14,4,0,6.5,0,iron,8);box(g,2,1.2,2,0,4.1,0,metal);
  }else if(['wreck','engine','assembly','jacket','test-bed'].includes(p.kind)){
   box(g,3.5,.7,4,0,.45,0,iron);
   for(const x of [-1.5,1.5]){box(g,.8,1,3.8,x,1,0,metal);for(const z of [-1.3,0,1.3]){const wheel=cylinder(g,.4,.2,x,1,z,iron,8);wheel.rotation.z=Math.PI/2;}}
   box(g,2.5,1.2,2.2,0,1.2,0,metal);
   if(p.kind==='test-bed'){g.children.at(-1).rotation.z=.2;for(const x of [-2,2]){box(g,.2,.12,8,x,.08,0,brass,0);box(g,.3,2,.3,x,1,-2,metal,0).rotation.z=x*.15;}}
   if(p.kind==='wreck')box(g,3,.4,1.2,0,2,-1,brass);
   else for(const x of [-.7,.7]){cylinder(g,.4,1.4,x,2.2,0,p.kind==='jacket'?glass:brass,8);ring(g,.46,.1,x,2.4,0,iron);}
   box(g,.8,.18,.15,0,1.4,1.2,warm,0);
  }else if(p.kind==='separator'||p.kind==='pump'){
   const separator=p.kind==='separator',r=separator?6.5:3,h=separator?12:8;
   cylinder(g,r,h,0,h/2,0,metal,20);
   for(const y of [1,h/2,h-.5])ring(g,r+.15,.25,0,y,0,brass);
   for(const side of [-1,1]){box(g,.6,h,r,side*(r-.5),h/2,0,iron,0);box(g,.18,h*.55,.5,side*r,h*.55,0,warm,0);}
   for(const x of [-r/2,r/2])cylinder(g,.4,4,x,h+1,-r/2,iron,10);
  }else if(['boiler','battery','core'].includes(p.kind)){
   cylinder(g,1.7,p.kind==='boiler'?6:3.5,0,p.kind==='boiler'?3:1.75,0,brass,12);
   for(const y of [1,2.5,3.3])ring(g,1.78,.16,0,y,0,iron);
   box(g,.6,1.5,.16,0,1.8,1.72,p.kind==='battery'?glass:warm,0);
   for(const x of [-1,1])box(g,.25,3,.3,x,1.5,-1.8,metal,0);
  }else if(['lens','emitter'].includes(p.kind)){
   box(g,3.8,.6,3.8,0,.3,0,iron);for(const x of [-1.3,1.3])box(g,.35,3.5,.5,x,2,0,metal,0);
   const barrel=cylinder(g,1.2,3,0,2.6,0,brass,12);barrel.rotation.x=Math.PI/2;
   const lens=cylinder(g,1,.15,0,2.6,1.6,glass,16);lens.rotation.x=Math.PI/2;
   ring(g,1.1,.1,0,2.6,1.72,metal).rotation.x=0;
  }else if(p.kind==='sluice'){
   box(g,3.8,2.6,.5,0,1.3,-1.6,metal);for(const x of [-1.5,0,1.5])box(g,.3,2.6,3.5,x,1.3,0,iron,0);
   box(g,3.5,.12,3.5,0,.4,0,glass,0);ring(g,.9,.13,0,2.5,0,brass);
  }else if(p.kind==='planter'){
   box(g,4,1.2,4,0,.6,0,metal);for(const x of [-1,0,1]){box(g,.2,2,.2,x,2,0,brass,0);for(const z of [-.6,.6]){const leaf=box(g,1.5,.12,1,x,2.3,z,mat(0x749764),0);leaf.rotation.z=x*.3;}}
  }else{
   box(g,4,.5,3,0,.25,0,iron);for(const x of [-1.5,1.5])box(g,.2,3,.3,x,1.5,0,metal,0);
   for(const y of [1,2,3]){box(g,4,.2,2.5,0,y,0,metal,0);box(g,1,.65,1.5,-.8,y+.4,0,iron);box(g,1,.65,1.5,.8,y+.4,0,brass);}
  }
 }
 // Installation bays frame the actual collectible and leave the front approach
 // open. Feet and service trenches explain how a module belonged to a machine.
 for(const p of expansionPickups){
  const g=new T.Group();g.position.set(p.x,p.y,p.z);parent.add(g);
  if(p.ability==='flotation'){
   for(const x of [-3,3]){box(g,1.2,.6,9,x,.4,0,metal);for(const z of [-3,0,3])box(g,1.3,.12,.4,x,.8,z,brass,0);}
   box(g,7,.25,1,0,.2,-4,metal,0);
   for(const x of [-2,2])cylinder(g,.45,.9,x,.5,-3,glass,10);
  }else if(p.ability==='laser'){
   for(const r of [2.7,3.2])ring(g,r,.1,0,.15,0,brass);
   for(const x of [-3,3]){box(g,.3,2,.5,x,1,0,metal,0);box(g,.2,1.5,.15,x,1,.3,glass,0);}
   box(g,.12,.06,9,0,.15,0,warm,0);
  }else if(p.ability==='circulation'){
   for(const x of [-3,3]){cylinder(g,.35,3,x,1.5,-1,metal,8);ring(g,.45,.1,x,2,-1,brass);box(g,.18,.14,7,x,.25,0,glass,0);}
   box(g,6,.14,.18,0,.25,3.5,glass,0);
   box(g,5,.3,2,0,.2,-3,metal);
  }else{
   for(const x of [-3,3]){box(g,.35,.2,p.ability==='phoenix'?14:9,x,.15,0,metal,0);for(const z of [-3,3])box(g,.7,.5,.8,x,.25,z,brass);}
   if(p.ability==='magnet'){
    for(const x of [-2.5,2.5]){box(g,.3,3,.4,x,1.5,-3,metal,0);box(g,.18,.5,.2,x,2.5,-2.7,blue,0);}
    box(g,5.5,.35,.6,0,3,-3,metal,0);
   }else for(const z of [-3,0,3])box(g,5,.06,.25,0,.14,z,warm,0);
  }
 }
}

// Moving machinery makes each local control's physical consequence visible.
export function makeWorkingDistricts(fixed,moving){
 const iron=mat(C.dark),metal=mat(C.metal),brass=mat(0xbfa16d),water=mat(0x91c7b5,true),warm=mat(0xd39550,true);
 const pipe=(a,b,r=.2)=>{const delta=new T.Vector3(...b).sub(new T.Vector3(...a)),m=cylinder(fixed,r,delta.length(),...(new T.Vector3(...a).addScaledVector(delta,.5).toArray()),metal,8);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());};
 // The crane rails and loading beds explain the moving cover below them.
 for(const z of [-1,8]){for(const side of [-1,1])box(fixed,72,.1,.16,-107,8.07,z+side*1.8,brass,0);box(fixed,72,.25,.35,-107,15,z,iron,0);for(const x of [-144,-70]){box(fixed,.45,7,.45,x,11.5,z,metal,0);box(fixed,2,.25,2,x,8.15,z,iron,0);}}
 // Exposed pump wheel, connected inlet pipe, and a readable downstream stream.
 const pump=new T.Group();pump.position.set(-123,-3,82);moving.add(pump);
 ring(pump,2.4,.2,0,0,0,brass).rotation.x=0;
 for(let i=0;i<6;i++){const blade=box(pump,.35,4,.18,0,0,0,metal,0);blade.rotation.z=i*Math.PI/6;}
 pipe([-123,-1,78],[-123,-1,100],.45);pipe([-123,-1,100],[-72,-1,100],.45);pipe([-72,-1,100],[-72,-7,100],.45);
 const flow=box(moving,24,.06,1,-108,-7.85,64,water,0),ripples=[];
 const diversion=new T.Group();diversion.position.set(-100,-8.2,98);moving.add(diversion);
 box(diversion,14,.22,.4,7,0,0,metal,0);cylinder(diversion,.3,1.6,0,0,0,brass,10);
 let lastTime=0,flowPhase=0;
 for(let i=0;i<6;i++)ripples.push(box(moving,.12,.025,.8,-120+i*4,-7.8,64,water,0));
 // The calibration well is a true hole between the galleries, with visible depth.
 for(const x of [297,325]){box(fixed,1,16,30,x,15,-65,iron,0);for(const y of [8,16,23])box(fixed,1.4,.3,30,x,y,-65,brass,0);}
 for(const z of [-80,-50])box(fixed,28,16,1,311,15,z,iron,0);
 cylinder(fixed,8,.7,311,8,-65,metal,20);ring(fixed,10,.3,311,22.8,-65,brass);
 const gimbal=new T.Group();gimbal.position.set(311,16,-65);moving.add(gimbal);
 ring(gimbal,6,.3,0,0,0,metal);ring(gimbal,4,.25,0,0,0,brass).rotation.x=0;
 pipe([326,-12,153],[326,-12,173],.65);pipe([326,-12,173],[352,-12,173],.65);pipe([352,-12,173],[352,-22,173],.65);
 pipe([326,-12,153],[379,-12,153],.45);pipe([379,-12,153],[379,-12,114],.45);pipe([379,-12,114],[379,-22,114],.45);
 const separator=new T.Group();separator.position.set(326,-11.5,153);moving.add(separator);
 for(let i=0;i<4;i++){const arm=box(separator,11,.2,.4,0,0,0,brass,0);arm.rotation.y=i*Math.PI/4;}
 // A predecessor remains plumbed into the machinery; its companion faces it.
 pipe([44,-39.65,80],[44,-39.65,110],.22);pipe([44,-39.65,110],[55,-39.65,110],.22);pipe([55,-39.65,110],[55,-38.5,116],.22);
 // A receiving frame announces the finite reserve's entry side.
 for(const x of [185,198])box(fixed,.6,6,.6,x,19,-193,iron,0);
 box(fixed,14,.6,.6,191.5,22,-193,metal,0);box(fixed,4,.12,.18,191.5,21.5,-192.5,warm,0);
 return {update(time,state){const dt=Math.max(0,Math.min(.1,time-lastTime));lastTime=time;flowPhase+=currentVelocity(expansionCurrents[1],state).x*dt;diversion.rotation.y=state['reservoir-inlet']?-.65:0;pump.rotation.z=time*(state['reservoir-inlet']?1.5:.08);for(const [i,r]of ripples.entries()){r.visible=flow.visible;r.position.x=-120+((i*4+flowPhase)%24+24)%24;}gimbal.rotation.y=state['lens-transfer']?time*.16:0;separator.rotation.y=time*(state['coolant-transfer']?.5:.06);}};
}

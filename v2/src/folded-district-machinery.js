import * as T from 'three';
import {box,cylinder,ring,mat,C} from './world.js';
import {expansionProps,expansionPickups} from './folded-expansion-layout.js';
import {SIGNAL} from './folded-visibility.js';

export function makeDistrictMachinery(parent){
 const iron=mat(C.dark),metal=mat(C.metal),brass=mat(0xbfa16d),blue=mat(SIGNAL.magnet),glass=mat(0x91c7b5,true),warm=mat(0xd39550,true);
 for(const p of expansionProps){
  const g=new T.Group();g.position.set(p.x,p.y,p.z);parent.add(g);
  if(p.kind==='gantry'){
   for(const x of [-7,7])box(g,.6,9,.8,x,4.5,0,metal,0);
   box(g,15,.7,1,0,9,0,brass,0);cylinder(g,.14,4,0,6.5,0,iron,8);box(g,2,1.2,2,0,4.1,0,metal);
  }else if(['wreck','engine','assembly','jacket'].includes(p.kind)){
   box(g,3.5,.7,4,0,.45,0,iron);
   for(const x of [-1.5,1.5]){box(g,.8,1,3.8,x,1,0,metal);for(const z of [-1.3,0,1.3]){const wheel=cylinder(g,.4,.2,x,1,z,iron,8);wheel.rotation.z=Math.PI/2;}}
   box(g,2.5,1.2,2.2,0,1.2,0,metal);
   if(p.kind==='wreck')box(g,3,.4,1.2,0,2,-1,brass);
   else for(const x of [-.7,.7]){cylinder(g,.4,1.4,x,2.2,0,p.kind==='jacket'?glass:brass,8);ring(g,.46,.1,x,2.4,0,iron);}
   box(g,.8,.18,.15,0,1.4,1.2,warm,0);
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

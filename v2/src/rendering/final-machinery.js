import * as T from 'three';
import {box,cylinder,ring,mat} from './factory-models.js';
import {finaleState,openingCarrier} from '../progression/finale.js';

export function makeFinalMachinery(scenery,moving){
  const iron=0x384c49,pale=0xa8ada0,copper=0xa98b69;
  const feeds=[-19,19].map((x,index)=>{
    // Low sheets and broken track shoes belong to the belt, not floating debris.
    const scraps=Array.from({length:3},(_,n)=>{
      const root=new T.Group();moving.add(root);
      box(root,2.4,.12,1.4,0,.28,0,pale,0);
      for(const side of [-1,1])box(root,.25,.18,1.6,side,.4,0,iron,0);
      return {root,offset:n*8};
    });
    box(scenery,8,.3,2,x,-55.8,23,iron,0);
    for(const side of [-1,1])box(scenery,.6,3,2,x+side*3.6,-54.5,23,iron,0);
    const jaw=box(moving,6,.5,1.5,x,-53.2,23,copper,0);
    // The transmission returns to the exposed battery, while reclaimed matter
    // continues along a sealed duct into the furnace's side inlet.
    box(scenery,Math.abs(x)-4,.2,.3,(x+Math.sign(x)*4)/2,-55.8,32,copper,0);
    box(scenery,.7,.3,10,x,-55.8,19,iron,0);
    box(scenery,11,.3,.7,Math.sign(x)*13.5,-55.8,14,iron,0);
    box(scenery,.7,.3,22,Math.sign(x)*8,-55.8,3,iron,0);
    box(scenery,4,.3,.7,Math.sign(x)*6,-55.8,-8,iron,0);
    const wheel=cylinder(moving,.8,.35,x,-54,23,iron,12);wheel.rotation.x=Math.PI/2;
    return {x,index,scraps,jaw,wheel,phase:0};
  });
  const conduits=[];
  for(const side of [-1,1]){
    box(scenery,.4,.35,7,side*2.8,-55.75,-3.5,iron,0);
    for(let i=0;i<8;i++)conduits.push({mesh:box(moving,.3,.08,.45,side*2.8,-55.52,-i*.85,mat(0x685947,true),0),step:i});
  }
  // The last exhausted regulator is beside the drive line, not across it.
  const predecessor=new T.Group();predecessor.position.set(-11,-56,5);scenery.add(predecessor);
  box(predecessor,3,.8,3.8,0,.8,0,iron,.2);
  for(const side of [-1,1])box(predecessor,.7,.7,4,side*1.7,.5,0,iron,.2);
  cylinder(predecessor,1,.6,0,1.5,0,pale,12);box(predecessor,.35,.35,2,0,1.5,-1.4,iron,0);
  box(scenery,.35,.35,10,-11,-55.8,-1.8,copper,0);
  // This same little carrier is visible beside the very first awakening bay.
  const cart=new T.Group();cart.position.set(openingCarrier.x,openingCarrier.y,openingCarrier.z);moving.add(cart);
  box(cart,2.2,.65,2.7,0,.6,0,pale,.15);box(cart,1.5,.18,1.7,0,1.03,0,copper,0);
  const wheels=[];
  for(const x of [-1.1,1.1])for(const z of [-.8,.8]){const wheel=cylinder(cart,.38,.25,x,.38,z,iron,10);wheel.rotation.z=Math.PI/2;wheels.push(wheel);}
  const eye=box(cart,.7,.18,.08,0,.82,1.39,mat(0x46564c,true),0);
  for(const x of [6.9,9.1])box(scenery,.14,.06,6,x,-7.93,80,iron,0);
  return {cart,eye,feeds,conduits,update(dt,time,p,state,keeper){
    const renewal=finaleState(p.endingTime,state.endingSeen);
    for(const feed of feeds){
      const live=keeper.hp>0&&keeper.parts[feed.index].hp>0;
      if(live)feed.phase+=dt*3.2;
      for(const {root,offset}of feed.scraps){root.position.set(feed.x,-56,49-(offset+feed.phase)%26);}
      feed.jaw.position.y=T.MathUtils.damp(feed.jaw.position.y,live?-53.8+Math.sin(feed.phase*.8)*.6:-55.25,6,dt);
      feed.wheel.rotation.z=feed.phase;
    }
    for(const {mesh,step}of conduits){
      const powered=renewal.power>step/9;
      mesh.material.color.setHex(powered?((time*3-step*.3)%2<.5?0xffdf9a:0xc78f54):0x685947);
    }
    cart.position.z=openingCarrier.z+renewal.travel*1.6;
    wheels.forEach(w=>w.rotation.x=renewal.travel*1.6/.38);
    eye.material.color.setRGB(.12+renewal.wake*.68,.17+renewal.wake*.58,.14+renewal.wake*.3);
    return renewal;
  }};
}

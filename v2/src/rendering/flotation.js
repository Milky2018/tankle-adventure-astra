import * as T from 'three';
import { box, C } from './factory-models.js';

export function flotationAssembly(parent){
  const root=new T.Group();parent.add(root);const floats=[];
  for(const side of [-1,1]){
    const arm=new T.Group();root.add(arm);arm.position.x=side*1.25;
    box(arm,.3,.16,2.7,0,.4,0,C.dark);box(arm,.8,.6,3.4,0,.18,0,0xd8c184,.25);
    for(const z of [-1,1])box(arm,.84,.1,.22,0,.52,z,C.metal);
    const fin=box(arm,.14,.4,.6,0,.15,-1.8,C.dark);fin.rotation.x=.3;floats.push({arm,side});
  }
  root.visible=false;
  return {update(deployed,time,moving){root.visible=deployed;for(const {arm,side} of floats){arm.position.x=T.MathUtils.damp(arm.position.x,side*(deployed?1.65:1.25),8,1/60);arm.rotation.z=Math.sin(time*3+side)*.015;}root.position.y=moving?Math.sin(time*4)*.025:0;}};
}

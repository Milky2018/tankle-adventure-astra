import * as T from 'three';
import {box,mat,C} from './world.js';
import {SIGNAL} from './folded-visibility.js';

export function makeSlideMarkers(scene,bodies){
  const markers=[];
  for(const body of bodies.filter(b=>b.rail.latch)){
    const r=body.rail,along=r.axis==='x',goals=r.goal===undefined?[r.min,r.max]:[r.goal];
    for(const goal of goals){
      const x=along?goal:body.x,z=along?body.z:goal,root=new T.Group();root.name=`slide-destination:${body.id}:${goal}`;scene.add(root);
      const color=mat(SIGNAL.magnet,true),outline=[];
      for(const side of [-1,1]){
        outline.push(box(root,body.w,.06,.18,x+body.w/2,body.y+.23,z+(side>0?body.d:0),color,0));
        outline.push(box(root,.18,.06,body.d,x+(side>0?body.w:0),body.y+.23,z+body.d/2,color,0));
      }
      // The fixed terminal is outside the swept body, so the box cannot hide it.
      const terminal=[along?x+body.w/2:x+body.w+.8,body.y+.27,along?z+body.d+.8:z+body.d/2];
      box(root,.65,.16,.65,...terminal,C.dark,0);box(root,.4,.05,.4,terminal[0],terminal[1]+.1,terminal[2],color,0);
      markers.push({body,goal,root,color,outline});
    }
  }
  return {markers,update(){for(const m of markers){
    const arrived=Math.abs(m.body[m.body.rail.axis]-m.goal)<.08;
    m.color.color.setHex(arrived?SIGNAL.open:SIGNAL.magnet);
  }}};
}

import {Vector3} from 'three';

// A read-only path is shared by the aiming guide and the damaging beam.
export function traceFoldedLaser(start,direction,cast,{range=90,bounces=5}={}){
  let origin=start.clone(),dir=direction.clone().normalize(),remaining=range;
  const segments=[];
  for(let bounce=0;bounce<=bounces&&remaining>.05;bounce++){
    const hit=cast(origin,dir,remaining),end=hit?hit.point.clone():origin.clone().addScaledVector(dir,remaining);
    segments.push({start:origin,end,hit});
    if(hit?.refuge)break;
    let normal=hit?.mirror?.normal;
    const target=hit?.target;
    if(!normal&&target?.mirror&&Math.cos(Math.atan2(origin.x-target.x,origin.z-target.z)-target.aim)>.55)normal=new Vector3(Math.sin(target.aim),0,Math.cos(target.aim));
    if(!normal)break;
    segments.at(-1).reflected=true;
    remaining-=hit.distance+.03;dir.reflect(normal);
    origin=end.clone().addScaledVector(dir,.03);
  }
  return segments;
}

export const REFUGE_RADIUS=5;
export const REFUGE_CLEARANCE=15;

export function refugeAt(point,hives,state,radius=REFUGE_RADIUS){
  return hives.find(h=>(!h.requires||state[h.requires])&&point.y>=h.y-.75&&point.y<h.y+4&&Math.hypot(point.x-h.x,point.z-h.z)<=radius);
}

// A finite cylinder blocks fire in both directions, including lobbed shells.
// The caps keep protection local to this floor in the stacked city.
export function refugeRayDistance(origin,dir,range,hives,state){
  let nearest=Infinity;
  for(const h of hives){
    if(h.requires&&!state[h.requires])continue;
    const x=origin.x-h.x,z=origin.z-h.z,a=dir.x*dir.x+dir.z*dir.z;
    const candidates=[];
    if(a>1e-12){
      const b=x*dir.x+z*dir.z,c=x*x+z*z-REFUGE_RADIUS*REFUGE_RADIUS,d=b*b-a*c;
      if(d>=0)for(const t of [(-b-Math.sqrt(d))/a,(-b+Math.sqrt(d))/a]){
        const y=origin.y+dir.y*t;
        if(y>=h.y-.75&&y<=h.y+4)candidates.push(t);
      }
    }
    if(Math.abs(dir.y)>1e-12)for(const y of [h.y-.75,h.y+4]){
      const t=(y-origin.y)/dir.y;
      if(Math.hypot(x+dir.x*t,z+dir.z*t)<=REFUGE_RADIUS)candidates.push(t);
    }
    for(const t of candidates)if(t>=0&&t<=range)nearest=Math.min(nearest,t);
  }
  return nearest;
}

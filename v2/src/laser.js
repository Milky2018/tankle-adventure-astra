import { clamp } from './mechanics.js';
export const LASER={range:90,heat:24,damage:2.5,bounces:5};
const cross=(ax,az,bx,bz)=>ax*bz-az*bx;
export function rayBox(x,z,dx,dz,b){
  let near=0,far=Infinity;
  for(const [p,v,min,max] of [[x,dx,b.x,b.x+b.w],[z,dz,b.z,b.z+b.d]]){
    if(Math.abs(v)<1e-9){if(p<min||p>max)return Infinity;continue;}
    const a=(min-p)/v,c=(max-p)/v;near=Math.max(near,Math.min(a,c));far=Math.min(far,Math.max(a,c));
  }
  return far>=near?near:Infinity;
}
export function rayCircle(x,z,dx,dz,c){
  const px=x-c.x,pz=z-c.z,b=px*dx+pz*dz,q=b*b-(px*px+pz*pz-c.radius*c.radius);
  if(q<0)return Infinity;const d=-b-Math.sqrt(q);return d>=0?d:(-b+Math.sqrt(q)>=0?0:Infinity);
}
export function mirrorEnds(m){return {ax:m.x-Math.cos(m.angle)*m.length/2,az:m.z-Math.sin(m.angle)*m.length/2,bx:m.x+Math.cos(m.angle)*m.length/2,bz:m.z+Math.sin(m.angle)*m.length/2};}
// The final segment carries its own origin and direction for armour/weak-point tests.
export function traceLaser(x,z,dx,dz,{mirrors=[],walls=[],targets=[],range=LASER.range,bounces=LASER.bounces}={}){
  const magnitude=Math.hypot(dx,dz);if(!magnitude)return [];dx/=magnitude;dz/=magnitude;
  const segments=[];let remaining=range,last=null;
  for(let bounce=0;bounce<=bounces&&remaining>.01;bounce++){
    let distance=remaining,hit=null,kind=null;
    for(const wall of walls){if(wall.active===false)continue;const t=rayBox(x,z,dx,dz,wall);if(t<distance){distance=t;hit=wall;kind='wall';}}
    for(const target of targets){const t=target.bounds?rayBox(x,z,dx,dz,target.bounds):rayCircle(x,z,dx,dz,target);if(t<distance){distance=t;hit=target;kind='target';}}
    for(const mirror of mirrors){
      if(mirror===last)continue;const {ax,az,bx,bz}=mirrorEnds(mirror),ex=bx-ax,ez=bz-az,den=cross(dx,dz,ex,ez);if(Math.abs(den)<1e-8)continue;
      const t=cross(ax-x,az-z,ex,ez)/den,u=cross(ax-x,az-z,dx,dz)/den;
      if(t>=.001&&u>=0&&u<=1&&t<distance){distance=t;hit=mirror;kind='mirror';}
    }
    const endX=x+dx*distance,endZ=z+dz*distance;segments.push({x,z,endX,endZ,dx,dz,hit,kind});remaining-=distance;
    if(kind!=='mirror')break;
    const nx=-Math.sin(hit.angle),nz=Math.cos(hit.angle),dot=dx*nx+dz*nz;dx-=2*dot*nx;dz-=2*dot*nz;
    x=endX+dx*.015;z=endZ+dz*.015;remaining-=.015;last=hit;
  }
  return segments;
}
export function rearHit(heading,dx,dz){return dx*Math.sin(heading)+dz*Math.cos(heading)>.55;}
export function laserHeat(p,dt,time){if(p.hp<=0||p.overheated)return false;p.heat=clamp(p.heat+LASER.heat*dt,0,100);p.lastHeat=time;p.boostCooling=false;p.actionHeatAt=time;if(p.heat>=100)p.overheated=true;return true;}

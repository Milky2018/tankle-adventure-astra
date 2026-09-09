import { clamp } from './mechanics.js';
export const MORTAR = { range: 24, heat: 35, cooldown: 1.05, duration: 1.15, height: 8, radius: 3, damage: 3 };
export function mortarTarget(x,z,ax,az){const distance=Math.hypot(ax-x,az-z),scale=Math.min(1,MORTAR.range/(distance||1));return {x:x+(ax-x)*scale,z:z+(az-z)*scale};}
export function mortarPosition(shot,age){const t=clamp(age/MORTAR.duration,0,1);return {x:shot.x+(shot.target.x-shot.x)*t,z:shot.z+(shot.target.z-shot.z)*t,y:shot.y*(1-t)+.2*t+4*MORTAR.height*t*(1-t)};}

export const FLOTATION = { speed: .75, radius: .88 };
export function supportedHull(available,x,z,r=FLOTATION.radius){
  return [[r,0],[-r,0],[0,r],[0,-r],[r*.7,r*.7],[-r*.7,-r*.7],[r*.7,-r*.7],[-r*.7,r*.7]].every(([dx,dz])=>available(x+dx,z+dz));
}
export function toggleFlotation(p,available){
  if(!p.flotation||p.hp<=0)return false;
  if(p.deployed&&!supportedHull(available,p.x,p.z))return false;
  p.deployed=!p.deployed;p.speed=1;return true;
}

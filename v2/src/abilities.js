import { clamp } from './mechanics.js';
export const MORTAR = { range: 24, heat: 35, cooldown: 1.05, duration: 1.15, height: 8, radius: 3, damage: 3 };
export function mortarTarget(x,z,ax,az){const distance=Math.hypot(ax-x,az-z),scale=Math.min(1,MORTAR.range/(distance||1));return {x:x+(ax-x)*scale,z:z+(az-z)*scale};}
export function mortarPosition(shot,age){const t=clamp(age/MORTAR.duration,0,1);return {x:shot.x+(shot.target.x-shot.x)*t,z:shot.z+(shot.target.z-shot.z)*t,y:shot.y*(1-t)+.2*t+4*MORTAR.height*t*(1-t)};}

// Artillery brackets the last sighting; it never follows the player after launch.
export function barrageTargets(origin,target){
  const dx=target.x-origin.x,dz=target.z-origin.z,length=Math.max(1,Math.hypot(dx,dz));
  return [-1,0,1].map((side,i)=>({x:target.x+dz/length*side*5,y:target.y,z:target.z-dx/length*side*5,delay:i*.32}));
}
export const RAIL={range:86,speed:120,lockTime:.8};
export const BARRAGE={duration:1.9,height:9,radius:4};
export const SORTER_REACH=18;

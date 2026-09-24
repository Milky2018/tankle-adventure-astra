import {angleDelta,clamp} from '../player/mechanics.js';

// Telegraphs finish locking before release; gaps remain wide enough to dodge.
export function bossPattern(enemy,clearSight=true){
 const cycle=enemy.attackCycle||1,late=enemy.hp/enemy.max<.4,parts=enemy.parts?.filter(p=>p.hp>0).length||0;
 if(enemy.id==='foundry')return {kind:!clearSight||cycle%3===0?'barrage':parts?'batteries':'fan',warn:parts?1.05:.9,recovery:1.45,speed:32,offsets:parts?[-.3,-.15,0,.15,.3]:[-.45,-.3,-.15,0,.15,.3,.45],waves:2,spacing:.32};
 if(enemy.guardian)return {kind:cycle%3===0?'seekers':'fan',warn:late?.85:1.05,recovery:2.2,speed:36,offsets:[-.36,-.18,0,.18,.36],waves:2,spacing:.38};
 if(enemy.id==='sorter')return {kind:!clearSight||cycle%3===0?'barrage':'sweep',warn:1.1,recovery:1.5,speed:30};
 return {kind:!clearSight||cycle%4===0?'barrage':cycle%4===2?'seekers':!parts&&cycle%4===3?'sweep':parts?'batteries':'fan',warn:late?.85:1.1,recovery:late?1.05:1.35,speed:late?38:32,offsets:late?[-.45,-.3,-.15,0,.15,.3,.45]:[-.36,-.18,0,.18,.36],waves:2,spacing:.36,overlay:late};
}
export function bossBarrage(origin,target){
 const dx=target.x-origin.x,dz=target.z-origin.z,length=Math.max(1,Math.hypot(dx,dz));
 return [-1,0,1].map((side,i)=>({x:target.x+dz/length*side*5.5,y:target.y,z:target.z-dx/length*side*5.5,delay:i*.24}));
}
export function steerSeeker(shot,target,dt){
 // A bounded turn rate and a final ballistic approach let the player bait a
 // missile into cover. No last-instant U-turns or permanent pursuit.
 const dx=target.x-shot.position.x,dz=target.z-shot.position.z,distance=Math.hypot(dx,dz);
 if(shot.age>1.65||distance<5)shot.homing=false;
 if(!shot.homing)return;
 const angle=Math.atan2(shot.dir.x,shot.dir.z),next=angle+clamp(angleDelta(angle,Math.atan2(dx,dz)),-.9*dt,.9*dt);
 shot.dir.x=Math.sin(next);shot.dir.z=Math.cos(next);shot.dir.y=0;
}

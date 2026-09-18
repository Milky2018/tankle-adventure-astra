import * as T from 'three';
import {foldedDecks,foldedSupport,deckHeight,inRect} from './folded-layout.js';

// Keep support local and height-continuous; a ceiling is never a wheel contact.
export function groundPatches(p,lifts=[]){
  const center=foldedSupport(p.x,p.z,p.y,p.deployed,lifts);
  if(!center||center.water)return [];
  const candidates=[...foldedDecks,...lifts].filter(d=>{
    if(d.water)return false;
    const x=Math.max(d.x,Math.min(d.x+d.w,p.x)),z=Math.max(d.z,Math.min(d.z+d.d,p.z));
    return Math.hypot(x-p.x,z-p.z)<6&&Math.abs(deckHeight(d,z)-deckHeight(center,z))<.15;
  }).sort((a,b)=>Number(b.id===center.id)-Number(a.id===center.id)||Math.hypot(p.x-Math.max(a.x,Math.min(a.x+a.w,p.x)),p.z-Math.max(a.z,Math.min(a.z+a.d,p.z)))-Math.hypot(p.x-Math.max(b.x,Math.min(b.x+b.w,p.x)),p.z-Math.max(b.z,Math.min(b.z+b.d,p.z))));
  return candidates.slice(0,4);
}
export function groundHeight(x,z,p,patches){
  const center=patches[0],expected=center?deckHeight(center,z):p.y;
  const matches=patches.filter(d=>inRect(x,z,d,.01));
  return matches.length?deckHeight(matches.sort((a,b)=>Math.abs(deckHeight(a,z)-expected)-Math.abs(deckHeight(b,z)-expected))[0],z):expected;
}

// Root tilt is in world space. Body heading and turret aim are resolved inside it.
export function createGroundPose(){
  const orientation=new T.Quaternion(),target=new T.Quaternion(),up=new T.Vector3(0,1,0),normal=new T.Vector3(),point=new T.Vector3();
  let lift=0;
  return {orientation,update(p,patches,dt,snap=false){
    const sx=Math.sin(p.heading),cz=Math.cos(p.heading),corners=[];
    for(const side of [-1,1])for(const end of [-1,1]){
      const x=side*1.5*cz+end*1.25*sx,z=-side*1.5*sx+end*1.25*cz;
      corners.push({side,end,x,z,h:groundHeight(p.x+x,p.z+z,p,patches)});
    }
    const across=corners.reduce((n,c)=>n+c.side*c.h,0)/6,along=corners.reduce((n,c)=>n+c.end*c.h,0)/5;
    normal.set(-across*cz-along*sx,1,across*sx-along*cz).normalize();
    if(p.afloat||!patches.length)normal.copy(up);
    target.setFromUnitVectors(up,normal);orientation.slerp(target,snap?1:1-Math.exp(-dt*18));
    let clearance=0;
    for(const side of [-1,1])for(const end of [-1.3,-.8,-.4,0,.4,.8,1.3]){point.set(side*1.5*cz+end*sx,.085,-side*1.5*sx+end*cz).applyQuaternion(orientation);clearance=Math.max(clearance,groundHeight(p.x+point.x,p.z+point.z,p,patches)-p.y-point.y);}
    // Raise immediately to avoid penetration; settling back onto a flat is damped.
    lift=snap?clearance:Math.max(clearance,T.MathUtils.damp(lift,clearance,18,dt));
    return {orientation,y:p.y+(p.afloat?-.12:lift)};
  }};
}
export function groundAim(origin,target,orientation,limit=40*Math.PI/180){
  const local=target.clone().sub(origin).applyQuaternion(orientation.clone().invert()),distance=local.length();
  const yaw=Math.atan2(local.x,local.z),pitch=T.MathUtils.clamp(Math.atan2(local.y,Math.hypot(local.x,local.z)),-limit,limit);
  const direction=new T.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)).applyQuaternion(orientation);
  return {yaw,pitch,direction,target:origin.clone().addScaledVector(direction,distance)};
}

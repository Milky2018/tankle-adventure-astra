import {angleDelta,contactDamage,redContact,phoenixReady} from './mechanics.js';

// Armour is spatial. A reflected ray uses its final segment's origin.
export function cityDamage(e,amount,origin,kind='cannon',part=null){
  const red=kind==='red',rear=Math.cos(angleDelta(Math.atan2(origin.x-e.x,origin.z-e.z),e.aim))<-.45;
  if(e.guardian&&!rear&&!red)return 0;
  if(e.id==='prototype'&&e.phase!=='vent'&&!rear&&!red)amount*=.4;
  if(['foundry','sorter'].includes(e.id)&&e.phase!=='vent'&&!red)return 0;
  if(e.parts?.some(p=>p.hp>0)){
    if(red){let remaining=amount;for(const part of e.parts){const dealt=Math.min(part.hp,remaining);part.hp-=dealt;remaining-=dealt;}return Math.min(e.hp,amount);}
    const exposed=part?.hp>0?part:null;
    if(!exposed)return 0;
    const dealt=Math.min(exposed.hp,amount);exposed.hp-=dealt;
    return dealt;
  }
  if(!red&&kind!=='ram'&&kind!=='mortar'&&e.type==='reflector'&&Math.cos(angleDelta(Math.atan2(origin.x-e.x,origin.z-e.z),e.aim))>.55)return 0;
  if(!red&&kind!=='ram'&&kind!=='mortar'&&e.type==='guard'&&!e.guardian&&!e.shieldRemoved&&e.phase!=='vent'&&Math.cos(angleDelta(Math.atan2(origin.x-e.x,origin.z-e.z),e.aim))>.55)amount*=.4;
  return Math.min(e.hp,amount);
}
export function cityContact(p,e){
  if(redContact(p))return contactDamage(p);
  if(e.type==='boss'||e.guardian||e.type==='elite'&&e.persistent)return 0;
  if(phoenixReady(p))return contactDamage(p);
  if(!p.overdrive||p.deployed||p.speed<1.3||e.type==='elite')return 0;
  if(e.type==='guard'&&!e.shieldRemoved&&Math.cos(angleDelta(Math.atan2(p.x-e.x,p.z-e.z),e.aim))>.55)return 0;
  return e.type==='scout'?e.hp:1;
}

export function armorAbsorbs(e,amount,origin,kind='cannon',part=null){
  // Probe armour before health/part truncation; never mutate the live boss here.
  const parts=(e.parts||[]).map(p=>({...p,hp:p.hp>0?Infinity:0}));
  const copy={...e,hp:Infinity,parts};
  return cityDamage(copy,amount,origin,kind,part?parts[e.parts.indexOf(part)]:null)<amount*.99;
}
export const magnetPullable=e=>['scout','skirmisher','miner','repairer'].includes(e.type);

// Hit recovery shares the existing damage protection window. Displacement is
// integrated over the frame interval, then resolved by normal world collision.
export const playerStunned = (p,time) => p.hp > 0 && time < (p.hurtUntil || 0);
export function beginPlayerHit(p,time,source){
  const dx=source?p.x-source.x:0,dz=source?p.z-source.z:0,length=Math.hypot(dx,dz);
  p.hurtAt=time;p.hurtUntil=p.invincible;p.speed=1;p.dockHold=0;
  p.knockX=length>.001?dx/length:-Math.sin(p.heading||0);
  p.knockZ=length>.001?dz/length:-Math.cos(p.heading||0);
}
export function hitDisplacement(p,time,dt){
  const progress=t=>{const u=Math.max(0,Math.min(1,(t-(p.hurtAt??-10))/.18));return 1-(1-u)**2;};
  const distance=p.hp>0?1.2*(progress(time)-progress(time-dt)):0;
  return {x:(p.knockX||0)*distance,z:(p.knockZ||0)*distance};
}
export function hitOpacity(p,time){
  return playerStunned(p,time)&&Math.floor((time-p.hurtAt)/.075)%2===0?.3:1;
}

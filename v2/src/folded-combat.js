import {angleDelta,contactDamage,redContact} from './mechanics.js';

// Armour is spatial. A reflected ray uses its final segment's origin.
export function cityDamage(e,amount,origin,kind='cannon',part=null){
  const red=kind==='red',rear=Math.cos(angleDelta(Math.atan2(origin.x-e.x,origin.z-e.z),e.aim))<-.45;
  if(e.guardian&&!rear&&!red)return 0;
  if(e.id==='foundry'&&e.phase!=='vent'&&!red)return 0;
  if(e.parts?.some(p=>p.hp>0)){
    if(red){let remaining=amount;for(const part of e.parts){const dealt=Math.min(part.hp,remaining);part.hp-=dealt;remaining-=dealt;}return Math.min(e.hp,amount);}
    const exposed=part?.hp>0?part:null;
    if(!exposed)return 0;
    const dealt=Math.min(exposed.hp,amount);exposed.hp-=dealt;
    return dealt;
  }
  if(!red&&kind!=='mortar'&&e.type==='reflector'&&Math.cos(angleDelta(Math.atan2(origin.x-e.x,origin.z-e.z),e.aim))>.55)return 0;
  if(!red&&kind!=='mortar'&&e.type==='guard'&&!e.guardian&&!e.shieldRemoved&&e.phase!=='vent'&&Math.cos(angleDelta(Math.atan2(origin.x-e.x,origin.z-e.z),e.aim))>.55)amount*=.4;
  return Math.min(e.hp,amount);
}
export function cityContact(p,e){
  if((e.type==='boss'||e.guardian)&&!redContact(p))return 0;
  return contactDamage(p);
}

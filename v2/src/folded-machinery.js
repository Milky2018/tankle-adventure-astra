import {circuitReady} from './folded-circuits.js';
import {currentVelocity} from './folded-mechanisms.js';
import {expansionCurrents,expansionBelts,expansionHeat} from './folded-expansion-layout.js';
import {cityBelts} from './folded-city-layout.js';
import {inRect,deckHeight,moveFolded,foldedSupport} from './folded-layout.js';

export function applyFloorHeat(player,dt,time,state){
  const floor=[...expansionHeat,...cityBelts.filter(b=>b.heat)].find(q=>inRect(player.x,player.z,q)&&Math.abs(deckHeight(q,player.z)-player.y)<.5&&(!q.release||!state[q.release])&&(!q.stop||!state[q.stop]));
  if(!floor)return;
  player.heat=Math.min(100,player.heat+floor.heat*dt);player.lastHeat=time;player.boostCooling=false;player.actionHeatAt=time;
  if(player.heat>=100)player.overheated=true;
}

export function conveyorVelocity(body,enemies=[],state={}){
  const belt=[...cityBelts,...expansionBelts].find(b=>inRect(body.x,body.z,b)&&Math.abs(deckHeight(b,body.z)-body.y)<.5);
  if(!belt||belt.stop&&state[belt.stop])return {x:0,z:0};
  if(belt.id.includes('feed-')){
    const owner=enemies.find(e=>e.id===(belt.id.startsWith('foundry')?'foundry':'keeper'));
    if(owner?.hp===0||owner?.parts[belt.id.endsWith('left')?0:1]?.hp===0)return {x:0,z:0};
  }
  if(belt.release&&state[belt.release])return {x:0,z:-4};
  return {x:belt.vx,z:belt.vz};
}

export function moveWithConveyor(body,dx,dz,dt,state,lifts=[],enemies=[]){
  const belt=conveyorVelocity(body,enemies,state);
  const current=currentVelocity(body.deployed&&foldedSupport(body.x,body.z,body.y,true,lifts)?.water&&expansionCurrents.find(c=>inRect(body.x,body.z,c)&&Math.abs(c.y-body.y)<.5),state);
  moveFolded(body,dx+(belt.x+(current?.x||0))*dt,dz+(belt.z+(current?.z||0))*dt,state,lifts);
}

export function stepLifts(lifts,state,player,dt,enemies=[]){
  const bodies=[player,...enemies.filter(e=>e.hp>0)];
  for(const lift of lifts){
    const aboard=body=>Math.abs(body.y-lift.y)<.2&&inRect(body.x,body.z,lift,-.85);
    const riders=bodies.filter(aboard);
    if(!circuitReady(state,lift.lock||lift.id,lift)||lift.locks&&!lift.locks.every(id=>circuitReady(state,id,lift)))continue;
    if(lift.settle){
      const next=Math.max(lift.stops[0],lift.y-dt*3);
      if(bodies.some(b=>!aboard(b)&&inRect(b.x,b.z,lift,.9)&&b.y+2.7>next&&b.y<lift.y))continue;
      for(const body of riders)body.y+=next-lift.y;
      lift.y=next;lift.destination=lift.stops[0];continue;
    }
    if(lift.y===lift.destination){lift.destination=lift.y===lift.stops[0]?lift.stops.at(-1):lift.stops[0];lift.wait=3;}
    const dwell=Math.min(lift.wait,dt),travel=dt-dwell;lift.wait-=dwell;
    if(travel<1e-9)continue;
    const next=lift.y+Math.max(-travel*5,Math.min(travel*5,lift.destination-lift.y));
    // Pause at a straddling hull; neither the player nor enemies can be sliced by a deck.
    if(bodies.some(body=>!aboard(body)&&inRect(body.x,body.z,lift,.9)&&Math.min(lift.y,next)<=body.y+2.7&&Math.max(lift.y,next)>=body.y))continue;
    for(const body of riders)body.y+=next-lift.y;
    const elapsed=Math.abs(next-lift.y)/5;
    lift.y=next;
    if(lift.y===lift.destination){lift.destination=lift.y===lift.stops[0]?lift.stops.at(-1):lift.stops[0];lift.wait=Math.max(0,3-(travel-elapsed));}
  }
}

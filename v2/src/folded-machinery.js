import {cityBelts} from './folded-city-layout.js';
import {inRect,deckHeight,moveFolded} from './folded-layout.js';

export function conveyorVelocity(body,enemies=[],state={}){
  const belt=cityBelts.find(b=>inRect(body.x,body.z,b)&&Math.abs(deckHeight(b,body.z)-body.y)<.5);
  if(!belt)return {x:0,z:0};
  if(belt.id.includes('feed-')){
    const owner=enemies.find(e=>e.id===(belt.id.startsWith('foundry')?'foundry':'keeper'));
    if(owner?.parts[belt.id.endsWith('left')?0:1]?.hp===0)return {x:0,z:0};
  }
  if(belt.release&&state[belt.release])return {x:0,z:-4};
  return {x:belt.vx,z:belt.vz};
}

export function moveWithConveyor(body,dx,dz,dt,state,lifts=[],enemies=[]){
  const belt=conveyorVelocity(body,enemies,state);
  moveFolded(body,dx+belt.x*dt,dz+belt.z*dt,state,lifts);
}

export function stepLifts(lifts,state,player,dt,enemies=[]){
  const bodies=[player,...enemies.filter(e=>e.hp>0)];
  for(const lift of lifts){
    const aboard=body=>Math.abs(body.y-lift.y)<.2&&inRect(body.x,body.z,lift,-.85);
    const riders=bodies.filter(aboard);
    if(!state[lift.lock||lift.id])continue;
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

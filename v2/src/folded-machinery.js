import {cityBelts} from './folded-city-layout.js';
import {inRect,deckHeight,moveFolded} from './folded-layout.js';

export function conveyorVelocity(body,enemies=[]){
  const belt=cityBelts.find(b=>inRect(body.x,body.z,b)&&Math.abs(deckHeight(b,body.z)-body.y)<.5);
  if(!belt)return {x:0,z:0};
  if(belt.id.includes('feed-')){
    const owner=enemies.find(e=>e.id===(belt.id.startsWith('foundry')?'foundry':'keeper'));
    if(owner?.parts[belt.id.endsWith('left')?0:1]?.hp===0)return {x:0,z:0};
  }
  return {x:belt.vx,z:belt.vz};
}

export function moveWithConveyor(body,dx,dz,dt,state,lifts=[],enemies=[]){
  const belt=conveyorVelocity(body,enemies);
  moveFolded(body,dx+belt.x*dt,dz+belt.z*dt,state,lifts);
}

export function stepLifts(lifts,state,player,dt,enemies=[]){
  const bodies=[player,...enemies.filter(e=>e.hp>0)];
  for(const lift of lifts){
    const aboard=body=>Math.abs(body.y-lift.y)<.2&&inRect(body.x,body.z,lift,-.85);
    const riders=bodies.filter(aboard);
    const enabled=lift.id==='carrier'?(lift.used||state.brake||riders.length>0):!!state[lift.lock||lift.id];
    if(enabled&&!lift.used){lift.used=true;lift.destination=lift.y<lift.stops.at(-1)-.1?lift.stops.at(-1):lift.stops[0];lift.wait=.6;}
    if(lift.wait>0){lift.wait=Math.max(0,lift.wait-dt);continue;}
    if(enabled&&Math.abs(lift.y-lift.destination)<.01){lift.destination=lift.destination===lift.stops[0]?lift.stops.at(-1):lift.stops[0];lift.wait=3;continue;}
    const next=lift.y+Math.max(-dt*5,Math.min(dt*5,lift.destination-lift.y));
    // Pause at a straddling hull; neither the player nor enemies can be sliced by a deck.
    if(bodies.some(body=>!aboard(body)&&inRect(body.x,body.z,lift,.9)&&Math.min(lift.y,next)<=body.y+2.7&&Math.max(lift.y,next)>=body.y))continue;
    for(const body of riders)body.y+=next-lift.y;
    lift.y=next;
  }
}

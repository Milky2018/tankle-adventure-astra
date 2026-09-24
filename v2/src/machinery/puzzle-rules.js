import { clamp, approach } from '../player/mechanics.js';
import { carrierRoute } from '../content/prototypes/puzzle-layout.js';

export function createRailPuzzle(saved={}){
  const state={switches:[!!saved.switches?.[0],!!saved.switches?.[1]],secured:!!saved.secured,solved:!!saved.solved,moving:false,distance:0,direction:1,route:[]};
  if(state.secured||state.solved){state.secured=true;state.solved=true;}
  function length(){let total=0;for(let i=1;i<state.route.length;i++)total+=Math.hypot(state.route[i][0]-state.route[i-1][0],state.route[i][1]-state.route[i-1][1]);return total;}
  function position(distance=state.distance){
    if(state.secured)return {x:-24,z:-94};
    if(!state.route.length)return {x:-38,z:-104};
    for(let i=1;i<state.route.length;i++){
      const [ax,az]=state.route[i-1],[bx,bz]=state.route[i],d=Math.hypot(bx-ax,bz-az);
      if(distance<=d)return {x:ax+(bx-ax)*distance/d,z:az+(bz-az)*distance/d};distance-=d;
    }const [x,z]=state.route.at(-1);return {x,z};
  }
  function act(id){
    if(state.solved)return false;
    if(id==='rail-signal'){if(!state.moving)return false;state.direction=-1;return true;}
    if(id==='rail-carrier'){
      if(state.moving)return false;
      state.route=carrierRoute(state.switches);state.distance=0;state.direction=1;state.moving=true;return true;
    }
    const index=id==='rail-a'?0:id==='rail-b'?1:-1;if(index<0||state.moving)return false;
    state.switches[index]=!state.switches[index];return true;
  }
  function update(dt,blocked=()=>false){
    if(!state.moving)return false;
    const next=clamp(state.distance+dt*4*state.direction,0,length());if(blocked(position(next)))return false;state.distance=next;
    if(next===0&&state.direction<0){state.moving=false;state.route=[];return true;}
    if(next>=length()){state.moving=false;state.secured=state.switches.every(Boolean);state.solved=state.secured;if(!state.secured){state.route=[];state.distance=0;}return true;}
    return false;
  }
  return {state,act,update,position,serialize:()=>({switches:[...state.switches],secured:state.secured,solved:state.solved})};
}
export function createBasinPuzzle(saved={}){
  const state={level:clamp(saved.level||0,0,1),filling:false,locked:!!saved.locked,solved:!!saved.solved};
  if(state.solved){state.level=0;state.filling=false;state.locked=true;}
  function act(id,occupied=false){
    if(state.solved||occupied)return false;
    if(id==='basin-lock'&&state.level>=.98&&!state.locked){state.locked=true;return true;}
    return false;
  }
  function update(dt){const solved=state.solved;state.level=approach(state.level,state.filling?1:0,dt/3);if(state.locked&&!state.filling&&state.level===0)state.solved=true;return !solved&&state.solved;}
  function press(pressed,occupied=false){state.filling=!state.solved&&pressed&&!occupied;}
  return {state,act,press,update,serialize:()=>({...state})};
}
export function createGutterPuzzle(saved={}){
  const state={angles:[0,0].map((_,i)=>Number.isInteger(saved.angles?.[i])?clamp(saved.angles[i],0,2):0),fill:clamp(saved.fill||0,0,1),unplugged:!!saved.unplugged||!!saved.grown,grown:!!saved.grown};
  if(state.grown){state.angles=[1,2];state.fill=1;}
  function act(id){const index=id==='gutter-a'?0:id==='gutter-b'?1:-1;if(index<0||state.grown)return false;state.angles[index]=(state.angles[index]+1)%3;return true;}
  function update(dt,connected=true){if(state.grown)return false;state.fill=approach(state.fill,state.unplugged&&connected&&state.angles[0]===1&&state.angles[1]===2?1:0,dt/2);if(state.fill===1){state.grown=true;return true;}return false;}
  function unplug(){if(state.unplugged)return false;state.unplugged=true;return true;}
  return {state,act,unplug,update,serialize:()=>({...state,angles:[...state.angles]})};
}

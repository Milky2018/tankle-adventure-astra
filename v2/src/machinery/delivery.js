const route=[[110,-24,30],[122,-24,30],[122,-24,24],[122,-16,0],[130,-16,0],[130,-16,18]];
export function createDelivery(completed=false){
 const state={position:[...(completed?route.at(-1):route[0])],leg:completed?route.length:1,heading:0,complete:completed};
 function update(dt,started,occupied){
  if(!started||state.complete||dt<=0)return false;
  let left=dt*3;
  while(left>0&&state.leg<route.length){
   const end=route[state.leg],delta=end.map((n,i)=>n-state.position[i]),length=Math.hypot(...delta),step=Math.min(left,length,.2),next=state.position.map((n,i)=>n+delta[i]/length*step);
   if(occupied(next))return false;
   state.position=next;state.heading=Math.atan2(delta[0],delta[2]);left-=step;
   if(length<=step+1e-8)state.leg++;
  }
  if(state.leg===route.length){state.complete=true;return true;}return false;
 }
 return Object.assign(state,{update});
}

// Shot timing also drives the physical renewal; skipping reaches the same state.
export const ENDING_DURATION=26;
export const openingCarrier={x:8,y:-8,z:79};
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function finaleState(seconds,completed=false){
  const t=seconds|| (completed?ENDING_DURATION:0);
  return {power:smooth((t-2)/6),wake:smooth((t-21)/2),travel:smooth((t-23)/2)};
}
export function endingShot(seconds){
  if(seconds<9)return {id:'coupling',eye:[7,-49,9],at:[0,-54,-1]};
  if(seconds<15)return {id:'rail',eye:[8,12,25],at:[0,7,12]};
  if(seconds<20)return {id:'garden',eye:[87,-2,-28],at:[81,-5.7,-35.3]};
  return {id:'awakening',eye:[14,-3,86],at:[8,-7.5,79]};
}

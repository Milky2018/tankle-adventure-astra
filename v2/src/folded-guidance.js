import {districtPlans} from './folded-expansion-layout.js';
// Door frames mark local openings. No weapon or ability pictogram supplies
// the solution to an unexplored route.
export const routeSigns=[
  ...districtPlans.filter(d=>d.ability).map(d=>({id:`${d.id}-approach`,x:d.approach[0][0],y:d.y,z:d.approach[0][1],yaw:Math.atan2(d.approach[1][0]-d.approach[0][0],d.approach[1][1]-d.approach[0][1])})),
  {id:'foundry-service',x:-14,y:-8,z:85,yaw:Math.PI/2},
  {id:'foundry-return',x:0,y:-8,z:74,yaw:0},
  {id:'prototype-return',x:-20,y:-16,z:117,yaw:0},
  {id:'hub-freight',x:0,y:0,z:5,yaw:0},
  {id:'training-garden',x:-26,y:0,z:22,yaw:0},
  {id:'loading-loop',x:-12,y:0,z:-40,yaw:0},
  {id:'hub-garden',x:-16,y:0,z:27,yaw:Math.PI/2},
  {id:'roof-optics',x:172,y:24,z:-30,yaw:Math.PI/2},
  {id:'roof-circulation',x:162,y:24,z:-19,yaw:0},
  {id:'rig-return',x:214,y:-24,z:101,yaw:Math.PI},
  {id:'predecessor-rail',x:82,y:-40,z:40,yaw:Math.PI},
  {id:'inner-lane',x:122,y:24,z:-25,yaw:0}
];

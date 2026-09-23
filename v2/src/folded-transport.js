// Freight cover has the same bounds for hull collision, bullets and rendering.
// Occupied crossings stop the carrier rather than pushing a tank off its floor.
export const transportSolids=[
 {id:'assembly-carrier',x:-142,y:8,z:-35,w:10,d:3,h:3.5,permanent:true,theme:'transit',motion:{axis:'x',min:-142,max:-128,speed:2.4}},
 {id:'intro-cargo',x:-16,y:0,z:-4,w:4,d:3,h:2.8,permanent:true,theme:'transit',motion:{axis:'x',min:-17,max:-11,speed:2.4}},
 {id:'press-carrier',x:-30,y:-16,z:48,w:4,d:2.6,h:2.4,permanent:true,theme:'foundry',motion:{axis:'x',min:-42,max:-29,speed:2.4}},
 {id:'dispatch-carrier-a',x:-125,y:8,z:-2,w:6,d:3,h:2.8,permanent:true,theme:'transit',motion:{axis:'x',min:-138,max:-77,speed:3.2}},
 {id:'dispatch-carrier-b',x:-93,y:8,z:7,w:5,d:3,h:2.8,permanent:true,theme:'transit',motion:{axis:'x',min:-134,max:-74,speed:2.4}}
];
export function stepTransport(solids,dt,bodies){
 for(const s of solids){
  const m=s.motion;if(!m)continue;
  const axis=m.axis,other=axis==='x'?'z':'x',size=axis==='x'?'w':'d',otherSize=axis==='x'?'d':'w';
  let remaining=dt;
  // Swept substeps also protect manual simulation at a large time step.
  while(remaining>0){
   const delta=Math.min(remaining,.05);remaining-=delta;
   const direction=s.direction||1,next=Math.max(m.min,Math.min(m.max,s[axis]+direction*m.speed*delta));
   if(bodies.some(b=>b.hp!==0&&Math.abs(b.y-s.y)<3&&b[axis]+.9>Math.min(next,s[axis])&&b[axis]-.9<Math.max(next,s[axis])+s[size]&&b[other]+.9>s[other]&&b[other]-.9<s[other]+s[otherSize]))break;
   s[axis]=next;if(next===m.min||next===m.max)s.direction=-direction;
  }
 }
}

// Local-space solids shared by the visible housing and projectile queries.
// The opening faces local +Z; top trays instead open toward +Y.
export function controlHousingParts(c) {
  const part=(x,y,z,w,h,d)=>({x,y,z,w,h,d});
  if(c.surface==='top')return [
    part(0,-.4,0,2,.2,2),
    part(-.95,-.2,0,.1,.4,2),part(.95,-.2,0,.1,.4,2),
    part(0,-.2,-.95,2,.4,.1),part(0,-.2,.95,2,.4,.1),
  ];
  if(c.kind==='laser')return [part(0,0,-.2,(c.radius??1.8)*2+.3,(c.radius??1.8)*2+.3,.2)];
  if(!c.facing&&!c.requires&&!c.pressure&&!c.cycle)return [];
  return [
    part(0,0,-.4,2.4,2.4,.25),
    part(-1.1,0,.35,.2,2.4,1.6),part(1.1,0,.35,.2,2.4,1.6),
    part(0,-1.1,.35,2.4,.2,1.6),part(0,1.1,.35,2.4,.2,1.6),
  ];
}
export function controlCoverPart(c) {
  if(!c.requires&&!c.pressure&&!c.cycle)return null;
  if(c.surface==='top')return {x:0,y:.3,z:0,w:2,h:.18,d:2};
  const size=c.kind==='laser'?(c.radius??1.8)*2+.25:2.1;
  return {x:0,y:0,z:1.25,w:size,h:size,d:.18};
}

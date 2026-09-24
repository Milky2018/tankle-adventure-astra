export const inRect=(x,z,r,margin=0)=>x>=r.x-margin&&x<=r.x+r.w+margin&&z>=r.z-margin&&z<=r.z+r.d+margin;
export const deckHeight=(d,z)=>d.y+(d.rise||0)*Math.max(0,Math.min(1,(z-d.z)/d.d));
export function supportAt(decks,lifts,x,z,y,water=false){
  let best=null;
  for(const d of [...decks,...lifts]){
    if(d.water&&!water||!inRect(x,z,d))continue;
    const height=deckHeight(d,z),delta=Math.abs(height-y);
    if(delta<=.45&&(!best||delta<best.delta))best={...d,height,delta};
  }
  return best;
}

// Collision uses the union of the authored decks. Render each point on a flat
// surface once, so adjoining rooms cannot compete for the same depth sample.
function subtractDeck(r,cut){
  const x=Math.max(r.x,cut.x),right=Math.min(r.x+r.w,cut.x+cut.w);
  const z=Math.max(r.z,cut.z),bottom=Math.min(r.z+r.d,cut.z+cut.d);
  if(x>=right||z>=bottom)return {outside:[r],inside:[]};
  return {outside:[{...r,w:x-r.x},{...r,x:right,w:r.x+r.w-right},
    {...r,x,w:right-x,d:z-r.z},{...r,x,w:right-x,z:bottom,d:r.z+r.d-bottom}].filter(p=>p.w>0&&p.d>0),
    inside:[{...r,x,z,w:right-x,d:bottom-z}]};
}
export function renderDecks(decks,lifts){
  const result=[];
  for(const deck of decks){
    let parts=[deck];
    if(!deck.rise)for(const previous of result){
      if(previous.rise||previous.y!==deck.y)continue;
      parts=parts.flatMap(r=>subtractDeck(r,previous).outside);
    }
    result.push(...parts);
  }
  // A ground slab remains below the main platform, allowing safe recall from
  // underneath. Recess its visual surface so a docked lift never shares it.
  return result.flatMap(d=>{
    let parts=[d];
    if(!d.rise)for(const lift of lifts.filter(l=>l.stops[0]===d.y))parts=parts.flatMap(r=>{
      const {outside,inside}=subtractDeck(r,lift);
      return [...outside,...inside.map(p=>({...p,recess:lift.recess??.12}))];
    });
    return parts;
  });
}

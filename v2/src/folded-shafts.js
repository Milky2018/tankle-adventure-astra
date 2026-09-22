// Open the entire rider volume, including the landing above the lift.
export function openLiftShafts(decks,lifts){
  return decks.flatMap(deck=>{
    let parts=[deck];
    for(const lift of lifts){
      parts=parts.flatMap(p=>{
        const left=Math.max(p.x,lift.x),right=Math.min(p.x+p.w,lift.x+lift.w);
        const near=Math.max(p.z,lift.z),far=Math.min(p.z+p.d,lift.z+lift.d);
        const height=z=>p.y+(p.rise||0)*(z-p.z)/p.d;
        if(left>=right||near>=far||Math.max(height(near),height(far))<=lift.stops[0]+.01||Math.min(height(near),height(far))>=lift.stops.at(-1)+3.4)return [p];
        return [[p.x,p.z,left-p.x,p.d],[right,p.z,p.x+p.w-right,p.d],[left,p.z,right-left,near-p.z],[left,far,right-left,p.z+p.d-far]]
          .filter(([, ,w,d])=>w>0&&d>0)
          .map(([x,z,w,d])=>({...p,x,z,w,d,y:height(z),...(p.rise?{rise:p.rise*d/p.d}:{})}));
      });
    }
    return parts;
  });
}

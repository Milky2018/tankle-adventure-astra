import {deckHeight} from './hoist-layout.js';

const clearance=.28;
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const point=(d,x,z)=>[x,(d.lift?d.y:deckHeight(d,z))+clearance,z];

// Keep every bend square, including short stepped runs beside sloped floors.
export function orthogonalCircuit(points,score=()=>0){
  const out=[points[0].slice()];
  for(let i=1;i<points.length;i++){
    const a=out.at(-1),b=points[i],rise=Math.abs(b[1]-a[1]),run=Math.hypot(b[0]-a[0],b[2]-a[2]);
    const steps=rise>.01&&run>.01?Math.max(1,Math.ceil(rise/.4)):1;
    for(let n=1;n<=steps;n++){
      const start=out.at(-1),end=a.map((v,j)=>n===steps?b[j]:v+(b[j]-v)*n/steps);
      const orders=end[1]>=start[1]?[[1,0,2],[1,2,0],[0,1,2],[2,1,0],[0,2,1],[2,0,1]]:[[0,2,1],[2,0,1],[0,1,2],[2,1,0],[1,0,2],[1,2,0]];
      const candidates=orders.map(order=>{const ps=[start];for(const axis of order){const p=ps.at(-1).slice();p[axis]=end[axis];if(distance(p,ps.at(-1))>1e-8)ps.push(p);}return ps;});
      const ranked=candidates.map(ps=>({ps,cost:score(ps)})).sort((a,b)=>a.cost-b.cost);out.push(...ranked[0].ps.slice(1));
    }
  }
  const compact=[];
  for(const p of out){
    if(compact.length&&distance(p,compact.at(-1))<1e-7)continue;
    if(compact.length>1){const a=compact.at(-2),b=compact.at(-1);if([0,1,2].some(axis=>(b[axis]-a[axis])*(p[axis]-b[axis])>0&&[0,1,2].every(j=>j===axis||Math.abs(a[j]-b[j])<1e-8&&Math.abs(b[j]-p[j])<1e-8)))compact.pop();}
    compact.push(p);
  }
  return compact;
}

// Follow connected floor surfaces and fixed lift pillars instead of drawing a
// straight chord through stacked rooms. This graph is built once with the world.
export function createCircuitRouter(decks,lifts,solids){
  const surfaces=decks.map(d=>({...d})),edges=surfaces.map(()=>[]);
  for(const l of lifts)for(const x of [l.x+.3,l.x+l.w-.3])for(const y of l.stops){surfaces.push({id:l.id,x,z:l.z-.35,w:0,d:0,y,lift:l});edges.push([]);}
  for(const l of lifts)for(const y of l.stops)for(const r of [
    {x:l.x-.2,z:l.z-.4,w:l.w+.4,d:.7},
    {x:l.x-.2,z:l.z+l.d-.3,w:l.w+.4,d:.5},
    {x:l.x-.2,z:l.z,w:.5,d:l.d},
    {x:l.x+l.w-.3,z:l.z,w:.5,d:l.d},
  ]){surfaces.push({...r,y,id:`${l.id}-conduit-rim`});edges.push([]);}
  function connect(i,j,a,b=a){const cost=distance(point(surfaces[i],surfaces[i].x+surfaces[i].w/2,surfaces[i].z+surfaces[i].d/2),a)+distance(a,b)+distance(b,point(surfaces[j],surfaces[j].x+surfaces[j].w/2,surfaces[j].z+surfaces[j].d/2));edges[i].push({to:j,a,b,cost});edges[j].push({to:i,a:b,b:a,cost});}
  for(let i=0;i<surfaces.length;i++)for(let j=i+1;j<surfaces.length;j++){
    const a=surfaces[i],b=surfaces[j];
    if(a.lift&&a.lift===b.lift&&a.x===b.x){connect(i,j,[a.x,a.y+clearance,a.z],[b.x,b.y+clearance,b.z]);continue;}
    if(a.lift||b.lift){const pillar=a.lift?a:b,floor=a.lift?b:a;if(floor.lift)continue;const x=clamp(pillar.x,floor.x,floor.x+floor.w),z=clamp(pillar.z,floor.z,floor.z+floor.d),p=[pillar.x,pillar.y+clearance,pillar.z],q=point(floor,x,z);if(distance(p,q)<1.1)connect(i,j,a.lift?p:q,a.lift?q:p);continue;}
    const x0=Math.max(a.x,b.x),x1=Math.min(a.x+a.w,b.x+b.w),z0=Math.max(a.z,b.z),z1=Math.min(a.z+a.d,b.z+b.d);
    if(x0>x1+.01||z0>z1+.01)continue;
    let z=(z0+z1)/2;const slope=(a.rise||0)/a.d-(b.rise||0)/b.d;
    if(Math.abs(slope)>1e-8)z=clamp(z-(deckHeight(a,z)-deckHeight(b,z))/slope,z0,z1);
    if(Math.abs(deckHeight(a,z)-deckHeight(b,z))>.06)continue;
    connect(i,j,point(a,(x0+x1)/2,z),point(b,(x0+x1)/2,z));
  }
  function nearest(p){let best=null;for(let i=0;i<surfaces.length;i++){const d=surfaces[i],q=point(d,clamp(p[0],d.x,d.x+d.w),clamp(p[2],d.z,d.z+d.d)),cost=distance(p,q);if(!best||cost<best.cost)best={i,q,cost};}return best;}
  function supported(a,b){const length=distance(a,b);for(let t=0;t<=length;t+=.6){const u=length?t/length:0,p=a.map((v,i)=>v+(b[i]-v)*u);if(lifts.some(l=>p[0]>l.x+.5&&p[0]<l.x+l.w-.5&&p[2]>l.z+.5&&p[2]<l.z+l.d-.5&&l.stops.some(y=>Math.abs(p[1]-y-clearance)<.1))||!surfaces.some(d=>!d.lift&&p[0]>=d.x-.03&&p[0]<=d.x+d.w+.03&&p[2]>=d.z-.03&&p[2]<=d.z+d.d+.03&&Math.abs(p[1]-deckHeight(d,p[2])-clearance)<.08))return false;}return true;}
  function compact(points){const out=[points[0]];for(let i=0;i<points.length-1;){let j=points.length-1;while(j>i+1&&!supported(points[i],points[j]))j--;out.push(points[j]);i=j;}return out;}
  // Find the portion of a segment inside a closed prop, with room for its casing.
  function crossing(a,b,s){if(distance(a,b)<1e-6)return null;let lo=0,hi=1;for(const [axis,min,max]of [[0,s.x-.22,s.x+s.w+.22],[1,s.y-.02,s.y+s.h+.22],[2,s.z-.22,s.z+s.d+.22]]){const v=b[axis]-a[axis];if(Math.abs(v)<1e-8){if(a[axis]<=min+1e-6||a[axis]>=max-1e-6)return null;}else {const x=(min-a[axis])/v,y=(max-a[axis])/v;lo=Math.max(lo,Math.min(x,y));hi=Math.min(hi,Math.max(x,y));if(hi-lo<1e-7)return null;}}return [lo,hi];}
  const obstacles=solids.filter(s=>!s.invisible&&!s.rail&&!s.motion);
  const shafts=lifts.flatMap(l=>l.stops.map(y=>({id:`${l.id}-shaft`,x:l.x+.6,z:l.z+.6,w:l.w-1.2,d:l.d-1.2,y:y-.05,h:.6})));
  const bendCosts=new Map();
  function bendCost(ps){return ps.reduce((sum,p,i)=>{
    if(!i)return sum;const a=ps[i-1],key=`${a}:${p}`;
    if(!bendCosts.has(key))bendCosts.set(key,obstacles.reduce((n,s)=>n+(crossing(a,p,s)?1000:0),0)+(supported(a,p)?0:distance(a,p)));
    return sum+bendCosts.get(key);
  },0);}
  function avoid(points,obstacles){
    let out=points.filter((p,i)=>!i||distance(p,points[i-1])>1e-6);
    for(let pass=0;pass<80;pass++){
      let hit=null;
      for(let i=1;i<out.length&&!hit;i++)for(const s of obstacles){
        const range=crossing(out[i-1],out[i],s);
        if(range){hit={i,s,range};break;}
      }
      if(!hit)return out.filter((p,i)=>!i||distance(p,out[i-1])>.01);
      const {i,s,range}=hit;let last=i,finish=range;
      while(finish[1]>=1-1e-8&&last<out.length-1){const next=crossing(out[last],out[last+1],s);if(!next)break;finish=next;last++;}
      const a=out[i-1],b=out[last],enter=a.map((v,k)=>v+(out[i][k]-v)*range[0]),exit=out[last-1].map((v,k)=>v+(b[k]-v)*finish[1]);
      if(i===1&&range[0]===0||last===out.length-1&&finish[1]===1)throw new Error(`Circuit endpoint inside ${s.id}`);
      const x0=s.x-.34,x1=s.x+s.w+.34,z0=s.z-.34,z1=s.z+s.d+.34;
      const candidates=[[[x0,enter[1],enter[2]],[x0,exit[1],exit[2]]],[[x1,enter[1],enter[2]],[x1,exit[1],exit[2]]],[[enter[0],enter[1],z0],[exit[0],exit[1],z0]],[[enter[0],enter[1],z1],[exit[0],exit[1],z1]]].map(mid=>orthogonalCircuit([enter,...mid,exit]));
      const clear=ps=>ps.every((p,j)=>!j||!obstacles.some(o=>crossing(ps[j-1],p,o)));
      const detour=candidates.filter(ps=>clear(ps)&&(Math.abs(enter[1]-exit[1])>.1||ps.every((p,j)=>!j||supported(ps[j-1],p)))).sort((a,b)=>a.reduce((n,p,j)=>n+(j?distance(a[j-1],p):0),0)-b.reduce((n,p,j)=>n+(j?distance(b[j-1],p):0),0))[0];
      const over=orthogonalCircuit([enter,[enter[0],s.y+s.h+.34,enter[2]],[exit[0],s.y+s.h+.34,exit[2]],exit]);
      out.splice(i,last-i,...(detour||over));
    }
    throw new Error('Circuit obstacle detour did not converge');
  }
  return (start,end)=>{
    const from=nearest(start),to=nearest(end),costs=new Map([[from.i,0]]),previous=new Map(),pending=new Set([from.i]);
    while(pending.size){let id=null;for(const n of pending)if(id===null||costs.get(n)<costs.get(id))id=n;pending.delete(id);if(id===to.i)break;
      for(const edge of edges[id]){const cost=costs.get(id)+edge.cost;if(cost<(costs.get(edge.to)??Infinity)){costs.set(edge.to,cost);previous.set(edge.to,{...edge,from:id});pending.add(edge.to);}}
    }
    if(from.i!==to.i&&!previous.has(to.i))throw new Error(`Disconnected circuit surfaces: ${surfaces[from.i].id} -> ${surfaces[to.i].id}`);
    const steps=[];for(let id=to.i;id!==from.i;){const e=previous.get(id);steps.unshift(e);id=e.from;}
    const points=[from.q];for(const e of steps)points.push(e.a,e.b);points.push(to.q);
    const square=orthogonalCircuit([start,...compact(points),end],bendCost);
    return avoid(avoid(square,shafts),obstacles);
  };
}

import {createCircuitRouter,orthogonalCircuit} from './folded-circuit-routing.js';
import {SIGNAL} from './folded-visibility.js';

export const circuitEventSources=[
  {id:'inner-thermal',x:147.5,y:-6.7,z:97.5},
  {id:'sorter',x:44,y:-6.7,z:-154},
  {id:'guardian',x:202,y:17.3,z:64},
  {id:'rail-crossing',x:-162,y:9.3,z:-66},
  {id:'coolant-return',x:324.5,y:-22.7,z:112.6,ground:-24},
];

export function circuitLinks(controls,solids,lifts,decks=null,architecture=[]){
  const route=decks?createCircuitRouter(decks,lifts,[...solids,...architecture]):null;
  const links=[];
  for(const c of controls){
    if(c.slide)continue;
    const ids=c.id==='relay-east'?['relays']:c.id==='loading-return'?['loading-return','bridge-crane']:[c.id];
    const endpoints=[...solids.filter(s=>ids.includes(s.id)&&!s.permanent||ids.includes(s.rail?.release)||ids.includes(s.rail?.latch)),...lifts.filter(l=>ids.includes(l.lock||l.id)||l.locks?.some(id=>ids.includes(id))),...controls.filter(t=>t.requires===c.id).map(t=>({...t,y:t.ground??t.y-1.3}))];
    if(c.id==='signal')endpoints.push({id:'signal-dish',x:204,y:40,z:146});
    if(c.id==='rail-repair')endpoints.push({id:'cargo-rail',x:-18,y:0,z:25});
    if(c.id==='maintenance')endpoints.push({id:'tender-drive',x:108,y:-24,z:32});
    if(c.id==='reservoir-inlet')endpoints.push({id:'reservoir-diverter',x:-100,y:-8,z:98});
    if(c.id==='coolant-bypass')endpoints.push({id:'coolant-runout',x:284,y:-24,z:106});
    for(const target of endpoints){
      if(target.red&&target.id===c.id)continue;
      if(target.localControl===c.id){links.push({id:c.id,target:target.id,local:true,points:[[c.x,c.y,c.z],[c.x,c.y-.8,c.z]]});continue;}
      const ground=c.ground??c.y-1.3,end=[target.x+(target.w||0)/2,(target.y??target.stops[0])+.12,target.z+(target.d||0)/2];
      if(target.stops){
        end[0]=Math.max(target.x+.3,Math.min(target.x+target.w-.3,c.x));
        end[2]=Math.max(target.z+.3,Math.min(target.z+target.d-.3,c.z));
        end[1]=target.stops.reduce((best,y)=>Math.abs(y-ground)<Math.abs(best-ground)?y:best)+.12;
      }
      let points=[[c.x,ground+.12,c.z],[c.x,ground+.12,end[2]],[end[0],ground+.12,end[2]],end];
      if(c.id==='reservoir-inlet')points=[[c.x,ground+.24,c.z],[-72,-7.76,114],[-100,-7.76,114],[-100,-7.76,98]];
      if(c.id==='coolant-bypass')points=[[278,-23.76,117],[282,-23.76,117],[282,-23.76,106],[284,-23.76,106]];
      if(c.id==='loading-return'&&target.id!=='loading-return')points=[[32,-7.88,-58],[30,-7.88,-58],[18,-7.88,-46],[18,.12,-46],[18,.12,-34],[0,.12,-34],end];
      if(c.id==='load'){
        points=[[123,.12,-13],[123,.12,-9],[110,.12,-9],[110,.12,-14],end];
        if(target.id==='carrier')points=[[123,.12,-13],[123,.12,-9],[110,.12,-9],[110,.12,-18],[110,8.12,-42],[110,8.12,-62],[78,8.12,-62],end];
      }
      if(c.id==='proving-inspection')points=[[c.x,16.12,c.z],[192,16.12,-154],[6,16.12,-154],end];
      if(c.id==='roof-express')points=[[76,24.12,-28],[76,24.12,-32],...(target.y<24?[[76,24.12,-28],[76,.12,44]]:[]),end];
      if(c.id==='guardian'&&target.x===156)points=[[202,16.12,64],[202,16.12,38],[230,16.12,38],[230,16.12,36],[230,24.12,12],[230,24.12,6],[242,24.12,6],[242,24.12,-28],[162,24.12,-28],end];
      if(c.id==='pump'&&target.x<0)points=[[c.x,c.y,c.z],[c.x,ground+4.3,c.z],[c.x,ground+4.3,-11.5],[c.x,-7.88,-11.5],[58,-7.88,-30],[-26,-7.88,-30],end];
      if(c.id==='garden-optical'){
        const common=[[232,24.12,-9.5],[242,24.12,-9.5],[242,24.12,6],[230,24.12,6],[230,24.12,12],[230,16.12,36],[202,16.12,36],[202,16.12,6]];
        points=[...common,[end[0],16.12,6],end];
      }
      if(c.id==='pressure-return'){
        const start=[218,-15.88,18];
        if(target.x===248)points=[start,[254,-15.88,18],[254,-15.88,28],[254,-23.66,98],end];
        if(target.x===64){end[1]=-13.1;points=[start,[134,-15.88,18],[134,-15.88,30],[110,-15.88,30],[110,-15.88,18],[70,-15.88,18],[70,-15.88,12],end];}
        if(target.x===116){end[1]=-15.71;points=[start,[134,-15.88,18],[134,-15.88,30],[122,-15.88,30],end];}
        if(target.x===104)points=[start,[134,-15.88,18],[134,-15.88,30],[122,-15.88,30],[122,-15.88,24],[122,.12,-24],[110,.12,-24],end];
      }
      if(c.kind==='magnet'&&!c.slide){
        const y=ground+.24,start=[c.x,y,c.z];
        if(c.id==='rail-repair')points=[start,[-16.9,y,23],[-16.9,y,30],[-8,y,30],[-8,y,8],[-8,9.5,8],[-2,9.5,8],[-2,9.5,18]];
        else if(c.id==='arsenal-return'&&target.y===0){
          // Cross above the local shutter, then follow the supported return ramp.
          points=[start,[c.x,11.8,-54],[-99.6,11.8,-54],[-99.6,y,-54],[-54,y,-54],[-54,y,-48],[-54,.24,-16],[-54,.24,-15.35]];
        }
      }
      if(route){
        const facing=c.facing||[0,0,1],socket=[c.x+facing[0]*.4,c.y+(c.surface==='top'?.08:-.45),c.z+facing[2]*.4];
        const foot=[socket[0],ground+.28,socket[2]],lead=[socket];
        const plinth=solids.find(s=>s.permanent&&s.y<=ground+.05&&socket[0]>s.x&&socket[0]<s.x+s.w&&socket[2]>s.z&&socket[2]<s.z+s.d&&ground<s.y+s.h);
        if(plinth){
          const exits=[[plinth.x-.34,socket[2]],[plinth.x+plinth.w+.34,socket[2]],[socket[0],plinth.z-.34],[socket[0],plinth.z+plinth.d+.34]];
          exits.sort((a,b)=>Math.hypot(a[0]-end[0],a[1]-end[2])-Math.hypot(b[0]-end[0],b[1]-end[2]));
          const [x,z]=c.id==='mortar-cache'?[plinth.x+plinth.w+.34,socket[2]]:exits[0];lead.push([socket[0],plinth.y+plinth.h+.28,socket[2]],[x,plinth.y+plinth.h+.28,z]);foot[0]=x;foot[2]=z;
        }
        let finish;
        const blocked=p=>lifts.some(l=>p[0]>l.x+.5&&p[0]<l.x+l.w-.5&&p[2]>l.z+.5&&p[2]<l.z+l.d-.5&&l.stops.some(y=>Math.abs(p[1]-y-.28)<.1))||[...solids,...architecture].some(s=>!s.invisible&&!s.motion&&!s.rail&&p[0]>s.x-.23&&p[0]<s.x+s.w+.23&&p[2]>s.z-.23&&p[2]<s.z+s.d+.23&&p[1]>s.y-.02&&p[1]<s.y+s.h+.23);
        const candidates=[];
        if(target.stops){for(const x of [target.x+.3,target.x+target.w-.3])for(const dz of [-.35])candidates.push([x,end[1]+.16,target.z+dz]);}
        else if(target.w){for(const t of [.5,.25,.75]){
          if(target.w>=target.d)for(const z of [target.z-.35,target.z+target.d+.35])candidates.push([target.x+target.w*t,target.y+.28,z]);
          if(target.d>target.w)for(const x of [target.x-.35,target.x+target.w+.35])candidates.push([x,target.y+.28,target.z+target.d*t]);
        }}else candidates.push([target.x,target.y+.28,target.z]);
        finish=candidates.filter(p=>!blocked(p)).sort((a,b)=>Math.hypot(a[0]-foot[0],a[2]-foot[2])-Math.hypot(b[0]-foot[0],b[2]-foot[2]))[0];
        if(c.id==='mortar-cache')finish=[161,20.28,-139.35];
        if(!finish)throw new Error(`No exposed circuit socket on ${target.id}`);
        if(c.id==='rail-repair')points=[...lead,...route(foot,[-11.35,.28,8]),[-11.35,9.65,8],[-2,9.65,8],[-2,9.65,18]];
        else {try{points=c.id==='mortar-cache'?[...lead,...route(foot,[160.5,20.28,-134.1]),...route([160.5,20.28,-134.1],finish)]:[...lead,...route(foot,finish)];}catch(e){throw new Error(`${c.id} -> ${target.id}: ${e.message}`);}}
      }else points=c.circuit||points;
      links.push({id:c.id,target:target.id,points:orthogonalCircuit(points),magnetic:c.kind==='magnet'&&!c.slide});
    }
  }
  return links;
}

export function circuitColor(open,elapsed,progress,duration=3){
  if(!open)return SIGNAL.ready;
  if(elapsed<duration-1e-7){
    const front=Math.max(0,elapsed/duration);
    if(progress>front)return SIGNAL.ready;
    if(front-progress<.07)return 0xfff1b0;
  }
  return SIGNAL.open;
}

// Branches from one switch arrive together, so a shared mechanism flag cannot
// open one destination while another branch is still carrying the signal.
export function createCircuitSignals(state,links){
  const durations=new Map();
  for(const link of links){
    let length=0;
    for(let i=1;i<link.points.length;i++)length+=Math.hypot(...link.points[i].map((v,j)=>v-link.points[i-1][j]));
    if(length>.01)durations.set(link.id,Math.max(durations.get(link.id)||0,link.local?.18:Math.max(1.4,length/18)));
  }
  state.pendingSignals??={};
  return {
    duration:id=>durations.get(id)||0,
    active:id=>!!state[id]||!!state.pendingSignals[id],
    pending:id=>state.pendingSignals[id],
    trigger(id,changes,external=false){
      if(!external&&state[id]||state.pendingSignals[id])return false;
      const duration=durations.get(id)||0;
      if(!duration)Object.assign(state,changes);
      else state.pendingSignals[id]={duration,remaining:duration,changes};
      return true;
    },
    advance(dt){
      const delivered=[];
      for(const [id,signal]of Object.entries(state.pendingSignals)){
        signal.remaining=Math.max(0,signal.remaining-dt);
        if(signal.remaining>1e-8)continue;
        Object.assign(state,signal.changes);
        delivered.push({id,...signal});
        delete state.pendingSignals[id];
      }
      return delivered;
    },
  };
}

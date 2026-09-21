import {SIGNAL} from './folded-visibility.js';

export function circuitLinks(controls,solids,lifts){
  const links=[];
  for(const c of controls){
    const ids=c.id.startsWith('relay-')?['relay-east','relays']:c.id==='loading-return'?['loading-return','bridge-crane']:[c.id];
    const endpoints=[...solids.filter(s=>ids.includes(s.id)&&!s.permanent||ids.includes(s.rail?.release)||ids.includes(s.rail?.latch)),...lifts.filter(l=>ids.includes(l.lock||l.id)||l.locks?.some(id=>ids.includes(id))),...controls.filter(t=>t.requires===c.id).map(t=>({...t,y:t.ground??t.y-1.3}))];
    if(c.id==='signal')endpoints.push({id:'signal-dish',x:204,y:40,z:146});
    if(c.id==='rail-repair')endpoints.push({id:'cargo-rail',x:-18,y:0,z:25});
    if(c.id==='maintenance')endpoints.push({id:'tender',x:110,y:-24,z:31});
    for(const target of endpoints){
      if(target.localControl===c.id)continue;
      const ground=c.ground??c.y-1.3,end=[target.x+(target.w||0)/2,(target.y??target.stops[0])+.12,target.z+(target.d||0)/2];
      if(target.stops){
        end[0]=Math.max(target.x+.3,Math.min(target.x+target.w-.3,c.x));
        end[2]=Math.max(target.z+.3,Math.min(target.z+target.d-.3,c.z));
        end[1]=target.stops.reduce((best,y)=>Math.abs(y-ground)<Math.abs(best-ground)?y:best)+.12;
      }
      let points=[[c.x,ground+.12,c.z],[c.x,ground+.12,end[2]],[end[0],ground+.12,end[2]],end];
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
        if(c.id==='rail-repair')points=[start,[-16.9,y,23],[-16.9,y,25.8],[-17.65,y,25.8],[-17.65,.6,25.8]];
        else if(c.id==='arsenal-return'&&target.y===0){
          // Cross above the local shutter, then follow the supported return ramp.
          points=[start,[c.x,11.8,-54],[-99.6,11.8,-54],[-99.6,y,-54],[-54,y,-54],[-54,y,-48],[-54,.24,-16],[-54,.24,-15.35]];
        }
      }
      links.push({id:c.id,target:target.id,points:c.circuit||points,magnetic:c.kind==='magnet'&&!c.slide});
    }
  }
  return links;
}

export function circuitColor(open,elapsed,progress,duration=3){
  if(!open)return SIGNAL.ready;
  if(elapsed<duration){
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
    if(length>.01)durations.set(link.id,Math.max(durations.get(link.id)||0,1.4,length/18));
  }
  state.pendingSignals??={};
  return {
    duration:id=>durations.get(id)||0,
    active:id=>!!state[id]||!!state.pendingSignals[id],
    pending:id=>state.pendingSignals[id],
    trigger(id,changes){
      if(state[id]||state.pendingSignals[id])return false;
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

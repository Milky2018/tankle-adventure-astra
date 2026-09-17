import {SIGNAL} from './folded-visibility.js';

export function circuitLinks(controls,solids,lifts,mirrors=[]){
  const links=[];
  for(const c of controls){
    const ids=c.id==='relay-east'?['relay-east','relays']:[c.id];
    const endpoints=[...solids.filter(s=>ids.includes(s.id)&&!s.permanent),...lifts.filter(l=>ids.includes(l.lock||l.id)),...mirrors.filter(m=>m.index===c.id)];
    if(c.id==='signal')endpoints.push({id:'signal-dish',x:204,y:40,z:146});
    if(c.id==='rail-repair')endpoints.push({id:'cargo-rail',x:-18,y:0,z:25});
    if(c.id==='maintenance')endpoints.push({id:'tender',x:110,y:-24,z:31});
    for(const target of endpoints){
      const ground=c.ground??c.y-1.3,end=[target.x+(target.w||0)/2,(target.y??target.stops[0])+.12,target.z+(target.d||0)/2];
      if(target.stops){
        end[0]=Math.max(target.x+.3,Math.min(target.x+target.w-.3,c.x));
        end[2]=Math.max(target.z+.3,Math.min(target.z+target.d-.3,c.z));
        end[1]=target.stops.reduce((best,y)=>Math.abs(y-ground)<Math.abs(best-ground)?y:best)+.12;
      }
      if(target.n)end[1]=target.y-2;
      let points=[[c.x,ground+.12,c.z],[c.x,ground+.12,end[2]],[end[0],ground+.12,end[2]],end];
      if(c.id==='rail-crossing')points=[[-372,8.12,-70],[-372,8.12,-62],[-292,8.12,-62],end];
      if(c.id==='pump'&&target.x<0)points=[[58,-7.88,-4],[58,-7.88,-30],[-26,-7.88,-30],end];
      if(c.id==='load'&&target.stops)points=[[90,2.12,-34],[90,8.12,-52],[78,8.12,-52],end];
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
      if(c.id==='mirror-index')points=[[238,26.4,-4],[238,31.8,-4],[232,31.8,-4],end];
      links.push({id:c.id,target:target.id,points:c.circuit||points});
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

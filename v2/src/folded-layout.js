import {sideDecks,sideGates,sideObstacles,sideEnemies} from './folded-side-layout.js';
import {expansionDecks,expansionSolids,expansionControls,expansionHives,expansionEnemies,expansionPickups,expansionFlags} from './folded-expansion-layout.js';
import {cityDecks,cityLifts,citySolids,cityControls,cityHives,cityPickups,cityEnemies,cityFlags} from './folded-city-layout.js';
import {inRect,deckHeight} from './hoist-layout.js';
import {phoenixReady,redContact,clamp} from './mechanics.js';
import {buildArchitecture,architectureIndex} from './folded-architecture.js';
import {mechanismReady} from './folded-pacing.js';

const deck=(id,x,z,w,d,y,extra={})=>({id,x,z,w,d,y,...extra});
export const foldedDecks=[
  deck('turntable',-16,10,32,26,0),deck('hub-entry',30,-2,12,38,0),deck('hub-entry-neck',16,26,14,10,0),deck('transport-bridge',-6,-28,12,38,0),
  deck('west-landing',-32,22,16,12,0),deck('garden-descent',-32,-2,12,24,-8,{rise:8}),
  deck('ferry-approach',-40,-14,20,12,-8),deck('ferry-cradle',-52,-14,12,16,-8),
  deck('launch-ramp',-52,2,12,24,-8,{rise:-8}),
  deck('launch-pool',-52,16,22,18,-16,{water:true}),
  deck('canal-bend',-42,-10,12,32,-16,{water:true}),
  deck('bridge-underside',-42,-10,74,12,-16,{water:true}),
  deck('canal-landing',28,-22,12,12,-16),deck('east-sill',32,-22,8,22,-16),deck('bank-foot',40,-22,12,10,-16),
  deck('bank-ascent',40,-12,12,24,-16,{rise:8}),
  deck('garden-bank',32,12,32,16,-8),deck('sluice',64,12,12,16,-8,{water:true}),
  deck('rear-dock',76,12,18,16,-8),deck('gangway-west',54,24,10,14,-8),
  deck('gangway',58,30,30,8,-8),deck('gangway-east',82,24,12,14,-8),
  deck('dock-ascent',82,-12,12,24,0,{rise:-8}),
  deck('common-benches',68,-28,32,16,0),
  deck('loading',-6,-40,42,12,0),deck('freight',36,-40,40,12,0),
  deck('bench-ascent',84,-52,12,24,8,{rise:-8}),
  deck('carrier-landing',72,-66,28,14,8),
  deck('phoenix-cradle',64,-94,28,16,16),
  deck('launch-track',92,-92,64,12,16),deck('launch-landing',156,-92,16,28,16),
  deck('roof-ascent',160,-64,12,24,16,{rise:8}),
  deck('roof-junction',132,-40,40,18,24),deck('roof-return',26,-38,118,6,24),
  deck('roof-walk',29,-32,6,30,24),deck('cage-landing',16,-2,22,16,24),
  deck('observatory-outlook',172,-36,24,12,24),
  deck('circulation-outlook',156,-22,12,22,24),
  ...cityDecks,...expansionDecks,...sideDecks
];
export const foldedLiftDefs=[
  {id:'carrier',x:72,z:-78,w:12,d:12,stops:[8,16],lock:'load'},
  {id:'cage',x:4,z:10,w:12,d:12,stops:[0,24],recess:.6},
  ...cityLifts
];
// Bounds describe solid material, including the moving shutters while closed.
export const foldedSolids=[
  {id:'magnet',x:-40.5,z:-14,w:1,d:12,y:-8,h:3},
  {id:'freight',x:25.5,z:-40,w:1,d:12,y:0,h:3.2},
  {id:'gangway',x:69.5,z:30,w:1,d:8,y:-8,h:3},
  {id:'load',x:84,z:-29,w:12,d:1.4,y:0,h:6.2},
  {id:'brake',x:72,z:-78.5,w:12,d:1,y:16,h:2.5},
  {id:'launch',x:139.5,z:-92,w:1,d:12,y:16,h:3},
  {id:'optics',x:175.5,z:-36,w:1,d:12,y:24,h:3},
  {id:'pressure',x:156,z:-16.5,w:12,d:1,y:24,h:3},
  {id:'bank-cover',x:34,z:-5,w:3,d:3,y:-16,h:2,permanent:true},
  {id:'canal-cover',x:29,z:-13,w:2,d:2,y:-16,h:1.6,permanent:true},
  {id:'bench-cover',x:77,z:-25,w:3,d:4,y:0,h:2,magnetic:true},
  {id:'upper-cover',x:94,z:-58,w:3,d:3,y:8,h:2,permanent:true},
  {id:'gangway-casing',x:84.4,z:28,w:.5,d:6,y:-8,h:3,permanent:true},
  {id:'dock-cover',x:78,z:13,w:3,d:3,y:-8,h:2,magnetic:true},
  ...citySolids,...expansionSolids,...sideGates
];
export const foldedControls=[
  {id:'rail-repair',x:-18,y:1.4,z:23,kind:'magnet'},
  {id:'magnet',x:-39.7,y:-6.6,z:-8,kind:'magnet'},
  {id:'freight',x:32,y:4.2,z:-34,ground:0,kind:'shot',surface:'top'},
  {id:'gangway',x:86,y:-6.6,z:31,kind:'shot'},
  {id:'load',x:90,y:7,z:-34,ground:2,kind:'shot'},
  {id:'brake',x:78,y:18,z:-77.7,kind:'shot'},
  {id:'cage',x:22,y:25.4,z:8,kind:'shot'},
  {id:'dock-cover',x:79.5,y:-5.6,z:14.5,kind:'magnet',ground:-8},
  {id:'bench-cover',x:78.5,y:2.4,z:-23,kind:'magnet',ground:0},
  ...cityControls,...expansionControls
];
export const foldedHives=[
  {id:'turntable',x:0,y:0,z:27,heading:Math.PI},{id:'garden-entry',x:-27,y:-8,z:-7,heading:-Math.PI/2},{id:'loading-entry',x:12,y:0,z:-34},{id:'bank',x:56,y:-8,z:20,heading:Math.PI/2},
  {id:'benches',x:94,y:0,z:-18,heading:Math.PI},{id:'roof',x:32,y:24,z:6},
  ...cityHives,...expansionHives
];
export const foldedPickups=[
  ...cityPickups.filter(p=>!expansionPickups.some(q=>q.id===p.id)),...expansionPickups
];
export const foldedEnemies=[
  {id:'bank-gunner',x:31,y:-16,z:-18,hp:2,type:'turret',encounter:'garden-bank'},
  {id:'bank-scout',x:44,y:-16,z:-19,hp:3,type:'guard',magneticShield:true,encounter:'garden-bank'},
  {id:'dock-gunner',x:89,y:-8,z:17,hp:3,type:'artillery',encounter:'rear-dock'},
  {id:'dock-scout',x:87,y:-8,z:25,hp:2,type:'skirmisher',encounter:'rear-dock'},
  {id:'bench-guard',magneticShield:true,x:73,y:0,z:-24,hp:3,type:'guard',encounter:'test-benches'},
  {id:'bench-scout',x:75,y:0,z:-18,hp:3,type:'welder',encounter:'test-benches'},
  {id:'upper-gunner',x:96,y:8,z:-61,hp:2,type:'sniper',encounter:'carrier-brake'},
  {id:'upper-scout',x:88,y:8,z:-63,hp:2,type:'miner',encounter:'carrier-brake'},
  {id:'track-scout',x:148,y:16,z:-86,hp:2,type:'scout'},
  ...cityEnemies,...expansionEnemies,...sideEnemies
];

export const foldedArchitecture=buildArchitecture(foldedDecks,foldedLiftDefs);
export const architectureGrid=architectureIndex(foldedArchitecture.solids);
export const activeSolid=(s,state)=>s.permanent||!state[s.id];
export function foldedAimHeight(p,target){
  const verticalReach=Math.hypot(target.x-p.x,target.z-p.z)*Math.tan(Math.PI*40/180);
  return clamp(target.y,p.y+2-verticalReach,p.y+2+verticalReach);
}
export function foldedSupport(x,z,y,deployed=false,lifts=[]){
  let best=null;
  for(const d of [...foldedDecks,...lifts]){
    if(d.water&&!deployed||!inRect(x,z,d))continue;
    const height=deckHeight(d,z);
    // A recessed shaft bottom is not a boarding surface while its platform is away.
    if(!d.stops&&lifts.some(l=>inRect(x,z,l)&&Math.abs(height-l.stops[0])<.01))continue;
    // At a ramp seam, step onto the higher reachable surface instead of sticking
    // to a coplanar landing underneath it. Other floors remain out of reach.
    if(Math.abs(height-y)<=.45&&(!best||height>best.height||height===best.height&&best.water&&!d.water))best={...d,height};
  }
  return best;
}
export function foldedBlocked(x,y,z,state,r=.9){
  const blocks=s=>activeSolid(s,state)&&y+2>s.y+.12&&y<s.y+s.h-.1&&inRect(x,z,s,r);
  return sideObstacles.find(blocks)||foldedSolids.find(blocks)||[...architectureGrid.near(x,z,r)].find(s=>y+2>s.y+.12&&y<s.y+s.h-.1&&inRect(x,z,s,r))||foldedDecks.find(d=>!d.water&&inRect(x,z,d,-.01)&&deckHeight(d,z)>y+.45&&deckHeight(d,z)<y+3.25);
}
export function moveFolded(p,dx,dz,state,lifts=[]){
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.2));
  for(let i=0;i<steps;i++)for(const [ax,az] of [[dx/steps,0],[0,dz/steps]]){
    if(!ax&&!az)continue;
    const x=p.x+ax,z=p.z+az,floor=foldedSupport(x,z,p.y,p.deployed,lifts);
    if(!floor){p.speed=1;continue;}
    const wall=foldedBlocked(x,floor.height,z,state);
    if(wall?.red&&redContact(p)&&p.speed>1)state[wall.id]=true;
    else if(wall&&(wall.phoenix||['launch','optics','pressure'].includes(wall.id))&&phoenixReady(p))state[wall.id]=true;
    else if(wall){p.speed=1;continue;}
    // Sample corners as well as side midpoints, preventing diagonal ledge cutting.
    if(![[.9,0],[-.9,0],[0,.9],[0,-.9],[.64,.64],[.64,-.64],[-.64,.64],[-.64,-.64]]
      .every(([ox,oz])=>foldedSupport(x+ox,z+oz,deckHeight(floor,z+oz),p.deployed,lifts))){p.speed=1;continue;}
    p.x=x;p.z=z;p.y=floor.height;
  }
  p.afloat=!!foldedSupport(p.x,p.z,p.y,p.deployed,lifts)?.water;
}

export function initialFoldedState(saved={}){
  const state={};
  for(const id of ['magnet','freight','gangway','load','brake','cage','launch','optics','pressure','flotation','phoenix','rail-repair',...cityFlags,...expansionFlags])state[id]=saved[id]===true;
  if(state['pressure-return'])state['pressure-thermal']=true;
  if(state['inner-transit'])state['inner-thermal']=true;
  if(state.keeper||state.endingSeen)state['core-feed']=true;
  for(const [district,ability]of [['arsenal','magnetModule'],['reservoir','flotation'],['proving','phoenix'],['lens','laser'],['coolant','circulation'],['hearth','core-feed']]){
    if(state[ability]||saved.anchor===`${district}-hive-3`)state[`${district}-transfer`]=true;
    if(['proving','hearth'].includes(district)&&(state[ability]||saved.anchor===`${district}-hive-3`))state[`${district}-endurance`]=true;
  }
  state.sorter=saved.sorter===true;
  state['maintenance-started']=saved['maintenance-started']===true;
  state.sidePuzzles=saved.sidePuzzles||{};
  state['rail-crossing']=!!(saved.sidePuzzles?.rail?.solved||saved.sidePuzzles?.rail?.secured);
  state.anchor=foldedHives.some(h=>h.id===saved.anchor)?saved.anchor:'turntable';
  // The old lower Hive was reachable before the workshop shutter opened.
  if(state.anchor==='lower-foundry'&&!state['relay-west'])state.anchor='awakening';
  state.discovered=Array.isArray(saved.discovered)?saved.discovered.filter(id=>foldedDecks.some(d=>d.id===id)):['turntable'];
  return state;
}

export function releaseFolded(id,kind,p,state,lifts,time=0){
  if(state[id])return false;
  const c=foldedControls.find(c=>c.id===id);if(!c)return false;
  if(!mechanismReady(c,p,time))return false;
  if(c.kind==='laser'&&kind!=='laser'||['use','dock'].includes(c.kind)&&kind!=='use')return false;
  if(id==='press-return'&&!state.foundry)return false;
  if(id==='pump'&&(p.pumpPressure||0)<.8)return false;
  const inside={'emitter-cage':24,'last-cage':-40,'loading-return':-8,'freight-return':0};
  if(id in inside&&Math.abs(p.y-inside[id])>.5)return false;
  if(c.kind==='magnet'&&(kind!=='magnet'||!p.magnet))return false;
  if(id==='brake'&&!lifts.some(l=>l.id==='carrier'&&Math.abs(l.y-16)<.15))return false;
  if(id==='cage'&&(!p.phoenix||Math.abs(p.y-24)>.5))return false;
  if(id==='gangway'&&(p.x<76||Math.abs(p.y+8)>.5))return false;
  state[id]=true;return true;
}

export {inRect,deckHeight};

import {circuitReady} from './folded-circuits.js';
import {mountedControlPosition} from './folded-control-housing.js';
import {openLiftShafts} from './folded-shafts.js';
import {restoreSlidePositions} from './folded-mechanisms.js';
import {refugeHives,refugeDecks,refugeSolids,refugeControls,refugeFlags,refugeLifts,migrateRefuge} from './folded-refuge-network.js';
import {explorationDecks,explorationBattles,explorationControls,explorationFlags,explorationPickups,explorationSolids,explorationEnemies} from './folded-exploration-layout.js';
import {UPGRADE_IDS} from './folded-upgrades.js';
import {arenaGates,bossReserves} from './folded-boss-arenas.js';
import {transportSolids} from './folded-transport.js';
import {sideDecks,sideGates,sideObstacles,sideEnemies} from './folded-side-layout.js';
import {expansionBattles,expansionDecks,expansionSolids,expansionControls,expansionEnemies,expansionPickups,expansionFlags} from './folded-expansion-layout.js';
import {cityDecks,cityLifts,citySolids,cityControls,cityPickups,cityEnemies,cityFlags} from './folded-city-layout.js';
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

  deck('common-benches',104,-10,24,8,0),deck('inspection-front',68,-28,12,6,0),deck('inspection-turn',92,-22,12,20,0,{water:true,region:'garden'}),deck('inspection-channel',68,-22,36,12,0,{water:true,region:'garden'}),deck('inspection-load-bed',104,-18,12,8,0),deck('inspection-tray-plinth',118,-18,10,8,0),
  deck('loading',-6,-40,42,12,0),deck('freight',36,-40,40,12,0),
  deck('bench-ascent',104,-42,12,24,8,{rise:-8}),deck('bench-head',104,-56,12,14,8),
  deck('carrier-landing',64,-78,52,26,8),
  deck('phoenix-cradle',64,-94,28,16,16),
  deck('bulkhead-ascent',148,-92,12,90,24,{rise:-24,region:'transit'}),
  deck('roof-junction',132,-40,40,18,24),deck('roof-return',26,-38,118,6,24),
  deck('roof-walk',29,-32,6,30,24),deck('cage-landing',16,-2,22,16,24),
  deck('observatory-outlook',172,-36,24,12,24),
  deck('circulation-outlook',156,-22,12,22,24),
  ...cityDecks,...expansionDecks,...sideDecks,...explorationDecks,...refugeDecks
];
export const foldedLiftDefs=[
  {id:'carrier',x:72,z:-90,w:12,d:12,stops:[8,16],lock:'load'},
  {id:'cage',x:4,z:10,w:12,d:12,stops:[0,24],recess:.6},
  ...cityLifts,...refugeLifts
];
foldedDecks.splice(0,foldedDecks.length,...openLiftShafts(foldedDecks,foldedLiftDefs));

// Bounds describe solid material, including the moving shutters while closed.
export const foldedSolids=[
  {id:'magnet',x:68,z:-23,w:12,d:1,y:0,h:4,magnetic:true},
  {id:'gangway',x:69.5,z:30,w:1,d:8,y:-8,h:3},
  {id:'inspection-north-wall',x:80,z:-23,w:24,d:1,y:0,h:5,permanent:true},
  {id:'inspection-ascent-west',x:103.8,z:-42,w:.2,d:24,y:0,h:9,permanent:true},
  {id:'inspection-ascent-east',x:115.8,z:-42,w:.2,d:24,y:0,h:9,permanent:true},
  {id:'inspection-tray',x:120,z:-16,w:6,d:6,y:0,h:4.8,permanent:true},
  {id:'brake',x:72,z:-78.5,w:12,d:1,y:16,h:2.5},
  {id:'guardian',x:156,z:-16.5,w:12,d:1,y:24,h:4},
  {id:'bank-cover',x:34,z:-5,w:3,d:3,y:-16,h:2,permanent:true},
  {id:'canal-cover',x:29,z:-13,w:2,d:2,y:-16,h:1.6,permanent:true},
  {id:'bench-cover',x:124,z:-7,w:3,d:4,y:0,h:2,permanent:true},
  {id:'gangway-casing',x:84.4,z:28,w:.5,d:6,y:-8,h:3,permanent:true},
  ...explorationSolids,...citySolids,...expansionSolids,...sideGates,...transportSolids,...arenaGates,...refugeSolids
];
export const foldedControls=[
  {id:'rail-repair',x:-18,y:1.4,z:23,kind:'magnet',ground:0},
  {id:'magnet',x:74,y:1.4,z:-24,kind:'magnet',ground:0,mount:'magnet',facing:[0,0,-1]},
  {id:'gangway',x:86,y:-6.6,z:31,kind:'shot',mount:'gangway',facing:[1,0,0]},
  {id:'load',x:123,y:6.8,z:-13,ground:0,kind:'shot',surface:'top'},
  {id:'cage',x:150,y:25.4,z:-23,kind:'shot',requires:'phoenix',facing:[0,0,-1],circuit:[[150,24.12,-23],[150,24.12,-35],[32,24.12,-35],[32,24.12,8],[16,24.12,8],[10,24.12,16]]},
  ...cityControls,...expansionControls,...explorationControls,...refugeControls
];
export const foldedHives=refugeHives;
export const foldedPickups=[
  ...explorationPickups,...cityPickups.filter(p=>!expansionPickups.some(q=>q.id===p.id)),...expansionPickups
];
export const foldedEnemies=[
  {id:'bank-gunner',x:35,y:-16,z:-20,hp:2,type:'turret',encounter:'garden-bank'},
  {id:'bank-scout',x:44,y:-16,z:-19,hp:3,type:'guard',magneticShield:true,encounter:'garden-bank'},
  {id:'dock-gunner',x:89,y:-8,z:17,hp:3,type:'artillery',encounter:'rear-dock'},
  {id:'dock-scout',x:87,y:-8,z:25,hp:2,type:'skirmisher',encounter:'rear-dock'},
  {id:'bench-guard',magneticShield:true,x:86,y:8,z:-61,hp:3,type:'guard',encounter:'test-benches'},
  {id:'bench-scout',x:99,y:8,z:-66,hp:3,type:'welder',encounter:'test-benches'},
  {id:'track-scout',x:142,y:16,z:-82,hp:2,type:'scout'},
  ...explorationEnemies,...cityEnemies,...expansionEnemies,...sideEnemies,...bossReserves
];

// Local controls live on their actuator's working face. Remote receivers and
// overhead trays retain their authored sightlines and collecting surfaces.
for(const c of foldedControls.filter(c=>c.mount)){
  const body=foldedSolids.find(s=>s.id===c.mount);
  Object.assign(c,mountedControlPosition(c,body));
  body.localControl=c.id;
}

export const foldedArchitecture=buildArchitecture(foldedDecks,foldedLiftDefs);
export const architectureGrid=architectureIndex(foldedArchitecture.solids);
export function activeSolid(s,state){
  if(s.arena)return state.combatArena===s.arena;
  if(s.permanent||s.rail)return true;
  if(s.red||s.phoenix)return !state[s.id];
  return !circuitReady(state,s.localControl||s.id,s);
}

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
  return (state.bodies?.obstacles||sideObstacles).find(blocks)||(state.bodies?.solids||foldedSolids).find(blocks)||[...architectureGrid.near(x,z,r)].find(s=>y+2>s.y+.12&&y<s.y+s.h-.1&&inRect(x,z,s,r))||foldedDecks.find(d=>!d.water&&inRect(x,z,d,-.01)&&deckHeight(d,z)>y+.45&&deckHeight(d,z)<y+3.25);
}
export function moveFolded(p,dx,dz,state,lifts=[]){
  // A stationary land hull cannot enter water; lifts already move their riders.
  if(!dx&&!dz&&!p.deployed){p.afloat=false;return;}
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
  // Session-owned collision bodies share positions with animated machinery,
  // but are neither authored definitions nor saved progression.
  Object.defineProperty(state,'bodies',{value:{
    obstacles:sideObstacles.map(body=>({...body})),
    solids:foldedSolids.map(body=>({...body})),
  },enumerable:false});
  for(const id of ['proving-endurance','magnet','freight','gangway','load','brake','cage','launch','optics','pressure','flotation','phoenix','rail-repair',...refugeFlags,...cityFlags,...expansionFlags,...explorationFlags,...UPGRADE_IDS])state[id]=saved[id]===true;
  if(state.prototype||state.overdrive)state['overdrive-return']=true;
  if(state.load)state.brake=true;
  if(state['loading-return'])state['bridge-crane']=true;
  if(state.ballast)state.ratchet=true;
  if(state['relay-east'])state.relays=true;
  if(state['pressure-return'])state['pressure-thermal']=true;
  if(state['inner-transit'])state['inner-thermal']=true;
  if(state.keeper||state.endingSeen)state['core-feed']=true;
  for(const [district,ability]of [['arsenal','magnetModule'],['reservoir','flotation'],['proving','phoenix'],['lens','laser'],['coolant','circulation'],['hearth','core-feed']]){
    if(state[ability]||saved.anchor===`${district}-hive-3`)state[`${district}-transfer`]=true;
    if(['proving','hearth'].includes(district)&&(state[ability]||saved.anchor===`${district}-hive-3`))state[`${district}-endurance`]=true;
  }
  state.sorter=saved.sorter===true;
  state['maintenance-started']=saved['maintenance-started']===true;
  state.sidePuzzles=structuredClone(saved.sidePuzzles||{});
  if(saved.bossRouteRevision!==1){
    if(saved.sorter)state['roof-express']=true;
    delete state.sidePuzzles.coverX;
  }
  state.bossRouteRevision=1;
  state.pendingSignals=structuredClone(saved.pendingSignals||{});
  if(state.pendingSignals['relay-east'])state.pendingSignals['relay-east'].changes.relays=true;
  if(state.pendingSignals['loading-return'])state.pendingSignals['loading-return'].changes['bridge-crane']=true;
  // Preserve the old indexed orientation, including an in-flight switch signal.
  state.mirrorTurns={'return-index':saved.mirrorTurns?.['return-index']??(saved['mirror-index']||saved.pendingSignals?.['mirror-index']?1:0)};
  delete state.pendingSignals['mirror-index'];
  delete state.pendingSignals['prototype-inspection'];
  delete state.pendingSignals['overdrive-bypass'];
  delete state.pendingSignals['press-return'];
  state['rail-crossing']=!!(saved.sidePuzzles?.rail?.solved||saved.sidePuzzles?.rail?.secured);
  state['garden-bloom']=!!saved.sidePuzzles?.gutter?.grown;
  for(const p of explorationPickups)if(p.requires&&state[p.id])state[p.requires]=true;
  // Preserve earned access in legacy saves without granting missing modules.
  if(saved.progressionRevision!==2&&saved.anchor&&(state.phoenix||state.laser||state.circulation)){
    state.pressure=true;state['phoenix-departure']=true;state['proving-inspection']=true;
    if(state.circulation)state['lens-return']=true;
  }
  state.progressionRevision=2;
  state.anchor=migrateRefuge(saved.anchor,state);
  state.discovered=Array.isArray(saved.discovered)?saved.discovered.filter(id=>foldedDecks.some(d=>d.id===id)):['turntable'];
  state.slidePositions=restoreSlidePositions(state.bodies.solids,saved.slidePositions,state);
  return state;
}

export function releaseFolded(id,kind,p,state,lifts,time=0){
  if(state[id])return false;
  const c=foldedControls.find(c=>c.id===id);if(!c)return false;
  if(!mechanismReady(c,p,time,state))return false;
  if(c.kind==='shot'&&!['cannon','mortar','laser'].includes(kind))return false;
  if(c.kind==='laser'&&kind!=='laser'||['use','dock'].includes(c.kind)&&kind!=='use')return false;
  if(c.kind==='magnet'&&(kind!=='magnet'||!p.magnet))return false;
  state[id]=true;
  if(id==='relay-east')state.relays=true;
  if(id==='load')state.brake=true;
  if(id==='loading-return')state['bridge-crane']=true;
  if(id==='ballast')state.ratchet=true;
  return true;
}

export {inRect,deckHeight};

export const foldedBattles=[...expansionBattles,...explorationBattles];

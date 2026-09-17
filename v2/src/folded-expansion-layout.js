// Six service districts extend the city with outward journeys and short returns.
// Room names describe their former use; their equipment supplies combat cover.
export const districtPlans=[
  {id:'arsenal',region:'transit',x:-404,z:-94,y:8,mirror:true,ability:'magnet',pickup:'magnetModule',names:['dispatch','sighting','crane','repair','armature','return'],approach:[[-56,31],[-180,31]]},
  {id:'reservoir',region:'garden',x:-404,z:-286,y:-8,mirror:true,ability:'flotation',pickup:'flotation',names:['spillway','nursery','filter','drydock','pontoons','current'],approach:[[-52,-8],[-100,-8],[-100,-174],[-180,-174]]},
  {id:'proving',region:'testworks',x:32,z:-318,y:16,ability:'phoenix',pickup:'phoenix',names:['receiving','recoil','impact','endurance','engine','runout'],approach:[[77,-94],[77,-206],[64,-206]]},
  {id:'lens',region:'optics',x:312,z:-144,y:24,ability:'laser',pickup:'laser',names:['vestibule','collimator','shutter','alignment','emitter','reflection'],approach:[[248,-24],[344,-24]]},
  {id:'coolant',region:'circulation',x:312,z:100,y:-24,flip:true,ability:'circulation',pickup:'circulation',names:['intake','boilers','separator','condenser','jacket','pressure'],approach:[[260,117],[320,117],[320,132],[344,132]]},
  {id:'hearth',region:'furnace',x:-316,z:20,y:-40,mirror:true,flip:true,names:['receiving','mounts','coolers','batteries','feed','return'],approach:[[28,-10],[-60,-10],[-60,52],[-108,52]]}
];
export const expansionDecks=[],expansionSolids=[],expansionControls=[],expansionHives=[],expansionEnemies=[],expansionPickups=[],expansionRooms=[],expansionRoutes=[],expansionCurrents=[],expansionHeat=[],expansionBattles=[];
const squads={
  arsenal:[['sniper','guard','skirmisher'],['artillery','guard','scout'],['repairer','guard','skirmisher'],['guard','guard','turret']],
  reservoir:[['turret','scout','miner'],['artillery','scout','guard'],['sniper','skirmisher','miner'],['turret','skirmisher','scout']],
  proving:[['turret','guard','scout'],['artillery','welder','scout'],['sniper','guard','skirmisher'],['scout','guard','turret']],
  lens:[['sniper','guard','scout'],['sniper','reflector','skirmisher'],['artillery','guard','repairer'],['turret','guard','reflector']],
  coolant:[['turret','welder','miner'],['artillery','guard','welder'],['repairer','skirmisher','miner'],['guard','welder','turret']],
  hearth:[['sniper','guard','scout'],['artillery','reflector','welder'],['sniper','guard','repairer'],['turret','guard','skirmisher']]
};
const entryRefuges={arsenal:[-188,31],reservoir:[-188,-174],proving:[64,-193],lens:[321,-24],coolant:[321,132],hearth:[-104,52]};
const floor=(id,x,z,w,d,y,extra={})=>expansionDecks.push({id,x,z,w,d,y,...extra});
function corridor(id,a,b,y,extra={}){
  floor(id,Math.min(a[0],b[0])-6,Math.min(a[1],b[1])-6,Math.abs(a[0]-b[0])+12,Math.abs(a[1]-b[1])+12,y,extra);
}
for(const plan of districtPlans){
  const {id,region,y}=plan;
  const slots=[[0,1],[0,0],[1,0],[2,0],[2,1],[1,1]].map(([x,z])=>[plan.mirror?2-x:x,plan.flip?1-z:z]);
  const rooms=slots.map(([col,row],i)=>({id:`${id}-${plan.names[i]}`,x:plan.x+col*80,z:plan.z+row*80,w:64,d:64,y,region,district:id,chapter:i}));
  expansionDecks.push(...rooms);expansionRooms.push(...rooms);
  for(let i=0;i<6;i++){
    const a=rooms[i],b=rooms[(i+1)%6],start=[a.x+32,a.z+32],end=[b.x+32,b.z+32];
    // Only the gap is a bridge. Rooms retain distinct thresholds and silhouettes.
    const mid=[(start[0]+end[0])/2,(start[1]+end[1])/2];
    corridor(`${id}-link-${i}`,[mid[0]-(a.x!==b.x?9:0),mid[1]-(a.z!==b.z?9:0)],[mid[0]+(a.x!==b.x?9:0),mid[1]+(a.z!==b.z?9:0)],y);
    if(i===5){
      const gate={id:`${id}-return`,x:mid[0]-(a.x!==b.x?.5:6),z:mid[1]-(a.z!==b.z?.5:6),w:a.x!==b.x?1:12,d:a.z!==b.z?1:12,y,h:4};
      if(plan.ability==='flotation'){
        const bridge=expansionDecks.at(-1);bridge.water=true;bridge.current={x:plan.mirror?4:-4,z:0};
        expansionCurrents.push(bridge);
      }else{
        if(plan.ability==='phoenix')gate.phoenix=true;
        else if(plan.ability==='circulation')gate.red=true;
        else expansionControls.push({id:gate.id,x:mid[0]+(a.x!==b.x?(a.x<b.x?-7:7):0),y:y+1.3,z:mid[1]+(a.z!==b.z?(a.z<b.z?-7:7):0),kind:plan.ability==='magnet'?'magnet':plan.ability==='laser'?'laser':'shot'});
        expansionSolids.push(gate);
      }
    }
  }
  for(let i=1;i<plan.approach.length;i++)corridor(`${id}-approach-${i}`,plan.approach[i-1],plan.approach[i],y,{region});
  const workshop=rooms[1],next=rooms[2],gateX=(workshop.x+next.x)/2+32;
  const trial={id:`${id}-transfer`,kind:'shot',x:workshop.x+42,y:y+1.3,z:workshop.z+32};
  if(['arsenal','reservoir'].includes(id))trial.pressure={x:workshop.x+32,y,z:workshop.z+32};
  else if(id==='proving'){trial.surface='top';trial.y=y+2.6;trial.z-=14;trial.ground=y;}
  else trial.cycle={period:4.5,open:2.1};
  expansionControls.push(trial);
  expansionSolids.push({id:trial.id,x:gateX-.5,y,z:workshop.z+26,w:1,d:12,h:4});
  if(trial.surface)expansionSolids.push({id:`${id}-tray-screen`,x:trial.x-2,y,z:trial.z-2,w:4,d:4,h:1.9,permanent:true});
  if(['proving','hearth'].includes(id)){
    const a=rooms[2],b=rooms[3],x=(a.x+b.x)/2+32,z=a.z+32;
    expansionSolids.push({id:`${id}-endurance`,x:x-.5,y,z:z-6,w:1,d:12,h:4});
    expansionBattles.push({id:`${id}-endurance`,battle:a.id,x:a.x+32,y:y+1.3,z:a.z+22});
  }
  const cradle=rooms[4];
  if(plan.pickup)expansionPickups.push({id:plan.pickup,ability:plan.ability,x:cradle.x+32,y,z:cradle.z+32});
  else expansionControls.push({id:'core-feed',kind:'laser',x:cradle.x+32,y:y+1.3,z:cradle.z+32,circuit:[[cradle.x+32,y+.12,cradle.z+32],[-60,y+.12,52],[-60,y+.12,-10],[34,y+.12,-10],[34,y+.12,13.5]]});
  // An entry refuge and a quiet mid-route repair bay make defeat recoverable locally.
  for(const i of [0,3])expansionHives.push({id:`${id}-hive-${i}`,x:i===0?entryRefuges[id][0]:rooms[i].x+9,y,z:i===0?entryRefuges[id][1]:rooms[i].z+9,heading:Math.PI/2});
  for(const [stage,i]of [0,2,2,5].entries()){
    if(id==='hearth'&&i===5)continue;
    const r=rooms[i],types=squads[id][stage],reserve=stage===2;
    for(let j=0;j<3;j++){
      const type=types[j],hp={sniper:3,guard:5,skirmisher:3,artillery:5,scout:2,turret:4,welder:5,miner:3,repairer:3,reflector:5}[type];
      const runout=i===5&&['proving','coolant'].includes(id);
      expansionEnemies.push({id:`${id}-${i}-${reserve?'reserve-':''}${type}${types.indexOf(type)!==j?`-${j}`:''}`,type,hp,x:r.x+(i===0?[25,34,40]:reserve?[16,24,12]:[51,39,43])[j],y,z:r.z+(runout?32:(i===0?(plan.flip?[52,47,54]:[12,18,10]):reserve?[48,55,59]:[48,38,53])[j]),startup:1.2+j*.45,encounter:r.id+(reserve?'-reserve':''),...(i===2?{battle:r.id,wave:reserve?1:0}:{}),...(type==='guard'?{magneticShield:true}:{})});
    }
  }
  for(const i of [0,2,5]){
    const r=rooms[i];
    // Offset cover forces a choice of left/right advance and blocks real bullets.
    for(const [j,c]of [[0,[20,18,7,3,3.2]],[1,[43,23,3,6,3.2]],[2,[9,43,4,4,2.2]]]){
      expansionSolids.push({id:`${id}-cover-${i}-${j}`,x:r.x+c[0],z:r.z+c[1],w:c[2],d:c[3],h:c[4],y,permanent:true,theme:region});
    }
  }
  if(id==='coolant'){
    const a=rooms[4],b=rooms[0];
    expansionHeat.push({id:'coolant-runout',x:b.x+32,z:b.z+26,w:a.x-b.x,d:12,y,heat:20});
  }
  expansionRoutes.push({id,ability:plan.ability,trial:trial.id,rooms:rooms.map(r=>({id:r.id,x:r.x+32,y,z:r.z+32})),approach:plan.approach});
}
// The final service circuit reconnects at the refuge before the keeper descent.
expansionSolids.push({id:'core-feed',x:28,z:13,w:12,d:1,y:-40,h:4});
// Water is visible from the ferry before its module is acquired. The near bank
// is dry; the current lane later becomes a fast alternative to the approach.
floor('reservoir-preview-bank',-112,-186,12,172,-8,{region:'garden'});
floor('reservoir-preview-water',-132,-186,20,172,-8,{water:true,region:'garden'});
expansionCurrents.push({id:'reservoir-preview-water',x:-132,z:-186,w:20,d:172,y:-8,current:{x:0,z:4.2}});
floor('reservoir-current-mouth',-180,-186,68,12,-8,{water:true,region:'garden'});
floor('reservoir-current-exit',-132,-20,80,12,-8,{water:true,region:'garden'});
// Small refuges interrupt the current. Bank defenders can be outflanked on the
// later downstream pass instead of requiring a second walk through the same lane.
for(const [i,z]of [-66,-118,-170].entries()){
  floor(`reservoir-eddy-${i}`,-128,z,8,9,-8,{region:'garden'});
  expansionEnemies.push({id:`spillway-${i}-gunner`,type:i===1?'sniper':'turret',hp:3,x:-99,y:-8,z:z+2,encounter:`spillway-${i}`},{id:`spillway-${i}-scout`,type:'scout',hp:2,x:-107,y:-8,z:z+10,encounter:`spillway-${i}`});
  expansionSolids.push({id:`spillway-cover-${i}`,x:-110,y:-8,z:z-14,w:4,d:3,h:2.8,permanent:true,theme:'garden'});
}
export const expansionFlags=[...new Set([...expansionSolids.filter(s=>!s.permanent).map(s=>s.id),...expansionControls.map(c=>c.id)])];

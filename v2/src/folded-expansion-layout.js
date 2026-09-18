// Authored service districts. Coordinates describe usable rooms and machinery,
// not slots in a repeated acquisition template.
export const districtPlans=[
 {id:'arsenal',region:'transit',y:8,ability:'magnet',pickup:'magnetModule',approach:[[-56,31],[-76,31]]},
 {id:'reservoir',region:'garden',y:-8,ability:'flotation',pickup:'flotation',approach:[[-52,-8],[-76,-8],[-76,58]]},
 {id:'proving',region:'testworks',y:16,ability:'phoenix',pickup:'phoenix',approach:[[77,-94],[77,-124]]},
 {id:'lens',region:'optics',y:24,ability:'laser',pickup:'laser',approach:[[248,-24],[276,-24]]},
 {id:'coolant',region:'circulation',y:-24,ability:'circulation',pickup:'circulation',approach:[[260,117],[286,117]]},
 {id:'hearth',region:'furnace',y:-40,approach:[[28,-10],[44,-10],[44,6],[68,6],[68,60]]}
];
export const expansionDecks=[],expansionSolids=[],expansionControls=[],expansionHives=[],expansionEnemies=[],expansionPickups=[],expansionRooms=[],expansionRoutes=[],expansionCurrents=[],expansionHeat=[],expansionBattles=[],expansionProps=[],expansionMirrors=[],expansionBelts=[];
const hp={sniper:3,guard:5,skirmisher:3,artillery:5,scout:2,turret:4,welder:5,miner:3,repairer:3,reflector:5};
// Large machines divide usable space. Separate banks, work lanes and inspection
// walks face one another instead of forming six interchangeable room chains.
const roomData={
 arsenal:[['dispatch',-146,-12,82,54],['armature',-158,-70,46,30],['rail-shop',-192,-98,60,56],['inspection',-94,-68,20,66]],
 reservoir:[['east-bank',-84,46,16,72],['filter-bank',-172,106,104,16],['drydock',-174,54,20,52],['pump-island',-130,70,14,16]],
 proving:[['receiving',64,-146,32,32],['recoil',64,-176,24,20],['impact',108,-196,94,42],['observation',102,-150,96,10],['repair',208,-154,24,30],['engine',204,-118,28,28]],
 lens:[['vestibule',264,-38,28,28],['west-gallery',264,-96,14,70],['north-gallery',264,-100,80,18],['east-gallery',328,-100,20,68],['emitter',308,-46,40,28]],
 coolant:[['intake',274,106,28,30],['west-service',282,136,20,56],['separator',292,176,76,20],['east-service',350,136,20,56],['jacket',352,94,36,34]],
 hearth:[['receiving',52,50,28,22],['mounts',8,76,54,28],['feed',4,100,64,22]]
};
const routes={
 arsenal:{
  path:[[-76,31,'repair'],[-104,31],[-104,12],[-136,12],[-136,-24,'arsenal-transfer'],[-136,-54],[-128,-54,'repair'],[-120,-54,'pickup']],
  returns:[[-120,-54,'arsenal-return'],[-66,-54],[-66,31],[-56,31]],
  branches:[[[-104,31],[-76,31],[-76,-2],[-104,-2],[-136,-2]],[[-136,-54],[-162,-54],[-162,-66],[-176,-66],[-176,-76]],[[-136,-54],[-82,-54],[-82,-30],[-82,-14],[-82,31]]],
  hives:[[-76,31],[-142,-62]],
  controls:[['arsenal-transfer',-145,-24,'shot',{counterweight:true}],['arsenal-return',-110,-54,'magnet']],
  gates:[['arsenal-transfer',-142,-35,12,1],['arsenal-return',-101,-60,1,12]],
  cover:[[-123,-10,4,5],[-93,18,4,10],[-152,-48,3,6]],
  enemies:[['sniper',-134,-5,'dispatch'],['guard',-113,9,'dispatch'],['skirmisher',-80,1,'dispatch'],['artillery',-143,-46,'assembly'],['scout',-125,-45,'assembly'],['guard',-66,-20,'return']],
  props:[['gantry',-124,-8],['assembly',-151,-58],['rack',-143,24],['rack',-97,-58]],
 },
 reservoir:{
  path:[[-76,58,'repair'],[-76,82],[-76,102,'reservoir-inlet'],[-76,114],[-104,114,'reservoir-transfer'],[-144,114],[-164,114],[-164,78,'repair'],[-164,64,'pickup']],
  returns:[[-164,64,'float'],[-146,64],[-94,64],[-94,34],[-76,34],[-76,-8],[-52,-8,'float']],
  branches:[[[-104,114],[-104,98],[-122,98],[-122,90]]],
  hives:[[-76,58],[-164,88]],
  controls:[['reservoir-inlet',-72,100,'shot',{rotor:true}],['reservoir-transfer',-104,108,'shot',{rotor:true,requires:'reservoir-inlet'}]],
  gates:[['reservoir-transfer',-131,104,1,18],['reservoir-inlet',-110,102,12,1]],
  cover:[[-84,72,3,3],[-97,117,3,5],[-149,117,3,5]],
  enemies:[['sniper',-159,105,'banks'],['guard',-77,95,'banks'],['sniper',-142,113,'filter'],['skirmisher',-115,111,'filter']],
  props:[['pump',-123,78],['sluice',-107,118],['wreck',-167,60],['planter',-169,74],['planter',-72,114]],
 },
 proving:{
  path:[[77,-124,'repair'],[77,-150],[77,-158,'proving-transfer'],[94,-158],[94,-180],[112,-180],[130,-172],[152,-172,'battle'],[182,-172],[182,-182],[218,-182],[218,-136,'repair'],[218,-114,'pickup']],
  returns:[[218,-114],[218,-122],[98,-122,'boost'],[77,-122],[77,-94]],
  branches:[[[112,-176],[106,-176],[106,-146],[192,-146],[192,-176],[188,-176]]],
  hives:[[77,-124],[220,-136]],
  controls:[['proving-transfer',77,-170,'shot',{surface:'top',ground:16,height:2.6}]],
  gates:[['proving-transfer',100,-196,1,42],['proving-endurance',201,-196,1,54],['proving-return',175,-128,1,12,{phoenix:true}]],
  cover:[[122,-187,4,8],[156,-168,9,3],[176,-190,3,8]],
  enemies:[['turret',82,-148,'receiving'],['artillery',169,-183,'endurance'],['skirmisher',133,-178,'endurance'],['scout',178,-166,'endurance'],['guard',192,-184,'endurance',1],['skirmisher',190,-178,'endurance',1],['scout',170,-122,'return'],['guard',150,-122,'return']],
  props:[['test-bed',86,-139],['test-bed',145,-190],['engine',225,-113],['wreck',207,-110]],
 },
 lens:{
  path:[[276,-24,'repair'],[271,-62],[271,-88,'lens-transfer'],[304,-88],[338,-88],[338,-58,'repair'],[324,-58],[324,-28,'pickup']],
  returns:[[324,-28,'lens-return'],[296,-28],[276,-28],[248,-24]],
  branches:[[[271,-62],[290,-62],[290,-88]]],
  hives:[[280,-24],[340,-48]],
  controls:[['lens-transfer',269,-80,'shot',{rotor:true}],['lens-return',308,-14,'laser',{height:2,via:[324,26,-14]}]],
  gates:[['lens-transfer',310,-100,1,18],['lens-return',302,-34,1,12]],
  cover:[[266,-58,5,3],[295,-99,3,9],[343,-76,4,3]],
  enemies:[['reflector',272,-74,'collimator'],['sniper',332,-90,'gallery'],['skirmisher',303,-91,'gallery']],
  props:[['lens',284,-91],['lens',320,-94],['emitter',337,-24]],
 },
 coolant:{
  path:[[286,117,'repair'],[292,143],[292,166],[292,186,'coolant-transfer'],[325,186],[360,186],[360,160],[374,160,'repair'],[374,116,'pickup']],
  returns:[[374,116],[374,106],[284,106,'boost'],[284,117],[260,117]],
  branches:[[[292,143],[312,143],[312,164],[340,164],[340,186]]],
  hives:[[286,117],[374,152]],
  controls:[['coolant-transfer',287,184,'shot',{counterweight:true}]],
  gates:[['coolant-transfer',316,176,1,20],['coolant-transfer',334,158,1,12],['coolant-return',324,100,1,12,{red:true}]],
  cover:[[283,150,5,3],[299,177,3,5],[342,188,3,7]],
  enemies:[['welder',293,163,'separator'],['artillery',348,185,'separator'],['miner',325,188,'separator'],['guard',311,106,'return'],['welder',297,106,'return']],
  props:[['separator',326,153],['boiler',352,173],['jacket',379,114]],
 },
 hearth:{
  path:[[68,60,'repair'],[48,60],[48,90,'hearth-transfer'],[20,90],[20,110,'repair'],[24,110,'core-feed']],
  returns:[[24,110,'hearth-return'],[24,58],[24,-10],[28,-10]],
  branches:[],
  hives:[[68,60],[14,114]],
  controls:[['hearth-transfer',42,96,'shot',{surface:'top',ground:-40,height:2.6}],['core-feed',24,118,'laser'],['hearth-return',24,103,'shot']],
  gates:[['hearth-transfer',32,76,1,46],['hearth-return',18,58,12,1]],
  cover:[[19,80,3,7]],
  enemies:[['sniper',15,87,'intake'],['guard',10,92,'intake']],
  props:[['wreck',44,80],['wreck',37,80],['battery',12,106],['core',55,116]],
 }
};
function floor(id,x,z,w,d,y,extra={}){const f={id,x,z,w,d,y,...extra};expansionDecks.push(f);return f;}
function corridor(id,a,b,y,extra={}){
 if(a[0]!==b[0]&&a[1]!==b[1]){corridor(id+'-a',a,[b[0],a[1]],y,extra);corridor(id+'-b',[b[0],a[1]],b,y,extra);return;}
 return floor(id,Math.min(a[0],b[0])-6,Math.min(a[1],b[1])-6,Math.abs(a[0]-b[0])+12,Math.abs(a[1]-b[1])+12,y,extra);
}
for(const plan of districtPlans){
 const {id,y,region}=plan,r=routes[id];
 const rooms=roomData[id].map(([name,x,z,w,d])=>floor(`${id}-${name}`,x,z,w,d,y+(id==='proving'&&name==='observation'?4:0),{region,district:id}));expansionRooms.push(...rooms);
 const paths=[plan.approach,r.path,r.returns,...r.branches];
 for(const [j,points]of paths.entries())for(let i=1;i<points.length;i++){
  if(id==='proving'&&j===3)continue;
  const water=id==='reservoir'&&j===2;
  corridor(`${id}-route-${j}-${i}`,points[i-1],points[i],y,{region,...(water?{water:true}:{})});
 }
 for(const [i,[x,z]]of r.hives.entries())expansionHives.push({id:`${id}-hive-${i?3:0}`,x,y,z,heading:Math.PI/2});
 for(const [cid,x,z,kind,extra={}]of r.controls)expansionControls.push({id:cid,x,y:y+(extra.height||1.3),z,kind,...extra});
 for(const [gid,x,z,w,d,extra={}]of r.gates)expansionSolids.push({id:gid,x,y,z,w,d,h:3.5,...extra});
 for(const [i,[x,z,w,d]]of r.cover.entries())expansionSolids.push({id:`${id}-cover-${i}`,x,y,z,w,d,h:2.6,permanent:true,theme:region});
 for(const [i,[type,x,z,encounter,wave=0]]of r.enemies.entries())expansionEnemies.push({id:`${id}-${encounter}-${type}-${i}`,type,hp:Math.ceil(hp[type]*({proving:1.25,lens:1.5,coolant:1.5,hearth:1.75}[id]||1)),x,y,z,encounter:`${id}-${encounter}${wave?'-reserve':''}`,startup:1.2+(i%3)*.4,...(encounter==='endurance'?{battle:`${id}-endurance`,wave}:{}),...(type==='guard'?{magneticShield:true}:{})});
 for(const [kind,x,z]of r.props){
  expansionProps.push({kind,x,y,z,region,district:id});
  if(kind==='gantry')for(const side of [-7,7])expansionSolids.push({id:`${id}-gantry-${side}`,x:x+side-.3,y,z:z-.4,w:.6,d:.8,h:9,permanent:true,invisible:true});
  else {const size=kind==='separator'?14:kind==='pump'?7:4;expansionSolids.push({id:`${id}-${kind}-${x}`,x:x-size/2,y,z:z-size/2,w:size,d:size,h:kind==='separator'?12:kind==='pump'?8:kind==='boiler'?6:['lens','emitter','rack'].includes(kind)?3.8:3.5,permanent:true,invisible:true});}
 }
 if(plan.pickup){const [x,z]=r.path.find(p=>p[2]==='pickup');expansionPickups.push({id:plan.pickup,ability:plan.ability,x,y,z});}
 if(id==='proving'){const [x,z]=r.path.find(p=>p[2]==='battle');expansionBattles.push({id:`${id}-endurance`,battle:`${id}-endurance`,x:x+5,y:y+1.3,z});}
 for(const c of expansionControls.filter(c=>c.id.startsWith(id)&&c.surface==='top'))expansionSolids.push({id:c.id+'-tray',x:c.x-2,y,z:c.z-2,w:4,d:4,h:1.9,permanent:true});
 expansionRoutes.push({...plan,path:r.path,returns:r.returns,rooms:rooms.map(r=>({...r,x:r.x+r.w/2,z:r.z+r.d/2})),trial:`${id}-transfer`});
}
floor('arsenal-counterweight-foot',-149,-28,8,8,8,{region:'transit'});
floor('proving-gallery-west',102,-176,8,26,16,{rise:4,region:'testworks'});
floor('proving-gallery-east',188,-176,8,26,16,{rise:4,region:'testworks'});
floor('lens-mirror-plinth',320,-20,8,10,24,{region:'optics'});
floor('lens-receiver-plinth',304,-20,8,10,24,{region:'optics'});
// Water occupies the centre of the reservoir, not a corridor hidden after pickup.
floor('reservoir-basin',-156,28,72,78,-8,{water:true,region:'garden'});
floor('reservoir-current-exit',-100,28,30,12,-8,{water:true,region:'garden'});
expansionCurrents.push({id:'reservoir-preview-water',x:-100,z:34,w:16,d:72,y:-8,current:{x:0,z:-4.2}},{id:'reservoir-mouth',x:-156,z:58,w:72,d:12,y:-8,current:{x:3,z:0}});
floor('reservoir-preview-bank',-102,38,34,10,-8,{region:'garden'});
floor('reservoir-eddy',-102,47,8,9,-8,{region:'garden'});
expansionHeat.push({id:'coolant-runout',x:284,z:100,w:96,d:12,y:-24,heat:28});
expansionSolids.push({id:'core-feed',x:28,z:13,w:12,d:1,y:-40,h:4});
expansionControls.find(c=>c.id==='core-feed').circuit=[[24,-39.88,118],[24,-39.88,110],[24,-39.88,58],[24,-39.88,6],[34,-39.88,6],[34,-39.88,13.5]];
expansionMirrors.push({id:'lens-first-reflection',x:324,y:26,z:-14,n:[Math.SQRT1_2,0,Math.SQRT1_2],size:5});
// The collimator court stays empty in its centre: a real shaft establishes the
// opposing sightlines, while these rails carry shields through the dispatch hall.
expansionBelts.push({id:'dispatch-line',x:-138,z:-4,w:70,d:8,y:8,vx:3.2,vz:0});
// Single demonstration opponents are not coordinated squads.
for(const e of expansionEnemies)if(expansionEnemies.filter(other=>other.encounter===e.encounter).length===1)delete e.encounter;
expansionEnemies.push({id:'spillway-turret',type:'turret',hp:3,x:-76,y:-8,z:40,encounter:'spillway'}, {id:'spillway-guard',type:'guard',magneticShield:true,hp:3,x:-94,y:-8,z:42,encounter:'spillway'});
export const expansionFlags=[...new Set([...expansionSolids.filter(s=>!s.permanent).map(s=>s.id),...expansionControls.map(c=>c.id)])];

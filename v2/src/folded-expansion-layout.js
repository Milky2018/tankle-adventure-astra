// Authored service districts. Coordinates describe usable rooms and machinery,
// not slots in a repeated acquisition template.
export const districtPlans=[
 {id:'arsenal',region:'transit',y:8,ability:'magnet',pickup:'magnetModule',approach:[[-56,31],[-188,31]]},
 {id:'reservoir',region:'garden',y:-8,ability:'flotation',pickup:'flotation',approach:[[-52,-8],[-100,-8],[-100,-174],[-188,-174]]},
 {id:'proving',region:'testworks',y:16,ability:'phoenix',pickup:'phoenix',approach:[[77,-94],[77,-206],[64,-206]]},
 {id:'lens',region:'optics',y:24,ability:'laser',pickup:'laser',approach:[[248,-24],[344,-24]]},
 {id:'coolant',region:'circulation',y:-24,ability:'circulation',pickup:'circulation',approach:[[260,117],[320,117],[320,132],[344,132]]},
 {id:'hearth',region:'furnace',y:-40,approach:[[28,-10],[-60,-10],[-60,52],[-108,52]]}
];
export const expansionDecks=[],expansionSolids=[],expansionControls=[],expansionHives=[],expansionEnemies=[],expansionPickups=[],expansionRooms=[],expansionRoutes=[],expansionCurrents=[],expansionHeat=[],expansionBattles=[],expansionProps=[],expansionMirrors=[];
const hp={sniper:3,guard:5,skirmisher:3,artillery:5,scout:2,turret:4,welder:5,miner:3,repairer:3,reflector:5};
const roomData={
 arsenal:[['dispatch',-238,8,60,36],['sighting',-246,-76,44,58],['crane',-348,-94,84,50],['rail-shop',-402,-98,60,56],['repair',-288,-146,34,32],['armature',-176,-140,46,42],['return',-138,-70,32,38]],
 reservoir:[['spillway',-242,-194,64,32],['nursery',-276,-270,48,44],['filter',-372,-274,64,44],['drydock',-402,-222,44,48],['pontoons',-322,-224,36,30]],
 proving:[['receiving',42,-236,44,46],['recoil',24,-300,48,46],['impact',104,-310,70,48],['endurance',192,-300,56,44],['repair',230,-250,30,30],['engine',188,-204,38,40],['runout',92,-202,78,24]],
 lens:[['vestibule',322,-52,44,42],['collimator',306,-122,36,48],['shutter',366,-132,68,34],['alignment',440,-114,34,60],['emitter',414,-42,34,32],['reflection',370,-40,30,30]],
 coolant:[['intake',320,116,48,34],['boilers',310,170,56,58],['separator',386,184,48,38],['condenser',468,144,46,58],['jacket',446,90,38,34]],
 hearth:[['receiving',-170,32,70,40],['mounts',-236,-16,48,38],['coolers',-306,-14,46,36],['batteries',-320,44,42,44],['feed',-236,76,42,36]]
};
const routes={
 arsenal:{
  path:[[-188,31,'repair'],[-220,31],[-220,-46,'arsenal-transfer'],[-304,-46],[-304,-68],[-304,-130],[-272,-130,'repair'],[-152,-130],[-152,-118,'pickup']],
  returns:[[-152,-118,'arsenal-return'],[-112,-118],[-112,-50],[-112,-28],[-50,-28],[-50,31],[-56,31]],
  branches:[[[-304,-46],[-292,-46],[-292,-34],[-292,-10],[-220,-10],[-220,31]],[[-304,-68],[-372,-68],[-372,-80]],[[-220,31],[-178,31],[-178,-20],[-220,-20]]],
  hives:[[-188,31],[-278,-138]],
  controls:[['arsenal-transfer',-233,-46,'shot',{pressure:{x:-220,y:8,z:-46}}],['arsenal-return',-144,-118,'magnet']],
  gates:[['arsenal-transfer',-254,-52,1,12],['arsenal-return',-134,-124,1,12]],
  cover:[[-228,8,5,12],[-218,-12,11,3],[-319,-64,4,12],[-291,-86,13,3],[-316,-88,3,8]],
  enemies:[['sniper',-226,-20,'entry'],['scout',-211,11,'entry'],['guard',-315,-74,'assembly'],['skirmisher',-291,-56,'assembly'],['repairer',-309,-82,'assembly'],['artillery',-332,-82,'assembly'],['guard',-112,-64,'return'],['skirmisher',-114,-42,'return']],
  props:[['gantry',-314,-90],['assembly',-165,-116],['assembly',-142,-134],['rack',-236,-64],['rack',-332,-58]],
 },
 reservoir:{
  path:[[-188,-174,'repair'],[-212,-174],[-242,-174],[-242,-210],[-252,-210],[-252,-246,'reservoir-inlet'],[-252,-256,'reservoir-transfer'],[-340,-256],[-340,-266],[-356,-266],[-356,-256],[-380,-256],[-380,-200,'repair'],[-304,-200],[-304,-208,'pickup']],
  returns:[[-304,-208,'float'],[-304,-214],[-121,-214],[-121,-14],[-52,-14],[-52,-8,'float']],
  branches:[[[-252,-246],[-268,-246],[-268,-216],[-340,-216],[-340,-256]]],
  hives:[[-188,-174],[-390,-192]],
  controls:[['reservoir-inlet',-245,-246,'shot',{rotor:true}],['reservoir-transfer',-244,-256,'shot',{rotor:true,requires:'reservoir-inlet'}]],
  gates:[['reservoir-transfer',-290,-262,1,12],['reservoir-transfer',-290,-222,1,12]],
  cover:[[-232,-185,3,10],[-258,-198,12,3],[-349,-260,3,16],[-329,-247,10,3]],
  enemies:[['turret',-223,-184,'bank'],['scout',-241,-182,'bank'],['sniper',-347,-239,'filter'],['miner',-319,-258,'filter'],['skirmisher',-331,-238,'filter']],
  props:[['sluice',-251,-263],['sluice',-261,-235],['wreck',-305,-217],['planter',-368,-210],['planter',-272,-265]],
 },
 proving:{
  path:[[64,-206,'repair'],[64,-224],[48,-224],[48,-276,'proving-transfer'],[136,-276],[188,-276],[188,-262],[218,-262],[218,-276,'battle'],[244,-276],[244,-236,'repair'],[206,-236],[206,-186,'pickup']],
  returns:[[206,-186],[206,-170],[77,-170,'boost'],[77,-94]],
  branches:[[[136,-276],[136,-224],[64,-224]]],
  hives:[[64,-198],[250,-230]],
  controls:[['proving-transfer',48,-289,'shot',{surface:'top',ground:16,height:2.6}]],
  gates:[['proving-transfer',82,-282,1,12],['proving-transfer',82,-230,1,12],['proving-endurance',237,-282,1,12],['proving-return',172,-176,1,12,{phoenix:true}]],
  cover:[[119,-298,3,13],[149,-272,13,3],[198,-286,4,14],[225,-266,12,3]],
  enemies:[['turret',52,-220,'receiving'],['scout',69,-231,'receiving'],['sniper',148,-300,'crossfire'],['skirmisher',121,-279,'crossfire'],['artillery',224,-292,'endurance'],['welder',204,-272,'endurance'],['scout',227,-278,'endurance'],['guard',212,-284,'endurance',1],['skirmisher',232,-274,'endurance',1],['scout',145,-170,'return'],['guard',128,-170,'return']],
  props:[['test-bed',35,-285],['test-bed',156,-294],['engine',218,-193],['wreck',218,-180]],
 },
 lens:{
  path:[[344,-24,'repair'],[324,-24],[324,-96,'lens-transfer'],[400,-96],[455,-96],[455,-68,'repair'],[431,-68],[431,-27,'pickup']],
  returns:[[431,-27,'lens-return'],[384,-27],[344,-27],[344,-24],[248,-24]],
  branches:[[[400,-96],[400,-62],[364,-62],[364,-24]]],
  hives:[[348,-20],[466,-64]],
  controls:[['lens-transfer',330,-96,'shot',{rotor:true}],['lens-return',415,-12,'laser',{height:2,via:[431,26,-12]}]],
  gates:[['lens-transfer',353,-102,1,12],['lens-transfer',358,-61,12,1],['lens-return',404,-33,1,12]],
  cover:[[332,-45,3,12],[382,-123,3,17],[406,-107,16,3]],
  enemies:[['reflector',338,-41,'entry'],['skirmisher',326,-58,'entry'],['sniper',422,-114,'gallery'],['guard',391,-111,'gallery'],['repairer',406,-116,'gallery']],
  props:[['lens',322,-114],['lens',400,-118],['emitter',438,-34],['lens',459,-102]],
 },
 coolant:{
  path:[[344,132,'repair'],[337,132],[337,158],[347,158],[347,184],[337,184],[337,198,'coolant-transfer'],[380,198],[380,206],[408,206],[408,198],[490,198],[490,174,'repair'],[464,174],[464,106,'pickup']],
  returns:[[464,106],[344,106,'boost'],[284,106],[284,132],[260,132],[260,117]],
  branches:[[[408,198],[408,156],[372,156],[372,132],[344,132]]],
  hives:[[351,128],[502,161]],
  controls:[['coolant-transfer',342,198,'shot',{counterweight:true}]],
  gates:[['coolant-transfer',377,192,1,12],['coolant-transfer',402,176,12,1],['coolant-return',420,100,1,12,{red:true}]],
  cover:[[326,169,15,3],[350,202,4,16],[393,190,3,12],[413,212,14,3]],
  enemies:[['welder',330,184,'boilers'],['miner',348,185,'boilers'],['artillery',419,192,'separator'],['guard',401,212,'separator'],['repairer',415,209,'separator'],['guard',397,106,'return'],['welder',380,106,'return']],
  props:[['boiler',320,209],['boiler',356,218],['boiler',482,188],['jacket',464,97]],
 },
 hearth:{
  path:[[-108,52,'repair'],[-152,52],[-152,62],[-180,62],[-180,52],[-212,52],[-212,3,'hearth-transfer'],[-212,15],[-242,15],[-242,3],[-282,3,'battle'],[-282,64],[-300,64,'repair'],[-216,64],[-216,96,'core-feed']],
  returns:[[-216,96,'hearth-return'],[-152,96],[-152,-10],[28,-10]],
  branches:[[[-212,3],[-212,-34],[-150,-34],[-150,52]]],
  hives:[[-108,52],[-311,76]],
  controls:[['hearth-transfer',-221,3,'shot',{surface:'top',ground:-40,height:2.6}],['core-feed',-216,96,'laser'],['hearth-return',-210,96,'shot']],
  gates:[['hearth-transfer',-248,-3,1,12],['hearth-endurance',-288,29,12,1],['hearth-return',-184,90,1,12]],
  cover:[[-165,41,3,16],[-227,-3,3,12],[-274,9,10,3],[-296,-7,3,12]],
  enemies:[['sniper',-158,40,'intake'],['guard',-182,50,'intake'],['artillery',-290,-3,'endurance'],['reflector',-278,14,'endurance'],['skirmisher',-293,13,'endurance'],['repairer',-298,-10,'endurance',1],['guard',-285,-8,'endurance',1]],
  props:[['wreck',-228,9],['wreck',-203,-8],['battery',-291,77],['battery',-205,101],['core',-226,85]],
 }
};
function floor(id,x,z,w,d,y,extra={}){const f={id,x,z,w,d,y,...extra};expansionDecks.push(f);return f;}
function corridor(id,a,b,y,extra={}){
 if(a[0]!==b[0]&&a[1]!==b[1]){corridor(id+'-a',a,[b[0],a[1]],y,extra);corridor(id+'-b',[b[0],a[1]],b,y,extra);return;}
 return floor(id,Math.min(a[0],b[0])-6,Math.min(a[1],b[1])-6,Math.abs(a[0]-b[0])+12,Math.abs(a[1]-b[1])+12,y,extra);
}
for(const plan of districtPlans){
 const {id,y,region}=plan,r=routes[id];
 const rooms=roomData[id].map(([name,x,z,w,d])=>floor(`${id}-${name}`,x,z,w,d,y,{region,district:id}));expansionRooms.push(...rooms);
 const paths=[plan.approach,r.path,r.returns,...r.branches];
 for(const [j,points]of paths.entries())for(let i=1;i<points.length;i++){
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
  else expansionSolids.push({id:`${id}-${kind}-${x}`,x:x-2,y,z:z-2,w:4,d:4,h:kind==='boiler'?6:['lens','emitter','rack'].includes(kind)?3.8:3.5,permanent:true,invisible:true});
 }
 if(plan.pickup){const [x,z]=r.path.find(p=>p[2]==='pickup');expansionPickups.push({id:plan.pickup,ability:plan.ability,x,y,z});}
 if(['proving','hearth'].includes(id)){const [x,z]=r.path.find(p=>p[2]==='battle');expansionBattles.push({id:`${id}-endurance`,battle:`${id}-endurance`,x:x+5,y:y+1.3,z});}
 for(const c of expansionControls.filter(c=>c.id.startsWith(id)&&c.surface==='top'))expansionSolids.push({id:c.id+'-tray',x:c.x-2,y,z:c.z-2,w:4,d:4,h:1.9,permanent:true});
 expansionRoutes.push({...plan,path:r.path,returns:r.returns,rooms:rooms.map(r=>({...r,x:r.x+r.w/2,z:r.z+r.d/2})),trial:`${id}-transfer`});
}
// The water outlet reconnects to the original ferry. A dry tank cannot take it.
floor('reservoir-preview-bank',-112,-186,12,172,-8,{region:'garden'});
floor('reservoir-preview-water',-132,-186,20,172,-8,{water:true,region:'garden'});
expansionCurrents.push({id:'reservoir-preview-water',x:-132,z:-186,w:20,d:172,y:-8,current:{x:0,z:4.2}},{id:'reservoir-mouth',x:-310,z:-220,w:198,d:12,y:-8,current:{x:3,z:0}});
floor('reservoir-current-exit',-132,-20,86,12,-8,{water:true,region:'garden'});
for(const [i,z]of [-66,-118,-170].entries()){
 floor(`reservoir-eddy-${i}`,-128,z,8,9,-8,{region:'garden'});
 expansionEnemies.push({id:`spillway-${i}-gunner`,type:i===1?'sniper':'turret',hp:3,x:-99,y:-8,z:z+2,encounter:`spillway-${i}`},{id:`spillway-${i}-scout`,type:'scout',hp:2,x:-107,y:-8,z:z+10,encounter:`spillway-${i}`});
 expansionSolids.push({id:`spillway-cover-${i}`,x:-110,y:-8,z:z-14,w:4,d:3,h:2.8,permanent:true,theme:'garden'});
}
expansionHeat.push({id:'coolant-runout',x:344,z:100,w:126,d:12,y:-24,heat:28});
expansionSolids.push({id:'core-feed',x:28,z:13,w:12,d:1,y:-40,h:4});
// Pipe-routing actuators remain useful without adding a new ability or a timer.
expansionSolids.push({id:'reservoir-inlet',x:-267,y:-8,z:-219,w:1,d:12,h:3.5});
expansionControls.find(c=>c.id==='core-feed').circuit=[[-216,-39.88,96],[-152,-39.88,96],[-152,-39.88,-10],[34,-39.88,-10],[34,-39.88,13.5]];
expansionMirrors.push({id:'lens-first-reflection',x:431,y:26,z:-12,n:[Math.SQRT1_2,0,Math.SQRT1_2],size:5});
export const expansionFlags=[...new Set([...expansionSolids.filter(s=>!s.permanent).map(s=>s.id),...expansionControls.map(c=>c.id)])];

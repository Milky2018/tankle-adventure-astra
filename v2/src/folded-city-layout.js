// The remaining city occupies the same coordinates and supporting-height space
// as the original R2/R3/R5 circuit. No connector changes scenes or teleports.
const d=(id,x,z,w,depth,y,extra={})=>({id,x,z,w,d:depth,y,...extra});
const gate=(id,x,z,w,depth,y,h=4,extra={})=>({id,x,z,w,d:depth,y,h,...extra});
const control=(id,x,y,z,kind='shot',extra={})=>({id,x,y,z,kind,...extra});
export const cityDecks=[
  d('foundry-awakening',-14,74,28,24,-8),d('foundry-west',-46,80,32,12,-8),
  d('foundry-west-ramp',-46,56,12,24,-16,{rise:8,solidRails:true}),
  d('press-working-floor',-46,38,24,18,-16),
  d('press-service-link',-62,44,16,12,-16),d('reclaim-entry-verge',-50,44,4,48,-16),d('foundry-reclaim-track',-62,44,12,96,-16),
  d('reclaim-sorting-bay',-70,94,20,22,-16),
  d('prototype-court',-50,116,36,24,-16),d('prototype-return',-34,56,12,60,-16),
  d('foundry-belt',-6,58,12,16,-8),d('recycling-furnace',-18,34,48,24,-8),
  d('foundry-exit-rise',18,10,12,24,0,{rise:-8}),d('exit-terrace',6,-2,24,12,0),
  d('cargo-canal',-78,-10,36,12,-16,{water:true}),d('press-canal',-78,2,12,42,-16,{water:true}),d('press-maintenance',-78,44,16,12,-16),
  d('canal-launch-loop',-78,22,26,12,-16,{water:true}),
  d('training-gallery',-56,22,12,18,8),
  d('loading-descent-top',-18,-40,12,74,0),d('loading-descent',-18,-64,12,24,-8,{rise:8}),
  d('loading-west',-18,-80,14,16,-8),d('loading-conveyor',-4,-76,28,8,-8),d('mortar-apron',24,-80,22,16,-8),
  d('loading-return-top',12,-40,12,12,0),d('loading-return-bottom',24,-64,12,24,-8),d('emitter-cage-foot',44,-80,12,24,-8),
  d('freight-half-rise',56,-60,6,20,4,{rise:-4}),d('freight-half-landing',56,-66,14,6,4),
  d('outer-ring-ascent',56,-86,6,20,8,{rise:-4}),d('observatory-outer-west',56,-94,10,8,8),
  d('receiving-descent',64,-60,6,20,4,{rise:-4}),d('outer-ring-back',56,-112,10,18,8),
  d('outer-freight-span',56,-112,38,12,8),d('observatory-outer-east',196,-100,28,24,8),
  d('outer-calibration-rise',212,-76,12,40,8,{rise:16}),d('calibration',196,-36,52,24,24),
  d('emitter-return',58,-104,202,12,24),d('emitter-service',248,-92,12,56,24),d('emitter-return-neck',236,-36,24,12,24),
  d('emitter-cage-top',56,-98,14,18,24),d('mirror-bay',204,-12,18,4,24),
  d('mirror-turntable',228,-8,8,8,24),d('mirror-bypass',236,-12,12,24,24),d('gallery-top',216,0,32,12,24),d('gallery-descent',224,12,12,24,24,{rise:-8}),d('mirror-service-gallery',196,24,40,16,16),d('optical-yard-upper',236,36,12,8,16),
  d('guardian-neck',196,40,12,4,16),d('guardian-court',180,44,48,46,16),
  d('guardian-exit',228,64,32,12,16,{region:'optics'}),
  d('guardian-descent',248,16,12,48,-8,{rise:24,region:'circulation'}),
  d('guardian-descent-foot',236,8,24,16,-8,{region:'circulation'}),
  d('signal-ascent',180,90,12,48,16,{rise:24}),d('signal-deck',180,138,36,16,40),
  d('garden-optical-bridge',116,-4,80,12,16),d('optical-bridge-neck',196,-4,12,28,16),d('optical-lift-north',104,-4,12,16,16),
  d('garden-optical-foot',94,12,10,12,-8),d('pump-service-walk',94,-24,10,36,-8),
  d('pump-terrace',52,-36,52,12,-8),d('pump-wrap',52,-24,12,36,-8),
  d('pump-return-bridge',-32,-36,84,12,-8),d('pump-return-shore',-32,-24,12,10,-8),
  d('pressure-descent-one',156,0,12,24,24,{rise:-8}),d('pressure-braking-court',148,24,32,12,16),
  d('pressure-descent-two',168,-12,12,36,8,{rise:8}),d('pressure-middle-court',168,-24,28,12,8),
  d('pressure-descent-three',184,-12,12,36,8,{rise:-16}),
  d('old-service-spur',30,2,130,8,0),d('bulkhead-ascent-foot',148,-2,12,12,0),
  d('pressure-approach',148,24,48,12,-8),d('circulation-yard',148,36,100,16,-8),d('optical-yard-landing',236,24,12,12,-8),
  d('circulation-dry-descent',236,52,12,48,-8,{rise:-16}),d('circulation-rig',208,100,52,36,-24),d('inner-runup',260,112,12,24,-24),
  d('sustained-return',208,28,12,72,-16,{rise:-8}),d('pressure-release-court',208,4,52,24,-16),
  d('pressure-bypass',248,28,12,72,-16,{rise:-8}),d('industrial-return',64,12,52,12,-16),d('industrial-return-east',128,12,80,12,-16),d('industrial-return-elbow',104,24,36,12,-16),
  d('industrial-ascent',64,-24,12,36,-8,{rise:-8}),
  d('predecessor-gallery',28,0,80,12,-40),
  d('predecessor-service-link',76,18,32,12,-40),
  d('predecessor-mount',66,44,22,18,-40),d('predecessor-cooling',88,18,20,16,-40),d('predecessor-dock',72,-12,20,12,-40),d('last-refuge',28,-24,28,24,-40),d('last-cage-top',16,-12,12,10,-8),
  d('predecessor-descent',28,12,12,48,-40,{rise:-16}),d('keeper-forecourt',-28,60,68,16,-56),
  d('keeper-court',-28,12,56,48,-56),d('central-furnace',-16,-16,32,28,-56),
  d('loading-water',0,-40,12,30,-16,{water:true}),d('loading-water-bend',12,-40,8,12,-16,{water:true}),d('loading-water-rise',8,-64,12,24,-8,{rise:-8}),d('loading-water-apron',8,-88,24,24,-8),
  d('maintenance-sump',116,24,24,24,-24,{water:true}),d('sump-dock',104,24,12,12,-24),
  d('sump-descent',116,0,12,24,-16,{rise:-8}),d('sump-upper-dock',116,-12,12,12,-16),d('sump-upper-walk',128,-12,12,36,-16)
];
export const cityLifts=[
  {id:'training',x:-44,z:22,w:12,d:12,stops:[0,8],lock:'ballast'},
  {id:'loading-return',x:12,z:-52,w:12,d:12,stops:[-8,0],lock:'loading-return'},
  {id:'emitter-cage',x:44,z:-92,w:12,d:12,stops:[-8,24],lock:'emitter-cage'},
  {id:'garden-lift',x:104,z:12,w:12,d:12,stops:[-8,16],lock:'garden-optical'},
  {id:'yard-lift',x:236,z:24,w:12,d:12,stops:[-8,16],lock:'guardian',recess:.6},
  {id:'last-cage',x:16,z:-24,w:12,d:12,stops:[-40,-8],lock:'last-cage'}
];
export const citySolids=[
  // Flooded greenhouse rooms leave the first east-west crossing at z=64 clear.
  // Their broad broken doorway offers cover and two water approaches later on.
  gate('garden-ruin-west',-150,32,1.2,22,-8,3.4,{permanent:true,theme:'garden',masonry:true}),
  gate('garden-ruin-north',-150,31,32,1.2,-8,3.4,{permanent:true,theme:'garden',masonry:true}),
  gate('garden-ruin-east-north',-119,32,1.2,11,-8,3.4,{permanent:true,theme:'garden',masonry:true}),
  gate('garden-ruin-east-south',-119,51,1.2,3,-8,2.4,{permanent:true,theme:'garden',masonry:true}),
  gate('garden-ruin-south',-150,53,8,1.2,-8,1.4,{permanent:true,theme:'garden',masonry:true}),
  gate('awakening-carrier',6.8,77.6,2.4,4.5,-8,1.1,{permanent:true,invisible:true}),
  gate('final-predecessor',-13.1,3,4.2,4,-56,1.9,{permanent:true,invisible:true}),
  gate('furnace-shell',-5,-13,10,10,-56,7,{permanent:true,invisible:true}),
  gate('predecessor-west',96,23.5,4,3,-40,2.7,{permanent:true,invisible:true}),
  gate('predecessor-east',80,-8,4,3,-40,2.7,{permanent:true,invisible:true}),
  gate('predecessor-mount',74,48.5,4,3,-40,2.7,{permanent:true,invisible:true}),
  gate('predecessor-last',48,-19.5,4,3,-40,2.7,{permanent:true,invisible:true}),
  gate('foundry-foundation',-14,74,28,24,-24,15.2,{permanent:true,mass:true}),
  gate('optical-foundation',196,-36,52,24,-24,47.2,{permanent:true,mass:true}),
  gate('rig-foundation',208,100,52,36,-56,31.2,{permanent:true,mass:true}),
  gate('refuge-foundation',28,-24,28,24,-64,23.2,{permanent:true,mass:true}),
  gate('training-pier-west',-58.8,23.2,1.2,1.2,-16,24,{permanent:true}),gate('training-pier-east',-45.6,37.2,1.2,1.2,-16,24,{permanent:true}),
  gate('relay-west',-47.5,44,1,12,-16,3),
  gate('relays',-50.5,120,1,12,-16),gate('overdrive-return',-34,114,12,1,-16,5),
  gate('prototype-shortcut',-34,58,12,1,-16),
  gate('prototype-jamb-north',-50.5,116,1,4,-16,6,{permanent:true}),gate('prototype-jamb-south',-50.5,132,1,8,-16,6,{permanent:true}),
  gate('foundry',204,-121,28,1,16,5),
  gate('bridge-crane',-6,-20,12,1,0,3.2),
  gate('bridge-crane',-6,-28,1,8,0,3.2),gate('bridge-crane',5,-28,1,8,0,3.2),
  gate('freight-return',62.5,-40,1,12,0),
  gate('pressure',92,2,1,8,0,4,{phoenix:true}),
  gate('gallery',224,11.5,12,1,24),gate('guardian',180,89.5,12,1,16),
  gate('garden-optical',188,-4,1,12,16),gate('guardian',235.5,24,1,20,16),gate('guardian',228,64,1,12,16),
  gate('pump',52,-10,12,1,-8),gate('pump',-32,-24,12,1,-8),gate('pressure-return',248,98,12,1,-24),
  gate('pressure-return',64,-1,12,1,-14,4),
  gate('pressure-thermal',208,52,12,1,-18.6666666667,3,{red:true}),
  gate('keeper',-8,11.5,16,1,-56),
  gate('receiver-south',222,-.5,14,.5,24,3,{permanent:true}),gate('receiver-east',235.5,-8,.5,2,24,3,{permanent:true}),gate('receiver-east-end',235.5,-2,.5,2,24,3,{permanent:true}),gate('receiver-east-sill',235.5,-6,.5,4,24,1.2,{permanent:true}),
  gate('receiver-aperture-north',221.5,-8,.5,2,24,3,{permanent:true}),gate('receiver-aperture-south',221.5,-2,.5,2,24,3,{permanent:true}),
  gate('mirror-housing',222,-8,8,1,24,3,{permanent:true}),gate('mirror-housing-end',234,-8,2,1,24,3,{permanent:true}),
  gate('relay-well-back',229.5,-11,5,.5,24,3,{permanent:true}),gate('relay-well-west',229.5,-11,.5,3,24,3,{permanent:true}),gate('relay-well-east',234,-11,.5,3,24,3,{permanent:true}),
  gate('pressure-housing-west',214,14,.7,9,-16,5,{permanent:true}),gate('pressure-housing-east',222,14,.7,9,-16,5,{permanent:true}),
  gate('pressure-housing-back',214,22,8,1,-16,5,{permanent:true}),gate('pressure-housing-roof',214,14,8,9,-12,1,{permanent:true}),
  gate('keeper-cover-left',-16,42,4,3,-56,2,{permanent:true}),gate('keeper-cover-right',12,42,4,3,-56,2,{permanent:true}),
  gate('prototype-column-left',-44,118,2,3,-16,6,{permanent:true}),
  gate('prototype-column-right',-19,119,2,3,-16,6,{permanent:true}),
  gate('reclaim-cover',-64,99,3,3,-16,2,{permanent:true}),
  gate('relay-west-drive',-37.3,37.25,4.6,2.5,-16,3.3,{permanent:true,invisible:true}),
  gate('relay-east-drive',-67.3,107.25,4.6,2.5,-16,3.3,{permanent:true,invisible:true}),
  gate('press-cover',-45,39,4,3,-16,2,{permanent:true}),
  gate('freight-shield-wall',48,-40,3,5,0,2.6,{permanent:true}),
  gate('loading-cover',38,-79,4,3,-8,2,{permanent:true}),
  gate('loading-return',24,-64,12,1,-8,3.2),
  gate('dispatch-screen',-18,-12,5,3,0,2.5,{permanent:true}),
  gate('dispatch-cover',-10,-33,3,4,0,2,{permanent:true}),
  gate('overseer-cover-west',206,-141,4,3,16,2,{permanent:true}),
  gate('overseer-cover-east',234,-141,4,3,16,2,{permanent:true}),
  gate('outer-cover',210,-99,3,5,8,2,{permanent:true}),
  gate('yard-inlet-cover',164,40,4,3,-8,2,{permanent:true}),
  gate('calibration-cover',223,-26,3,4,24,2,{permanent:true}),
  gate('gallery-cover',211,32,4,3,16,2,{permanent:true})
];
export const cityControls=[
  control('relay-west',-35,-14.5,44),control('relay-east',-65,-14.5,114,'shot',{effects:['relay-east','relays'],feeds:['relays']}),
  control('prototype-shortcut',-28,-12.75,59.1,'shot',{mount:'prototype-shortcut',facing:[0,0,1]}),
  control('ballast',-29,1.3,27,'shot',{effects:['ballast','ratchet'],feeds:['ballast']}),
  control('loading-return',32,-2,-58,'shot',{ground:-8,surface:'top',effects:['loading-return','bridge-crane']}),control('freight-return',70,1.3,-34,'shot',{mount:'freight-return',facing:[1,0,0]}),
  control('emitter-cage',63,25.4,-86,'shot',{facing:[1,0,0]}),control('gallery',228,26,-4,'laser',{ground:24,normal:[-1,0,0]}),
  control('garden-optical',232,26,-9.5,'laser',{ground:24,normal:[0,0,1]}),
  control('pump',58,-5.5,-4,'shot',{ground:-8,mount:'pump',facing:[0,0,1]}),
  control('pressure-return',218,-14.6,18),control('last-cage',40,-38.6,-12,'shot',{facing:[1,0,0]}),
  control('signal',198,41.3,146,'shot',{destinations:[{id:'signal-dish',x:204,y:40,z:146}]}),control('maintenance',110,-22.1,30,'shot',{weapons:['cannon'],effects:['maintenance-started'],feeds:['maintenance'],destinations:[{id:'tender-drive',x:108,y:-24,z:32}]}),
  control('dock',0,-54.6,0,'dock')
];
export const cityPickups=[
  {id:'overdrive',ability:'overdrive',x:-28,y:-16,z:124,requires:'prototype',preview:true},
  {id:'magnetModule',ability:'magnet',x:-50,y:8,z:33},{id:'mortarModule',ability:'mortar',x:32,y:-8,z:-178,requires:'sorter',preview:true},
  {id:'laser',ability:'laser',x:228,y:24,z:-20},{id:'circulation',ability:'circulation',x:222,y:-24,z:117}
];
export const cityEnemies=[
  {id:'foundry-west-scout',x:-40,y:-16,z:54,hp:1,type:'scout'},
  {id:'press-gunner',x:-32,y:-16,z:42,hp:2,type:'turret',encounter:'press-relay'},
  {id:'press-scout',x:-43,y:-16,z:46,hp:1,type:'scout',encounter:'press-relay'},
  {id:'reclaim-scout',x:-66,y:-16,z:104,hp:3,type:'welder',encounter:'prototype-approach',patrol:{x:-70,z:94,w:18,d:18}},
  {id:'reclaim-guard',x:-55,y:-16,z:110,hp:3,type:'guard',encounter:'prototype-approach',patrol:{x:-70,z:94,w:18,d:18}},
  {id:'prototype',x:-30,y:-16,z:126,hp:9,type:'elite',persistent:true},
  {id:'foundry',x:218,y:16,z:-144,hp:14,type:'boss',parts:[4,4],core:6,persistent:true},
  {id:'workroom-gunner',x:12,y:-8,z:38,hp:2,type:'turret',encounter:'foundry-workroom',patrol:{x:-16,z:36,w:44,d:20}},
  {id:'workroom-flanker',x:-10,y:-8,z:42,hp:2,type:'skirmisher',encounter:'foundry-workroom',patrol:{x:-16,z:36,w:44,d:20}},
  {id:'workroom-guard',x:22,y:-8,z:47,hp:3,type:'guard',encounter:'foundry-workroom',patrol:{x:-16,z:36,w:44,d:20}},
  {id:'freight-lobber',x:55,y:0,z:-36,hp:3,type:'artillery',encounter:'freight-battery'},
  {id:'freight-flanker',x:53,y:0,z:-30,hp:2,type:'skirmisher',encounter:'freight-battery'},
  {id:'dispatch-turret',x:-15,y:0,z:-24,hp:2,type:'turret',encounter:'dispatch-crossing',patrol:{x:-18,z:-36,w:12,d:28}},
  {id:'dispatch-flanker',x:-9,y:0,z:-18,hp:2,type:'skirmisher',encounter:'dispatch-crossing',patrol:{x:-18,z:-36,w:12,d:28}},
  {id:'outer-sentry',x:202,y:8,z:-78,hp:4,type:'sniper',encounter:'outer-calibration'},
  {id:'outer-scout',x:213,y:8,z:-77,hp:4,type:'miner',encounter:'outer-calibration'},
  {id:'calibration-guard',x:221,y:24,z:-29,hp:5,type:'reflector',mirror:true,encounter:'emitter'},
  {id:'calibration-scout',x:233,y:24,z:-29,hp:4,type:'skirmisher',encounter:'emitter'},
  {id:'gallery-sentry',x:220,y:16,z:34,hp:4,type:'reflector',encounter:'optical-releases'},
  {id:'gallery-scout',magneticShield:true,x:211,y:16,z:28,hp:5,type:'guard',encounter:'optical-releases'},
  {id:'guardian',x:202,y:16,z:64,hp:36,type:'guard',guardian:true,persistent:true},
  {id:'yard-inlet-gunner',x:160,y:-8,z:40,hp:4,type:'turret',encounter:'pressure-inlet'},
  {id:'yard-inlet-flanker',x:158,y:-8,z:47,hp:4,type:'skirmisher',encounter:'pressure-inlet'},
  {id:'yard-guard',x:230,y:-8,z:46,hp:5,type:'welder',encounter:'rig-approach'},
  {id:'yard-scout',x:232,y:-8,z:44,hp:4,type:'skirmisher',encounter:'rig-approach'},
  {id:'rig-gunner',x:242,y:-24,z:122,hp:5,type:'artillery',encounter:'circulation-cradle'},
  {id:'rig-scout',x:234,y:-24,z:114,hp:4,type:'miner',encounter:'circulation-cradle'},
  {id:'hot-obstruction',magneticShield:true,x:211,y:-16,z:24,hp:5,type:'guard',encounter:'pressure-release'},
  {id:'pressure-gunner',x:218,y:-16,z:6,hp:4,type:'sniper',encounter:'pressure-release'},
  {id:'gallery-repairer',x:223,y:16,z:28,hp:4,type:'repairer',encounter:'optical-releases'},
  {id:'yard-repairer',x:220,y:-8,z:40,hp:4,type:'repairer',encounter:'rig-approach'},
  {id:'rig-shield',x:230,y:-24,z:128,hp:5,type:'guard',magneticShield:true,encounter:'circulation-cradle'},
  {id:'keeper',x:0,y:-56,z:32,hp:63,type:'boss',parts:[6.75,6.75],core:49.5,persistent:true}
];
export const cityBelts=[
  // Paired freight lanes keep both directions usable without waiting for a lift.
  {id:'inspection-up',x:1,z:-150,w:4,d:64,y:16,rise:-16,vx:0,vz:-10.15},
  {id:'inspection-down',x:7,z:-150,w:4,d:64,y:16,rise:-16,vx:0,vz:10.15},
  {id:'inspection-foot-up',x:1,z:-86,w:4,d:46,y:0,vx:0,vz:-10.15},
  {id:'inspection-foot-down',x:7,z:-86,w:4,d:46,y:0,vx:0,vz:10.15},
  {id:'inspection-east',x:12,z:-157,w:182,d:3,y:16,vx:10.15,vz:0},
  {id:'inspection-west',x:12,z:-153,w:182,d:3,y:16,vx:-10.15,vz:0},
  {id:'vestibule-heat',x:148,z:52,w:28,d:50,y:-8,vx:0,vz:0,heat:28},
  {id:'press-crossing',x:-44,z:47,w:22,d:5,y:-16,vx:2.4,vz:0},
  {id:'rejection',x:-6,z:64,w:12,d:8,y:-8,vx:0,vz:10.15},
  {id:'foundry-entry',x:-46,z:64,w:12,d:8,y:-40/3,rise:8/3,vx:0,vz:-10.15},
  {id:'overdrive-return-belt',x:-34,z:104,w:12,d:6,y:-16,vx:0,vz:10.15},
  {id:'loading',x:-4,z:-76,w:8,d:8,y:-8,vx:-10.15,vz:0},
  {id:'loading-final',x:16,z:-76,w:8,d:8,y:-8,vx:-10.15,vz:0},
  {id:'return',x:208,z:28,w:12,d:48,y:-16,rise:-16/3,vx:0,vz:10.15,release:'pressure-return',heat:28},
  {id:'foundry-feed-left',x:203,z:-159,w:5,d:28,y:16,vx:-3.2,vz:0},
  {id:'foundry-feed-right',x:237,z:-159,w:5,d:28,y:16,vx:3.2,vz:0},
  {id:'keeper-feed-left',x:-23,z:24,w:8,d:26,y:-56,vx:0,vz:-3.2},
  {id:'keeper-feed-right',x:15,z:24,w:8,d:26,y:-56,vx:0,vz:-3.2}
];
const q=Math.SQRT1_2;
export const cityMirrors=[
  {id:'calibration',x:216,y:26,z:-4,n:[-Math.sqrt(3)/2,0,.5],size:10},
  {id:'return-index',x:232,y:26,z:-4,n:[q,0,-q],turnable:true,size:6},
  {id:'guardian-east-b',x:210,y:18,z:70,n:[1.1417430631,0,1.5397934235],size:10},
  {id:'guardian-west-b',x:190,y:18,z:68,n:[-1.4631790535,0,1.1737206917],size:10},
  {id:'keeper-mirror',x:22,y:-54,z:18,n:[q,0,-q],size:6}
];
export const cityFlags=['pressure-thermal','inner-thermal','bridge-crane','inner-optics','bench-cover','overdrive','magnetModule','mortarModule','laser','circulation','relay-west','relay-east','relays','prototype','overdrive-return','prototype-shortcut','foundry','ballast','ratchet','loading-return','freight-return','optics-outer','emitter-cage','gallery','garden-optical','yard-optical','guardian','pump','pressure-return','last-cage','keeper','signal','maintenance','endingSeen','inner-transit'];

cityEnemies.push({id:'canal-hunter',type:'hunter',hp:3,x:-72,y:-16,z:26,swimPatrol:[[-72,26],[-72,32]]});
citySolids.push(gate('canal-hunter-pier',-12,-9,2,2,-16,3,{permanent:true}));

// Match the visible side rails of the shared Foundry ramp with small stepped
// collision volumes. Open ends remain traversable; adjoining slopes cannot be
// crossed sideways through a decorative railing.
for(const d of cityDecks.filter(d=>d.solidRails))for(const side of [0,1])for(let offset=0;offset<d.d;offset+=2){
  const span=Math.min(2,d.d-offset),a=d.y+d.rise*offset/d.d,b=d.y+d.rise*(offset+span)/d.d;
  citySolids.push(gate(`${d.id}-rail-${side}-${offset}`,d.x+(side?d.w-.28:.12),d.z+offset,.16,span,Math.min(a,b),1+Math.abs(a-b),{permanent:true,invisible:true}));
}

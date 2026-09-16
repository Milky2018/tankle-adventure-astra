// The remaining city occupies the same coordinates and supporting-height space
// as the original R2/R3/R5 circuit. No connector changes scenes or teleports.
const d=(id,x,z,w,depth,y,extra={})=>({id,x,z,w,d:depth,y,...extra});
const gate=(id,x,z,w,depth,y,h=4,extra={})=>({id,x,z,w,d:depth,y,h,...extra});
const control=(id,x,y,z,kind='shot',extra={})=>({id,x,y,z,kind,...extra});
export const cityDecks=[
  d('foundry-awakening',-14,74,28,24,-8),d('foundry-west',-46,80,32,12,-8),d('foundry-east',14,80,32,12,-8),
  d('foundry-west-ramp',-46,56,12,24,-16,{rise:8}),d('foundry-east-ramp',34,56,12,24,-16,{rise:8}),
  d('press-working-floor',-46,38,36,18,-16),d('foundry-relay-east',10,38,36,18,-16),d('foundry-crossing',-10,44,20,12,-16),
  d('press-service-link',-62,44,16,12,-16),d('reclaim-entry-verge',-50,44,4,48,-16),d('foundry-reclaim-track',-62,44,12,96,-16),
  d('prototype-court',-50,116,36,24,-16),d('prototype-return',-26,92,12,24,-8,{rise:-8}),
  d('foundry-belt',-6,58,12,16,-8),d('recycling-furnace',-18,34,48,24,-8),
  d('foundry-exit-rise',18,10,12,24,0,{rise:-8}),d('exit-terrace',6,-2,24,12,0),
  d('cargo-canal',-78,-10,36,12,-16,{water:true}),d('press-canal',-78,2,12,42,-16,{water:true}),d('press-maintenance',-78,44,16,12,-16),
  d('canal-launch-loop',-78,22,26,12,-16,{water:true}),
  d('training-gallery',-56,22,12,18,8),d('training-return-ramp',-56,40,12,24,8,{rise:-8}),
  d('training-return',-44,34,12,42,0),d('training-bottom',-56,64,12,12,0),d('training-foot',-44,34,24,12,0),
  d('loading-descent-top',-18,-40,12,12,0),d('loading-descent',-18,-64,12,24,-8,{rise:8}),
  d('loading-west',-18,-80,14,16,-8),d('loading-conveyor',-4,-76,28,8,-8),d('mortar-apron',24,-80,22,16,-8),
  d('loading-return-top',12,-40,12,12,0),d('loading-return-bottom',24,-64,12,24,-8),d('emitter-cage-foot',46,-80,12,24,-8),
  d('outer-ring-ascent',36,-64,12,24,8,{rise:-8}),d('observatory-outer-west',36,-76,32,12,8),
  d('receiving-descent',56,-64,12,24,8,{rise:-8}),d('outer-ring-back',36,-112,10,36,8),
  d('outer-freight-span',46,-112,166,12,8),d('observatory-outer-east',196,-100,28,24,8),
  d('outer-calibration-rise',212,-76,12,40,8,{rise:16}),d('calibration',196,-36,52,24,24),
  d('emitter-return',58,-72,178,12,24),d('emitter-service',224,-60,12,24,24),
  d('emitter-cage-top',58,-92,12,32,24),d('mirror-bay',204,-12,32,4,24),
  d('mirror-bypass',236,-12,12,24,24),d('gallery-top',216,0,32,12,24),d('gallery-descent',224,12,12,24,24,{rise:-8}),d('mirror-service-gallery',196,24,40,16,16),d('optical-yard-upper',236,36,12,8,16),
  d('guardian-neck',196,40,12,4,16),d('guardian-court',180,44,48,46,16),
  d('signal-ascent',180,90,12,48,16,{rise:24}),d('signal-deck',180,138,36,16,40),
  d('garden-optical-bridge',116,-4,80,12,16),d('optical-bridge-neck',196,-4,12,28,16),d('optical-lift-north',104,-4,12,16,16),d('garden-optical-landing',104,24,24,12,16),
  d('garden-optical-foot',94,12,10,12,-8),d('pump-service-walk',94,-24,10,36,-8),
  d('pump-terrace',52,-36,52,12,-8),d('pump-wrap',52,-24,12,36,-8),
  d('pump-return-bridge',-32,-36,84,12,-8),d('pump-return-shore',-32,-24,12,10,-8),
  d('pressure-descent-one',156,0,12,24,24,{rise:-8}),d('pressure-braking-court',148,24,32,12,16),
  d('pressure-descent-two',168,-12,12,36,8,{rise:8}),d('pressure-middle-court',168,-24,28,12,8),
  d('pressure-descent-three',184,-12,12,36,8,{rise:-16}),
  d('old-service-spur',30,-2,130,12,0),d('old-spur-descent',148,10,12,24,0,{rise:-8}),
  d('pressure-approach',148,24,48,12,-8),d('circulation-yard',148,36,100,16,-8),d('optical-yard-landing',236,24,12,12,-8),
  d('circulation-dry-descent',236,52,12,48,-8,{rise:-16}),d('circulation-rig',208,100,52,36,-24),d('inner-runup',260,112,12,24,-24),
  d('sustained-return',208,28,12,72,-16,{rise:-8}),d('pressure-release-court',208,4,52,24,-16),
  d('pressure-bypass',248,28,12,72,-16,{rise:-8}),d('industrial-return',64,12,52,12,-16),d('industrial-return-east',128,12,80,12,-16),d('industrial-return-elbow',104,24,36,12,-16),
  d('industrial-ascent',64,-24,12,36,-8,{rise:-8}),d('inner-return-rise',116,-24,12,48,0,{rise:-16}),
  d('inner-return-top',100,-36,28,12,0),d('inner-service-connector',104,-24,12,22,0),
  d('inner-sustained-approach',260,16,12,96,-40,{rise:16}),d('inner-lane-landing',248,0,32,16,-40),
  d('predecessor-gallery',28,0,232,12,-40),d('last-refuge',28,-24,28,24,-40),d('last-cage-top',16,-12,12,10,0),
  d('predecessor-descent',28,12,12,48,-40,{rise:-16}),d('keeper-forecourt',-28,60,68,16,-56),
  d('keeper-court',-28,12,56,48,-56),d('central-furnace',-16,-16,32,28,-56),
  d('loading-water',0,-40,12,30,-16,{water:true}),d('loading-water-bend',12,-40,8,12,-16,{water:true}),d('loading-water-rise',8,-64,12,24,-8,{rise:-8}),d('loading-water-apron',8,-88,24,24,-8),
  d('maintenance-sump',116,24,24,24,-24,{water:true}),d('sump-dock',104,24,12,12,-24),
  d('sump-descent',116,0,12,24,-16,{rise:-8}),d('sump-upper-dock',116,-12,12,12,-16),d('sump-upper-walk',128,-12,12,36,-16)
];
export const cityLifts=[
  {id:'training',x:-44,z:22,w:12,d:12,stops:[0,8],lock:'ballast',calls:[[-30,0,27],[-49,8,27]]},
  {id:'loading-return',x:12,z:-52,w:12,d:12,stops:[-8,0],lock:'loading-return',calls:[[28,-8,-46],[20,0,-34]]},
  {id:'emitter-cage',x:46,z:-92,w:12,d:12,stops:[-8,24],lock:'emitter-cage',calls:[[40,-8,-72],[63,24,-86]]},
  {id:'garden-lift',x:104,z:12,w:12,d:12,stops:[-8,16],lock:'garden-optical',calls:[[99,-8,18],[110,16,29]]},
  {id:'yard-lift',x:236,z:24,w:12,d:12,stops:[-8,16],lock:'yard-optical',recess:.6,calls:[[242,-8,40],[230,16,38]]},
  {id:'last-cage',x:16,z:-24,w:12,d:12,stops:[-40,0],lock:'last-cage',calls:[[33,-40,-18],[22,0,-4]]}
];
export const citySolids=[
  gate('furnace-shell',-5,-13,10,10,-56,7,{permanent:true,invisible:true}),
  gate('predecessor-west',148,.5,4,3,-40,2.7,{permanent:true,invisible:true}),
  gate('predecessor-east',82,.5,4,3,-40,2.7,{permanent:true,invisible:true}),
  gate('predecessor-last',48,-19.5,4,3,-40,2.7,{permanent:true,invisible:true}),
  gate('foundry-foundation',-14,74,28,24,-24,15.2,{permanent:true,mass:true}),
  gate('optical-foundation',196,-36,52,24,-24,47.2,{permanent:true,mass:true}),
  gate('rig-foundation',208,100,52,36,-56,31.2,{permanent:true,mass:true}),
  gate('refuge-foundation',28,-24,28,24,-64,23.2,{permanent:true,mass:true}),
  gate('relay-west',-47.5,44,1,12,-16,3),
  gate('relays',-50.5,116,1,24,-16),gate('overdrive-return',-26,100,12,1,-12,5),
  gate('foundry',18,33.5,12,1,-8),gate('press-return',-62.5,44,1,12,-16),
  gate('freight',25.5,-40.5,12,1,0,5),gate('freight',25.5,-28,12,1,0,5),gate('freight',36.5,-40,1,12,0,5),
  gate('freight-return',47.5,-40,1,12,0),gate('optics-outer',212,-46,12,1,18,8,{phoenix:true}),
  // Expose the same Phoenix lock before the long outer approach, not at its far end.
  gate('optics-outer',78,-112,1,12,8,4,{phoenix:true}),
  gate('pressure',62,-2,1,12,0,4,{phoenix:true}),
  gate('pressure',148,35.5,48,1,-8,4,{phoenix:true}),gate('rig',236,99.5,12,1,-24),
  gate('gallery',224,11.5,12,1,24),gate('guardian',180,89.5,12,1,16),
  gate('garden-optical',188,-4,1,12,16),gate('yard-optical',235.5,24,1,20,16),
  gate('pump',20,-36,1,12,-8),gate('pressure-return',248,98,12,1,-24),
  gate('pressure-return',64,-1,12,1,-14,4),gate('pressure-return',116,23,12,1,-16),gate('pressure-return',104,-5,12,1,0),
  gate('keeper',-8,11.5,16,1,-56),
  gate('ratchet',-56,40,12,1,8),
  gate('receiver-south',222,-.5,14,.5,24,6,{permanent:true}),gate('receiver-east',235.5,-8,.5,8,24,6,{permanent:true}),
  gate('receiver-aperture-north',221.5,-8,.5,3.6,24,6,{permanent:true}),gate('receiver-aperture-south',221.5,-3.6,.5,3.6,24,6,{permanent:true}),
  gate('rig-cover',228,106,3,5,-24,2,{permanent:true}),gate('yard-cover',219,42,5,4,-8,2,{permanent:true}),
  gate('mirror-housing',222,-8,14,1,24,6,{permanent:true}),gate('mirror-housing-roof',222,-8,14,8,30,1,{permanent:true}),
  gate('pressure-housing-west',214,14,.7,9,-16,5,{permanent:true}),gate('pressure-housing-east',222,14,.7,9,-16,5,{permanent:true}),
  gate('pressure-housing-back',214,22,8,1,-16,5,{permanent:true}),gate('pressure-housing-roof',214,14,8,9,-12,1,{permanent:true}),
  gate('keeper-cover-left',-16,42,4,3,-56,2,{permanent:true}),gate('keeper-cover-right',12,42,4,3,-56,2,{permanent:true}),
  gate('relay-cover',20,46,3,3,-16,2,{permanent:true}),gate('reclaim-cover',-59,80,3,4,-16,2,{permanent:true}),
  gate('press-cover',-45,39,4,3,-16,2,{permanent:true}),
  gate('loading-cover',38,-79,4,3,-8,2,{permanent:true}),
  gate('outer-cover',210,-99,3,5,8,2,{permanent:true}),
  gate('calibration-cover',223,-27,3,4,24,2,{permanent:true}),
  gate('gallery-cover',211,32,4,3,16,2,{permanent:true})
];
export const cityControls=[
  control('relay-west',-35,-14.5,44),control('relay-east',36,-14.5,44),
  control('press-return',-70,-14.6,50),control('ballast',-29,1.3,27),control('ratchet',-49,9.3,27),
  control('loading-return',32,-6.7,-58),control('freight-return',64,1.3,-34),
  control('emitter-cage',63,25.4,-86),control('gallery',228,28.54,-3.73,'laser',{ground:24}),
  control('garden-optical',206,17.5,32,'laser'),control('yard-optical',228,17.5,38,'laser'),
  control('pump',72,-4.5,-28,'shot',{ground:-8}),control('rig',242,-21,96,'shot',{ground:-23}),
  control('pressure-return',218,-14.6,18),control('last-cage',40,-38.6,-12),
  control('signal',198,41.3,146,'use'),control('maintenance',110,-22.6,30,'use'),
  control('dock',0,-54.6,0,'dock')
];
export const cityHives=[
  {id:'awakening',x:0,y:-8,z:86},{id:'lower-foundry',x:-17,y:-16,z:49},
  {id:'foundry-exit',x:6,y:-8,z:48,requires:'foundry'},
  {id:'emitter',x:202,y:24,z:-24},{id:'yard',x:210,y:-8,z:44},{id:'rig',x:214,y:-24,z:116},
  {id:'industrial',x:234,y:-16,z:18},{id:'last-refuge',x:44,y:-40,z:-10}
];
export const cityPickups=[
  {id:'overdrive',ability:'overdrive',x:-30,y:-16,z:128,requires:'prototype'},
  {id:'magnetModule',ability:'magnet',x:-50,y:8,z:33},{id:'mortarModule',ability:'mortar',x:34,y:-8,z:-72},
  {id:'laser',ability:'laser',x:228,y:24,z:-20},{id:'circulation',ability:'circulation',x:222,y:-24,z:117}
];
export const cityEnemies=[
  {id:'foundry-west-scout',x:-35,y:-8,z:85,hp:1,type:'scout'},
  {id:'foundry-east-scout',x:39,y:-8,z:85,hp:1,type:'scout'},
  {id:'press-gunner',x:-32,y:-16,z:42,hp:2,type:'turret',encounter:'press-relay'},
  {id:'press-scout',x:-43,y:-16,z:46,hp:1,type:'scout',encounter:'press-relay'},
  {id:'relay-guard',x:32,y:-16,z:49,hp:3,type:'guard',encounter:'east-relay'},
  {id:'relay-scout',x:21,y:-16,z:41,hp:1,type:'scout',encounter:'east-relay'},
  {id:'reclaim-scout',x:-55,y:-16,z:103,hp:1,type:'scout',encounter:'prototype-approach'},
  {id:'reclaim-guard',x:-59,y:-16,z:115,hp:3,type:'guard',encounter:'prototype-approach'},
  {id:'prototype',x:-30,y:-16,z:126,hp:9,type:'elite',persistent:true},
  {id:'foundry',x:0,y:-8,z:42,hp:14,type:'boss',parts:[4,4],core:6,persistent:true},
  {id:'loading-gunner',x:30,y:-8,z:-77,hp:2,type:'turret',encounter:'mortar-rig'},
  {id:'loading-scout',x:25,y:-8,z:-69,hp:2,type:'scout',encounter:'mortar-rig'},
  {id:'outer-sentry',x:202,y:8,z:-86,hp:2,type:'turret',encounter:'outer-calibration'},
  {id:'outer-scout',x:213,y:8,z:-89,hp:2,type:'scout',encounter:'outer-calibration'},
  {id:'calibration-guard',x:217,y:24,z:-25,hp:3,type:'guard',mirror:true,encounter:'emitter'},
  {id:'calibration-scout',x:233,y:24,z:-29,hp:2,type:'scout',encounter:'emitter'},
  {id:'gallery-sentry',x:220,y:16,z:34,hp:2,type:'turret',encounter:'optical-releases'},
  {id:'gallery-scout',x:211,y:16,z:28,hp:2,type:'scout',encounter:'optical-releases'},
  {id:'guardian',x:202,y:16,z:64,hp:36,type:'guard',guardian:true,persistent:true},
  {id:'yard-guard',x:230,y:-8,z:46,hp:3,type:'guard',encounter:'rig-approach'},
  {id:'yard-scout',x:240,y:-8,z:48,hp:2,type:'scout',encounter:'rig-approach'},
  {id:'rig-gunner',x:242,y:-24,z:122,hp:2,type:'turret',encounter:'circulation-cradle'},
  {id:'rig-scout',x:234,y:-24,z:114,hp:2,type:'scout',encounter:'circulation-cradle'},
  {id:'hot-obstruction',x:211,y:-16,z:24,hp:3,type:'guard',encounter:'pressure-release'},
  {id:'pressure-gunner',x:219,y:-16,z:8,hp:2,type:'turret',encounter:'pressure-release'},
  {id:'keeper',x:0,y:-56,z:32,hp:48,type:'boss',parts:[12,12],core:24,persistent:true}
];
export const cityBelts=[
  {id:'rejection',x:-6,z:64,w:12,d:8,y:-8,vx:0,vz:9.4},
  {id:'loading',x:-4,z:-76,w:8,d:8,y:-8,vx:-9.4,vz:0},
  {id:'loading-final',x:16,z:-76,w:8,d:8,y:-8,vx:-9.4,vz:0},
  {id:'return',x:208,z:28,w:12,d:72,y:-16,rise:-8,vx:0,vz:18.2},
  {id:'inner',x:260,z:16,w:12,d:96,y:-40,rise:16,vx:0,vz:18.2},
  {id:'foundry-feed-left',x:-14,z:40,w:8,d:14,y:-8,vx:-5,vz:0},
  {id:'foundry-feed-right',x:14,z:40,w:8,d:14,y:-8,vx:5,vz:0},
  {id:'keeper-feed-left',x:-23,z:24,w:8,d:26,y:-56,vx:0,vz:-5},
  {id:'keeper-feed-right',x:15,z:24,w:8,d:26,y:-56,vx:0,vz:-5}
];
const q=Math.SQRT1_2;
export const cityMirrors=[
  {id:'calibration',x:216,y:26,z:-4,n:[-q,-.15,q],size:6},
  {id:'guardian-east-a',x:222,y:18,z:50,n:[q,0,-q],size:6},
  {id:'guardian-east-b',x:222,y:18,z:84,n:[.361,0,.933],size:7},
  {id:'guardian-west-a',x:182,y:18,z:50,n:[-q,0,-q],size:6},
  {id:'guardian-west-b',x:182,y:18,z:84,n:[-.361,0,.933],size:7},
  {id:'keeper-mirror',x:22,y:-54,z:18,n:[q,0,-q],size:6}
];
export const cityFlags=['overdrive','magnetModule','mortarModule','laser','circulation','relay-west','relay-east','relays','prototype','overdrive-return','foundry','press-return','ballast','ratchet','loading-return','freight-return','optics-outer','emitter-cage','gallery','garden-optical','yard-optical','guardian','pump','rig','pressure-return','last-cage','keeper','signal','maintenance','endingSeen'];

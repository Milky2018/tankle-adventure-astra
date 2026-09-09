// Regional IDs are geography. R4's exterior precedes Phoenix; its calibration depth follows it.
const floor=(id,x,z,w,d,color,kind='floor')=>({id,x,z,w,d,color,kind});
export const midgameRooms=[
  floor('r5-rear-water',-166,-366,78,12,0x3b727c,'water'),
  floor('r5-water-neck',-166,-358,12,12,0x3b727c,'water'),
  floor('r5-rear-dock',-94,-378,24,36,0x8e917c),
  floor('r5-gangway-west',-174,-382,8,40,0x8e917c),
  floor('r5-gangway',-174,-382,86,8,0x8e917c),
  floor('r5-west-bay',-74,-360,42,28,0x968e75),
  floor('r5-service-neck',-36,-402,16,50,0x968e75),
  floor('r5-cradle',-40,-426,48,34,0xa29c80),
  floor('r5-east-bay',4,-396,44,32,0x968e75),
  floor('r5-freight-hall',44,-376,40,32,0x968e75),
  floor('r5-freight-link',80,-356,44,8,0x968e75),
  floor('r5-freight-approach',116,-356,8,124,0x887965),
  floor('r5-launch-track',4,-410,100,8,0x9b957c),
  floor('r5-express-junction',96,-418,16,140,0x8b9887),
  floor('r5-transit-return',104,-286,8,40,0x8b9887),
  floor('r5-spur-return',20,-300,92,8,0x8b9887),
  floor('r5-spur-neck',12,-300,16,20,0x8b9887),
  floor('r4-outer-link',108,-240,32,8,0x8f9fa7),
  floor('r4-outer-ring',124,-260,34,68,0x8f9fa7),
  floor('r4-speed-approach',152,-260,32,8,0x99a8af),
  floor('r4-express-link',104,-328,84,8,0x99a8af),
  floor('r4-express-neck',180,-328,8,88,0x99a8af),
  floor('r4-calibration-north',172,-248,36,28,0xa3adb0),
  floor('r4-service-spine',180,-224,8,92,0x99a8af),
  floor('r4-screen-room',160,-206,30,24,0x8f9fa7),
  floor('r4-lens-room',176,-182,32,32,0xa3adb0),
  floor('r4-emitter',164,-144,44,38,0xa3adb0),
  floor('r4-loading-return',108,-114,64,8,0x99a8af),
  floor('r4-loading-neck',104,-114,8,38,0x99a8af),
  floor('r4-mirror-link',204,-138,16,8,0x9aaba9),
  floor('r4-mirror-gallery',216,-172,24,44,0x9aaba9),
  floor('r4-gallery-return',184,-220,44,8,0x9aaba9),
  floor('r4-guardian-approach',224,-218,8,50,0x9aaba9),
  floor('r4-guardian-court',212,-250,40,36,0x8f9fa7),
  floor('r4-signal-balcony',236,-264,16,18,0xa3adb0),
  floor('r4-circulation-bridge',192,-390,8,150,0x99a8af),
  floor('r4-circulation-landing',164,-390,36,8,0x99a8af),
  floor('r4-garden-bridge',-120,-316,304,8,0x99a8af),
  floor('r6-entry-link',108,-398,32,8,0x887e72),
  floor('r6-service-yard',136,-410,40,38,0x887e72),
  floor('r6-west-neck',144,-418,12,16,0x887e72),
  floor('r6-jacket-hall',144,-454,36,40,0x887e72),
  floor('r6-upper-neck',156,-468,12,20,0x887e72),
  floor('r6-upper-works',156,-470,76,12,0x958a74),
  floor('r6-rig-neck',224,-466,8,24,0x958a74),
  floor('r6-circulation-rig',216,-454,28,40,0x958a74),
  floor('r6-sustained-lane',224,-414,8,64,0x8e7964),
  floor('r6-return-landing',220,-352,24,34,0x958a74),
  floor('r6-pressure-bypass',204,-452,8,132,0x958a74),
  floor('r6-bypass-head',208,-452,16,8,0x958a74),
  floor('r6-industrial-return',-112,-336,344,8,0x887e72),
  floor('r6-return-neck',224,-336,8,12,0x887e72),
  floor('r3-industrial-layer',-112,-340,32,22,0x879989),
  floor('r6-inner-threshold',240,-344,30,12,0x887e72)
];
// axis is the normal of a barrier, not its long direction.
export const midgameGates=[
  {id:'rear-gangway',x:-170,z:-348,span:8,axis:'z',kind:'inside'},
  {id:'launch',x:52,z:-406,span:8,axis:'x',kind:'phoenix'},
  {id:'transit-express',x:108,z:-278,span:8,axis:'z',kind:'phoenix'},
  {id:'old-spur',x:20,z:-268,span:16,axis:'z',kind:'phoenix'},
  {id:'calibration-west',x:168,z:-256,span:8,axis:'x',kind:'phoenix'},
  {id:'calibration-north',x:184,z:-294,span:8,axis:'z',kind:'phoenix'},
  {id:'circulation-entry',x:128,z:-394,span:8,axis:'x',kind:'phoenix'},
  {id:'loading-lift',x:158,z:-110,span:8,axis:'x',kind:'inside'},
  {id:'mirror-gallery',x:212,z:-134,span:8,axis:'x',kind:'laser'},
  {id:'gallery-return',x:212,z:-216,span:8,axis:'x',kind:'laser'},
  {id:'circulation-bridge',x:196,z:-254,span:8,axis:'z',kind:'laser'},
  {id:'garden-east',x:176,z:-312,span:8,axis:'x',kind:'laser'},
  {id:'garden-middle',x:112,z:-312,span:8,axis:'x',kind:'laser'},
  {id:'garden-west',x:-104,z:-312,span:8,axis:'x',kind:'laser'},
  {id:'rig-feed',x:206,z:-464,span:12,axis:'x',kind:'cannon'},
  {id:'pressure-bypass',x:208,z:-440,span:8,axis:'z',kind:'inside'},
  {id:'return-east',x:218,z:-332,span:8,axis:'x',kind:'inside'},
  {id:'return-middle',x:128,z:-332,span:8,axis:'x',kind:'inside'},
  {id:'return-west',x:104,z:-332,span:8,axis:'x',kind:'inside'},
  {id:'garden-service-return',x:-108,z:-330,span:24,axis:'x',kind:'inside'},
  {id:'inner-future',x:264,z:-338,span:12,axis:'x',kind:'future'}
];
export const midgameModules=[{id:'phoenix',x:-15,z:-412},{id:'laser',x:190,z:-124},{id:'circulation',x:228,z:-438}];
export const midgameControls=[
  {id:'gangway-control',x:-86,z:-374,opens:['rear-gangway']},
  {id:'loading-control',x:166,z:-110,opens:['loading-lift']},
  {id:'pressure-control',x:228,z:-340,opens:['pressure-bypass','return-east','return-middle','return-west','garden-service-return']},
  {id:'array-control',x:244,z:-258,opens:[],signal:true}
];
export const midgameReceivers=[
  {id:'gallery-receiver',x:202,z:-122,kind:'laser',opens:['mirror-gallery','gallery-return']},
  {id:'bridge-receiver',x:202,z:-230,kind:'laser',opens:['circulation-bridge']},
  {id:'garden-receiver',x:182,z:-278,kind:'laser',opens:['garden-east','garden-middle','garden-west']},
  {id:'feed-receiver',x:158,z:-442,kind:'cannon',opens:['rig-feed']}
];
export const midgameMirrors=[
  {id:'calibration',x:202,z:-134,angle:Math.PI/4,length:5},
  {id:'gallery',x:232,z:-154,angle:-Math.PI/4,length:5},
  {id:'guardian-west',x:218,z:-242,angle:-Math.PI/4,length:8},
  {id:'guardian-east',x:246,z:-242,angle:Math.PI/4,length:8},
  {id:'guardian-south',x:246,z:-220,angle:Math.PI/4,length:6}
];
export const midgameHives=[[-82,-351,12],[66,-352,13],[-30,-412,14],[140,-202,15],[173,-118,16],[234,-164,17],[146,-389,18],[235,-446,19],[236,-326,20]];
export const midgameEnemies=[
  ['scout',-79,-364,'r5-dock'],['turret',-63,-345,'r5-bay'],['guard',-44,-347,'r5-bay'],
  ['scout',-28,-383,'r5-spine'],['turret',-25,-399,'r5-cradle'],['mortar',-3,-417,'r5-cradle'],
  ['guard',23,-381,'r5-east'],['scout',34,-373,'r5-east'],['turret',63,-363,'r5-freight'],
  ['scout',26,-406,'r5-launch'],['guard',42,-406,'r5-launch'],
  ['guard',143,-242,'r4-outer'],['turret',139,-215,'r4-outer'],
  ['turret',194,-237,'r4-calibration'],['scout',183,-210,'r4-screen'],['mortar',170,-196,'r4-screen'],
  ['guard',199,-164,'r4-lens'],['scout',188,-176,'r4-lens'],
  ['mirror',227,-150,'r4-mirror'],['turret',232,-137,'r4-mirror'],['scout',228,-190,'r4-approach'],
  ['guardian',232,-235,'r4-guardian'],
  ['guard',156,-400,'r6-yard'],['scout',164,-382,'r6-yard'],
  ['turret',168,-424,'r6-jackets'],['mortar',153,-437,'r6-jackets'],
  ['scout',187,-464,'r6-upper'],['turret',230,-422,'r6-rig'],
  ['guard',228,-366,'r6-hot'],['scout',226,-351,'r6-hot']
];
export const midgameProps=[
  ['crate',-53,-348,3,8],['tank',-60,-351,1.6,1.6],['crate',-26,-374,4,3],
  ['crate',18,-377,3,10],['tank',27,-386,1.6,1.6],['crate',60,-369,8,2],
  ['crate',140,-234,3,8],['tank',148,-236,1.6,1.6],['crate',178,-198,3,9],
  ['crate',192,-168,8,2],['tank',202,-172,1.6,1.6],
  ['crate',152,-395,3,8],['tank',165,-401,1.6,1.6],['crate',161,-430,3,10],['tank',170,-435,1.6,1.6]
];
export const returnLane={x:224,z:-414,w:8,d:64,dx:0,dz:-1,speed:2.6};

// R2 joins the north exit of R1. Rectangles describe supported floor, never water.
export const transitRooms = [
  ['arrival',-6,-116,12,38,'stone'],['turntable',-20,-148,40,36,'stone'],
  ['freight-link',-76,-140,60,12,'rust'],['switchyard',-102,-158,30,30,'rust'],
  ['crane-hall',-102,-204,48,42,'rust'],['crane-return',-54,-208,34,24,'rust'],
  ['archive',-20,-206,40,26,'stone'],['spine',-8,-184,16,40,'stone'],
  ['pump-approach',-38,-246,16,38,'water'],['garden-shore',-62,-266,40,20,'water'],
  ['signal-hall',4,-246,40,28,'slate'],['observatory-link',40,-236,24,12,'slate'],
  ['east-link',16,-140,64,12,'slate'],['loading-yard',76,-144,36,24,'slate'],
  ['old-loading',44,-100,52,34,'rust'],['foundry-return',5,-74,39,8,'rust'],
  ['optical-approach',86,-220,12,68,'slate'],['observatory-court',58,-250,54,34,'slate'],
  ['sealed-spur',12,-284,16,42,'stone'],['carrier-bay',-98,-104,24,20,'rust'],
  ['quiet-dock',-72,-254,10,12,'water'],['loading-balcony',94,-92,18,28,'rust'],
  ['signal-neck',12,-222,16,22,'stone'],['loading-neck',84,-106,16,10,'rust'],
  ['freight-north',-94,-164,14,8,'rust'],['freight-south',-96,-130,16,28,'rust'],
  ['artillery-bay',92,-158,20,16,'slate'],['service-lane',96,-122,16,20,'slate']
].map(([id,x,z,w,d,palette])=>({id:`r2-${id}`,x,z,w,d,palette}));
export const transitPalettes={stone:0x85867c,rust:0x886e55,water:0x587982,slate:0x68788a};
export const transitEnemies=[
  ['scout',-42,-134,'freight'],['scout',-65,-134,'freight'],
  ['turret',-77,-145,'switchyard'],['scout',-84,-146,'switchyard'],['guard',-90,-153,'switchyard'],
  ['turret',-63,-187,'crane'],['guard',-71,-179,'crane'],
  ['guard',-8,-195,'archive'],['turret',12,-201,'archive'],
  ['turret',28,-229,'signal'],['scout',16,-239,'signal'],
  ['scout',44,-134,'east'],['turret',67,-134,'east'],
  ['guard',86,-138,'loading'],['mortar',103,-149,'loading'],['scout',99,-137,'loading'],
  ['guard',78,-82,'works'],['mortar',70,-96,'works'],['scout',86,-76,'works'],
  ['guard',92,-170,'optical'],['mortar',89,-196,'optical'],
  ['turret',99,-238,'court'],['guard',84,-232,'court'],
  ['scout',-29,-238,'pump']
];
export const transitHives=[[-10,-119,3],[-97,-194,4],[108,-119,5],[-57,-250,6],[66,-240,7]];
export const magneticRails=[
  {id:'crane',x:-75,z:-191,axis:'x',min:-75,max:-64,goal:-64,opens:'crane-return'},
  {id:'spine',x:-8,z:-186,axis:'x',min:-8,max:5,goal:5,opens:'spine'},
  {id:'garden',x:-34,z:-218,axis:'x',min:-34,max:-26,goal:-26,opens:'garden'},
  {id:'crane-cover',x:-74,z:-186,axis:'z',min:-198,max:-179,w:2.4,d:7,free:true},
  {id:'archive-cover',x:1,z:-192,axis:'x',min:-6,max:8,w:5,d:2.8,free:true},
  {id:'loading-cover',x:94,z:-135,axis:'z',min:-143,max:-128,w:2.4,d:6,free:true},
  {id:'carrier',x:-88,z:-92,axis:'x',min:-88,max:-78,goal:-78,opens:'carrier'}
];
export const transitGateDefs=[
  {id:'crane-return',x:-52,z:-196,span:24,axis:'x'},
  {id:'spine',x:0,z:-165,span:24,axis:'z'},
  {id:'garden',x:-30,z:-225,span:16,axis:'z'},
  {id:'foundry-return',x:38,z:-70,span:8,axis:'x'},
  {id:'optical',x:92,z:-207,span:16,axis:'z'},
  {id:'observatory-return',x:50,z:-230,span:12,axis:'x'}
];
export const mortarLatches=[
  {id:'loading-latch',x:59,z:-93,opens:'foundry-return'},
  {id:'optical-latch',x:94,z:-187,opens:'optical'}
];
export const transitModules=[{id:'magnet',x:-84,z:-196},{id:'mortar',x:54,z:-78}];

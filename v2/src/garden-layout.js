// R3 is a shore loop around a reservoir, with a separate water return to the old works.
export const gardenRooms = [
  ['shore-link',-100,-254,30,10,'shore'],['service-court',-126,-266,28,30,'stone'],
  ['service-gallery',-148,-258,24,12,'shore'],['ferry-approach',-148,-248,12,36,'shore'],
  ['ferry-cradle',-164,-220,30,26,'stone'],['first-bank',-184,-264,30,22,'shore'],
  ['growing-frames',-182,-306,18,44,'garden'],['canopy',-182,-320,62,18,'garden'],
  ['sluice',-132,-326,24,38,'stone'],['pump-island',-148,-290,40,20,'stone'],
  ['testworks-shore',-174,-350,22,32,'stone'],
  ['pump-return',-110,-282,56,12,'shore','drain'],['return-ramp',-62,-274,10,14,'shore'],
  ['lower-pump',-148,-178,24,16,'stone'],['canal-dock',-166,-142,24,14,'shore'],
  ['canal-island',-66,-130,14,10,'stone'],['loading-jetty',38,-110,38,12,'shore'],
  ['tender-islet',-162,-303,6,6,'garden'],
  ['first-crossing',-166,-246,12,32,'water','water'],
  ['reservoir',-166,-308,54,50,'water','water'],
  ['old-shore-pool',-92,-302,76,36,'water','water'],
  ['ferry-channel',-164,-198,18,58,'water','water'],
  ['lower-basin',-166,-156,48,36,'water','water'],
  ['return-canal',-130,-128,176,12,'water','water'],
  ['loading-channel',38,-128,18,30,'water','water']
].map(([id,x,z,w,d,palette,kind='floor'])=>({id:`r3-${id}`,x,z,w,d,palette,kind}));
export const gardenPalettes={shore:0x879989,stone:0x7b8986,garden:0x79866a,water:0x3b727c};
export const gardenHives=[[-142,-202,8],[-175,-296,9],[-119,-318,10],[-158,-135,11]];
export const gardenEnemies=[
  ['guard',-114,-260,'r3-service'],['scout',-115,-244,'r3-service'],
  ['turret',-139,-231,'r3-gallery'],
  ['turret',-168,-277,'r3-bank'],['guard',-176,-285,'r3-bank'],
  ['scout',-170,-309,'r3-canopy'],['mortar',-147,-310,'r3-canopy'],
  ['turret',-123,-302,'r3-sluice'],['guard',-115,-297,'r3-sluice'],
  ['guard',-130,-277,'r3-pump'],['turret',-114,-285,'r3-pump'],
  ['turret',-143,-166,'r3-lower'],['mortar',-130,-167,'r3-lower'],
  ['turret',-57,-125,'r3-canal']
];
export const gardenRails=[
  {id:'garden-panel',x:-90,z:-249,axis:'x',min:-90,max:-79,goal:-79,opens:'garden-service'},
  {id:'garden-feed',x:-143,z:-281,axis:'x',min:-143,max:-133,goal:-133,opens:'garden-feed'},
  {id:'garden-cover',x:-173,z:-274,axis:'z',min:-280,max:-267,w:3,d:3,free:true}
];
export const gardenGates=[{id:'garden-service',x:-100,z:-249,span:10,axis:'x'}];
export const flotationModule={id:'flotation',x:-154,z:-208};
export const gardenCurrents=[{x:-164,z:-186,w:18,d:28,dx:0,dz:1.2}];
export const gardenProps=[
  ['crate',-112,-251,3,6],['tank',-112,-257,1.6,1.6],
  ['crate',-175,-270,7,2],['tank',-171,-281,1.6,1.6],
  ['crate',-157,-311,3,7],['tank',-151,-309,1.6,1.6],
  ['crate',-122,-296,7,2],['tank',-116,-301,1.6,1.6],
  ['crate',-125,-279,3,6],['tank',-118,-281,1.6,1.6],
  ['tank',-140,-167,1.6,1.6],['crate',-61,-125,2,6]
];

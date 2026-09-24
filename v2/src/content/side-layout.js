// Local expeditions stay within their incoming ability layer.
export const sideDecks=[
 {id:'rail-crossing',x:-88,z:-26,w:12,d:16,y:8,region:'transit'},
 {id:'garden-care',x:32,z:28,w:22,d:22,y:-8,region:'garden'},
 {id:'sorting-bay',x:24,z:-164,w:40,d:36,y:-8,region:'transit'},
 {id:'sorting-approach',x:28,z:-104,w:32,d:24,y:-8,region:'transit'},
 {id:'sorting-approach-turn',x:48,z:-140,w:12,d:60,y:-8,region:'transit'},
 {id:'sorting-entry',x:24,z:-124,w:36,d:12,y:-8,region:'transit'},
 {id:'mortar-installation',x:24,z:-188,w:24,d:24,y:-8,region:'transit'},
 {id:'sorting-retry-head',x:36,z:-100,w:8,d:60,y:0,region:'transit'},
 {id:'sorting-retry-landing',x:12,z:-112,w:32,d:12,y:0,region:'transit'},
 {id:'sorting-walk',x:120,z:-94,w:12,d:62,y:24,region:'testworks'}
];
export const sideGates=[
 {id:'mortar-crate-north',x:40,z:-184,w:5,d:6,y:-8,h:3,permanent:true},

 {id:'sorter',x:24,z:-164.5,w:24,d:1,y:-8,h:5},
 {id:'sorter-retry',x:23.5,z:-124,w:1,d:12,y:-8,h:4}
];
export const sideObstacles=[
 {id:'rail-cart',x:-177.1,z:-77.1,w:2.2,d:2.2,y:8,h:1.6,permanent:true},
 {id:'care-screen',x:32,z:32,w:3,d:12,y:-8,h:3,permanent:true},
 {id:'care-planter',x:42,z:33,w:2,d:2,y:-8,h:1,permanent:true},
 {id:'maintenance-cart',x:109,z:29,w:2,d:2,y:-24,h:1.5,permanent:true},
 {id:'sorter-cover',x:28,z:-144,w:5,d:2,y:-8,h:2.8,permanent:true,railMin:28,railMax:50,rail:{axis:'x',min:28,max:50}}
];
export const railOffset={x:-138,z:28,y:8};
export const gutterControls=[{id:'gutter-a',x:37,z:35},{id:'gutter-b',x:49,z:39},{id:'gutter-plug',x:36,z:44}];

export const sideEnemies=[
 {id:'sorter',type:'boss',x:44,y:-8,z:-154,hp:12,persistent:true},
 // The former roof arena is now a patrol crossing on the Phoenix return.
 {id:'sorting-walk-sniper',type:'sniper',x:125,y:24,z:-85,hp:4,encounter:'sorting-patrol'},
 {id:'sorting-walk-skirmisher',type:'skirmisher',x:126,y:24,z:-70,hp:4,encounter:'sorting-patrol'},
 {id:'sorting-walk-guard',type:'guard',magneticShield:true,x:124,y:24,z:-53,hp:5,encounter:'sorting-patrol'}
];

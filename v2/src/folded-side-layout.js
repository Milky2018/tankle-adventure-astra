// Optional loops stay within already reachable ability layers.
export const sideDecks=[
 {id:'rail-crossing',x:-88,z:-26,w:12,d:16,y:8,region:'transit'},
 {id:'garden-care',x:32,z:28,w:22,d:22,y:-8,region:'garden'},
 {id:'sorting-bay',x:112,z:-126,w:36,d:32,y:24,region:'testworks'},
 {id:'sorting-walk',x:120,z:-94,w:12,d:62,y:24,region:'testworks'}
];
export const sideGates=[];
export const sideObstacles=[
 {id:'rail-cart',x:-177.1,z:-77.1,w:2.2,d:2.2,y:8,h:1.6,permanent:true},
 {id:'care-screen',x:32,z:32,w:3,d:12,y:-8,h:3,permanent:true},
 {id:'care-planter',x:42,z:33,w:2,d:2,y:-8,h:1,permanent:true},
 {id:'maintenance-cart',x:109,z:29,w:2,d:2,y:-24,h:1.5,permanent:true},
 {id:'sorter-cover',x:116,z:-108,w:5,d:2,y:24,h:2.8,permanent:true}
];
export const railOffset={x:-138,z:28,y:8};
export const gutterControls=[{id:'gutter-a',x:37,z:35},{id:'gutter-b',x:49,z:39},{id:'gutter-plug',x:36,z:44}];

export const sideEnemies=[{id:'sorter',type:'boss',x:130,y:24,z:-118,hp:12,persistent:true}];

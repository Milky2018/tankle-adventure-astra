// Heights are supporting surfaces. All coordinates below are local to the shaft.
export const HOIST_ORIGIN={x:300,z:-120};
const deck=(id,x,z,w,d,y,extra={})=>({id,x:x+300,z:z-120,w,d,y,...extra});
export const hoistDecks=[
  deck('entry',-192,48,192,12,0),deck('loading',-24,20,52,40,0),
  deck('approach',-22,14,12,10,0),deck('underpass',-8,-24,16,48,0),
  deck('west',-24,-38,16,42,8),deck('west-landing',-10,4,6,12,8),deck('bridge',-8,-12,32,12,8),
  deck('east',24,-38,16,54,8),deck('gallery-return',-10,12,10,20,8),
  deck('north',-24,-66,64,16,16),deck('ramp-foot',-24,-50,12,12,16),
  deck('ascent',-24,-38,12,24,16,{rise:8}),
  deck('crown-bridge',-24,-14,64,12,24),deck('crown',16,-2,24,20,24),
  deck('crown-landing',0,8,24,12,24),
  deck('sump-approach',28,48,24,12,0),deck('sump-ramp',40,24,12,24,-8,{rise:8}),
  deck('sump-dock',28,12,24,12,-8),deck('sump-water',-8,4,36,20,-8,{water:true}),deck('sump-cache',-20,4,12,20,-8),
  deck('express-entry',40,0,16,12,24),deck('express-spine',48,-282,12,294,24),
  deck('optical-bridge',-176,-92,236,12,24),
  deck('optical-landing',-176,-104,12,12,24),deck('optical-base',-176,-104,12,12,0),
  deck('works-bridge',-132,-282,192,12,24),deck('works-landing',-138,-270,12,12,24),deck('works-base',-138,-270,12,12,0),
  deck('optical-room',-24,-82,36,16,16),
  deck('hot-runup',64,6,12,44,24),deck('hot-access',40,12,36,10,24),
  deck('hot-lane',64,-58,12,64,24),deck('hot-link',56,-2,8,8,24),
  deck('hot-landing',64,-70,24,12,24),deck('hot-bypass',80,-58,8,64,24),deck('hot-return',60,6,28,6,24)
];
export const hoistLiftDefs=[
  {id:'balance',x:278,z:-116,w:12,d:12,stops:[0,8]},
  {id:'carrier',x:324,z:-170,w:12,d:12,stops:[8,16]},
  {id:'main',x:300,z:-100,w:12,d:12,stops:[0,8,24]},
  {id:'optical',x:124,z:-236,w:12,d:12,stops:[0,24]},
  {id:'works',x:162,z:-378,w:12,d:12,stops:[0,24]}
];

// These side routes connect existing ability layers; none grants access to a new module.
export const puzzleRooms=[
  ['r2-shunting-yard',-42,-116,28,28,0x887e65],['r2-shunting-approach',-16,-110,10,8,0x85867c],
  ['r2-carrier-crossing',-74,-102,32,8,0x887e65],
  ['r3-cistern-approach',-204,-312,26,10,0x879989],['r3-cistern-controls',-194,-302,12,24,0x879989],
  ['r3-cistern',-204,-304,10,26,0x70877d],['r3-cistern-passage',-204,-278,10,20,0x879989],
  ['r3-cistern-exit',-204,-266,24,8,0x879989]
].map(([id,x,z,w,d,color])=>({id,x,z,w,d,color}));
export const puzzleControls=[
  {id:'rail-a',x:-28,z:-108,kind:'treadle'}, {id:'rail-b',x:-20,z:-104,kind:'treadle'},
  {id:'rail-signal',x:-38,z:-99,kind:'signal'},
  {id:'basin-valve',x:-190,z:-295,kind:'pump'}, {id:'basin-lock',x:-190,z:-286,kind:'lock'},
  {id:'gutter-a',x:-180,z:-248,kind:'crank'}, {id:'gutter-b',x:-165,z:-251,kind:'crank'}
];
export function carrierRoute(switches){
  if(!switches[0])return [[-38,-104],[-32,-104],[-32,-112],[-38,-112],[-38,-104]];
  if(!switches[1])return [[-38,-104],[-32,-104],[-24,-104],[-24,-112],[-38,-112],[-38,-104]];
  return [[-38,-104],[-32,-104],[-24,-104],[-24,-94]];
}
export const basinBounds={x:-204,z:-300,w:10,d:20};

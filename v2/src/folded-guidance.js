// Local, physical signs at decisions. They describe what lies through an opening;
// they are not a global objective trail and never reveal an undiscovered room.
export const routeSigns=[
  {id:'foundry-service',x:-14,y:-8,z:85,yaw:Math.PI/2,icon:'cannon',until:'relays'},
  {id:'foundry-return',x:0,y:-8,z:74,yaw:0,icon:'overdrive',until:'foundry'},
  {id:'prototype-return',x:-20,y:-16,z:117,yaw:0,icon:'overdrive',until:'foundry'},
  {id:'hub-freight',x:0,y:0,z:5,yaw:0,icon:'mortar',until:'bridge-crane'},
  {id:'training-garden',x:-26,y:0,z:22,yaw:0,icon:'flotation',until:'flotation'},
  {id:'loading-loop',x:-12,y:0,z:-40,yaw:0,icon:'overdrive',until:'loading-return'},
  {id:'hub-garden',x:-16,y:0,z:27,yaw:Math.PI/2,icon:'magnet',until:'magnetModule'},
  {id:'roof-optics',x:172,y:24,z:-30,yaw:Math.PI/2,icon:'laser',until:'laser'},
  {id:'roof-circulation',x:162,y:24,z:-19,yaw:0,icon:'circulation',until:'circulation'},
  {id:'inner-lane',x:266,y:-24,z:114,yaw:0,icon:'circulation',until:'inner-transit'}
];
export function gateAbility(gate){
  if(gate.id==='overdrive-return')return 'overdrive';
  if(gate.magnetic||gate.id==='magnet')return 'magnet';
  if(gate.phoenix||['launch','optics','pressure'].includes(gate.id))return 'phoenix';
  if(['bridge-crane','freight','load'].includes(gate.id))return 'mortar';
  if(['inner-optics','gallery','garden-optical','yard-optical'].includes(gate.id))return 'laser';
  return null;
}

// Fight locks are transient: a save/reload or death never leaves a closed arena.
export const BOSS_ARENAS=[
 {id:'prototype',x:-50,z:116,w:36,d:24,y:-16},
 {id:'foundry',x:64,z:-78,w:48,d:26,y:8},
 {id:'guardian',x:180,z:44,w:48,d:46,y:16},
 {id:'sorter',x:112,z:-126,w:36,d:22,y:24},
 {id:'keeper',x:-28,z:12,w:56,d:48,y:-56}
];
const gate=(arena,name,x,z,w,d,y)=>({id:`arena-${arena}-${name}`,arena,x,z,w,d,y,h:5});
export const arenaGates=[
 gate('prototype','entry',-50.5,120,1,12,-16),gate('prototype','return',-34,115.5,12,1,-16),
 gate('foundry','entry',84,-52.5,12,1,8),
 gate('guardian','entry',196,43.5,12,1,16),
 gate('sorter','entry',112,-104.5,36,1,24),
 gate('sorter','west',111.5,-126,1,22,24),gate('sorter','east',147.5,-126,1,22,24),gate('sorter','north',112,-126.5,36,1,24),
 gate('keeper','entry',-28,59.5,56,1,-56),
 gate('keeper','west-exit',-16,11.5,8,1,-56),gate('keeper','east-exit',8,11.5,8,1,-56)
];
export const bossReserves=[
 {id:'foundry-reserve-left',reserveFor:'foundry',reserveAt:.6,type:'skirmisher',x:68,y:8,z:-73,hp:3},
 {id:'foundry-reserve-right',reserveFor:'foundry',reserveAt:.6,type:'scout',x:104,y:8,z:-73,hp:2},
 {id:'keeper-reserve-west',reserveFor:'keeper',reserveAt:.65,type:'skirmisher',x:-23,y:-56,z:30,hp:4},
 {id:'keeper-reserve-east',reserveFor:'keeper',reserveAt:.65,type:'miner',x:22,y:-56,z:44,hp:3},
 {id:'keeper-reserve-flank',reserveFor:'keeper',reserveAt:.32,type:'scout',x:-23,y:-56,z:38,hp:3},
 {id:'keeper-reserve-support',reserveFor:'keeper',reserveAt:.32,type:'skirmisher',x:22,y:-56,z:51,hp:4}
];
export const insideArena=(arena,p,margin=0)=>Math.abs(p.y-arena.y)<2&&p.x>arena.x+margin&&p.x<arena.x+arena.w-margin&&p.z>arena.z+margin&&p.z<arena.z+arena.d-margin;
export function createBossArenas(enemies,state){
 Object.defineProperty(state,'combatArena',{value:null,writable:true,enumerable:false,configurable:true});
 const used=new Set();
 function reset(){state.combatArena=null;used.clear();for(const e of enemies.filter(e=>e.reserveFor)){e.hp=0;e.awake=false;e.deployUntil=0;e.deploy=0;}}
 function update(player,time){
  const events=[];
  if(player.hp<=0){reset();return events;}
  if(state.combatArena){
   const boss=enemies.find(e=>e.id===state.combatArena);
   if(!boss||boss.hp<=0||state[boss.id]){
    events.push({kind:'release',id:state.combatArena});
    for(const e of enemies.filter(e=>e.reserveFor===state.combatArena)){e.hp=0;e.awake=false;e.deploy=0;e.deployUntil=0;}
    state.combatArena=null;
   }
  }
  if(!state.combatArena){
   const arena=BOSS_ARENAS.find(a=>!state[a.id]&&insideArena(a,player,2.3)&&enemies.some(e=>e.id===a.id&&e.hp>0));
   if(arena){state.combatArena=arena.id;const boss=enemies.find(e=>e.id===arena.id);boss.timer=Math.max(boss.timer,1.2);events.push({kind:'seal',id:arena.id});}
  }
  if(state.combatArena){
   const boss=enemies.find(e=>e.id===state.combatArena);
   let activeReserves=enemies.filter(e=>e.reserveFor===boss.id&&e.hp>0).length;
   for(const e of enemies.filter(e=>e.reserveFor===boss.id)){
    if(activeReserves<2&&!used.has(e.id)&&boss.hp/boss.max<=e.reserveAt){
     activeReserves++;used.add(e.id);Object.assign(e,e.spawn);e.hp=e.max;e.awake=false;e.deployUntil=time+2;e.deploy=.001;e.phase='idle';e.timer=.8;events.push({kind:'reserve',id:e.id});
    }
    if(e.deployUntil&&time>=e.deployUntil){e.awake=true;e.deploy=0;e.deployUntil=0;e.alertUntil=time+12;e.lastSeen={x:player.x,y:player.y,z:player.z};}
   }
  }
  return events;
 }
 reset();return {update,reset};
}

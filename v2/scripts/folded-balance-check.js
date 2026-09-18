async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));

 await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');await page.waitForFunction(()=>window.__game?.debug);await page.evaluate(()=>__game.debug.traceCombat());await page.setViewportSize({width:1440,height:900});
 const results=await page.evaluate(()=>{
  const a=__game.debug,g=__game,T=a.T;
  function setup(player){a.state.keeper=false;a.respawn();a.setPause(false);a.clearShots();a.resetEnemies();for(const e of a.world.enemies){e.hp=0;e.model.root.visible=false;}g.scenario({player:{hp:50,heat:0,overheated:false,weapon:'mortar',mortar:true,laser:true,lastShot:-100,shotCooldown:0,...player}});__game.debug.enemyShots.length=0;}
  const covers=[];
  for(const x of [-14,14]){
   setup({x,y:-56,z:46});const e=a.world.enemies.find(e=>e.id==='keeper');e.hp=e.max;e.model.root.visible=true;
   const origin=new T.Vector3(e.x,e.y+4,e.z),to=new T.Vector3(a.p.x,a.p.y+1.2,a.p.z).sub(origin);const blocked=!!a.world.cast(origin,to.clone().normalize(),to.length()-1,{targets:false});
   const phases=new Set();let warned=false,firstHit=null;
   for(let i=0;i<2400&&a.p.hp>0&&e.hp>0;i++){
    const t=e.parts.find(t=>t.hp>0)||{x:e.x,y:e.y+1.5,z:e.z};g.aimAt(t.x,t.z,t.y);g.setInput(['Mouse0']);g.step(1/60,false);phases.add(e.phase+'/'+e.attack);if(e.zone.visible&&e.attack==='barrage')warned=true;if(a.p.hp<50&&firstHit===null)firstHit=i/60;
   }
   g.setInput([]);covers.push({x,blocked,hp:a.p.hp,bossHP:e.hp,warned,firstHit,lobs:__game.debug.enemyShots.filter(s=>s.lob).length,phases:[...phases]});
  }
  const mobility=[];
  for(const type of ['scout','turret','guard','skirmisher','sniper','artillery','miner','welder','reflector','elite']){
   setup({x:202,y:16,z:54,weapon:'cannon'});const e=a.world.enemies.find(e=>e.type===type&&!e.guardian);Object.assign(e,{x:202,y:16,z:70,spawn:{x:202,y:16,z:70},hp:e.max,phase:'idle',timer:.1,awake:true,stunnedUntil:0});e.model.root.visible=true;
   const phases=new Set();let distance=0,last={x:e.x,z:e.z},attacks=0,old='';
   for(let i=0;i<720&&a.p.hp>0;i++){g.setInput([]);g.step(1/60,false);phases.add(e.phase);if(e.phase==='warn'&&old!=='warn')attacks++;old=e.phase;distance+=Math.hypot(e.x-last.x,e.z-last.z);last={x:e.x,z:e.z};}
   mobility.push({type,distance,attacks,phases:[...phases],playerHP:a.p.hp});
  }
  setup({x:202,y:16,z:54,weapon:'laser'});const e=a.world.enemies.find(e=>e.id==='guardian');e.hp=e.max;e.model.root.visible=true;g.step(.05);const before=e.hp;g.aimAt(214,54,18);g.setInput(['Mouse0']);g.step(.3);g.setInput([]);
  return {covers,mobility,laser:{before,after:e.hp,damage:before-e.hp},errors:[]};
 });
 await page.screenshot({path:'v2/output/playwright/balance/laser.png'});
 if(results.covers.some(r=>!r.blocked||!r.warned||r.lobs<3||r.hp>0||r.bossHP<=0))throw Error('Cover response failed '+JSON.stringify(results));
 if(results.mobility.some(r=>r.attacks<2||r.type!=='turret'&&r.distance<2))throw Error('Enemy pressure failed '+JSON.stringify(results));
 if(Math.abs(results.laser.damage-1.35)>.02)throw Error('Laser damage failed '+JSON.stringify(results));
 await page.evaluate(()=>{
  const a=__game.debug,g=__game;a.state.keeper=false;a.respawn();a.setPause(false);a.clearShots();a.resetEnemies();
  for(const e of a.world.enemies){e.hp=0;e.model.root.visible=false;}
  g.scenario({player:{x:14,y:-56,z:46,hp:50,heat:0,overheated:false,weapon:'mortar',mortar:true,lastShot:-100}});
  const e=a.world.enemies.find(e=>e.id==='keeper');e.hp=e.max;e.model.root.visible=true;const t=e.parts[1];g.aimAt(t.x,t.z,t.y);g.fire();
  for(let i=0;i<240&&!e.zone.visible;i++)g.step(1/60,false);g.step(0);
  if(!e.zone.visible||e.attack!=='barrage')throw Error('Missing ground warning');
 });
 await page.screenshot({path:'v2/output/playwright/balance/keeper-warning.png'});
 if(errors.length)throw Error(JSON.stringify(errors));return {...results,errors};
}

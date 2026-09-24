async page=>{
 const errors=[],sorter=[];page.on('pageerror',e=>errors.push(e.message));
 for(const covered of [false,true]){
  await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');await page.waitForFunction(()=>window.__game?.debug);
  const result=await page.evaluate(covered=>{
   const g=__game,w=__game.debug.world,e=w.enemies.find(e=>e.id==='sorter');
   g.scenario({state:{sorter:false},player:{x:e.x,y:e.y,z:e.z+15,hp:50,heat:0,overheated:false,invincible:0,mortar:true,weapon:'mortar'},enemies:Object.fromEntries(w.enemies.map(other=>[other.id,other===e?e.max:0]))});
   w.sidePuzzles.pullCover(100,{x:covered?e.x+3.7:e.x-12,y:e.y,z:e.z+15},[],g.snapshot().time);
   g.step(.01); // Enter the arena before selecting a precise sweep frame.
   e.phase='sweep';e.timer=.95;e.aim=0;e.attack='sweep';e.stunnedUntil=0;e.awake=true;
   const events=[],original=__game.debug.audio.event;__game.debug.audio.event=name=>events.push(name);
   g.step(.05);const phase=e.phase,hp=g.snapshot().player.hp;
   if(covered){
    if(phase!=='vent'||hp!==50||!events.includes('armor'))throw Error('Rail cover did not interrupt and protect '+JSON.stringify({phase,hp,events}));
    g.aimAt(e.x,e.z,e.y+1.5);g.setInput(['Mouse0']);g.step(.1,false);g.setInput([]);g.step(1.4);
    if(e.hp>=12)throw Error('Interrupted sorter gives no Mortar counterattack');
    if(__game.debug.world.views.enemy(e).model.arm.scale.z>.4)throw Error('Interrupted arm did not retract');
   }else if(hp>=50||phase!=='sweep')throw Error('Uncovered hull is outside the visible sweep '+JSON.stringify({phase,hp,position:g.snapshot().player,enemy:{x:e.x,y:e.y,z:e.z,awake:e.awake,timer:e.timer},arena:__game.debug.state.combatArena}));
   __game.debug.audio.event=original;return {covered,hp,phase,enemyHp:e.hp,armScale:__game.debug.world.views.enemy(e).model.arm.scale.z,events};
  },covered);sorter.push(result);
  await page.screenshot({path:`output/playwright/late-review/sorter-${covered?'cover':'open'}.png`});
 }
 const warning=await page.evaluate(()=>{
  const {world:w}=__game.debug,e=w.enemies.find(e=>e.id==='sorter');
  __game.scenario({player:{x:e.x,y:e.y,z:e.z+15,hp:50,weapon:'cannon'}});
  w.sidePuzzles.pullCover(100,{x:e.x-12,y:e.y,z:e.z+15},[],__game.snapshot().time);
  e.phase='warn';e.timer=.8;e.aim=0;__game.step(.05);
  const points=__game.debug.world.views.enemy(e).zone.geometry.attributes.position;
  if(!__game.debug.world.views.enemy(e).zone.visible||points.count!==26||Math.abs(Math.hypot(points.getX(12),points.getZ(12))-18)>.001)throw Error('Warning footprint does not match the actual sweep');
  return {visible:__game.debug.world.views.enemy(e).zone.visible,reach:Math.hypot(points.getX(12),points.getZ(12))};
 });
 await page.screenshot({path:'output/playwright/late-review/sorter-warning.png'});
 const architectureHit=await page.evaluate(()=>{
  const {world:w,updateSorter,T}=__game.debug,e=w.enemies.find(e=>e.id==='sorter'),cast=w.cast;
  e.phase='sweep';e.timer=1.2;e.aim=0;
  w.cast=()=>({point:new T.Vector3(e.x,e.y+1.8,e.z+8),distance:8,architecture:{}});
  try{updateSorter(e,1/60);return e.phase==='sweep';}finally{w.cast=cast;}
 });
 const cores=await page.evaluate(()=>{
  const g=__game,w=__game.debug.world,results=[];
  for(const id of ['foundry','keeper']){
   const e=w.enemies.find(e=>e.id===id);g.scenario({player:{x:e.x+8,y:e.y,z:e.z+17,hp:50},enemies:{[id]:e.max}});
   const show=()=>{w.update(.5,g.snapshot().time,g.snapshot().player);return {gap:__game.debug.world.views.enemy(e).coreModel.shutters[1].position.x,color:__game.debug.world.views.enemy(e).coreModel.lamp.material.color.getHex()};};
   e.phase='vent';e.parts.forEach(part=>part.hp=part.max);const closed=show();
   e.parts.forEach(part=>part.hp=0);e.hp=e.max-e.parts.reduce((sum,part)=>sum+part.max,0);const open=show();e.phase='warn';const warning=show();
   if(closed.gap>.4||open.gap<.95||(id==='foundry'?warning.gap>.4:warning.gap<.95))throw Error('Core presentation mismatches vulnerability '+id);
   results.push({id,closed,open,warning});
  }
  return results;
 });
 for(const view of ['overhead','third']){
  if(await page.evaluate(()=>__game.snapshot().camera.view)!==view)await page.keyboard.press('c');
  await page.evaluate(()=>{__game.scenario({player:{x:0,y:-56,z:45,weapon:'cannon'}});const e=__game.debug.world.enemies.find(e=>e.id==='keeper');e.phase='idle';e.timer=0;__game.look(Math.PI,.18);__game.step(.1);});
  await page.screenshot({path:`output/playwright/late-review/keeper-core-${view}.png`});
 }
 if(errors.length)throw Error(errors.join('\n'));return {sorter,warning,architectureHit,cores,errors};
}

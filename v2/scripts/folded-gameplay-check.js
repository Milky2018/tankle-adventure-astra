async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.unroute('**/src/folded.js*');
 await page.route('**/src/folded.js*',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:await r.text()+'\nwindow.__craft={world,shots,mines,resetEnemies,clearShots,setCameraView,hitEnemy,renderer};'});});
 const result={parity:[],keeper:{}};
 async function open(view='overhead'){
  await page.goto('http://127.0.0.1:5174/?chapter=folded&test&view='+view);await page.waitForFunction(()=>window.__craft);await page.evaluate(()=>{__game.manual(true);for(const e of __craft.world.enemies){e.hp=0;e.model.root.visible=false;}});
 }
 for(const view of ['overhead','third']){
  await open(view);
  result.parity.push(await page.evaluate(()=>{
   __game.scenario({player:{x:202,y:16,z:78,hp:50,invincible:10000},state:{guardian:true}});
   const e=__craft.world.enemies.find(e=>e.id==='press-gunner');Object.assign(e,{x:182,y:16,z:58,spawn:{x:182,y:16,z:58},hp:2,phase:'idle',timer:.2});e.model.root.visible=true;__game.look(0,.32);
   const phases=new Set();let shots=0,warnings=0;
   for(let i=0;i<40;i++){__game.step(.1);phases.add(e.phase);shots=Math.max(shots,__craft.shots.length);warnings=Math.max(warnings,document.querySelectorAll('#threats i:not([hidden])').length);}
   return {view:__game.snapshot().camera.view,readable:e.readable,phases:[...phases],shots,warnings};
  }));
 }
 if(result.parity.some(r=>!r.shots||!r.warnings)||JSON.stringify(result.parity[0].phases)!==JSON.stringify(result.parity[1].phases))throw Error('Camera-dependent attack '+JSON.stringify(result.parity));
 await open();
 result.guard=await page.evaluate(()=>{
  __game.scenario({player:{x:202,y:16,z:78,hp:50,invincible:10000}});
  const e=__craft.world.enemies.find(e=>e.id==='bench-guard');Object.assign(e,{x:202,y:16,z:67,spawn:{x:202,y:16,z:67},hp:3,phase:'idle',timer:.8});e.model.root.visible=true;__game.step(4,false);
  const distance=Math.hypot(e.x-202,e.z-78);e.hp=0;return {distance,phase:e.phase};
 });if(result.guard.distance>=10)throw Error('Shield guard leaves the player stationary');
 result.keeper=await page.evaluate(()=>{
  __craft.clearShots();__game.scenario({player:{x:0,y:-56,z:53,hp:50,invincible:10000},state:{keeper:false}});
  const e=__craft.world.enemies.find(e=>e.id==='keeper');e.hp=e.max;e.model.root.visible=true;e.parts.forEach(p=>p.hp=p.max);
  const salvo=()=>{__craft.clearShots();e.phase='idle';e.timer=.01;__game.step(.2,false);const lines=e.batteryWarning.geometry.drawRange.count/2;__game.step(1.2,false);return {shots:__craft.shots.filter(s=>s.hostile).length,lines};};
  const both=salvo();e.parts[0].hp=0;const one=salvo();e.parts[1].hp=0;e.phase='idle';e.timer=.01;
  const phases=new Set();for(let i=0;i<50;i++){__game.step(.1);phases.add(e.phase);}
  return {both,one,core:[...phases],hp:e.hp,max:e.max};
 });if(result.keeper.both.shots!==6||result.keeper.one.shots!==3||result.keeper.both.lines!==6||result.keeper.one.lines!==3||!result.keeper.core.includes('sweep'))throw Error('Keeper batteries/core did not change tactics '+JSON.stringify(result.keeper));
 result.cover=await page.evaluate(()=>{
  __craft.clearShots();__game.scenario({player:{x:-15,y:-56,z:47,hp:50,invincible:0}});
  const e=__craft.world.enemies.find(e=>e.id==='keeper');e.parts.forEach(p=>p.hp=0);e.phase='sweep';e.timer=1.1;e.aim=Math.atan2(-15,15);e.sweepSign=1;__game.step(1/60);
  const a=e.warning.geometry.attributes.position.array;
  return {phase:e.phase,hp:__game.snapshot().player.hp,reach:Math.hypot(a[3]-a[0],a[5]-a[2])};
 });if(result.cover.phase!=='sweep'||result.cover.hp!==50||result.cover.reach>20)throw Error('Cover must intercept a committed sweep, not cancel it '+JSON.stringify(result.cover));
 await page.screenshot({path:'output/playwright/craft/keeper.png'});
 result.guidance=await page.evaluate(()=>({links:__craft.world.controlFeeds.map(f=>f.id),signs:__craft.world.signs.length}));
 if(!result.guidance.links.includes('inner-optics')||!result.guidance.links.includes('emitter-cage'))throw Error('Missing local consequence link');
 result.innerReturn=await page.evaluate(()=>{
  __craft.world.enemies.forEach(e=>e.hp=0);
  __game.scenario({player:{x:266,y:-40,z:15,hp:50,circulation:true},state:{'inner-transit':false}});__game.step(.02);return __game.snapshot().state['inner-transit'];
 });if(!result.innerReturn)throw Error('Physical first crossing did not restore conveyor');
 if(errors.length)throw Error(JSON.stringify(errors));return {...result,errors};
}

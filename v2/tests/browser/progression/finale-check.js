async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));

 await page.setViewportSize({width:1440,height:900});await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');await page.waitForFunction(()=>window.__game?.debug);
 await page.evaluate(()=>{localStorage.removeItem('furnace-born-v2-city');});await page.reload();await page.waitForFunction(()=>window.__game?.debug);await page.evaluate(()=>{__game.manual(true);__game.step(.1);});await page.screenshot({path:'output/playwright/finale/opening.png'});
 const fight=await page.evaluate(async()=>{
  const {keeperDodge}=await import('/tests/fixtures/keeper-dodge.js');
  const g=__game,a=__game.debug;
  g.scenario({state:{overdrive:true,prototype:true,foundry:true,mortarModule:true,phoenix:true,laser:true,circulation:true,load:true,brake:true,'bridge-crane':true,'core-feed':true,keeper:false,endingSeen:false,pump:false,signal:false,'rail-repair':false},player:{x:0,y:-56,z:56,hp:25,heat:0,overheated:false,overdrive:true,mortar:true,laser:true,phoenix:true,circulation:true,magnet:false,flotation:false,weapon:'laser'}});
  a.resetEnemies();a.clearShots();const e=a.world.enemies.find(e=>e.id==='keeper'),start=g.snapshot().time,phases=new Set(),stops=[];let corner=0;
  const orbit=[[-8,40],[-8,28],[8,28],[8,40]];
  for(let i=0;i<7200&&e.hp>0&&a.p.hp>0;i++){
   const p=a.p;if(Math.hypot(p.x-orbit[corner][0],p.z-orbit[corner][1])<.6)corner=(corner+1)%orbit.length;
   const dx=orbit[corner][0]-p.x,dz=orbit[corner][1]-p.z,keys=Math.abs(dx)>Math.abs(dz)?dx>0?['KeyS','KeyD']:['KeyW','KeyA']:dz>0?['KeyS','KeyA']:['KeyW','KeyD'];
   const target=e.parts.find(t=>t.hp>0)||{x:e.x,y:e.y+1.5,z:e.z};g.aimAt(target.x,target.z,target.y);keys.push('Mouse0');g.setInput(keeperDodge(p,e)||keys);g.step(1/60,false);phases.add(e.phase+'/'+e.attack);
   for(let n=0;n<2;n++)if(e.parts[n].hp<=0&&!stops.some(s=>s.index===n))stops.push({index:n,time:g.snapshot().time-start,belt:a.world.belts.find(b=>b.id===`keeper-feed-${n?'right':'left'}`).phase});
  }
  g.setInput([]);g.step(.1);return {hp:a.p.hp,enemy:e.hp,seconds:g.snapshot().time-start,phases:[...phases],stops};
 });
 if(fight.enemy||fight.hp<=0||fight.stops.length!==2)throw Error('Keeper fight '+JSON.stringify(fight));
 const motion=await page.evaluate(()=>{const a=__game.debug,b=a.world.belts.filter(b=>b.id.startsWith('keeper-feed')).map(b=>b.phase);__game.step(3);return {before:b,after:a.world.belts.filter(b=>b.id.startsWith('keeper-feed')).map(b=>b.phase)};});
 if(JSON.stringify(motion.before)!==JSON.stringify(motion.after))throw Error('Defeated feeds move');
 await page.screenshot({path:'output/playwright/finale/keeper-defeated.png'});
 // Drive the actual cleared approach, then test both ways to cancel commitment.
 const approach=await page.evaluate(()=>{
  const g=__game,a=__game.debug,start=g.snapshot().time;
  for(const [x,z]of [[0,20],[0,8],[0,0]])for(let i=0;i<1800;i++){
   const dx=x-a.p.x,dz=z-a.p.z;if(Math.hypot(dx,dz)<.15)break;
   g.setInput(Math.abs(dx)>Math.abs(dz)?dx>0?['KeyS','KeyD']:['KeyW','KeyA']:dz>0?['KeyS','KeyA']:['KeyW','KeyD']);g.step(1/60,false);
  }
  g.setInput(['KeyE']);g.step(1);g.setInput([]);g.step(.1);const released=a.p.dockHold;
  g.setInput(['KeyE']);g.step(1);g.setInput(['KeyE','KeyS']);g.step(.1);const moved=a.p.dockHold;g.setInput([]);
  return {released,moved,committed:!!a.p.endingTime,seconds:g.snapshot().time-start,hp:a.p.hp};
 });
 if(approach.released||approach.moved||approach.committed)throw Error('Premature commitment '+JSON.stringify(approach));
 await page.evaluate(()=>{__game.setInput(['KeyE']);__game.step(2.1);__game.setInput([]);});
 const shots=[];
 for(const t of [1,5,8,11,17,21,24.5,26.05]){
  const sample=await page.evaluate(t=>{const g=__game,a=__game.debug;g.step(Math.max(0,t-a.p.endingTime));return {time:a.p.endingTime,eye:a.world.presentation.finale.eye.material.color.toArray(),cartZ:a.world.presentation.finale.cart.position.z,completed:!document.querySelector('#ending').hidden,camera:a.camera.position.toArray()};},t);shots.push(sample);
  await page.screenshot({path:`output/playwright/finale/ending-${t}.png`});
 }
 if(!shots.at(-1).completed||shots[0].cartZ!==79||shots.at(-1).cartZ<80.5)throw Error('Ending sequence incomplete');
 await page.getByRole('button',{name:'Continue exploring',exact:true}).click();
 const continued=await page.evaluate(()=>{__game.step(.1);const s=__game.snapshot();return {anchor:s.state.anchor,keeper:s.state.keeper,ending:s.player.endingTime,view:s.camera.view,hp:s.player.hp};});
 if(continued.anchor!=='last-refuge'||!continued.keeper||continued.ending)throw Error('Continue failed '+JSON.stringify(continued));
 await page.reload();await page.waitForFunction(()=>window.__game?.debug);
 const loaded=await page.evaluate(()=>{__game.step(.1);return __game.snapshot();});
 if(!loaded.state.endingSeen||!loaded.state.keeper||loaded.player.endingTime||loaded.player.y!==-40)throw Error('Reload replayed ending or lost state');
 // Revisit in third person, pause/resume the film, then skip with the real button.
 await page.evaluate(()=>{__game.debug.setCameraView('third');__game.scenario({player:{x:0,y:-56,z:0},state:{pump:true,signal:true,'rail-repair':true}});__game.setInput(['KeyE']);__game.step(3);__game.setInput([]);__game.debug.setPause(true);});
 await page.getByRole('button',{name:'Resume cinematic',exact:true}).click();await page.evaluate(()=>__game.step(10));await page.screenshot({path:'output/playwright/finale/rail-restored.png'});await page.evaluate(()=>__game.step(6));await page.screenshot({path:'output/playwright/finale/pump-restored.png'});
 await page.getByRole('button',{name:'Skip',exact:true}).click();
 if(!await page.getByRole('heading',{name:'Mission Accomplished'}).isVisible())throw Error('Skip failed');
 await page.getByRole('button',{name:'Continue exploring',exact:true}).click();
 const third=await page.evaluate(()=>__game.snapshot());if(third.camera.view!=='third'||third.player.endingTime||!third.state.pump)throw Error('Third person restore failed');
 for(const key of ['Space','Escape']){await page.evaluate(()=>{__game.scenario({player:{x:0,y:-56,z:0}});__game.setInput(['KeyE']);__game.step(3);__game.setInput([]);});await page.keyboard.press(key);if(!await page.getByRole('heading',{name:'Mission Accomplished'}).isVisible())throw Error('Keyboard skip failed '+key);await page.getByRole('button',{name:'Continue exploring',exact:true}).click();}
 if(errors.length)throw Error(JSON.stringify(errors));return {fight,motion,approach,shots,continued,reload:true,thirdContinue:true,skip:true,errors};
}

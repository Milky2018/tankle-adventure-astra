async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1280,height:900});
 await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');await page.waitForFunction(()=>window.__game?.debug);
 await page.evaluate(()=>localStorage.removeItem('furnace-born-v2-city'));await page.reload();await page.waitForFunction(()=>window.__game?.debug);
 const before=await page.evaluate(()=>{
  const g=__game,w=g.debug.world;g.manual(true);g.scenario({enemies:Object.fromEntries(w.enemies.map(e=>[e.id,0])),player:{x:-156,y:8,z:-60,hp:25}});g.step(.5);
  const p=w.pickups.find(p=>p.id==='magnetModule');if(p.y!==14||!p.root.visible)throw Error('Raised reward must be visible');
  g.interact();if(g.snapshot().state.magnetModule)throw Error('Reward acquired before lowering');
  return {y:p.y,name:document.querySelector('#minimap-wrap .map-area-name').textContent};
 });
 await page.screenshot({path:'v2/output/playwright/regression/rail-reward-before.png'});
 const docked=await page.evaluate(()=>{
  const g=__game,w=g.debug.world,q=w.sidePuzzles;
  const shoot=(id,x,z)=>{const t=q.targets.find(t=>t.id===id);g.scenario({player:{x,y:8,z,hp:25,heat:0,overheated:false,lastShot:-100,lastHeat:-100,weapon:'cannon'}});g.aimAt(t.x,t.z,t.y);g.setInput(['Mouse0']);g.step(.1,false);g.setInput([]);g.step(1,false);};
  shoot('rail-a',-166,-88);shoot('rail-b',-154,-76);
  if(!q.rail.state.switches.every(Boolean))throw Error('Paddles did not switch');
  const angles=[0,1].map(i=>q.roots.find(r=>r.name===`rail-switch-${i}`).rotation.y);
  if(Math.abs(angles[0]+Math.PI/2)>.01||Math.abs(angles[1]-Math.PI)>.01)throw Error('Selected rails disagree with cart route');
  shoot('rail-carrier',-176,-84);g.scenario({player:{x:-166,y:8,z:-86}});g.step(12);
  const p=w.pickups.find(p=>p.id==='magnetModule'),lift=w.lifts.find(l=>l.id===p.lift);
  if(!g.snapshot().state['rail-crossing']||Math.abs(p.y-8)>.01||p.root.position.y!==lift.y)throw Error('Docking failed to deliver reward '+JSON.stringify({p:p.y,lift:lift.y}));
  g.scenario({player:{x:-156,y:8,z:-60}});g.step(.1);g.save();return {angles,y:p.y};
 });
 await page.screenshot({path:'v2/output/playwright/regression/rail-reward-lowered.png'});
 await page.evaluate(()=>{__game.debug.setCameraView('third');__game.step(.3);});
 await page.screenshot({path:'v2/output/playwright/regression/rail-reward-third.png'});
 await page.evaluate(()=>{__game.debug.setCameraView('overhead');__game.debug.reveal();});
 if(await page.locator('#region .map-heading h1').textContent()!=='Freight Exchange')throw Error('Full map name missing');
 await page.screenshot({path:'v2/output/playwright/regression/rail-reward-map.png'});
 await page.evaluate(()=>__game.debug.closeMap());
 await page.reload();await page.waitForFunction(()=>window.__game?.debug);
 const collected=await page.evaluate(()=>{
  const g=__game,w=g.debug.world;g.manual(true);g.scenario({player:{x:-156,y:8,z:-60},enemies:Object.fromEntries(w.enemies.map(e=>[e.id,0]))});g.step(.1);
  const p=w.pickups.find(p=>p.id==='magnetModule');if(p.y!==8)throw Error('Reload raised solved reward');
  // Overhead W+D drives north into the lowered berth.
  g.setInput(['KeyW','KeyD']);g.step(1.2);g.setInput([]);g.interact();g.step(.1);g.save();
  if(!g.snapshot().state.magnetModule)throw Error('Cannot drive onto berth and collect Magnet '+JSON.stringify(g.snapshot().player));
  return {player:g.snapshot().player,y:p.y};
 });
 await page.screenshot({path:'v2/output/playwright/regression/rail-reward-collected.png'});
 await page.reload();await page.waitForFunction(()=>window.__game?.debug);
 const names=await page.evaluate(async()=>{
  const g=__game;g.manual(true);if(!g.snapshot().state.magnetModule)throw Error('Collected reward not saved');
  const {REGION_NAMES}=await import('/src/folded-architecture.js'),{foldedArchitecture}=await import('/src/folded-layout.js');const results={};
  for(const [region,name]of Object.entries(REGION_NAMES)){
   const r=foldedArchitecture.rooms.find(r=>r.region===region);g.scenario({player:{x:r.x+r.w/2,y:r.y,z:r.z+r.d/2}});g.step(.4);
   const actual=document.querySelector('#minimap-wrap .map-area-name').textContent;if(actual!==name)throw Error('Region title '+region+': '+actual);results[region]=actual;
  }
  return results;
 });
 if(errors.length)throw Error(errors.join('\n'));return {before,docked,collected,names,errors};
}

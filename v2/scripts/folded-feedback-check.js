async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');await page.waitForFunction(()=>window.__game?.debug);
 await page.evaluate(()=>localStorage.removeItem('furnace-born-v2-city'));await page.reload();await page.waitForFunction(()=>window.__game?.debug);
 const circuits=await page.evaluate(async()=>{
  const g=__game,q=g.debug,w=q.world,{activeSolid}=await import('/src/folded-layout.js');
  g.scenario({enemies:Object.fromEntries(w.enemies.map(e=>[e.id,0])),player:{x:94,y:-8,z:31,hp:25,invincible:1e9}});
  const cases=[];
  for(const id of ['gangway','load','cage','bridge-crane','mortar-cache']){
   const c=w.controls.find(c=>c.id===id),duration=w.signals.duration(id);
   if(c.requires)q.state[c.requires]=true;
   const point=new q.T.Vector3(c.x,c.y,c.z);
   q.impact({point,target:c},{origin:point.clone().add(new q.T.Vector3(0,2,0)),hostile:false});
   if(q.state[id]||!w.signals.active(id)||!w.signals.pending(id))throw Error('Mechanism opened at switch contact '+id);
   g.step(duration/2,false);
   const feeds=w.controlFeeds.filter(f=>f.id===id),feed=feeds.find(f=>f.lamps.length>2);
   if(q.state[id])throw Error('Mechanism opened before cable arrived '+id);
   if(feed&&feed.lamps[0].color.equals(feed.lamps.at(-1).color))throw Error('No traveling cable front '+id);
   const walls=w.walls.filter(b=>b.id===id);
   if(walls.some(b=>!activeSolid(b,q.state)||b.open>.001))throw Error('Collision or visual door opened early '+id);
   g.step(duration/2+.04,false);
   if(!q.state[id]||w.signals.pending(id))throw Error('Cable arrived without operating machinery '+id);
   cases.push({id,duration,branches:feeds.length});
  }
  return cases;
 });
 const drive=[];
 for(const view of ['overhead','third']){
  drive.push(await page.evaluate(view=>{
   const g=__game,q=g.debug;q.setCameraView(view);g.look(0,.267);
   const start={x:-35,y:-16,z:128,hp:25,invincible:0,hurtUntil:0,hurtAt:-10,knockX:0,knockZ:0,heat:0,boostCooling:false,actionHeatAt:-100,overheated:false,speed:1,weapon:'cannon',mortar:true,overdrive:true,phoenix:true,magnet:true,lastShot:-100,lastHeat:-100};
   g.scenario({state:{prototype:true,combatArena:null},player:start});g.setInput(['KeyW']);g.step(.2,false);const normal={x:q.p.x,z:q.p.z};
   g.scenario({player:start});q.hurt(5,{x:-40,z:128});g.setInput(['KeyW','Mouse0','Mouse2']);g.step(.04);
   const material=q.model.radiator.material,dim=material.opacity;g.step(.07);const bright=material.opacity;g.step(.09,false);
   if(Math.abs(q.p.x-normal.x-1.2)>.05||Math.abs(q.p.z-normal.z)>.05)throw Error('Hit replaced driving instead of adding impulse '+view+JSON.stringify({normal,p:q.p}));
   if(dim>=bright)throw Error('Protection flash missing');
   q.hurt(5,{x:-30,z:128});if(q.p.hp!==20)throw Error('Repeated hit ignored protection');
   q.input('KeyQ');if(q.p.weapon!=='mortar')throw Error('Equipment locked during hit');q.input('KeyQ');if(q.p.weapon==='laser')q.input('KeyQ');q.p.weapon='cannon';
   g.step(.35,false);if(q.shots.some(s=>!s.hostile)||q.magneticActive())throw Error('Attack active during recovery');
   const before={x:q.p.x,z:q.p.z};g.step(.1,false);if(!q.shots.some(s=>!s.hostile)||Math.hypot(q.p.x-before.x,q.p.z-before.z)<.1)throw Error('Held fire did not resume while driving');
   q.clearShots();g.setInput([]);
   g.scenario({player:{...start,mortar:true,speed:3.2,heat:50}});g.setInput(['ShiftLeft','KeyW']);g.step(1/60);
   const flame=q.model.root.getObjectByName('phoenix-exhaust'),card=document.querySelector('[data-ability="phoenix"]');
   if(!flame?.visible)throw Error('Phoenix ready without exhaust');
   const beforeHeat=q.p.heat;g.setInput(['KeyW']);g.step(1/60);
   if(q.p.speed<3||q.p.heat>=beforeHeat)throw Error('Coasting prevents immediate cooling');
   if(flame.visible)throw Error('Phoenix exhaust remains active below HUD speed');
   return {view,recoilAdded:1.2,dim,bright,coolingBefore:beforeHeat,coolingAfter:q.p.heat,coastingSpeed:q.p.speed,hud:card?.className};
  },view));
 }
 await page.evaluate(()=>{const g=__game,q=g.debug;g.setInput([]);q.setCameraView('overhead');g.scenario({player:{x:-35,y:-16,z:128,hp:25,hurtUntil:0,speed:3.2,heading:Math.PI,heat:40,phoenix:true,overdrive:true}});g.setInput(['KeyS','KeyA','ShiftLeft']);g.step(1/60);g.setInput([]);});
 await page.screenshot({path:'v2/output/playwright/phoenix-exhaust-overhead.png'});
 await page.evaluate(()=>{const q=__game.debug;q.setCameraView('third');__game.look(Math.PI,.267);__game.step(0);});
 await page.screenshot({path:'v2/output/playwright/phoenix-exhaust-third.png'});
 // Saving halfway through a real signal must not silently unlock its destination.
 const pending=await page.evaluate(()=>{const g=__game,q=g.debug,c=q.world.controls.find(c=>c.id==='gangway');q.state[c.id]=false;const point=new q.T.Vector3(c.x,c.y,c.z);q.impact({point,target:c},{origin:point,hostile:false});g.step(.5,false);g.save();return {id:c.id,remaining:q.state.pendingSignals[c.id]?.remaining};});
 if(!pending.remaining)throw Error('No pending signal saved');
 await page.reload();await page.waitForFunction(()=>window.__game?.debug);
 await page.evaluate(pending=>{const g=__game,q=g.debug;if(q.state[pending.id]||!q.state.pendingSignals[pending.id])throw Error('Reload skipped signal travel');g.step(pending.remaining+.05,false);if(!q.state[pending.id])throw Error('Restored signal did not arrive');},pending);
 if(errors.length)throw Error(errors.join('\n'));return {circuits,drive,pending,errors};
}

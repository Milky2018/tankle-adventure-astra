async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');await page.waitForFunction(()=>window.__game?.debug);
 await page.evaluate(()=>{localStorage.removeItem('furnace-born-v2-city');localStorage.removeItem('furnace-born-v2-settings')});await page.reload();await page.waitForFunction(()=>window.__game?.debug);
 const fresh=await page.evaluate(()=>({hp:__game.debug.p.hp,bars:document.querySelectorAll('#hp i').length}));if(fresh.hp!==25||fresh.bars!==5)throw Error('Initial hull '+JSON.stringify(fresh));
 const results=[];
 for(const id of ['armor-proving','armor-lens','cooling-filter','armor-hearth']){
  results.push(await page.evaluate(async id=>{
   const g=__game,a=g.debug,{foldedSolids}=await import('/src/folded-layout.js'),routes=await (await fetch('/test-fixtures/exploration-routes.json')).json(),r=routes[id];
   g.manual(true);g.setInput([]);const state=Object.fromEntries(foldedSolids.filter(s=>!s.permanent).map(s=>[s.id,true]));state[id]=false;
   if(id==='armor-proving')state['impact-store']=false;if(id==='armor-lens')state['collimator-drawer']=false;
   g.scenario({state,enemies:Object.fromEntries(a.world.enemies.map(e=>[e.id,0])),player:{x:r.start[0],y:r.start[1],z:r.start[2],hp:25,speed:1,heat:0,overheated:false,overdrive:true,phoenix:true,magnet:true,flotation:true,deployed:!!r.deployed,weapon:'cannon'}});
   const start=a.time;let travelled=0,previous={x:a.p.x,z:a.p.z};
   function walk(x,z,boost=false){for(let i=0;i<2400;i++){
     const p=a.p,dx=x-p.x,dz=z-p.z;if(Math.hypot(dx,dz)<.2){g.setInput([]);return;}
     const keys=Math.abs(dx)>Math.abs(dz)?dx>0?['KeyS','KeyD']:['KeyW','KeyA']:dz>0?['KeyS','KeyA']:['KeyW','KeyD'];if(boost)keys.push('ShiftLeft');g.setInput(keys);g.step(1/60,false);travelled+=Math.hypot(p.x-previous.x,p.z-previous.z);previous={x:p.x,z:p.z};
   }throw Error('Blocked '+id+' '+JSON.stringify({x,z,p:[a.p.x,a.p.y,a.p.z]}));}
   for(const [i,[x,z]]of r.points.entries()){
     if(id==='armor-lens'&&i===r.points.length-2){walk(448,-106);g.aimAt(442,-109.5,25.3);g.setInput(['Mouse2']);g.step(1);g.setInput([]);if(!a.state['collimator-drawer'])throw Error('Drawer handle inaccessible');}
     walk(x,z,id==='armor-proving'&&i===0);
   }
   g.step(.05);if(!a.state[id])throw Error('Reward not collected '+id);const outbound=travelled,seconds=a.time-start;
   for(const [x,z]of r.returns)walk(x,z);
   g.setInput([]);g.step(.05);return {id,outbound,returnDistance:travelled-outbound,seconds,hp:a.p.hp,armorPacks:a.p.armorPacks,pickedUp:a.state[id],returned:Math.hypot(a.p.x-r.returns.at(-1)[0],a.p.z-r.returns.at(-1)[1])<.4};
  },id));
  await page.evaluate(id=>{const q=__game.debug.world.pickups.find(p=>p.id===id);__game.scenario({player:{x:q.x,y:q.y,z:q.z,deployed:false}});__game.step(.05);},id);
  for(const view of ['overhead','third']){await page.evaluate(view=>{__game.debug.setCameraView(view);__game.look(Math.PI,.267);__game.step(.02);},view);await page.screenshot({path:`output/playwright/regression/detour-${id}-${view}.png`});}
  await page.evaluate(()=>__game.debug.setCameraView('overhead'));
 }
 if(errors.length)throw Error(errors.join('\n'));return {fresh,results,errors,scope:'Real movement, Phoenix and Magnet inputs; enemies disabled for route/collision isolation. Combat is tested separately.'};
}

// Focused route and combat checks. The opening starts after the earned Boost return.
async page=>{
 const errors=[],stages=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');await page.waitForFunction(()=>window.__game?.debug);
 await page.evaluate(()=>{const g=__game;g.manual(true);g.scenario({state:{prototype:true,overdrive:true},player:{x:0,y:-8,z:86,overdrive:true,hp:25},enemies:Object.fromEntries(g.snapshot().enemies.map(e=>[e.id,0]))});});
 async function move(x,z,boost=false){return page.evaluate(({x,z,boost})=>{const g=__game;for(let i=0;i<2400;i++){const p=g.snapshot().player,dx=x-p.x,dz=z-p.z;if(Math.hypot(dx,dz)<.35){g.setInput([]);return;}const keys=Math.abs(dx)>Math.abs(dz)?dx>0?['KeyS','KeyD']:['KeyW','KeyA']:dz>0?['KeyS','KeyA']:['KeyW','KeyD'];if(boost)keys.push('ShiftLeft');g.setInput(keys);g.step(1/60,false);}throw Error(`Blocked toward ${x},${z}: ${JSON.stringify(g.snapshot().player)}`);},{x,z,boost});}
 async function shoot(id,weapon='mortar'){
  await page.evaluate(({id,weapon})=>{const g=__game,q=g.debug,c=q.world.controls.find(c=>c.id===id);g.setInput([]);g.step(2,false);q.p.weapon=weapon;for(let i=0;i<600&&!g.snapshot().state[id];i++){g.aimAt(c.x+(c.mount?c.facing.x*.5:0),c.z+(c.mount?c.facing.z*.5:0),c.y+(c.mount?c.facing.y*.5:0));g.setInput(['Mouse0']);g.step(1/60,false);}g.setInput([]);g.step(5,false);if(!g.snapshot().state[id])throw Error(`Control did not open: ${id}, ${JSON.stringify(g.snapshot().player)}`);},{id,weapon});
 }
 async function record(name){const s=await page.evaluate(()=>__game.snapshot());stages.push({name,player:s.player,foundry:s.state.foundry});await page.evaluate(()=>{__game.step(.2);__game.debug.draw();});await page.screenshot({path:`output/playwright/regression/cargo-${name}.png`});if(['mortar-cradle','boss-live','testworks'].includes(name)){await page.evaluate(name=>{const g=__game;g.debug.setCameraView('third');g.look(name==='mortar-cradle'?0:Math.PI,.267);g.step(.1);g.debug.draw();},name);await page.screenshot({path:`output/playwright/regression/cargo-${name}-third.png`});await page.evaluate(()=>__game.debug.setCameraView('overhead'));}}
 await move(0,54,true);await move(24,48);await move(24,4);await move(36,4);await move(36,30);await move(22,30);await move(0,27);await record('transit-before-boss');
 await move(-12,27);await move(-12,-8);await move(-12,-24);await move(-14,-36);await move(-12,-40);await move(-12,-72);await record('boost-crossing');
 await move(6,-72,true);await page.evaluate(()=>{__game.step(2,false);});await move(34,-72,true);await page.keyboard.press('e');await page.evaluate(()=>__game.step(.1,false));
 if(!(await page.evaluate(()=>__game.snapshot())).player.mortar)throw Error('Mortar cradle not acquired');await record('mortar-cradle');
 await shoot('loading-return');await move(28,-58);await move(28,-46);
 await page.evaluate(()=>{const g=__game;for(let i=0;i<1800;i++){const l=g.debug.world.lifts.find(l=>l.id==='loading-return');if(Math.abs(l.y+8)<.05&&l.wait>1)return;g.step(1/60,false);}throw Error('No lower boarding');});
 await move(18,-46);await page.evaluate(()=>{const g=__game;for(let i=0;i<1800;i++){if(g.snapshot().player.y>-.05)return;g.step(1/60,false);}throw Error('No upper landing');});await move(18,-34);await move(0,-34);
 await shoot('bridge-crane');await move(0,27);await record('first-use-return');
 await move(0,-6);await move(0,-34);await move(18,-34);await shoot('freight');
 await move(59,-34);await move(59,-63);await move(67,-63);await move(67,-34);await move(70,-34);await shoot('freight-return','cannon');await move(70,-19);await move(90,-19);await shoot('load');await record('pre-boss');
 await move(90,-56);await record('arena');
 const lock=await page.evaluate(()=>{const g=__game,l=g.debug.world.lifts.find(l=>l.id==='carrier');g.step(5,false);return {y:l.y,foundry:g.snapshot().state.foundry};});if(lock.y!==8||lock.foundry)throw Error('Carrier bypassed the live Overseer');
 await page.evaluate(()=>{const g=__game;g.scenario({enemies:{foundry:14},player:{x:90,y:8,z:-56,hp:25,heat:0}});g.step(.1);});
 await record('boss-live');
 if((await page.evaluate(()=>__game.snapshot())).state.combatArena)throw Error('Transient arena should not be serialized');
 const fight=await page.evaluate(()=>{
  const g=__game,q=g.debug;let destination=70,shots=0;
  for(let i=0;i<60*100;i++){
   const e=q.world.enemies.find(e=>e.id==='foundry'),p=q.p;if(e.hp<=0){g.setInput([]);g.step(4,false);return {hp:p.hp,seconds:i/60,shots};}if(p.hp<=0)throw Error('Died during Overseer fight '+JSON.stringify({seconds:i/60,hp:e.hp,parts:e.parts.map(p=>p.hp),position:[p.x,p.z]}));
   if(Math.abs(p.x-destination)<.6)destination=destination===70?106:70;
   const keys=p.x<destination?['KeyS','KeyD']:['KeyW','KeyA'];
   const reserve=q.world.enemies.find(r=>r.reserveFor==='foundry'&&r.hp>0);const t=reserve?{x:reserve.x,y:reserve.y+1.5,z:reserve.z}:e.parts.find(p=>p.hp>0)||{x:e.x,y:e.y+1.5,z:e.z};p.weapon='cannon';g.aimAt(t.x,t.z,t.y);if(reserve||e.phase==='vent'){keys.push('Mouse0');shots++;}g.setInput(keys);g.step(1/60,false);
  }throw Error('Overseer fight timeout');
 });await record('boss-complete');
 await move(82,-56);await move(82,-76);
 await page.evaluate(()=>{const g=__game;for(let i=0;i<1800;i++){const l=g.debug.world.lifts.find(l=>l.id==='carrier');if(l.y===8&&l.wait>1)return;g.step(1/60,false);}throw Error('Carrier never returned');});await move(78,-84);
 await page.evaluate(()=>{const g=__game;for(let i=0;i<1800;i++){if(g.snapshot().player.y===16)return;g.step(1/60,false);}throw Error('Carrier does not ascend');});await move(77,-94);await record('testworks');
 if(errors.length)throw Error(errors.join('\n'));return {fixture:true,stages,fight,errors};
}

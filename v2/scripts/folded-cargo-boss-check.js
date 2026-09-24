async page=>{
 await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');await page.waitForFunction(()=>window.__game?.debug);
 await page.evaluate(()=>{const g=__game;g.manual(true);g.scenario({player:{x:90,y:8,z:-56,hp:25,mortar:true,overdrive:true,heat:0},state:{load:true},enemies:Object.fromEntries(g.snapshot().enemies.map(e=>[e.id,e.id==='foundry'?14:0]))});g.step(.1);});
 async function record(name){await page.evaluate(()=>{__game.step(.1);__game.debug.draw();});await page.screenshot({path:`output/playwright/regression/cargo-${name}.png`});}
 const fight=await page.evaluate(()=>{
  const g=__game,q=g.debug;let destination=70,shots=0;
  for(let i=0;i<60*100;i++){
   const e=q.world.enemies.find(e=>e.id==='foundry'),p=q.p;if(e.hp<=0){g.setInput([]);g.step(4,false);return {hp:p.hp,seconds:i/60,shots};}if(p.hp<=0)throw Error('Died during Overseer fight '+JSON.stringify({seconds:i/60,hp:e.hp,parts:e.parts.map(p=>p.hp),position:[p.x,p.z]}));
   if(Math.abs(p.x-destination)<.6)destination=destination===70?106:70;
   const keys=p.x<destination?['KeyS','KeyD']:['KeyW','KeyA'];
   const reserve=q.world.enemies.find(r=>r.reserveFor==='foundry'&&r.hp>0);const t=reserve?{x:reserve.x,y:reserve.y+1.5,z:reserve.z}:e.parts.find(p=>p.hp>0)||{x:e.x,y:e.y+1.5,z:e.z};p.weapon='cannon';g.aimAt(t.x,t.z,t.y);if(reserve||e.phase==='vent'){keys.push('Mouse0');shots++;}g.setInput(keys);g.step(1/60,false);
  }throw Error('Overseer fight timeout');
 });await record('boss-complete');return fight;
}
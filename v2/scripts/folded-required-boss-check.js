async page => {
 await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');
 await page.waitForFunction(()=>window.__game?.debug);
 const result=await page.evaluate(()=>{
  const g=__game,a=g.debug;g.manual(true);g.setInput([]);a.setCameraView('overhead');
  g.scenario({player:{x:34,y:-8,z:-72,hp:25,armorPacks:0,cannonUpgrade:false,mortarUpgrade:false,laserUpgrade:false,scopeUpgrade:false,coolingUpgrade:false,shotCooldown:0,hurtUntil:0,speed:1,heat:0,invincible:0,overheated:false,overdrive:true,magnet:false,flotation:false,mortar:false,phoenix:false,laser:false,circulation:false,weapon:'cannon'},state:{overdrive:true,sorter:false,foundry:false,mortarModule:false,'sorter-retry':false},enemies:Object.fromEntries(a.world.enemies.map(e=>[e.id,e.id==='sorter'?e.max:0]))});
  const log=[];
  function walk(x,z,fire=null){
   for(let n=0;n<2400;n++){
    const dx=x-a.p.x,dz=z-a.p.z;if(Math.hypot(dx,dz)<.25){g.setInput([]);return;}
    const keys=Math.abs(dx)>Math.abs(dz)?dx>0?['KeyS','KeyD']:['KeyW','KeyA']:dz>0?['KeyS','KeyA']:['KeyW','KeyD'];
    if(fire?.hp>0&&fire.phase==='vent'){g.aimAt(fire.x,fire.z,fire.y+1.5);keys.push('Mouse0');}
    g.setInput(keys);g.step(1/60,false);if(a.p.hp<=0)throw Error('Died '+JSON.stringify({log,boss:fire?.hp,position:[a.p.x,a.p.y,a.p.z]}));
   }throw Error('Stuck '+JSON.stringify({at:[a.p.x,a.p.y,a.p.z],target:[x,z]}));
  }
  walk(34,-98);walk(54,-98);walk(54,-118);walk(32,-118);
  const latch=a.world.controls.find(c=>c.id==='sorter-retry');g.step(3,false);g.aimAt(latch.x,latch.z,latch.y);g.setInput(['Mouse0']);g.step(2,false);g.setInput([]);g.step(5,false);
  if(!a.state['sorter-retry'])throw Error('Retry latch did not release');log.push('pre-fight retry released by Cannon');
  walk(54,-118);walk(54,-132);const boss=a.world.enemies.find(e=>e.id==='sorter');const start=a.time;
  for(let n=0;n<14&&boss.hp>0;n++)for(const [x,z]of [[59,-148],[32,-148],[32,-160],[56,-160],[59,-140]]){walk(x,z,boss);if(boss.hp<=0)break;}
  if(boss.hp>0)throw Error('Sorter survived '+JSON.stringify({hp:boss.hp,player:a.p.hp,phase:boss.phase,time:a.time-start}));
  g.setInput([]);g.step(5,false);log.push({fightSeconds:a.time-start,hp:a.p.hp,sorter:a.state.sorter});
  walk(59,-146);walk(32,-146);walk(32,-178);g.step(.1,false);if(!a.p.mortar)throw Error('No Mortar reward');
  walk(32,-146);walk(59,-146);walk(59,-124);walk(54,-124);walk(54,-98);walk(34,-98);walk(34,-72);
  a.p.weapon='mortar';g.setInput([]);g.step(3,false);g.aimAt(32,-58,-2);g.setInput(['Mouse0']);g.step(.1,false);g.setInput([]);g.step(12,false);
  if(!a.state['loading-return']||!a.state['bridge-crane'])throw Error('Mortar first use did not open returns');
  log.push('Mortar acquired behind Sorter; real lob powers the remembered freight return');a.draw();return log;
 });
 await page.screenshot({path:'v2/output/playwright/regression/required-sorter-complete.png'});return result;
}

async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');await page.waitForFunction(()=>window.__game?.debug);
 await page.evaluate(()=>localStorage.removeItem('furnace-born-v2-city'));await page.reload();await page.waitForFunction(()=>window.__game?.debug);
 const result=await page.evaluate(()=>{
  const g=__game,e=__game.debug.world.enemies.find(e=>e.id==='keeper');
  g.scenario({player:{x:0,y:-56,z:66,hp:50,invincible:0,laser:true,weapon:'laser',heat:0,overheated:false},state:{'core-feed':true}});
  const phases=new Set(),start=e.hp;let shot=false;
  for(let i=0;i<1200;i++){
   const part=e.parts.find(p=>p.hp>0)||{x:e.x,z:e.z,y:e.y+1.5};g.aimAt(part.x,part.z,part.y);g.setInput(['Mouse0']);g.step(1/60,false);
   phases.add(e.phase);shot=shot||__game.debug.shots.some(s=>s.hostile);
  }
  g.setInput([]);g.step(.1);
  return {start,hp:e.hp,playerHp:g.snapshot().player.hp,phases:[...phases],shot,position:{x:g.snapshot().player.x,y:g.snapshot().player.y,z:g.snapshot().player.z}};
 });
 await page.screenshot({path:'output/playwright/late-review/keeper-distance.png'});
 if(errors.length)throw Error(errors.join('\n'));
 if(result.hp>=30||!result.shot||!result.phases.includes('warn')||result.playerHp>=50)throw Error('Keeper remained passive under distant fire '+JSON.stringify(result));
 return {result,errors};
}

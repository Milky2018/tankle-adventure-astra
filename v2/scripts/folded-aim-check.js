async page=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5174/?chapter=folded&test');
  await page.waitForFunction(()=>!!window.__game);
  await page.evaluate(()=>{
    window.__game.manual(true);
    window.__game.scenario({player:{x:70,y:0,z:-14,weapon:'cannon',heat:0},enemies:{'bench-guard':3}});
    window.__game.step(.1);
  });
  const samples=[];
  for(const offset of [-8,-4,0,4,8]){
    const point=await page.evaluate(()=>{
      const e=window.__game.snapshot().enemies.find(e=>e.id==='bench-guard');
      return window.__game.project(e.x,e.z,e.y+1.5);
    });
    const mouse={x:point.x+offset,y:point.y};
    await page.mouse.move(mouse.x,mouse.y);
    const result=await page.evaluate(()=>{
      window.__game.step(1/60);
      const s=window.__game.snapshot(),r=document.getElementById('reticle').getBoundingClientRect();
      return {aim:s.aim,reticle:{x:r.x+r.width/2,y:r.y+r.height/2},pitch:Math.atan2(s.aim.y-s.player.y-2,Math.hypot(s.aim.x-s.player.x,s.aim.z-s.player.z))*180/Math.PI};
    });
    samples.push({offset,error:Math.hypot(result.reticle.x-mouse.x,result.reticle.y-mouse.y),...result});
  }
  if(samples.some(s=>s.error>1))throw Error('Enemy aim snapped away from mouse: '+JSON.stringify(samples));
  if(samples.some(s=>Math.abs(s.pitch)>40.001))throw Error('Barrel exceeded pitch limit');
  await page.mouse.down();await page.evaluate(()=>window.__game.step(.5));await page.mouse.up();
  const hp=await page.evaluate(()=>window.__game.snapshot().enemies.find(e=>e.id==='bench-guard').hp);
  if(hp>=3)throw Error('Free aim failed to hit enemy');
  if(errors.length)throw Error(JSON.stringify(errors));
  return {samples,enemyHpAfterShot:hp,errors};
}

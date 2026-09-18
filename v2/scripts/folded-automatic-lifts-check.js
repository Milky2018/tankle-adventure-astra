async page=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5174/?chapter=folded&test&manual');await page.waitForFunction(()=>window.__game?.debug);await page.evaluate(()=>localStorage.clear());await page.reload();await page.waitForFunction(()=>window.__game?.debug);
  const results=await page.evaluate(()=>{
    const {world}=__game.debug,g=__game,results=[];
    if(world.controls.some(c=>c.kind==='call'||c.id.startsWith('call-')))throw Error('Elevator call controls remain in the scene');
    for(const lift of world.lifts){
      g.respawn();g.scenario({player:{x:lift.x+lift.w/2,y:lift.stops[0],z:lift.z+lift.d/2,invincible:1e9},state:{[lift.lock||lift.id]:true},enemies:Object.fromEntries(world.enemies.map(e=>[e.id,0]))});
      const lower=lift.stops[0],upper=lift.stops.at(-1);let visits=0,last=null,dwell=0,dwells=[];
      for(let i=0;i<3600;i++){
        g.step(1/60,false);const p=g.snapshot().player;
        if(Math.abs(p.y-lift.y)>.001)throw Error(lift.id+' left its passenger behind');
        const at=lift.y===lower?'lower':lift.y===upper?'upper':null;
        if(at){dwell++;if(last!==at){visits++;last=at;}}
        else if(dwell){dwells.push(dwell/60);dwell=0;}
      }
      if(visits<5||dwells.some(t=>Math.abs(t-3)>.02))throw Error(lift.id+' automatic cycle '+JSON.stringify({visits,dwells}));
      results.push({id:lift.id,visits,dwells});
    }
    return results;
  });
  // E at former call stations must neither retarget a platform nor change its wait.
  for(const [id,x,y,z]of [['carrier',87,8,-62],['cage',2,0,18],['garden-lift',99,-8,18],['last-cage',33,-40,-18]]){
    await page.evaluate(({x,y,z})=>__game.scenario({player:{x,y,z,invincible:1e9}}),{x,y,z});
    const sample=()=>page.evaluate(id=>{const l=__game.debug.world.lifts.find(l=>l.id===id);return [l.y,l.destination,l.wait];},id);
    const before=await sample();await page.keyboard.press('e');const after=await sample();if(JSON.stringify(before)!==JSON.stringify(after))throw Error('E changed '+id);
  }
  await page.evaluate(()=>{__game.save();__game.respawn();});
  await page.reload();await page.waitForFunction(()=>window.__game?.debug);
  const restored=await page.evaluate(()=>{__game.scenario({player:{x:0,y:-8,z:86,invincible:1e9}});__game.step(4,false);return __game.debug.world.lifts.map(l=>({id:l.id,y:l.y,lower:l.stops[0]}));});
  if(restored.some(l=>l.y<=l.lower))throw Error('Unlocked lift failed to restart after reload '+JSON.stringify(restored));
  if(errors.length)throw Error(errors.join('\n'));return {results,noCallControls:true,eDoesNotOperateLifts:true,restored,errors};
}

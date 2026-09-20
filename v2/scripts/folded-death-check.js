async page => {
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:5174/?chapter=folded&test&manual');
  await page.waitForFunction(()=>window.__game?.debug);
  await page.locator('#game').click();
  await page.evaluate(async()=>{const q=__game.debug;q.audio.start();q.setPause(false);await q.audio.score.load('mz-castle3');await q.audio.score.load('mz-battle6');});
  const results=[];
  for(const view of ['overhead','third']){
    await page.evaluate(async view=>{
      const g=__game,q=g.debug;q.setCameraView(view);
      g.scenario({player:{x:202,y:16,z:54,hp:1,invincible:0},state:{anchor:'awakening'}});
      q.audio.update(q.time,q.p,true,'r4-optics',false,false,{boss:'guardian'});
      await q.audio.score.select('mz-battle6');
    },view);
    await page.waitForFunction(()=>__game.snapshot().music.track==='mz-battle6');
    const early=await page.evaluate(()=>{
      const g=__game,q=g.debug;q.hurt(100);g.step(.15);
      return {hp:q.p.hp,music:g.snapshot().music,tilt:q.model.turret.rotation.z,drop:q.model.turret.position.y,
        smoke:q.scene.getObjectByName('player-death-smoke').children[0].position.y};
    });
    if(early.hp!==0||!early.music.paused||early.music.track)throw Error('Death did not stop music immediately '+JSON.stringify(early));
    await page.evaluate(()=>__game.step(.65));
    const wreck=await page.evaluate(()=>{
      const q=__game.debug;return {tilt:q.model.turret.rotation.z,drop:q.model.turret.position.y,
        smoke:q.scene.getObjectByName('player-death-smoke').children[0].position.y,hp:q.p.hp};
    });
    if(wreck.hp!==0||wreck.tilt>=early.tilt||wreck.drop>=early.drop||wreck.smoke<=early.smoke)throw Error('Wreck animation froze '+JSON.stringify({early,wreck}));
    await page.screenshot({path:`v2/output/playwright/regression/death-${view}-wreck.png`});
    await page.evaluate(()=>__game.step(1.4));
    const iris=await page.locator('#death-iris').evaluate(el=>({display:el.style.display,path:el.firstChild.getAttribute('d')}));
    if(iris.display==='none')throw Error('Death iris never closed');
    await page.screenshot({path:`v2/output/playwright/regression/death-${view}-iris.png`});
    await page.evaluate(()=>__game.step(.35));
    await page.waitForFunction(()=>__game.snapshot().music.track==='mz-castle3');
    const respawn=await page.evaluate(()=>{
      const g=__game,q=g.debug;return {hp:q.p.hp,x:q.p.x,y:q.p.y,z:q.p.z,heat:q.p.heat,
        tilt:q.model.turret.rotation.z,smoke:q.scene.getObjectByName('player-death-smoke').visible,music:g.snapshot().music};
    });
    if(respawn.hp!==25||respawn.heat!==0||respawn.smoke||respawn.tilt!==0||respawn.y!==-8)throw Error('Reconstruction did not restore the player '+JSON.stringify(respawn));
    await page.evaluate(()=>__game.step(.5));
    if(await page.locator('#death-iris').evaluate(el=>el.style.display!=='none'))throw Error('Respawn iris failed to open');
    await page.screenshot({path:`v2/output/playwright/regression/death-${view}-respawn.png`});
    results.push({view,early,wreck,respawn});
  }
  // A death that happens while paused must not inherit the pause resume position.
  await page.evaluate(()=>{const q=__game.debug;__game.scenario({player:{x:202,y:16,z:54,hp:1,invincible:0}});q.setPause(true);q.hurt(100);q.setPause(false);__game.step(.2);q.input('Space');__game.step(.5);});
  if(await page.evaluate(()=>__game.debug.p.hp!==25))throw Error('Death skip failed');
  if(errors.length)throw Error(errors.join('\n'));
  return {results,errors};
}

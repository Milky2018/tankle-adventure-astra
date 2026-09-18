async page => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');
  await page.waitForFunction(()=>window.__game?.debug);
  await page.evaluate(()=>{localStorage.removeItem('furnace-born-v2-city');localStorage.removeItem('furnace-born-v2-settings');});
  await page.reload();await page.waitForFunction(()=>window.__game?.debug);
  const pickups=await page.evaluate(async()=>{
    const {explorationPickups}=await import('/src/folded-exploration-layout.js');
    const {playerMaxHp}=await import('/src/mechanics.js');
    const g=__game,a=g.debug;g.manual(true);g.scenario({enemies:Object.fromEntries(a.world.enemies.map(e=>[e.id,0]))});
    const results=[];
    for(const q of explorationPickups){
      if(q.requires)g.scenario({state:{[q.requires]:true}});
      g.scenario({player:{x:q.x,y:q.y,z:q.z,hp:playerMaxHp(a.p)-5}});g.step(.02);
      if(!a.state[q.id])throw Error('Pickup failed: '+q.id);
      results.push({id:q.id,hp:a.p.hp,max:playerMaxHp(a.p),segments:document.getElementById('hp').children.length});
    }
    a.p.mortar=a.p.laser=true;a.state.mortarModule=a.state.laser=true;
    g.scenario({state:{anchor:'awakening'}});g.save();g.respawn();g.step(1.3);
    return {results,max:playerMaxHp(a.p),hp:a.p.hp,reinforced:document.querySelectorAll('.ability-card.reinforced').length,cooler:!document.querySelector('.cooling-module').hidden};
  });
  if(pickups.max!==75||pickups.hp!==75||pickups.reinforced!==3||!pickups.cooler)throw Error(JSON.stringify(pickups));
  await page.screenshot({path:'v2/output/playwright/regression/exploration-hud.png'});
  await page.reload();await page.waitForFunction(()=>window.__game?.debug);
  const restored=await page.evaluate(()=>({hp:__game.debug.p.hp,armor:__game.debug.p.armorPacks,cooler:__game.debug.p.coolingUpgrade,cannon:__game.debug.p.cannonUpgrade,mortar:__game.debug.p.mortarUpgrade,laser:__game.debug.p.laserUpgrade}));
  if(restored.hp!==75||restored.armor!==5||!restored.cooler||!restored.cannon||!restored.mortar||!restored.laser)throw Error(JSON.stringify(restored));
  const landings=[];
  for(const view of ['overhead','third']){
    const landing=await page.evaluate(view=>{
      const g=__game,a=g.debug,T=a.T;g.manual(true);g.setInput([]);a.setCameraView(view);a.clearShots();
      g.scenario({player:{x:140,y:16,z:-176,hp:75,weapon:'mortar',mortar:true,heat:0,overheated:false,lastShot:-100,invincible:10000},enemies:Object.fromEntries(a.world.enemies.map(e=>[e.id,0]))});g.step(1);
      if(view==='overhead')g.aimAt(158,-181,16);else g.look(Math.PI/2,.45);
      a.updateAim();const predicted=a.mortarLanding.userData.prediction,marker=a.mortarLanding.visible,ground=a.mortarLanding.position.toArray();
      if(!g.fire())throw Error('Mortar failed to launch');
      const damage=a.shots.at(-1).damage;
      for(let i=0;i<100&&a.shots.length;i++)a.updateShots(1/120);
      for(let i=0;i<100&&a.shots.length;i++)a.updateShots(1/120);
      const blast=a.waves[0]?.mesh.position.clone();if(!blast)throw Error('No landing blast');blast.y-=.08;
      const error=blast.distanceTo(new T.Vector3(...predicted));
      return {view,marker,ground,predicted,actual:blast.toArray(),error,damage};
    },view);
    if(!landing.marker||landing.error>.12||landing.damage!==4.5)throw Error(JSON.stringify(landing));
    landings.push(landing);await page.evaluate(()=>__game.step(0));
    await page.screenshot({path:`v2/output/playwright/regression/mortar-landing-${view}.png`});
  }
  const damage=await page.evaluate(()=>{
    const g=__game,a=g.debug,results=[];a.setCameraView('overhead');
    for(const weapon of ['cannon','mortar','laser']){
      g.setInput([]);a.clearShots();g.scenario({player:{x:140,y:16,z:-176,weapon,hp:75,heat:0,overheated:false,lastShot:-100,lastHeat:-100},enemies:Object.fromEntries(a.world.enemies.map(e=>[e.id,0]))});
      const e=a.world.enemies.find(e=>e.id==='foundry-west-scout');Object.assign(e,{x:150,y:16,z:-176,hp:20,max:20,awake:true,stunnedUntil:1e9,deadAt:null});g.step(.05);g.aimAt(e.x,e.z,e.y+1.5);
      const before=e.hp;
      if(weapon==='laser'){g.setInput(['Mouse0']);g.step(1/60,false);g.setInput([]);}
      else {if(!g.fire())throw Error('No '+weapon+' shot');for(let i=0;i<160&&a.shots.length;i++)a.updateShots(1/120);}
      results.push({weapon,damage:before-e.hp});
    }
    return results;
  });
  const expected={cannon:1.5,mortar:4.5,laser:6.75/60};
  if(damage.some(r=>Math.abs(r.damage-expected[r.weapon])>.001))throw Error(JSON.stringify(damage));
  await page.evaluate(()=>{__game.debug.p.weapon='mortar';__game.debug.updateAim();});
  const aimCost=await page.evaluate(()=>{
    const a=__game.debug,times=[];for(let i=0;i<160;i++){const t=performance.now();a.updateAim();if(i>=40)times.push(performance.now()-t);}times.sort((a,b)=>a-b);return {median:times[60],p95:times[114]};
  });
  const views=[['stores',-183,8,-79],['water',-104,-8,87],['lens',275,24,-89]];
  for(const [id,x,y,z]of views){await page.evaluate(({x,y,z})=>{const g=__game,a=g.debug;a.setCameraView('third');g.scenario({player:{x,y,z,weapon:'cannon',deployed:false}});g.look(.25,.15);g.step(.2);},{x,y,z});await page.screenshot({path:`v2/output/playwright/regression/exploration-${id}.png`});}
  if(errors.length)throw Error(JSON.stringify(errors));
  return {pickups,restored,landings,damage,aimCost,errors};
}

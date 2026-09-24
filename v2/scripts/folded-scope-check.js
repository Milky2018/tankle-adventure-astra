async page => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');
  await page.waitForFunction(()=>window.__game?.debug);
  const route=await page.evaluate(async()=>{
    const g=__game,a=g.debug,r=(await (await fetch('/test-fixtures/exploration-routes.json')).json())['cannon-scope'];
    g.manual(true);
    g.scenario({enemies:Object.fromEntries(a.world.enemies.map(e=>[e.id,e.encounter==='rangefinder'?e.max:0])),player:{x:r.start[0],y:24,z:r.start[2],hp:25,invincible:0,weapon:'cannon',magnet:true}});
    const start=a.time,phases=new Set();
    function walk(x,z){for(let i=0;i<2400;i++){
      const p=a.p,dx=x-p.x,dz=z-p.z;if(Math.hypot(dx,dz)<.25){g.setInput([]);return;}
      if(p.hp<=0)throw Error('Scope approach death');
      const keys=Math.abs(dx)>Math.abs(dz)?dx>0?['KeyS','KeyD']:['KeyW','KeyA']:dz>0?['KeyS','KeyA']:['KeyW','KeyD'];
      const enemy=a.world.enemies.filter(e=>e.encounter==='rangefinder'&&e.hp>0).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];
      if(enemy){g.aimAt(enemy.x,enemy.z,enemy.y+1.5);keys.push('Mouse0');phases.add(enemy.phase);}
      g.setInput(keys);g.step(1/60,false);
    }throw Error('Scope route blocked '+JSON.stringify({target:[x,z],player:[a.p.x,a.p.y,a.p.z]}));}
    for(const [x,z]of r.points.slice(0,-1))walk(x,z);
    if(a.state['cannon-scope'])throw Error('Scope awarded before opening drawer');
    g.aimAt(386.5,12,25.3);g.setInput(['Mouse2']);g.step(1);g.setInput([]);
    if(!a.state['scope-drawer'])throw Error('Scope drawer unreachable');
    walk(390,12);g.step(.02);
    if(!a.p.scopeUpgrade||document.getElementById('scope-tool').hidden)throw Error('Scope pickup/HUD missing');
    const notice=document.getElementById('acquired').textContent;
    if(!notice.includes('Cannon and Mortar range'))throw Error('Wrong scope benefit '+notice);
    for(const [x,z]of r.returns)walk(x,z);
    g.setInput([]);g.save();
    return {hp:a.p.hp,seconds:a.time-start,phases:[...phases],notice,returned:[a.p.x,a.p.z]};
  });
  await page.evaluate(()=>{__game.scenario({state:{'cannon-scope':false},player:{x:390,y:24,z:4}});__game.step(.02);});
  for(const view of ['overhead','third']){
    await page.evaluate(view=>{__game.debug.setCameraView(view);__game.look(0,.267);__game.step(.02);},view);
    await page.screenshot({path:`output/playwright/regression/scope-workshop-${view}.png`});
  }
  await page.reload();await page.waitForFunction(()=>window.__game?.debug);
  const range=await page.evaluate(()=>{
    const g=__game,a=g.debug;g.manual(true);
    if(!a.p.scopeUpgrade||!a.state['cannon-scope'])throw Error('Scope save lost');
    const results=[];
    // Isolate real player fire and projectile lifetime above the city geometry.
    for(const scopeUpgrade of [false,true]){
      a.clearShots();g.scenario({enemies:Object.fromEntries(a.world.enemies.map(e=>[e.id,0])),player:{x:0,y:128,z:0,scopeUpgrade,weapon:'cannon',heat:0,overheated:false,lastShot:-100}});
      a.aim.copy(a.weaponOrigin()).add(new a.T.Vector3(0,0,100));g.fire();
      const shot=a.shots.at(-1);if(!shot)throw Error('Cannon did not fire');
      for(let i=0;i<96;i++)a.updateShots(1/120);
      const beyondBaseRange=a.shots.includes(shot);
      for(let i=0;i<60;i++)a.updateShots(1/120);
      results.push({scopeUpgrade,range:shot.range,damage:shot.damage,beyondBaseRange,expired:!a.shots.includes(shot)});
    }
    if(results[0].beyondBaseRange||!results[1].beyondBaseRange||results[1].range!==36||results.some(r=>!r.expired||r.damage!==1))throw Error(JSON.stringify(results));
    return results;
  });
  const mortar=await page.evaluate(()=>{
    const g=__game,a=g.debug,results=[];a.setCameraView('overhead');
    for(const scopeUpgrade of [false,true]){
      g.setInput([]);a.clearShots();g.scenario({player:{x:240,y:16,z:-176,scopeUpgrade,weapon:'mortar',mortar:true,heat:0,overheated:false,lastShot:-100}});
      g.aimAt(240,-220,16);a.updateAim();
      const predicted=new a.T.Vector3(...a.mortarLanding.userData.prediction),marker=a.mortarLanding.visible;
      if(!g.fire())throw Error('Mortar failed to fire');
      const shot=a.shots.at(-1),distance=Math.hypot(shot.target.x-a.p.x,shot.target.z-a.p.z);
      for(let i=0;i<180&&a.shots.includes(shot);i++)a.updateShots(1/120);
      const actual=a.waves.at(-1).mesh.position.clone();actual.y-=.08;
      const expected=scopeUpgrade?36:24;
      if(Math.abs(distance-expected)>.05||actual.distanceTo(predicted)>.15||Math.hypot(actual.x-a.p.x,actual.z-a.p.z)<expected-.2||!marker)throw Error(JSON.stringify({scopeUpgrade,distance,predicted:predicted.toArray(),actual:actual.toArray(),marker}));
      results.push({scopeUpgrade,distance,predicted:predicted.toArray(),actual:actual.toArray()});
    }
    return results;
  });
  if(errors.length)throw Error(errors.join('\n'));return {route,range,mortar,errors};
}

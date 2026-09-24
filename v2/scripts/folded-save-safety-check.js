async page=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');
  await page.waitForFunction(()=>window.__game?.debug);
  await page.evaluate(()=>localStorage.removeItem('furnace-born-v2-city'));
  await page.reload();await page.waitForFunction(()=>window.__game?.debug);
  const result=await page.evaluate(async()=>{
    const {foldedHives}=await import('/src/folded-layout.js');
    const g=__game,a=__game.debug,runs=[];g.manual(true);
    for(const h of foldedHives){
      g.scenario({state:{anchor:h.id,...h.requires?{[h.requires]:true}:{}}});g.respawn();
      g.setInput(['Mouse2']);g.step(12,false);g.setInput([]);
      const s=g.snapshot();
      runs.push({hive:h.id,hp:s.player.hp,nearest:Math.min(...s.enemies.filter(e=>e.hp>0&&Math.abs(e.y-h.y)<3).map(e=>Math.hypot(e.x-h.x,e.z-h.z)))});
    }
    // Inject already launched attacks after spawn immunity expires. This exercises
    // projectile/contact handling independently of whether a sentry can see a Hive.
    const h=foldedHives.find(h=>h.id==='turntable');
    g.scenario({state:{anchor:h.id}});g.respawn();g.step(2,false);
    g.scenario({enemies:Object.fromEntries(a.world.enemies.map(e=>[e.id,0])),player:{invincible:0}});
    const e=a.world.enemies.find(e=>e.type==='sniper');
    Object.assign(e,{x:h.x+4,y:h.y,z:h.z});e.lock={clone:()=>new (__game.debug.world.views.enemy(e).model.root.position.constructor)(h.x,h.y+1.2,h.z)};
    a.shootEnemy(e);a.updateShots(.1);
    const projectileHp=a.p.hp;
    Object.assign(e,{x:h.x+11});a.shootEnemy(e);a.updateShots(.06);
    const incomingStopped=a.shots.length===0;
    const artillery=a.world.enemies.find(e=>e.type==='artillery');
    Object.assign(artillery,{x:h.x+11,y:h.y,z:h.z,lock:e.lock});
    a.shootEnemy(artillery);
    for(let i=0;i<120;i++)a.updateShots(1/60);
    const mortarHp=a.p.hp,markersCleared=a.shots.length===0;
    g.scenario({player:{hp:25,invincible:0}});
    a.layMine({id:'safety-fixture',x:h.x,y:h.y,z:h.z});
    for(let i=0;i<180;i++)a.updateMines(1/60);
    const mineHp=a.p.hp;
    a.clearShots();
    // A clear slice of the room isolates pursuit and charge from wall collisions.
    g.scenario({player:{x:h.x+7,y:h.y,z:h.z,hp:25,invincible:0}});
    const scout=a.world.enemies.find(e=>e.type==='scout');
    Object.assign(scout,{x:h.x+19.5,y:h.y,z:h.z,hp:2,phase:'charge',timer:.7,aim:-Math.PI/2});
    scout.spawn={...scout.spawn,x:scout.x,y:scout.y,z:scout.z};
    for(let i=0;i<60;i++)a.moveEnemy(scout,-Math.PI/2,4.5,1/60);
    const pursuitDistance=Math.hypot(scout.x-h.x,scout.z-h.z);
    for(let i=0;i<10;i++)a.updateEnemies(1/60);
    const chargeDistance=Math.hypot(scout.x-h.x,scout.z-h.z);
    // Damage must resume outside the refuge, with no lingering invulnerability.
    Object.assign(e,{x:h.x+11,y:h.y,z:h.z});
    e.lock={clone:()=>new (__game.debug.world.views.enemy(e).model.root.position.constructor)(h.x+7,h.y+1.2,h.z)};
    a.shootEnemy(e);a.updateShots(.1);const outsideHp=a.p.hp;
    const V=__game.debug.world.views.enemy(e).model.root.position.constructor;
    const outbound=a.castWeapon(new V(h.x,h.y+2,h.z),new V(1,0,0),30,{targets:false});
    a.clearShots();g.scenario({player:{x:h.x,y:h.y,z:h.z,hp:25}});
    Object.assign(scout,{phase:'warn',timer:.01,alertUntil:a.time+10,lastSeen:{...a.p}});
    a.updateEnemies(1/60);const disengaged=scout.phase==='idle'&&scout.alertUntil===0;
    g.respawn();g.step(0);
    return {runs,projectileHp,incomingStopped,mortarHp,markersCleared,mineHp,pursuitDistance,chargeDistance,outsideHp,outboundBlocked:!!outbound?.refuge,disengaged};
  });
  if(result.runs.some(r=>r.hp!==25||r.nearest<19.35)||result.projectileHp!==25||!result.incomingStopped||result.mortarHp!==25||!result.markersCleared||result.mineHp!==25||result.pursuitDistance<19.35||result.chargeDistance<19.35||result.outsideHp!==15||!result.outboundBlocked||!result.disengaged||errors.length)throw Error(JSON.stringify({...result,errors}));
  return {...result,errors};
}

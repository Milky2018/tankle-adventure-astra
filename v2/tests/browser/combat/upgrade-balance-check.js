async page=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));const results=[];
  for(const equipped of [false,true])for(const policy of ['cover-mortar','mobile-laser']){
    await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');
    await page.waitForFunction(()=>window.__game?.debug);
    await page.evaluate(()=>localStorage.removeItem('furnace-born-v2-city'));
    await page.reload();await page.waitForFunction(()=>window.__game?.debug);
    results.push(await page.evaluate(async({equipped,policy})=>{
      const g=__game,a=g.debug,{applyUpgrades,UPGRADE_IDS}=await import('/src/player/upgrades.js');g.manual(true);a.traceCombat();const {keeperDodge}=await import('/tests/fixtures/keeper-dodge.js');
      const flags=Object.fromEntries(UPGRADE_IDS.map(id=>[id,equipped]));
      g.scenario({state:{...flags,'core-feed':true},player:{x:policy==='cover-mortar'?14:0,y:-56,z:policy==='cover-mortar'?46:54,hp:equipped?50:25,invincible:0,heat:0,overheated:false,mortar:true,laser:true,weapon:policy==='cover-mortar'?'mortar':'laser'}});
      applyUpgrades(a.p,a.state);
      const boss=a.world.enemies.find(e=>e.id==='keeper'),phases=new Set(),orbit=[[-8,40],[-8,28],[8,28],[8,40]];let corner=0,firstHit=null;
      const start=a.time;
      for(let i=0;i<3600&&boss.hp>0&&a.p.hp>0;i++){
        const p=a.p,keys=[];
        if(policy==='mobile-laser'){
          if(Math.hypot(p.x-orbit[corner][0],p.z-orbit[corner][1])<.6)corner=(corner+1)%orbit.length;
          const dx=orbit[corner][0]-p.x,dz=orbit[corner][1]-p.z;keys.push(...(Math.abs(dx)>Math.abs(dz)?dx>0?['KeyS','KeyD']:['KeyW','KeyA']:dz>0?['KeyS','KeyA']:['KeyW','KeyD']));
        }
        const target=boss.parts.find(t=>t.hp>0)||{x:boss.x,y:boss.y+1.5,z:boss.z};g.aimAt(target.x,target.z,target.y);keys.push('Mouse0');g.setInput(policy==='mobile-laser'?(keeperDodge(p,boss)||keys):keys);g.step(1/60,false);
        if(firstHit===null&&p.hp<(equipped?50:25))firstHit=a.time-start;phases.add(boss.phase+'/'+boss.attack);
      }
      g.setInput([]);g.step(0);
      return {equipped,policy,won:boss.hp<=0,seconds:a.time-start,hp:a.p.hp,bossHp:boss.hp,firstHit,phases:[...phases],shots:a.enemyShots.length};
    },{equipped,policy}));
  }
  if(errors.length)throw Error(JSON.stringify(errors));
  if(results.some(r=>r.policy==='cover-mortar'&&r.won))throw Error('Cover camping wins with optional equipment '+JSON.stringify(results));
  if(results.some(r=>r.policy==='mobile-laser'&&!r.won))throw Error('Mobile Keeper response failed '+JSON.stringify(results));
  if(results.some(r=>r.policy==='mobile-laser'&&(r.seconds<20||r.seconds>40)))throw Error('Keeper duration outside 20–40 seconds '+JSON.stringify(results));
  return {results,errors,fixture:'Direct arena entry with ordinary or full earned equipment; identical input policies, no invulnerability.'};
}

async page=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));

  await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');await page.waitForFunction(()=>window.__game?.debug);
  const results=[];
  for(const [id,x,z,left,right]of [['prototype',-34,132,-41,-22],['foundry',0,53,-10,13],['guardian',202,78,188,218],['sorter',126,-108,118,141],['keeper',0,53,-9,9]]){
   const trials=[];
   for(const moving of [false,true])trials.push(await page.evaluate(({id,x,z,left,right,moving})=>{
    const a=__game.debug,g=__game,boss=a.world.enemies.find(e=>e.id===id);
    a.state[id]=false;g.respawn();a.clearShots();g.manual(true);
    g.scenario({enemies:Object.fromEntries(a.world.enemies.map(e=>[e.id,e===boss?e.max:0])),player:{x,y:boss.y,z,hp:50,heat:0,overheated:false,endingTime:0,invincible:0,speed:1,overdrive:id!=='prototype'},state:{relays:true}});
    boss.timer=0;
    const types=new Set(),patterns=new Set(),seen=new Set();let direction=1,maxShots=0,minimumHp=50;
    for(let i=0;i<18*30;i++){
     const p=g.snapshot().player;
     if(moving){if(p.x>right)direction=-1;if(p.x<left)direction=1;g.setInput(direction>0?['KeyS','KeyD']:['KeyW','KeyA']);}else g.setInput([]);
     g.step(1/30,false);minimumHp=Math.min(minimumHp,g.snapshot().player.hp);
     if(boss.attack)patterns.add(boss.attack);if(boss.phase==='charge')patterns.add('charge');
     maxShots=Math.max(maxShots,a.shots.length);
     for(const shot of a.shots){seen.add(shot);types.add(shot.homing?'seeker':shot.mortar?'mortar':shot.speed>=30?'fast-fan':'shell');}
     if(minimumHp<=0)break;
    }
    g.setInput([]);if(minimumHp>0&&a.state.combatArena!==id)throw Error(id+' left the live arena');g.step(.001);return {moving,hp:minimumHp,shots:seen.size,maxShots,types:[...types],patterns:[...patterns],arena:a.state.combatArena,position:g.snapshot().player};
   },{id,x,z,left,right,moving}));
   await page.screenshot({path:`output/playwright/enclosed-bosses/${id}-overhead.png`});
   const lifecycle=await page.evaluate(id=>{
    const a=__game.debug,g=__game,boss=a.world.enemies.find(e=>e.id===id);
    a.state[id]=false;g.respawn();a.clearShots();const arenas={prototype:[-34,-16,132],foundry:[0,-8,53],guardian:[202,16,78],sorter:[126,24,-108],keeper:[0,-56,53]};const [x,y,z]=arenas[id];
    g.scenario({enemies:Object.fromEntries(a.world.enemies.map(e=>[e.id,e===boss?e.max:0])),player:{x,y,z,hp:50,invincible:0}});g.step(.05);
    if(a.state.combatArena!==id)throw Error(id+' did not seal');
    const gates=a.world.walls.filter(w=>w.arena===id);g.step(.6);if(gates.some(w=>w.open>.05))throw Error(id+' shutter did not rise');
    boss.hp=boss.max*.3;g.step(.05);const deployment=a.world.enemies.filter(e=>e.reserveFor===id&&e.hp>0).map(e=>({id:e.id,awake:e.awake,until:e.deployUntil}));
    g.step(2.1);const reserves=a.world.enemies.filter(e=>e.reserveFor===id&&e.hp>0).map(e=>({id:e.id,awake:e.awake}));
    a.hitEnemy(boss,1000,{x,y,z},'red');g.step(.7);
    if(a.state.combatArena!==null||gates.some(w=>w.open<.99))throw Error(id+' did not release');
    if(a.shots.some(s=>s.owner===id)||a.world.enemies.some(e=>e.reserveFor===id&&e.hp>0))throw Error(id+' left combat hazards');
    return {deployment,reserves,released:true};
   },id);
   results.push({id,trials,lifecycle});
  }
  if(errors.length)throw Error(errors.join('\n'));return {results,errors};
}

async page=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');await page.waitForFunction(()=>window.__game?.debug);
  await page.evaluate(()=>{localStorage.removeItem('furnace-born-v2-city');});await page.reload();await page.waitForFunction(()=>window.__game?.debug);
  const trials=await page.evaluate(async()=>{
    const {expansionRoutes,expansionControls}=await import('/src/content/expansion-layout.js');
    const g=__game,results=[];g.manual(true);
    for(const route of expansionRoutes){
      const c=expansionControls.find(c=>c.id===route.trial),point=route.path.find(p=>p[2]===route.trial),r={x:point[0],y:route.y,z:point[1]};
      g.scenario({player:{x:r.x,y:r.y,z:r.z,hp:50,invincible:0,mortar:true,heat:0,overheated:false,weapon:c.surface?'mortar':'cannon'},state:{[c.id]:false}});
      if(c.requires){
        const inlet=expansionControls.find(t=>t.id===c.requires);g.scenario({state:{[c.requires]:false}});
        g.aimAt(c.x,c.z,c.y);g.setInput(['Mouse0']);g.step(1.2,false);g.setInput([]);if(g.snapshot().state[c.id])throw Error('Covered downstream target accepted fire');
        g.scenario({player:{heat:0,overheated:false}});
        for(let i=0;i<180&&!g.snapshot().state[inlet.id];i++){g.aimAt(inlet.x,inlet.z,inlet.y);g.setInput(['Mouse0']);g.step(1/60,false);}g.setInput([]);g.scenario({player:{heat:0,overheated:false}});
      }
      if(c.pressure){
        g.scenario({player:{x:r.x-5}});g.aimAt(c.x,c.z,c.y);g.setInput(['Mouse0']);g.step(1.2,false);g.setInput([]);
        if(g.snapshot().state[c.id])throw Error('Pressure plate accepted an empty floor '+c.id);
        g.scenario({player:{x:r.x,heat:0,overheated:false}});
      }
      for(let i=0;i<360&&!g.snapshot().state[c.id];i++){g.aimAt(c.x,c.z,c.y);g.setInput(['Mouse0']);g.step(1/60,false);}g.setInput([]);
      if(!g.snapshot().state[c.id])throw Error('Trial could not be solved '+JSON.stringify({id:c.id,player:g.snapshot().player,aim:g.snapshot().aim}));
      results.push({id:c.id,hp:g.snapshot().player.hp});g.step(0);
    }
    return results;
  });
  await page.screenshot({path:'output/playwright/overhaul/pacing-trial.png'});
  const waves=await page.evaluate(async()=>{
    const {expansionRoutes}=await import('/src/content/expansion-layout.js');
    const g=__game,a=__game.debug,route=expansionRoutes.find(r=>r.id==='proving'),point=route.path.find(p=>p[2]==='battle'),r={x:point[0],y:route.y,z:point[1]},group=a.world.enemies.filter(e=>e.battle==='proving-endurance');
    g.scenario({player:{x:r.x,y:r.y,z:r.z,hp:50,invincible:1e9},state:{'proving-endurance':false}});
    const reserve=group.filter(e=>e.wave);if(reserve.some(e=>e.awake))throw Error('Reserves started awake');
    for(const e of group.filter(e=>!e.wave))a.hitEnemy(e,100,new a.T.Vector3(r.x,r.y,r.z),'mortar');
    g.step(3.9,false);if(reserve.some(e=>e.awake)||g.snapshot().state['proving-endurance'])throw Error('Wave break skipped');
    g.step(.2,false);if(reserve.some(e=>!e.awake))throw Error('Reserve never deployed');
    for(const e of reserve)a.hitEnemy(e,100,new a.T.Vector3(r.x,r.y,r.z),'mortar');g.step(.1,false);
    if(!g.snapshot().state['proving-endurance'])throw Error('Finished battle left gate shut');
    g.respawn();if(reserve.some(e=>e.awake)||!g.snapshot().state['proving-endurance'])throw Error('Rest lost a cleared return or reserve reset');
    return {pause:4,finite:group.length,persistentReturn:true};
  });
  const thermal=await page.evaluate(async()=>{
    const {expansionHeat}=await import('/src/content/expansion-layout.js'),q=expansionHeat[0],g=__game;
    g.scenario({player:{x:q.x+q.w-4,y:q.y,z:q.z+6,hp:50,invincible:0,heat:0,overheated:false,speed:1,overdrive:true,phoenix:true,circulation:true},state:{'coolant-return':false}});
    g.setInput(['KeyW','KeyA','ShiftLeft']);g.step(8,false);g.setInput([]);g.step(0);
    const s=g.snapshot();if(!s.state['coolant-return']||!s.player.overheated||s.player.x>=q.x+6)throw Error('Cold Circulation runout failed '+JSON.stringify(s.player));
    return {coldStart:true,redContact:true,opened:true,hp:s.player.hp};
  });
  await page.screenshot({path:'output/playwright/overhaul/pacing-thermal.png'});
  if(errors.length)throw Error(errors.join('\n'));
  return {trials,waves,thermal,errors};
}

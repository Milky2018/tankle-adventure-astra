async page=>{
  await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');await page.waitForFunction(()=>window.__game?.debug);await page.evaluate(()=>__game.debug.traceCombat());
  const result=await page.evaluate(()=>{
    const g=__game,a=__game.debug,e=a.world.enemies.find(e=>e.id==='foundry');g.manual(true);
    g.scenario({player:{x:0,y:-8,z:55,hp:50,invincible:1e9,heat:0,overheated:false,weapon:'cannon'},state:{foundry:false},enemies:Object.fromEntries(a.world.enemies.map(o=>[o.id,o===e?14:0]))});
    e.parts.forEach(p=>p.hp=p.max);e.phase='idle';e.timer=0;let destination=-10;
    for(let i=0;i<1800&&e.hp;i++){
      const s=g.snapshot(),p=s.player;if(Math.abs(p.x-destination)<.6)destination=-destination;
      const target=e.parts.find(p=>p.hp>0)||{x:e.x,y:e.y+1.5,z:e.z};g.aimAt(target.x,target.z,target.y);
      g.setInput([...(destination>p.x?['KeyS','KeyD']:['KeyW','KeyA']),...(e.phase==='vent'?['Mouse0']:[])]);g.step(1/30,false);
    }
    g.setInput([]);return {hp:e.hp,phase:e.phase,aim:g.snapshot().aim,hits:a.hitLog};
  });
  if(result.hp!==0)throw Error(JSON.stringify(result));return result;
}

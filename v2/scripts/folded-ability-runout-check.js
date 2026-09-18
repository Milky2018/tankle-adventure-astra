async page=>{
  const errors=[],runs=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/src/folded.js*',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replace('let manual=false','let manual=true')+'\nwindow.__runout={world};'});});
  for(const id of ['proving','coolant']){
    await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test');await page.waitForFunction(()=>window.__runout);
    const result=await page.evaluate(async id=>{
      const {expansionRoutes}=await import('/src/folded-expansion-layout.js'),route=expansionRoutes.find(r=>r.id===id),pickup=route.path.find(p=>p[2]==='pickup'),exit=route.returns.find(p=>p[2]==='boost'),a={x:pickup[0],y:route.y,z:pickup[1]},b={x:exit[0],z:exit[1]},g=__game,ability=route.ability;
      // Begin at the real cradle with prior equipment, normal HP, and a cold engine.
      g.manual(true);g.scenario({player:{x:a.x,y:a.y,z:a.z,hp:50,invincible:0,overdrive:true,phoenix:id==='coolant',circulation:false,heat:0,overheated:false,speed:1,weapon:'cannon'},state:{[ability]:false,[id+'-return']:false}});g.step(.1,false);
      if(!g.snapshot().player[ability])throw Error('Cradle did not install '+ability);
      const squad=__runout.world.enemies.filter(e=>e.id.startsWith(id+'-return-'));
      for(const [x,z,action]of route.returns){
        if(action==='boost')break;
        for(let i=0;i<900;i++){
          const p=g.snapshot().player,dx=x-p.x,dz=z-p.z;if(Math.hypot(dx,dz)<.3)break;
          g.setInput(Math.abs(dx)>Math.abs(dz)?dx>0?['KeyS','KeyD']:['KeyW','KeyA']:dz>0?['KeyS','KeyA']:['KeyW','KeyD']);g.step(1/60,false);
        }
      }
      g.setInput(['KeyW','KeyA','ShiftLeft']);
      for(let i=0;i<600&&g.snapshot().player.x>b.x+1;i++)g.step(1/60,false);
      g.setInput([]);g.step(0);
      const s=g.snapshot();return {id,acquired:s.player[ability],opened:s.state[id+'-return'],x:s.player.x,destination:b.x,hp:s.player.hp,heat:s.player.heat,squad:squad.map(e=>({id:e.id,hp:e.hp,ram:e.ramAt>0}))};
    },id);
    await page.screenshot({path:`v2/output/playwright/overhaul/${id}-first-use.png`});
    if(!result.opened||result.x>result.destination+2||result.hp<=0||result.squad.some(e=>e.hp>0||!e.ram))throw Error('First-use ram return failed '+JSON.stringify(result));
    runs.push(result);
  }
  await page.unroute('**/src/folded.js*');if(errors.length)throw Error(errors.join('\n'));return {runs,errors};
}

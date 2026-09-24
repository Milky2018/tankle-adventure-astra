async page=>{
  await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');
  await page.waitForFunction(()=>window.__game?.debug);
  await page.evaluate(()=>localStorage.removeItem('furnace-born-v2-city'));
  await page.reload();await page.waitForFunction(()=>window.__game?.debug);
  const results=await page.evaluate(async()=>{
    const g=__game,a=g.debug;g.manual(true);
    const enemies=Object.fromEntries(a.world.enemies.map(e=>[e.id,0]));
    g.scenario({enemies,player:{x:-164,y:-8,z:92,hp:50,invincible:1e9,deployed:false}});
    g.setInput(['KeyS','KeyD']);g.step(3);g.setInput([]);
    const dry=a.p.x;if(dry>-151||a.state['armor-reservoir'])throw Error('Island accessible without flotation '+dry);
    g.scenario({player:{flotation:true}});g.toggleFlotation();g.setInput(['KeyS','KeyD']);
    for(let i=0;i<600&&!a.state['armor-reservoir'];i++)g.step(1/60,false);g.setInput([]);
    if(!a.state['armor-reservoir'])throw Error('Flotation island unreachable '+JSON.stringify(a.p));
    const island={dryStop:dry,pickupX:a.p.x};
    g.scenario({state:{'impact-store':false,'armor-proving':false},player:{x:188,y:16,z:-124,overdrive:true,phoenix:false,speed:1,deployed:false,heat:0,overheated:false}});
    g.setInput(['KeyS','KeyD','ShiftLeft']);g.step(5);g.setInput([]);
    if(a.state['impact-store'])throw Error('Ordinary boost breaks Phoenix store');
    g.scenario({player:{x:188,y:16,z:-124,phoenix:true,speed:1,heat:0,overheated:false}});
    g.setInput(['KeyS','KeyD','ShiftLeft']);
    for(let i=0;i<600&&!a.state['impact-store'];i++)g.step(1/60,false);g.setInput([]);
    if(!a.state['impact-store']||a.state['armor-proving'])throw Error('Phoenix spur should open without immediately awarding armour '+JSON.stringify(a.p));
    const impact={speed:a.p.speed,heat:a.p.heat,x:a.p.x};
    g.scenario({state:{'collimator-drawer':false,'armor-lens':false},player:{x:363,y:32,z:-80,magnet:true,weapon:'cannon',speed:1,heat:0,overheated:false}});
    const gate=a.state.bodies.solids.find(b=>b.id==='collimator-drawer');
    for(let i=0;i<900&&!a.state['collimator-drawer'];i++){
      const c=a.world.controls.find(c=>c.id==='collimator-drawer');g.aimAt(c.x,c.z,c.y);
      const keys=['Mouse2'];
      g.setInput(keys);g.step(1/60,false);
    }
    g.setInput([]);
    if(!a.state['collimator-drawer']||gate.rail)throw Error('Mezzanine lock failed '+JSON.stringify({gate,p:a.p}));
    a.setCameraView('third');a.clearShots();
    g.scenario({state:{'mortar-cache':false},player:{x:161,y:20,z:-146,mortar:true,weapon:'mortar',heat:0,lastShot:-100}});
    let yaw=Math.atan2(155.5-161,-134.5+146),pitch=0;
    for(let i=0;i<24;i++){g.look(yaw,pitch);g.step(1/60);const q=g.project(155.5,-134.5,22.7);yaw-=(q.x/innerWidth*2-1)*Math.tan(Math.PI/6)*(innerWidth/innerHeight)*.8;pitch+=(q.y/innerHeight*2-1)*Math.tan(Math.PI/6)*.8;}
    g.look(yaw,pitch);g.setInput(['Mouse0']);g.step(3);g.setInput([]);
    if(!a.state['mortar-cache'])throw Error('Third-person horizontal cabinet tray unreachable '+JSON.stringify({aim:a.aim,landing:a.mortarLanding.userData.prediction}));
    return {island,impact,magneticDrawer:true,thirdPersonMortar:true};
  });
  return results;
}

async page => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5174/?chapter=folded&test&manual&view=overhead');
  await page.waitForFunction(()=>window.__game);
  // Isolated mechanism checks: remove combat pressure, but operate the controls
  // through the real aiming, input, projectile and magnetic-traction paths.
  const report=await page.evaluate(()=>{
    const g=__game,w=g.debug.world;
    const enemies=Object.fromEntries(w.enemies.map(e=>[e.id,0]));
    g.scenario({player:{x:-106,y:8,z:-54,magnet:true,heat:0,overheated:false},enemies});
    const gate=g.debug.state.bodies.solids.find(b=>b.id==='arsenal-return');
    for(let i=0;i<120&&!w.signals.active('arsenal-return');i++){
      const c=w.controls.find(c=>c.id==='arsenal-return');g.aimAt(c.x,c.z,c.y);g.setInput(['Mouse2']);g.step(1/60,false);
    }
    g.setInput([]);g.step((w.signals.pending('arsenal-return')?.remaining||0)+1);
    if(!g.snapshot().state['arsenal-return']||gate.rail)throw Error('Workshop lock did not tear free');
    const magnet={x:gate.x,z:gate.z,heat:g.snapshot().player.heat};
    g.scenario({player:{x:376,y:24,z:-20,weapon:'cannon',heat:0,lastShot:-100,lastHeat:-100,overheated:false}});
    for(let i=0;i<180&&!w.signals.active('scope-drawer');i++){const c=w.controls.find(c=>c.id==='scope-drawer');g.aimAt(c.x+c.facing.x*.5,c.z+c.facing.z*.5,c.y+c.facing.y*.5);g.setInput(['Mouse0']);g.step(1/60,false);}
    g.setInput([]);g.step((w.signals.pending('scope-drawer')?.remaining||0)+6,false);
    const screen=g.debug.state.bodies.solids.find(b=>b.id==='scope-screen');
    if(!g.snapshot().state['scope-drawer']||screen.x<387.9)throw Error('Workshop screen failed '+JSON.stringify(screen));
    g.scenario({player:{x:0,y:0,z:-6,mortar:true,weapon:'mortar',heat:0,lastShot:-100,lastHeat:-100,overheated:false}});
    g.aimAt(0,-24,6.8);g.setInput(['Mouse0']);g.step(.05,false);g.setInput([]);g.step(5,false);
    const platform=w.lifts.find(l=>l.id==='freight-platform');
    if(!g.snapshot().state['bridge-crane']||platform.y!==0)throw Error('Mortar platform did not settle '+JSON.stringify({platform:{y:platform.y},state:g.snapshot().state['bridge-crane']}));
    g.scenario({player:{x:161,y:20,z:-146,weapon:'cannon',heat:0,lastShot:-100,lastHeat:-100,overheated:false}});
    g.aimAt(155.5,-134.5,22.7);g.setInput(['Mouse0']);g.step(.55,false);g.setInput([]);g.step(3,false);
    if(g.snapshot().state['mortar-cache'])throw Error('Cannon bypassed the protected tray underside');
    g.scenario({player:{weapon:'mortar',heat:0,lastShot:-100,lastHeat:-100,overheated:false}});
    g.debug.traceCombat();
    for(let i=0;i<240&&!g.snapshot().state['mortar-cache'];i++){g.aimAt(155.5,-134.5,22.7);g.setInput(['Mouse0']);g.step(1/60,false);}
    g.setInput([]);
    if(!g.snapshot().state['mortar-cache'])throw Error('Mortar did not pass through the horizontal cabinet tray '+JSON.stringify({p:g.snapshot().player,aim:g.debug.aim.toArray(),tray:w.controls.find(c=>c.id==='mortar-cache').root.userData,prediction:g.debug.mortarLanding.userData.prediction,hits:g.debug.hitLog}));
    g.scenario({state:{'hearth-transfer':true},player:{x:24,y:-40,z:100,laser:true,weapon:'laser',heat:0,lastHeat:-100,overheated:false}});
    for(let i=0;i<90&&!w.signals.active('core-feed');i++){g.aimAt(24,110,-38);g.setInput(['Mouse0']);g.step(1/60,false);}
    g.setInput([]);g.step((w.signals.pending('core-feed')?.remaining||0)+.1);
    if(!g.snapshot().state['core-feed'])throw Error('Final load-and-reflection receiver was not reached');
    return {magnet,screen:screen.x,platform:platform.y,cabinet:true,finalFeed:g.snapshot().state['core-feed']};
  });
  await page.screenshot({path:'output/playwright/refuge-final-feed-overhead.png'});
  await page.keyboard.press('c');await page.evaluate(()=>__game.step(.3));
  await page.screenshot({path:'output/playwright/refuge-final-feed-third.png'});
  if(errors.length)throw Error(errors.join('\n'));
  return report;
}

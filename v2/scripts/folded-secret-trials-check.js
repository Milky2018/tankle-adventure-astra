async page => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');
  await page.waitForFunction(()=>window.__game?.debug);
  await page.evaluate(()=>localStorage.removeItem('furnace-born-v2-city'));
  await page.reload();await page.waitForFunction(()=>window.__game?.debug);
  const denial=await page.evaluate(async()=>{
    const g=__game,a=g.debug,{explorationPickups}=await import('/src/folded-exploration-layout.js');g.manual(true);
    const results=[];
    // Preserve defenders: the completion system must not see a vacuously won trial.
    for(const q of explorationPickups.filter(q=>q.requires)){
      g.scenario({player:{x:q.x,y:q.y,z:q.z,invincible:1e9}});g.interact();g.step(.02);
      if(a.state[q.id]||a.state[q.requires])throw Error('Premature reward '+q.id);
      results.push(q.id);
    }return results;
  });
  async function move(x,z){return page.evaluate(({x,z})=>{
    const g=__game,a=g.debug,start=a.time;
    for(let i=0;i<1800;i++){
      const p=a.p,dx=x-p.x,dz=z-p.z;if(Math.hypot(dx,dz)<.3){g.setInput([]);return a.time-start;}
      const keys=Math.abs(dx)>Math.abs(dz)?dx>0?['KeyS','KeyD']:['KeyW','KeyA']:dz>0?['KeyS','KeyA']:['KeyW','KeyD'];
      g.setInput(keys);g.step(1/60,false);
    }throw Error('Walk blocked '+JSON.stringify({target:[x,z],p:a.p}));
  },{x,z});}
  const waves=await page.evaluate(()=>{
    const g=__game,a=g.debug;g.scenario({player:{x:-177,y:8,z:-66,hp:50,mortar:true,magnet:true,weapon:'mortar',heat:0,invincible:0}});g.step(.2);
    // Test an optional fight with authored HP, attacks and damage; no invulnerability.
    const orbit=[[-177,-66],[-163,-66],[-163,-84],[-177,-84]];let corner=0,firstClear=null,reserveAt=null;
    const start=a.time;
    for(let i=0;i<5400;i++){
      const group=a.world.enemies.filter(e=>e.battle==='stores-trial'),p=a.p;
      if(p.hp<=0)throw Error('Stores fight death '+JSON.stringify({hp:p.hp,at:[p.x,p.z],group:group.map(e=>({id:e.id,hp:e.hp}))}));
      if(a.state['stores-trial']){g.setInput([]);return {seconds:a.time-start,hp:p.hp,firstClear,reserveAt};}
      if(firstClear===null&&group.filter(e=>!e.wave).every(e=>!e.hp))firstClear=a.time;
      if(reserveAt===null&&group.some(e=>e.wave&&e.awake))reserveAt=a.time;
      if(Math.hypot(p.x-orbit[corner][0],p.z-orbit[corner][1])<.6)corner=(corner+1)%4;
      const dx=orbit[corner][0]-p.x,dz=orbit[corner][1]-p.z,keys=Math.abs(dx)>Math.abs(dz)?dx>0?['KeyS','KeyD']:['KeyW','KeyA']:dz>0?['KeyS','KeyA']:['KeyW','KeyD'];
      const e=group.filter(e=>e.hp>0&&e.awake).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];
      if(e){g.aimAt(e.x,e.z,e.y+.2);keys.push('Mouse0');}g.setInput(keys);g.step(1/30,false);
    }throw Error('Stores fight timeout');
  });
  await move(-180,-66);await move(-190,-76);await move(-190,-92);await move(-187,-92);
  if(!await page.evaluate(()=>__game.debug.state['cannon-coil']))throw Error('Cannon collection failed');
  await page.evaluate(()=>{__game.step(0);});await page.screenshot({path:'v2/output/playwright/regression/secret-stores.png'});
  const mortar=await page.evaluate(()=>{
    const g=__game,a=g.debug;g.setInput([]);a.clearShots();
    g.scenario({player:{x:175,y:20,z:-142,hp:50,weapon:'mortar',mortar:true,heat:0,lastShot:-100,invincible:1e9},enemies:Object.fromEntries(a.world.enemies.map(e=>[e.id,0]))});
    for(let i=0;i<240&&!a.state['mortar-cache'];i++){g.aimAt(183,-142.5,22.6);g.setInput(['Mouse0']);g.step(1/60,false);}g.setInput([]);
    if(!a.state['mortar-cache'])throw Error('Mortar tray unreachable '+JSON.stringify({aim:a.aim,prediction:a.mortarLanding.userData.prediction}));
    return {open:a.state['mortar-cache'],collected:!!a.state['mortar-charge']};
  });
  await move(175,-146);await move(192,-146);await move(195,-142);
  if(!await page.evaluate(()=>__game.debug.state['mortar-charge']))throw Error('Mortar collection failed');
  await page.evaluate(()=>__game.step(0));await page.screenshot({path:'v2/output/playwright/regression/secret-mortar.png'});
  const laser=[];
  for(const view of ['overhead','third']){
    await page.evaluate(view=>{
      const g=__game,a=g.debug;g.setInput([]);a.clearShots();a.setCameraView(view);
      g.scenario({state:{'laser-cache':false},player:{x:363,y:-24,z:178,hp:50,laser:true,weapon:'laser',heat:0,invincible:1e9}});g.step(.2);
      if(view==='third'){
        let yaw=0,pitch=0;
        for(let i=0;i<24;i++){g.look(yaw,pitch);const q=g.project(363,186,-22);yaw-=(q.x/innerWidth*2-1)*Math.tan(Math.PI/6)*(innerWidth/innerHeight)*.8;pitch+=(q.y/innerHeight*2-1)*Math.tan(Math.PI/6)*.8;}
        g.look(yaw,pitch);
      }else g.aimAt(363,186,-22);
      g.step(0);
    },view);
    await page.screenshot({path:`v2/output/playwright/regression/secret-laser-before-${view}.png`});
    laser.push(await page.evaluate(view=>{
      const g=__game,a=g.debug;g.setInput(['Mouse0']);g.step(.2);g.setInput([]);
      const segments=g.snapshot().laserSegments;
      if(!a.state['laser-cache'])throw Error('Laser receiver unreachable '+JSON.stringify({view,segments,aim:a.aim}));
      return {view,open:true,segments,collected:!!a.state['laser-focus']};
    },view));
  }
  await page.evaluate(()=>__game.debug.setCameraView('overhead'));
  await move(361,190);await move(360,194);await move(356,194);
  if(!await page.evaluate(()=>__game.debug.state['laser-focus']))throw Error('Laser collection failed');
  await page.evaluate(()=>__game.step(0));await page.screenshot({path:'v2/output/playwright/regression/secret-laser.png'});
  await page.evaluate(()=>{__game.save();__game.respawn();});await page.reload();await page.waitForFunction(()=>window.__game?.debug);
  const restored=await page.evaluate(()=>{const a=__game.debug;return ['stores-trial','mortar-cache','laser-cache','cannon-coil','mortar-charge','laser-focus'].map(id=>[id,!!a.state[id]]);});
  if(restored.some(([,v])=>!v)||errors.length)throw Error(JSON.stringify({restored,errors}));
  const walks=[];
  const routes=[
    ['armor-foundry',[-56,-16,114],[[-67,114]]],
    ['armor-reservoir',[-164,-8,88],[[-164,100],[-169,99]]],
    ['cooling-filter',[-104,-8,114],[[-104,98],[-122,98],[-122,90],[-123,84]]],
    ['armor-proving',[77,16,-124],[[91,-124],[91,-139]]],
    ['armor-lens',[271,24,-88],[[275,-88],[275,-94],[269,-94]]],
    ['armor-hearth',[146,-40,6],[[155,6],[155,-8],[150,-8]]],
  ];
  for(const [id,start,points]of routes){
    await page.evaluate(async({id,start})=>{
      const g=__game,a=g.debug,{foldedSolids}=await import('/src/folded-layout.js');g.manual(true);a.setCameraView('overhead');
      const state=Object.fromEntries(foldedSolids.filter(s=>!s.permanent).map(s=>[s.id,true]));state[id]=false;
      g.scenario({state,player:{x:start[0],y:start[1],z:start[2],hp:50,invincible:1e9},enemies:Object.fromEntries(a.world.enemies.map(e=>[e.id,0]))});
    },{id,start});
    let seconds=0;for(const [x,z]of points)seconds+=await move(x,z);
    if(!await page.evaluate(id=>!!__game.debug.state[id],id))throw Error('Walked past '+id);
    for(const [x,z]of [...points.slice(0,-1)].reverse())seconds+=await move(x,z);
    seconds+=await move(start[0],start[2]);walks.push({id,roundTripSeconds:seconds});
  }
  return {denial,waves,mortar,laser,restored,walks,errors};
}

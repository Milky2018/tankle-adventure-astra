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
  const waves=[];
  for(const policy of ['mortar-orbit','mixed']) waves.push(await page.evaluate(policy=>{
    const g=__game,a=g.debug;g.setInput([]);g.respawn();a.setPause(false);a.clearShots();a.resetEnemies();
    g.scenario({state:{'stores-trial':false},player:{x:-177,y:8,z:-66,hp:25,mortar:true,magnet:true,weapon:'mortar',heat:0,overheated:false,invincible:0,lastShot:-100}});g.step(.2);
    const orbit=policy==='mixed'?[[-166,-66],[-148,-66],[-148,-94],[-166,-94]]:[[-177,-66],[-163,-66],[-163,-84],[-177,-84]];
    let corner=0,firstClear=null,reserveAt=null;const attacks=new Set(),start=a.time;
    for(let i=0;i<2700;i++){
      const group=a.world.enemies.filter(e=>e.battle==='stores-trial'),p=a.p;
      for(const e of group)if(['warn','charge','fire','flame'].includes(e.phase))attacks.add(e.type);
      if(p.hp<=0||a.state['stores-trial']){g.setInput([]);return {policy,won:!!a.state['stores-trial'],seconds:a.time-start,hp:p.hp,firstClear,reserveAt,attacks:[...attacks]};}
      if(firstClear===null&&group.filter(e=>!e.wave).every(e=>!e.hp))firstClear=a.time-start;
      if(reserveAt===null&&group.some(e=>e.wave&&e.awake))reserveAt=a.time-start;
      if(Math.hypot(p.x-orbit[corner][0],p.z-orbit[corner][1])<.6)corner=(corner+1)%orbit.length;
      const dx=orbit[corner][0]-p.x,dz=orbit[corner][1]-p.z,keys=Math.abs(dx)>Math.abs(dz)?dx>0?['KeyS','KeyD']:['KeyW','KeyA']:dz>0?['KeyS','KeyA']:['KeyW','KeyD'];
      const e=group.filter(e=>e.hp>0&&e.awake).sort((a,b)=>(policy==='mixed'?(a.type==='sniper'?-100:0)-(b.type==='sniper'?-100:0):0)+Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];
      if(e){p.weapon=policy==='mixed'&&(e.type==='sniper'||p.x>-158&&p.x<-140&&p.z>-92&&p.z<-78)?'cannon':'mortar';g.aimAt(e.x,e.z,e.y+(p.weapon==='cannon'?1.5:.2));keys.push('Mouse0');if(policy==='mixed'&&e.type==='guard')keys.push('Mouse2');}
      g.setInput(keys);g.step(1/30,false);
    }
    g.setInput([]);return {policy,won:false,seconds:a.time-start,hp:a.p.hp,firstClear,reserveAt,attacks:[...attacks],remaining:a.world.enemies.filter(e=>e.battle==='stores-trial'&&e.hp).map(e=>({id:e.id,hp:e.hp,x:e.x,z:e.z}))};
  },policy));
  if(waves[0].won)throw Error('Mortar orbit still bypasses sheltered sniper '+JSON.stringify(waves));
  if(!waves[1].won)throw Error('Mixed warehouse response failed '+JSON.stringify(waves));
  await move(-180,-66);await move(-190,-76);await move(-190,-92);await move(-187,-92);
  if(!await page.evaluate(()=>__game.debug.state['cannon-coil']))throw Error('Cannon collection failed');
  await page.evaluate(()=>{__game.step(0);});await page.screenshot({path:'v2/output/playwright/regression/secret-stores.png'});
  const mortar=await page.evaluate(()=>{
    const g=__game,a=g.debug;g.setInput([]);a.clearShots();
    g.scenario({player:{x:161,y:20,z:-146,hp:25,weapon:'mortar',mortar:true,heat:0,lastShot:-100,invincible:1e9},enemies:Object.fromEntries(a.world.enemies.map(e=>[e.id,0]))});
    for(let i=0;i<240&&!a.state['mortar-cache'];i++){g.aimAt(155.5,-134.5,22.7);g.setInput(['Mouse0']);g.step(1/60,false);}g.setInput([]);
    if(!a.state['mortar-cache'])throw Error('Mortar tray unreachable '+JSON.stringify({aim:a.aim,prediction:a.mortarLanding.userData.prediction}));
    return {open:a.state['mortar-cache'],collected:!!a.state['mortar-charge']};
  });
  await move(161,-134);await move(165,-134);
  if(!await page.evaluate(()=>__game.debug.state['mortar-charge']))throw Error('Mortar collection failed');
  await page.evaluate(()=>__game.step(0));await page.screenshot({path:'v2/output/playwright/regression/secret-mortar.png'});
  const laser=[];
  for(const view of ['overhead','third']){
    await page.evaluate(view=>{
      const g=__game,a=g.debug;g.setInput([]);a.clearShots();a.setCameraView(view);
      g.scenario({state:{'laser-cache':false},player:{x:364,y:-24,z:178,hp:25,laser:true,weapon:'laser',heat:0,invincible:1e9}});g.step(.2);
      if(view==='third'){
        let yaw=0,pitch=0;
        for(let i=0;i<24;i++){g.look(yaw,pitch);const q=g.project(364,193,-22);yaw-=(q.x/innerWidth*2-1)*Math.tan(Math.PI/6)*(innerWidth/innerHeight)*.8;pitch+=(q.y/innerHeight*2-1)*Math.tan(Math.PI/6)*.8;}
        g.look(yaw,pitch);
      }else g.aimAt(364,193,-22);
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
  await move(364,186);await move(350,186);await move(350,193);await move(348,193);
  if(!await page.evaluate(()=>__game.debug.state['laser-focus']))throw Error('Laser collection failed');
  await page.evaluate(()=>__game.step(0));await page.screenshot({path:'v2/output/playwright/regression/secret-laser.png'});
  await page.evaluate(()=>{__game.save();__game.respawn();});await page.reload();await page.waitForFunction(()=>window.__game?.debug);
  const restored=await page.evaluate(()=>{const a=__game.debug;return ['stores-trial','mortar-cache','laser-cache','cannon-coil','mortar-charge','laser-focus'].map(id=>[id,!!a.state[id]]);});
  if(restored.some(([,v])=>!v)||errors.length)throw Error(JSON.stringify({restored,errors}));
  const walks=[];
  const routes=await page.evaluate(async()=>Object.entries(await (await fetch('/test-fixtures/exploration-routes.json')).json()).filter(([id])=>id.startsWith('armor-')||id==='cooling-filter').map(([id,r])=>[id,r.start,r.points,r.deployed]));
  for(const [id,start,points,deployed]of routes){
    await page.evaluate(async({id,start,deployed})=>{
      const g=__game,a=g.debug,{foldedSolids}=await import('/src/folded-layout.js');g.manual(true);a.setCameraView('overhead');
      const state=Object.fromEntries(foldedSolids.filter(s=>!s.permanent).map(s=>[s.id,true]));state[id]=false;
      g.scenario({state,player:{x:start[0],y:start[1],z:start[2],hp:25,invincible:1e9,deployed:!!deployed},enemies:Object.fromEntries(a.world.enemies.map(e=>[e.id,0]))});
    },{id,start,deployed});
    let seconds=0;for(const [x,z]of points)seconds+=await move(x,z);
    if(!await page.evaluate(id=>!!__game.debug.state[id],id))throw Error('Walked past '+id);
    for(const [x,z]of [...points.slice(0,-1)].reverse())seconds+=await move(x,z);
    seconds+=await move(start[0],start[2]);walks.push({id,roundTripSeconds:seconds});
  }
  return {denial,waves,mortar,laser,restored,walks,errors};
}

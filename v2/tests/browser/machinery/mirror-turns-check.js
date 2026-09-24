async page=>{
  const errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5174/?chapter=folded&test&manual');
  await page.waitForFunction(()=>window.__game?.debug);
  await page.evaluate(()=>{__game.manual(true);__game.scenario({enemies:Object.fromEntries(__game.snapshot().enemies.map(e=>[e.id,0]))});});
  for(const view of ['overhead','third']){
    const result=await page.evaluate(view=>{
      const g=__game,q=g.debug,T=q.T,w=q.world,check=(ok,msg)=>{if(!ok)throw Error(view+': '+msg);};
      g.setInput([]);q.clearShots();q.setCameraView(view);
      g.scenario({player:{x:242,y:24,z:-4,hp:25,invincible:1e9,weapon:'cannon',mortar:true,laser:true,heat:0,overheated:false,lastShot:-100},state:{mirrorTurns:{'return-index':0},gallery:true,'garden-optical':false,'optical-screen':true}});g.step(2);
      const m=w.mirrors.find(m=>m.id==='return-index'),initial=m.normal.clone();
      check(!w.controls.some(c=>c.id==='mirror-index'),'Retired switch remains');
      check(!q.scene.getObjectByName('folded-mirror-link'),'Retired linkage remains');
      function aim(x,y,z){
        if(view==='overhead'){g.aimAt(x,z,y);return;}
        let yaw=Math.atan2(x-q.p.x,z-q.p.z),pitch=0;
        for(let i=0;i<30;i++){g.look(yaw,pitch);const p=g.project(x,z,y);yaw-=(p.x/innerWidth*2-1)*Math.tan(Math.PI/6)*(innerWidth/innerHeight)*.8;pitch+=(p.y/innerHeight*2-1)*Math.tan(Math.PI/6)*.8;}
        g.look(yaw,pitch);
      }
      for(let n=1;n<=5;n++){
        g.scenario({player:{weapon:'cannon',heat:0,lastShot:-100,overheated:false}});aim(m.x,m.y,m.z);
        g.setInput(['Mouse0']);g.step(1/60,false);g.setInput([]);g.step(.8);
        check(q.state.mirrorTurns[m.id]===n,'Cannon hit '+n+' did not turn exactly once: '+JSON.stringify({turns:q.state.mirrorTurns[m.id],aim:q.aim.toArray(),p:g.snapshot().player,hit:(()=>{const o=q.weaponOrigin(),h=q.castWeapon(o,q.aim.clone().sub(o).normalize(),30);return {point:h?.point.toArray(),mirror:h?.mirror?.id,target:h?.target?.id,object:h?.object?.name,wall:w.walls.find(b=>b.mesh===h?.object)?.id,blocked:h?.blockedTarget?.id};})(),shots:q.shots.length}));
        const expected=initial.clone().applyAxisAngle(new T.Vector3(0,1,0),-n*Math.PI/2);
        check(m.normal.distanceTo(expected)<1e-6,'Turn '+n+' did not settle at 90 degrees');
      }
      // Solve the actual return after turning by projectile, then wait for its cable.
      g.scenario({player:{x:225.2376,y:24,z:-20,weapon:'laser',heat:0,overheated:false}});
      aim(216,26,-4);g.setInput(['Mouse0']);g.step(1/60);g.setInput([]);
      check(g.debug.progression.signals.active('garden-optical'),'Turned mirror did not route the laser to the receiver');
      check(q.state.mirrorTurns[m.id]===5,'Solving the reflection rotated the mirror');
      g.step(g.debug.progression.signals.duration('garden-optical')+.1,false);check(q.state['garden-optical'],'Return did not unlock after cable arrival');
      g.scenario({player:{x:242,y:24,z:-4},state:{'garden-optical':false,pendingSignals:{}}});
      // Aiming at the mirror resolves a ground landing; its unobstructed blast turns the plate.
      for(let n=6;n<=9;n++){
        g.scenario({player:{weapon:'mortar',heat:0,lastShot:-100,overheated:false}});
        aim(m.x,m.y,m.z);g.setInput(['Mouse0']);g.step(1/60,false);g.setInput([]);g.step(2);
        check(q.state.mirrorTurns[m.id]===n,'Mortar hit '+n+' did not rotate exactly once');
        const expected=initial.clone().applyAxisAngle(new T.Vector3(0,1,0),-n*Math.PI/2);
        check(m.normal.distanceTo(expected)<1e-6,'Mortar turn did not settle at 90 degrees');
      }
      g.scenario({player:{weapon:'laser',heat:0,lastHeat:-100,overheated:false}});aim(m.x,m.y,m.z);
      g.setInput(['Mouse0']);g.step(.2);g.setInput([]);
      check(q.state.mirrorTurns[m.id]===9,'Laser rotated the mirror');
      check(m.flash>0,'Laser did not reach mirror');
      // Hostile shells and fixed mirrors cannot change the puzzle orientation.
      q.impact({mirror:m,point:new T.Vector3(m.x,m.y,m.z)},{hostile:true,origin:new T.Vector3(242,26,-4)});
      check(q.state.mirrorTurns[m.id]===9,'Hostile fire rotated the mirror');
      const fixed=w.mirrors.find(m=>m.id==='calibration');
      q.impact({mirror:fixed,point:new T.Vector3(fixed.x,fixed.y,fixed.z)},{origin:new T.Vector3(225,26,-20)});
      check(q.state.mirrorTurns[fixed.id]===undefined,'Fixed mirror rotated');
      return {view,turns:q.state.mirrorTurns[m.id],normal:m.normal.toArray()};
    },view);
    results.push(result);
    await page.screenshot({path:`output/playwright/regression/mirror-turns-${view}.png`});
  }
  await page.reload();await page.waitForFunction(()=>window.__game?.debug);
  const restored=await page.evaluate(()=>{const q=__game.debug,m=q.world.mirrors.find(m=>m.id==='return-index');return {turns:q.state.mirrorTurns[m.id],normal:m.normal.toArray()};});
  if(restored.turns!==9||restored.normal.some((n,i)=>Math.abs(n-results.at(-1).normal[i])>1e-6))throw Error('Mirror orientation was lost on reload');
  if(errors.length)throw Error(errors.join('\n'));
  return {results,restored,errors};
}

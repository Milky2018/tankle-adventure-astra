async page=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');
  await page.waitForFunction(()=>window.__game?.debug);
  await page.evaluate(()=>{
    const {T,p,model,aim,shots,updateAim}=__game.debug;

window.__heightAimProbe={
  sample(){
    const before=aim.clone();updateAim();const drift=before.distanceTo(aim);
    const r=document.getElementById('reticle').getBoundingClientRect();
    return {drift,pitch:-model.barrel.rotation.x,aim:before,player:{x:p.x,y:p.y,z:p.z},reticle:{x:r.x+r.width/2,y:r.y+r.height/2},count:document.querySelectorAll('#reticle').length};
  },
  shot:()=>shots.filter(s=>!s.hostile).map(s=>({dir:s.dir.clone(),mortar:s.mortar,origin:s.origin.clone(),target:s.target.clone()})),
  barrel:()=>new T.Vector3(0,0,1).transformDirection(model.barrel.matrixWorld)
};
  });
  await page.evaluate(()=>window.__game.manual(true));
  async function setup(player){
    await page.evaluate(player=>{window.__game.setInput([]);window.__game.scenario({player:{hp:50,heat:0,overheated:false,lastHeat:-100,lastShot:-100,weapon:'cannon',...player}});window.__game.step(.2);},player);
  }
  async function sample(mouse){
    const s=await page.evaluate(()=>window.__heightAimProbe.sample());
    return {...s,error:Math.hypot(s.reticle.x-mouse.x,s.reticle.y-mouse.y)};
  }
  await setup({x:0,y:0,z:18});
  const point=await page.evaluate(()=>window.__game.project(18,12,24));
  const samples=[];
  // Sweep across the raised landing and its silhouette, including unreachable angles.
  for(let dx=-200;dx<=200;dx+=10){
    const mouse={x:point.x+dx,y:point.y};await page.mouse.move(mouse.x,mouse.y);
    await page.evaluate(()=>window.__game.step(1/60));samples.push(await sample(mouse));
  }
  if(!samples.some(s=>Math.abs(s.pitch)>39.9*Math.PI/180))throw Error('Fixture never reached the elevation limit');
  if(!samples.some(s=>Math.abs(s.pitch)<39*Math.PI/180))throw Error('Fixture never left the raised landing');
  if(samples.some(s=>s.error>1))throw Error('Raised-platform cursor drift: '+JSON.stringify(samples.map(s=>({error:s.error,pitch:s.pitch}))));
  if(samples.some(s=>Math.abs(s.pitch)>40.001*Math.PI/180||s.count!==1))throw Error('Barrel limit or single reticle failed');
  // Keep the mouse still while driving; a fresh pick must agree with the frame just rendered.
  await page.mouse.move(point.x,point.y);await page.keyboard.down('d');
  const moving=[];
  for(let i=0;i<12;i++){await page.evaluate(()=>window.__game.step(1/60));moving.push(await sample(point));}
  await page.keyboard.up('d');
  if(moving.some(s=>s.error>1||s.drift>1e-5||Math.abs(s.pitch)>40.001*Math.PI/180))throw Error('Movement used a stale camera or player pose: '+JSON.stringify(moving));
  if(Math.hypot(moving.at(-1).player.x-moving[0].player.x,moving.at(-1).player.z-moving[0].player.z)<.5)throw Error('Movement fixture was blocked');
  // A held shot must follow the visible, constrained barrel, not the high cursor target.
  await setup({x:0,y:0,z:18});await page.mouse.move(point.x,point.y);await page.evaluate(()=>window.__game.step(1/60));
  await page.mouse.down();
  const shots=await page.evaluate(()=>window.__heightAimProbe.shot());await page.mouse.up();
  const shot=shots.at(-1),barrel=await page.evaluate(()=>window.__heightAimProbe.barrel());
  if(!shot||shot.mortar||Math.abs(Math.asin(shot.dir.y)-40*Math.PI/180)>1e-4)throw Error('Shot ignored elevation limit: '+JSON.stringify(shot));
  if(Math.hypot(shot.dir.x-barrel.x,shot.dir.y-barrel.y,shot.dir.z-barrel.z)>1e-5)throw Error('Shot and barrel disagree');
  await setup({x:0,y:0,z:18,weapon:'laser',laser:true});await page.mouse.move(point.x,point.y);
  await page.mouse.down();await page.evaluate(()=>window.__game.step(1/60));
  const laser=await page.evaluate(()=>window.__game.snapshot().laserSegments);await page.mouse.up();
  const laserPitch=Math.atan2(laser[4]-laser[1],Math.hypot(laser[3]-laser[0],laser[5]-laser[2]));
  if(laser.length<6||Math.abs(laserPitch-40*Math.PI/180)>1e-4)throw Error('Laser ignored elevation limit');
  // Mortar keeps its physical range without pulling the cursor back toward the tank.
  await setup({x:0,y:0,z:27,weapon:'mortar',mortar:true});
  const far=await page.evaluate(()=>window.__game.project(-23,44,0));await page.mouse.move(far.x,far.y);await page.evaluate(()=>window.__game.step(1/60));
  const mortar=await sample(far);
  if(mortar.error>1||Math.abs(Math.hypot(mortar.aim.x,mortar.aim.z-27)-24)>.001)throw Error('Mortar cursor or range failed: '+JSON.stringify(mortar));
  await page.screenshot({path:'output/playwright/height-aim.png'});
  if(errors.length)throw Error(JSON.stringify(errors));
  return {edgeSamples:samples.length,maxCursorError:Math.max(...samples.map(s=>s.error)),movingSamples:moving.length,maxMovingAimDrift:Math.max(...moving.map(s=>s.drift)),shotPitch:Math.asin(shot.dir.y)*180/Math.PI,laserPitch:laserPitch*180/Math.PI,mortarCursorError:mortar.error,errors};
}

async page => {
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');await page.waitForFunction(()=>window.__game?.debug);
 await page.evaluate(()=>{localStorage.removeItem('furnace-born-v2-city');});await page.reload();await page.waitForFunction(()=>window.__game?.debug);
 const prototype=await page.evaluate(()=>{
  const g=__game,q=g.debug,e=q.world.enemies.find(e=>e.id==='prototype');
  g.scenario({state:{relays:true},player:{x:-40,y:-16,z:122,hp:25,invincible:100},enemies:Object.fromEntries(q.world.enemies.map(e=>[e.id,e.id==='prototype'?9:0]))});
  q.traceCombat();e.phase='idle';e.timer=0;
  for(let i=0;i<90&&e.phase!=='warn';i++)g.step(1/60,false);g.step(1/60);if(e.phase!=='warn'||e.attack!=='cannon'||e.charge.root.visible||!e.warning.visible)throw Error('Cannon warning is absent or displays a charge '+JSON.stringify({phase:e.phase,attack:e.attack,charge:e.charge.root.visible,warning:e.warning.visible,arena:q.state.combatArena}));
  if(q.enemyShots.length)throw Error('Shot before warning');
  const phases=new Set();let shellsVisible=false;
  for(let i=0;i<240;i++){g.step(.05,false);phases.add(e.phase);if(q.shots.some(s=>s.owner==='prototype'&&s.mesh.visible&&s.distance>2))shellsVisible=true;}
  if(q.enemyShots.filter(s=>s.id==='prototype').length<3||!phases.has('charge')||!shellsVisible)throw Error('Prototype does not alternate visible cannon shots and charges');
  return {shots:q.enemyShots.filter(s=>s.id==='prototype').length,phases:[...phases],shellsVisible};
 });
 const results=[];
 for(const view of ['overhead','third']){
  await page.evaluate(view=>{
   const g=__game,q=g.debug;q.clearShots();q.setCameraView(view);
   g.scenario({state:{prototype:true,combatArena:null},player:{x:-35,y:-16,z:128,hp:25,invincible:0,hurtUntil:0,hurtAt:-10,heat:0,overheated:false,speed:1,weapon:'cannon',magnet:true,mortar:true,laser:true,overdrive:true,phoenix:true,flotation:true,deployed:false},enemies:Object.fromEntries(q.world.enemies.map(e=>[e.id,0]))});
   g.aimAt(-28,132,-14.5);q.hurt(5,{x:-40,z:128});
  },view);
  const reaction=await page.evaluate(()=>{
   const g=__game,q=g.debug,start={...q.p},aim=g.snapshot().aim;
   for(const key of ['KeyQ','KeyF','KeyE','KeyC','Tab','Mouse0','Mouse2'])q.input(key);
   g.setInput(['KeyW','ShiftLeft','Mouse0','Mouse2']);g.step(.04);
   let material; q.model.body.traverse(o=>{if(!material&&o.material)material=o.material;});
   const dim=material.opacity,x=q.p.x;
   q.hurt(10,{x:-30,z:128});g.step(.07);const bright=material.opacity;
   g.step(.11);const stopped={x:q.p.x,z:q.p.z};g.step(.32);
   const s=g.snapshot();
   if(s.player.hp!==20||s.player.weapon!=='cannon'||s.player.deployed||s.mapOpen)throw Error('Actions or second damage accepted during stun');
   if(q.shots.some(s=>!s.hostile)||q.magneticActive()||q.laserBeam.visible)throw Error('Weapon active during stun');
   if(dim>=bright||x<=start.x||Math.abs(q.p.z-start.z)>.01||Math.hypot(q.p.x-stopped.x,q.p.z-stopped.z)>.01)throw Error('Missing flash, directional recoil, or movement lock');
   if(JSON.stringify(s.aim)!==JSON.stringify(aim))throw Error('Aim changed during stun');
   return {hp:s.player.hp,recoil:q.p.x-start.x,dim,bright,view:s.camera.view};
  });
  await page.screenshot({path:`v2/output/playwright/hit-response-${view}.png`});
  const recovered=await page.evaluate(()=>{
   const g=__game,q=g.debug,before={x:q.p.x,z:q.p.z};g.step(.12);
   if(Math.hypot(q.p.x-before.x,q.p.z-before.z)<.1||!q.shots.some(s=>!s.hostile))throw Error('Held movement/fire failed to resume');
   g.setInput([]);q.input('KeyQ');if(q.p.weapon!=='mortar')throw Error('Weapon selection remained locked');
   q.hurt(5,{x:q.p.x+5,z:q.p.z});if(q.p.hp!==15||q.p.knockX>=0)throw Error('Damage did not recover or direction is wrong');
   return {hp:q.p.hp,weapon:q.p.weapon};
  });
  results.push({view,...reaction,recovered});
 }
 // Continuous laser must also stop, not only the discrete Cannon trigger.
 const laser=await page.evaluate(()=>{
  const g=__game,q=g.debug;g.setInput([]);g.step(.7,false);q.p.weapon='laser';g.setInput(['Mouse0']);g.step(.04,false);
  if(!q.laserBeam.visible)throw Error('Laser control is not firing');q.p.invincible=0;q.hurt(5,{x:q.p.x-5,z:q.p.z});g.step(.05,false);
  if(q.laserBeam.visible)throw Error('Laser continues through stun');
  q.respawn();if(q.p.hurtUntil!==0||q.p.hp!==25)throw Error('Reconstruction retained hit state');return true;
 });
 if(errors.length)throw Error(errors.join('\n'));return {prototype,results,laser,errors};
}

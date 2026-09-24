async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5174/?chapter=folded&test&manual&view=overhead');await page.waitForFunction(()=>window.__game?.debug);
 const result=await page.evaluate(async()=>{
  const g=__game,q=g.debug;const {activeSolid}=await import('/src/folded-layout.js');
  const enemies=Object.fromEntries(q.world.enemies.map(e=>[e.id,0]));
  const cases=[['rail-repair',-18,0,19],['magnet',-30,-8,-8],['arsenal-return',-106,8,-54],['collimator-drawer',363,32,-80]];
  const results=[];
  for(const view of ['overhead','third'])for(const [id,x,y,z]of cases){
   const c=q.world.controls.find(c=>c.id===id);q.setCameraView(view);g.setInput([]);
   g.scenario({enemies,state:{[id]:false},player:{x,y,z,hp:25,invincible:1e9,magnet:true,heat:0,lastHeat:-100,overheated:false}});g.step(.5);
   const aim=()=>{if(view==='overhead')g.aimAt(c.x,c.z,c.y);else{let yaw=Math.atan2(c.x-q.p.x,c.z-q.p.z),pitch=0;for(let j=0;j<24;j++){g.look(yaw,pitch);const p=g.project(c.x,c.z,c.y);yaw-=(p.x/innerWidth*2-1)*Math.tan(Math.PI/6)*(innerWidth/innerHeight)*.8;pitch+=(p.y/innerHeight*2-1)*Math.tan(Math.PI/6)*.8;}g.look(yaw,pitch);}};
   aim();g.setInput(['Mouse2']);g.step(.25);g.setInput([]);
   if(q.state[id]||!(c.pull>0)||c.moving.position.length()<.02)throw Error('No visible loosening '+view+'/'+id+' '+JSON.stringify({pull:c.pull,target:g.snapshot().magnetic,aim:q.aim.toArray(),c:{x:c.x,y:c.y,z:c.z,cutaway:c.root.userData.cutaway},p:{x:q.p.x,y:q.p.y,z:q.p.z},line:(()=>{const o=q.weaponOrigin(),d=new q.T.Vector3(c.x,c.y,c.z).sub(o),h=q.world.cast(o,d.clone().normalize(),d.length());return {target:h?.target?.id,point:h?.point.toArray(),object:h?.object?.userData};})()}));
   g.step(.5);if(c.pull>.01)throw Error('Released grip did not settle '+id);
   aim();g.setInput(['Mouse2']);g.step(.85);g.setInput([]);
   if(!q.progression.signals.active(id))throw Error('Lock did not release '+view+'/'+id+' '+JSON.stringify({pull:c.pull,target:g.snapshot().magnetic}));
   g.step((q.progression.signals.pending(id)?.remaining||0)+1);if(!q.state[id])throw Error("Signal never reached lock "+id);const fallen=c.moving.getWorldPosition(new q.T.Vector3());if(Math.abs(fallen.y-c.ground-.65)>.02)throw Error('Detached piece did not settle on its floor '+id+' '+fallen.y);
   if(q.world.controls.find(t=>t.id===id).slide)throw Error('Lock still uses a rail');
   for(const b of q.state.bodies.solids.filter(b=>b.id===id))if(activeSolid(b,q.state))throw Error('Released passage remains solid '+id);
   results.push({view,id,pullOff:true});
  }
  // The one retained ordinary rail cover still moves and can be pulled back.
  const c=q.world.controls.find(c=>c.id==='bench-cover'),body=q.state.bodies.solids.find(b=>b.id===c.id),initial=body.z;
  q.setCameraView('overhead');g.scenario({player:{x:74,y:0,z:-12,magnet:true,heat:0,overheated:false}});
  for(let i=0;i<60;i++){g.aimAt(c.x,c.z,c.y);g.setInput(['Mouse2']);g.step(1/60,false);}g.setInput([]);
  const forward=body.z;if(forward<=initial)throw Error('Retained cover does not move');
  g.scenario({player:{x:73,y:0,z:-28,heat:0,overheated:false}});
  for(let i=0;i<60;i++){g.aimAt(c.x,c.z,c.y);g.setInput(['Mouse2']);g.step(1/60,false);}g.setInput([]);
  if(body.z>=forward)throw Error('Retained cover cannot return '+JSON.stringify({initial,forward,z:body.z,p:q.p,aim:q.aim.toArray()}));
  g.save();return {results,cover:{initial,forward,back:body.z}};
 });
 await page.reload();await page.waitForFunction(()=>window.__game?.debug);
 const saved=await page.evaluate(()=>{const g=__game;g.manual(true);g.step(1);return g.debug.world.controls.filter(c=>c.kind==='magnet'&&!c.slide).map(c=>({id:c.id,open:g.snapshot().state[c.id],detached:c.detached,age:c.detachAge}));});
 if(saved.some(c=>!c.open||!c.detached||c.age<.75))throw Error('Reload reconstructed a torn lock '+JSON.stringify(saved));
 for(const view of ['overhead','third']){
  await page.evaluate(view=>{const g=__game;g.scenario({player:{x:-107,y:8,z:-56,magnet:true},state:{'arsenal-return':false}});g.debug.setCameraView(view);g.look(Math.PI/2,.15);g.step(.4);},view);
  await page.screenshot({path:`output/playwright/regression/magnetic-lock-${view}-intact.png`});
  await page.evaluate(()=>{__game.debug.state['arsenal-return']=true;__game.step(1);});
  await page.screenshot({path:`output/playwright/regression/magnetic-lock-${view}-removed.png`});
 }
 if(errors.length)throw Error(errors.join('\n'));return {...result,saved,errors};
}

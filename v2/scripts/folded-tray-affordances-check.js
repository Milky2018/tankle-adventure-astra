async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');await page.waitForFunction(()=>window.__game?.debug);
 const result=await page.evaluate(()=>{
  const g=__game,q=g.debug,T=q.T,enemies=Object.fromEntries(q.world.enemies.map(e=>[e.id,0]));
  const cases=[['bridge-crane',0,0,-6],['freight',18,0,-34],['load',90,0,-23],['hearth-transfer',48,-40,90],['mortar-cache',161,20,-146]];
  const aim=(c,view)=>{if(view==='overhead')g.aimAt(c.x,c.z,c.y);else{let yaw=Math.atan2(c.x-q.p.x,c.z-q.p.z),pitch=0;for(let i=0;i<24;i++){g.look(yaw,pitch);const p=g.project(c.x,c.z,c.y);yaw-=(p.x/innerWidth*2-1)*Math.tan(Math.PI/6)*(innerWidth/innerHeight)*.8;pitch+=(p.y/innerHeight*2-1)*Math.tan(Math.PI/6)*.8;}g.look(yaw,pitch);}};
  const results=[];
  for(const view of ['overhead','third'])for(const [id,x,y,z]of cases){
   const c=q.world.controls.find(c=>c.id===id);g.setInput([]);q.clearShots();q.setCameraView(view);
   g.scenario({enemies,state:{[id]:false},player:{x,y,z,hp:25,mortar:true,weapon:'cannon',heat:0,lastShot:-100,lastHeat:-100,overheated:false,invincible:1e9}});g.step(.5);
   if(c.surface!=='top')throw Error('Vertical mortar target '+id);
   const down=q.world.cast(new T.Vector3(c.x,c.y+1,c.z),new T.Vector3(0,-1,0),1.2);
   const up=q.world.cast(new T.Vector3(c.x,c.y-.8,c.z),new T.Vector3(0,1,0),1.2);
   if(down?.target!==c||up?.target===c)throw Error('Wrong contact face '+id);
   q.impact({point:new T.Vector3(c.x,c.y-.05,c.z)},{mortar:true,hostile:false,origin:q.weaponOrigin()});
   if(q.progression.signals.active(id))throw Error('Below-tray blast operated '+id);
   aim(c,view);g.setInput(['Mouse0']);g.step(.6,false);g.setInput([]);g.step(2,false);
   if(q.progression.signals.active(id))throw Error('Approach Cannon bypassed tray '+view+'/'+id);
   g.scenario({player:{weapon:'mortar',heat:0,lastShot:-100,lastHeat:-100,overheated:false}});aim(c,view);
   g.setInput(['Mouse0']);g.step(.02,false);g.setInput([]);g.step(3,false);
   if(!q.progression.signals.active(id))throw Error('Mortar missed tray '+view+'/'+id+' '+JSON.stringify({aim:q.aim.toArray(),prediction:q.mortarLanding.userData.prediction}));
   g.step((q.progression.signals.pending(id)?.remaining||0)+.5);if(!q.state[id])throw Error("Tray signal never arrived "+id);if(c.moving.position.y>-.35)throw Error('Tray did not depress '+id);
   results.push({view,id,cannonBlocked:true,mortarOpened:true});
  }
  return results;
 });
 for(const view of ['overhead','third']){
  await page.evaluate(view=>{const g=__game;g.setInput([]);g.scenario({enemies:Object.fromEntries(g.debug.world.enemies.map(e=>[e.id,0])),state:{'mortar-cache':false},player:{x:161,y:20,z:-146,weapon:'mortar',heat:0,overheated:false}});g.debug.setCameraView(view);g.look(-.45,.15);g.step(.3);if(view==='overhead')g.aimAt(155.5,-134.5,22.7);},view);
  await page.screenshot({path:`output/playwright/regression/mortar-tray-${view}.png`});
 }
 if(errors.length)throw Error(errors.join('\n'));return {result,errors};
}

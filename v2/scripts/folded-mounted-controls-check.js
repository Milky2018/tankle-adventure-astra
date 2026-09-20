async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5174/?chapter=folded&test&manual');await page.waitForFunction(()=>window.__game?.debug);
 const approaches=await page.evaluate(async()=>{
  const g=__game,q=g.debug,w=q.world,T=q.T;
  const {foldedDecks,foldedBlocked,deckHeight}=await import('/src/folded-layout.js');
  g.scenario({enemies:Object.fromEntries(w.enemies.map(e=>[e.id,0])),player:{invincible:1e9}});
  const result=[];
  for(const c of w.controls.filter(c=>c.mount&&!c.slide)){
   q.state[c.id]=false;delete q.state.pendingSignals[c.id];if(c.requires)q.state[c.requires]=true;g.step(2,false);
   const target=new T.Vector3(c.x,c.y,c.z).addScaledVector(c.facing,.5);
   const ray=origin=>{const delta=target.clone().sub(origin);return w.cast(origin,delta.clone().normalize(),delta.length()+.1);};
   if(ray(target.clone().addScaledVector(c.facing,2.2))?.target?.id!==c.id)throw Error('Mounted face is blocked '+c.id);
   if(ray(target.clone().addScaledVector(c.facing,-2.2))?.target?.id===c.id)throw Error('Latch is reachable from behind '+c.id);
   let position;
   for(const distance of [6,8,10,4,12,16,20]){
    for(const side of [0,-2,2,-4,4]){
     const x=c.x+c.facing.x*distance+c.facing.z*side,z=c.z+c.facing.z*distance-c.facing.x*side;
     for(const d of foldedDecks.filter(d=>!d.water&&x>d.x+1&&x<d.x+d.w-1&&z>d.z+1&&z<d.z+d.d-1)){
      const y=deckHeight(d,z);if(y>c.y||c.y-y>7||foldedBlocked(x,y,z,q.state))continue;
      if(ray(new T.Vector3(x,y+1.6,z))?.target?.id===c.id){position={x,y,z};break;}
     }
     if(position)break;
    }
    if(position)break;
   }
   if(!position)throw Error('No supported working side '+c.id);
   result.push({id:c.id,...position});
  }
  return result;
 });
 const results=[];
 for(const view of ['overhead','third'])for(const fixture of approaches){
  await page.evaluate(({view,fixture})=>{
   const g=__game,q=g.debug,c=q.world.controls.find(c=>c.id===fixture.id);
   g.setInput([]);delete q.state.pendingSignals[c.id];q.setCameraView(view);
   const b=q.state.bodies.solids.find(b=>b.id===c.mount);if(b.rail){b[b.rail.axis]=b.rail.min;q.state.slidePositions[b.id]=b.rail.min;}
   g.scenario({state:{[c.id]:false,...(c.requires?{[c.requires]:true}:{})},player:{...fixture,hp:25,invincible:1e9,magnet:true,weapon:'cannon',heat:0,lastHeat:-100,lastShot:-100,overheated:false}});g.step(2);
   let yaw=Math.atan2(c.x-q.p.x,c.z-q.p.z),pitch=0;
   if(view==='third')for(let j=0;j<30;j++){g.look(yaw,pitch);const p=g.project(c.x+c.facing.x*.5,c.z+c.facing.z*.5,c.y+c.facing.y*.5);yaw-=(p.x/innerWidth*2-1)*Math.tan(Math.PI/6)*(innerWidth/innerHeight)*.8;pitch+=(p.y/innerHeight*2-1)*Math.tan(Math.PI/6)*.8;}
   g.look(yaw,pitch);g.aimAt(c.x+c.facing.x*.5,c.z+c.facing.z*.5,c.y+c.facing.y*.5);g.step(.05);
  },{view,fixture});
  await page.screenshot({path:`v2/output/playwright/regression/mounted-${fixture.id}-${view}.png`});
  const result=await page.evaluate(({view,id})=>{
   const g=__game,q=g.debug,w=q.world,c=w.controls.find(c=>c.id===id),before=c.root.position.clone();
   for(let i=0;i<150&&!w.signals.active(id);i++){
    if(view==='overhead')g.aimAt(c.x+c.facing.x*.5,c.z+c.facing.z*.5,c.y+c.facing.y*.5);
    g.setInput([c.kind==='magnet'?'Mouse2':'Mouse0']);g.step(1/60,false);
   }
   g.setInput([]);
   if(!w.signals.active(id))throw Error('Actual input cannot operate mounted control '+view+'/'+id+' '+JSON.stringify({p:{x:q.p.x,y:q.p.y,z:q.p.z},aim:q.aim.toArray(),magnetic:g.snapshot().magnetic,heat:q.p.heat,cutaway:c.root.userData.cutaway,ray:(()=>{const target=new q.T.Vector3(c.x+c.facing.x*.5,c.y+c.facing.y*.5,c.z+c.facing.z*.5),ray=new q.T.Raycaster();ray.setFromCamera(target.clone().project(q.camera),q.camera);const h=w.cast(ray.ray.origin,ray.ray.direction,1000,{aiming:true});return {target:h?.target?.id,point:h?.point.toArray(),object:h?.object?.userData,objectAt:h?.object?.position.toArray()};})()}));
   g.step(2,false);
   const attached=c.root.position.clone().sub(c.mountWall.mesh.position).distanceTo(c.mountOffset)<.001;
   if(!attached||c.root.position.distanceTo(before)<.5)throw Error('Control did not travel with its actuator '+id);
   return {id,view,attached,immediateLocalRelease:true};
  },{view,id:fixture.id});
  results.push(result);
  if(['arsenal-return','scope-drawer','overseer-service'].includes(fixture.id))await page.screenshot({path:`v2/output/playwright/regression/mounted-${fixture.id}-${view}-open.png`});
 }
 const sheet=await page.context().newPage();await sheet.setViewportSize({width:1400,height:900});
 await sheet.setContent(`<html><body style="margin:0;background:#182d2b;color:white;font:16px sans-serif;display:grid;grid-template-columns:1fr 1fr">${approaches.flatMap(({id})=>['overhead','third'].map(view=>`<div>${id} / ${view}<img style="display:block;width:700px;height:390px;object-fit:contain" src="http://127.0.0.1:5174/output/playwright/regression/mounted-${id}-${view}.png"></div>`)).join('')}</body></html>`);
 await sheet.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth));await sheet.screenshot({path:'v2/output/playwright/regression/mounted-controls-sheet.png',fullPage:true});await sheet.close();
 await page.evaluate(()=>__game.save());await page.reload();await page.waitForFunction(()=>window.__game?.debug);
 const restored=await page.evaluate(async()=>{
  const g=__game,q=g.debug,{foldedControls}=await import('/src/folded-layout.js'),{mountedControlPosition}=await import('/src/folded-control-housing.js');g.step(2);
  return q.world.controls.filter(c=>c.mount).map(c=>{
   const authored=foldedControls.find(d=>d.id===c.id),b=q.state.bodies.solids.find(b=>b.id===c.mount),expected=mountedControlPosition(authored,b);
   if(Math.hypot(c.x-expected.x,c.z-expected.z)>.001)throw Error('Reload left a floating control at its old position '+c.id);
   return {id:c.id,attached:true};
  });
 });
 if(errors.length)throw Error(errors.join('\n'));return {approaches,results,restored,errors};
}

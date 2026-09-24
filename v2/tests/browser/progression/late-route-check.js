async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');await page.waitForFunction(()=>window.__game);
 await page.evaluate(()=>localStorage.removeItem('furnace-born-v2-city'));await page.reload();await page.waitForFunction(()=>window.__game);
 const result=await page.evaluate(async()=>{
  const g=__game;g.manual(true);
  const {expansionRoutes}=await import('/src/content/expansion-layout.js');
  const {foldedControls}=await import('/src/world/terrain.js');
  g.scenario({state:{anchor:'distribution',phoenix:true,pressure:true},player:{x:150,y:24,z:-28,overdrive:true,magnet:true,mortar:true,flotation:true,phoenix:true,laser:false,circulation:false,invincible:1e9},enemies:Object.fromEntries(g.snapshot().enemies.map(e=>[e.id,0]))});
  const milestones=[];
  const feeds=g.debug.world.controlFeeds.filter(c=>c.id==='inner-thermal');
  if(!feeds.length||feeds.some(c=>c.points.some(p=>p[1]<-8||p[1]>-7.5)))throw Error('Thermal power leaves the lower maintenance deck');
  function rest(n=3){g.setInput([]);g.step(n,false);}
  function move(x,z,boost=false){for(let i=0;i<2400;i++){const p=g.snapshot().player,dx=x-p.x,dz=z-p.z;if(Math.hypot(dx,dz)<.2){g.setInput([]);return;}
   const keys=Math.abs(dx)>Math.abs(dz)?dx>0?['KeyS','KeyD']:['KeyW','KeyA']:dz>0?['KeyS','KeyA']:['KeyW','KeyD'];if(boost)keys.push('ShiftLeft');g.setInput(keys);g.step(1/60,false);}
   throw Error(`Blocked ${x},${z}: ${JSON.stringify(g.snapshot().player)}`);}
  function shoot(id){const c=foldedControls.find(c=>c.id===id),v=c.via||[c.x,c.y,c.z];rest();g.scenario({player:{weapon:c.kind==='laser'?'laser':c.surface==='top'?'mortar':'cannon'}});g.aimAt(v[0],v[2],v[1]);g.setInput(['Mouse0']);g.step(2,false);rest(14);if(!g.snapshot().state[id])throw Error('Mechanism '+id);}
  function route(id){const r=expansionRoutes.find(r=>r.id===id);for(const [x,z]of r.approach)move(x,z);
   for(const [x,z,action]of r.path){move(x,z);if(action==='pickup'){g.interact();}else if(action&&action!=='repair')shoot(action);}
   if(!g.snapshot().player[r.ability])throw Error('Missing '+r.ability);
   for(const [x,z,action]of r.returns){move(x,z,action==='boost');if(action&&action!=='boost')shoot(action);}milestones.push(r.ability);}
  for(const [x,z]of [[202,-28],[242,-24]])move(x,z);route('lens');
  for(const [x,z]of [[242,-24],[242,-28],[202,-28],[162,-28],[162,30],[174,30],[174,-18],[190,-18],[190,48],[242,48],[242,120],[248,120],[248,117]])move(x,z);
  route('coolant');move(284,117);shoot('coolant-bypass');
  for(const [x,z]of [[290,117],[290,106]])move(x,z);for(let i=0;i<30&&g.snapshot().player.y<24;i++)rest(1);
  for(const [x,z]of [[278,106],[278,-28],[150,-28],[162,-28],[162,30],[174,30],[174,-18],[190,-18],[190,46],[154,46]])move(x,z);
  rest();move(154,108,true);move(170,108);move(170,58);shoot('inner-transit');move(170,46);move(170,108);
  for(const [x,z]of [[154,108],[106,108],[94,108]])move(x,z);for(let i=0;i<30&&g.snapshot().player.y>-40;i++)rest(1);
  for(const [x,z]of [[82,108],[82,6],[44,6],[44,-10]])move(x,z);g.interact();
  if(g.snapshot().state.anchor!=='last-refuge')throw Error('Did not reach D');milestones.push('inner-thermal','last-refuge');
  return {milestones,scope:'Combat isolated; actual acquisitions, shots, reflection, heat, lifts and movement from C through R5/R6 to D.'};
 });
 await page.screenshot({path:'output/playwright/late-progressive-route.png'});
 if(errors.length)throw Error(errors.join('\n'));return {...result,errors};
}

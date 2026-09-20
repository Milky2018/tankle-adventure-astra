async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5174/?chapter=folded&test&manual&view=overhead');await page.waitForFunction(()=>window.__game?.debug);
 const cases=[['rail-repair',-18,0,19],['magnet',-30,-8,-8],['arsenal-return',-106,8,-54],['collimator-drawer',363,32,-80],['dock-cover',75,-8,14.5],['rig-cover',223,-24,108],['yard-cover',213,-8,44]];
 const results=[];
 for(const view of ['overhead','third'])for(const [id,x,y,z]of cases){
  const before=await page.evaluate(async({view,id,x,y,z})=>{
   const g=__game,q=g.debug,w=q.world;g.setInput([]);q.setCameraView(view);
   delete q.state.pendingSignals[id];
   g.scenario({enemies:Object.fromEntries(w.enemies.map(e=>[e.id,0])),state:{[id]:false},player:{x,y,z,hp:25,invincible:1e9,magnet:true,heat:0,overheated:false,lastHeat:-100}});
   const c=w.controls.find(c=>c.id===id);g.look(Math.atan2(c.x-x,c.z-z),.267);g.step(.2);
   const feeds=w.controlFeeds.filter(f=>f.id===id);if(!feeds.length)throw Error('No rendered magnetic circuit '+id);
   for(const f of feeds){
    if(f.lamps.length<4||f.lamps.at(-1).progress!==1)throw Error('Unreadable or incomplete cable '+id);
    if(!f.root.visible||!f.mesh.visible)throw Error('Hidden cable root '+id);
   }
   const capture=()=>{q.renderer.render(q.scene,q.camera);return q.renderer.domElement.toDataURL();};
   const shown=capture();feeds.forEach(f=>f.root.visible=false);const hidden=capture();feeds.forEach(f=>f.root.visible=true);capture();
   const pixels=async url=>{const image=new Image();image.src=url;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const context=canvas.getContext('2d');context.drawImage(image,0,0);return context.getImageData(0,0,canvas.width,canvas.height).data;};
   const a=await pixels(shown),b=await pixels(hidden);let visiblePixels=0;
   for(let i=0;i<a.length;i+=4)if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>24)visiblePixels++;
   if(visiblePixels<20)throw Error('Circuit is present but not legible in the rendered view '+view+'/'+id+' pixels='+visiblePixels);
   return {visiblePixels,feeds:feeds.map(f=>({id:f.id,target:f.target,lamps:f.lamps.length,points:f.points}))};
  },{view,id,x,y,z});
  await page.screenshot({path:`v2/output/playwright/regression/cable-${id}-${view}.png`});
  const timing=await page.evaluate(({view,id})=>{
   const g=__game,q=g.debug,w=q.world,c=w.controls.find(c=>c.id===id);
   if(view==='overhead')g.aimAt(c.x,c.z,c.y);
   else{let yaw=Math.atan2(c.x-q.p.x,c.z-q.p.z),pitch=0;for(let i=0;i<24;i++){g.look(yaw,pitch);const p=g.project(c.x,c.z,c.y);yaw-=(p.x/innerWidth*2-1)*Math.tan(Math.PI/6)*(innerWidth/innerHeight)*.8;pitch+=(p.y/innerHeight*2-1)*Math.tan(Math.PI/6)*.8;}g.look(yaw,pitch);}
   g.setInput(['Mouse2']);g.step(.65,false);g.setInput([]);
   const pending=w.signals.pending(id);if(!pending||q.state[id])throw Error('Missing transmission after pull '+view+'/'+id);
   g.step(Math.max(0,pending.remaining-pending.duration/2));
   const feeds=w.controlFeeds.filter(f=>f.id===id);
   for(const f of feeds)if(f.lamps[0].color.equals(f.lamps.at(-1).color))throw Error('Cable did not show moving front '+id);
   if(q.state[id])throw Error('Actuator opened before power arrived '+id);
   const fixed=feeds.map(f=>f.points.map(p=>[...p]));
   g.step(w.signals.pending(id).remaining+.2);
   if(!q.state[id])throw Error('No action at arrival '+id);
   for(const f of feeds)if(f.lamps.some(l=>l.color.getHex()!==0x85db58))throw Error("Cable did not remain green after arrival "+id);
   if(JSON.stringify(fixed)!==JSON.stringify(feeds.map(f=>f.points)))throw Error('Cable followed the discarded grip');
   return {duration:pending.duration,open:q.state[id],endpointColors:feeds.map(f=>f.lamps.at(-1).color.getHex())};
  },{view,id});
  results.push({view,id,feeds:before,timing});
  if(id==='dock-cover')await page.screenshot({path:`v2/output/playwright/regression/cable-dock-cover-${view}-open.png`});
 }
 // A contact sheet preserves each unmodified gameplay capture for visual review.
 const sheet=await page.context().newPage();await sheet.setViewportSize({width:1400,height:2920});
 await sheet.setContent(`<html><body style="margin:0;background:#182d2b;color:white;font:16px sans-serif;display:grid;grid-template-columns:1fr 1fr">${cases.flatMap(([id])=>['overhead','third'].map(view=>`<div>${id} / ${view}<img style="display:block;width:700px;height:390px;object-fit:contain" src="http://127.0.0.1:5174/output/playwright/regression/cable-${id}-${view}.png"></div>`)).join('')}</body></html>`);
 await sheet.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth));await sheet.screenshot({path:'v2/output/playwright/regression/magnetic-cables-sheet.png',fullPage:true});await sheet.close();
 if(errors.length)throw Error(errors.join('\n'));return {results,errors};
}

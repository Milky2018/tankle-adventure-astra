async page=>{
 await page.setViewportSize({width:1600,height:900});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 const results=[];
 // Measure real requestAnimationFrame work: 3 s warm-up, then 8 s per fixture.
 for(const [view,mode] of [['third','opening'],['third','lens'],['overhead','lens'],['third','reservoir']]){
  await page.goto(`http://127.0.0.1:5174/?chapter=folded&view=${view}&test`);await page.waitForFunction(()=>window.__game?.debug.profile);
  const result=await page.evaluate(async({view,mode})=>{
   const q={...__game.debug,...__game.debug.profile};const [x,y,z]=mode==='lens'?[344,24,-32]:mode==='reservoir'?[-212,-8,-174]:[0,-8,86];__game.scenario({player:{x,y,z,hp:100,invincible:1e9}});__game.look(Math.PI,.32);q.renderer.setPixelRatio(1.75);
   let start=0,last=0,before=0;const intervals=[];
   await new Promise(resolve=>{const tick=now=>{if(!start)start=now;const elapsed=now-start;if(elapsed>3000){if(!before){before=q.frames();last=now;q.start();}else{intervals.push(now-last);last=now;}}if(elapsed>11000){q.stop();resolve();return;}requestAnimationFrame(tick);};requestAnimationFrame(tick);});
   const time=intervals.reduce((a,b)=>a+b,0),frames=q.frames()-before,sorted=[...intervals].sort((a,b)=>a-b),slow=sorted.slice(-Math.ceil(sorted.length*.01));
   const stats=Object.fromEntries(Object.entries(q.stats).map(([k,v])=>[k,{msPerFrame:v.total/frames,callsPerFrame:v.count/frames,maxCallMs:v.max}]));
   const gpu=[...q.gpu].sort((a,b)=>a-b);
   return {view,mode,fps:frames*1000/time,onePercentLow:1000/(slow.reduce((a,b)=>a+b,0)/slow.length),p95:sorted[Math.floor(sorted.length*.95)],drawCalls:q.renderer.info.render.calls,triangles:q.renderer.info.render.triangles,stats,gpu:{samples:gpu.length,mean:gpu.reduce((a,b)=>a+b,0)/gpu.length,p95:gpu[Math.floor(gpu.length*.95)]}};
  },{view,mode});results.push(result);
 }
 await page.evaluate(()=>__game.manual(true));if(errors.length)throw Error(errors.join('\n'));return {results,errors};
}

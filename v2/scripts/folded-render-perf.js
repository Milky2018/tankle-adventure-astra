async page=>{
 await page.setViewportSize({width:1600,height:900});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.route('**/src/folded.js*',async r=>{const response=await r.fetch();await r.fulfill({response,body:await response.text()+`
const stats={},gpu=[],pending=[];let collecting=false,gpuFrame=0;
function profile(name,fn){return function(...args){if(!collecting)return fn.apply(this,args);const t=performance.now();try{return fn.apply(this,args);}finally{const d=performance.now()-t,s=stats[name]||(stats[name]={total:0,count:0,max:0});s.total+=d;s.count++;s.max=Math.max(s.max,d);}};}
advance=profile('advance',advance);updateCamera=profile('camera',updateCamera);updateAim=profile('aim',updateAim);updateEnemies=profile('enemies',updateEnemies);hud=profile('hud',hud);world.update=profile('world',world.update);
const gl=renderer.getContext(),timer=gl.getExtension('EXT_disjoint_timer_query_webgl2'),realRender=renderer.render;
renderer.render=profile('render',function(...args){
  for(let i=pending.length-1;i>=0;i--)if(gl.getQueryParameter(pending[i],gl.QUERY_RESULT_AVAILABLE)){if(!gl.getParameter(timer.GPU_DISJOINT_EXT)&&collecting)gpu.push(gl.getQueryParameter(pending[i],gl.QUERY_RESULT)/1e6);gl.deleteQuery(pending[i]);pending.splice(i,1);}
  let q;if(collecting&&timer&&gpuFrame++%10===0){q=gl.createQuery();gl.beginQuery(timer.TIME_ELAPSED_EXT,q);}try{return realRender.apply(renderer,args);}finally{if(q){gl.endQuery(timer.TIME_ELAPSED_EXT);pending.push(q);}}
});
window.__profile={renderer,world,scene,camera,stats,gpu,frames:()=>frames,start:()=>{for(const k of Object.keys(stats))delete stats[k];gpu.length=0;collecting=true;},stop:()=>{collecting=false;}};
`});});
 const results=[];
 // Measure real requestAnimationFrame work: 3 s warm-up, then 8 s per fixture.
 for(const [view,mode] of [['third','opening'],['overhead','opening'],['third','hub'],['third','carrier']]){
  await page.goto(`http://127.0.0.1:5174/?chapter=folded&view=${view}&test`);await page.waitForFunction(()=>window.__profile);
  const result=await page.evaluate(async({view,mode})=>{
   const q=__profile;const [x,y,z]=mode==='hub'?[0,0,27]:mode==='carrier'?[90,0,-18]:[0,-8,86];__game.scenario({player:{x,y,z,hp:100,invincible:1e9}});__game.look(Math.PI,.32);q.renderer.setPixelRatio(1.75);
   let start=0,last=0,before=0;const intervals=[];
   await new Promise(resolve=>{const tick=now=>{if(!start)start=now;const elapsed=now-start;if(elapsed>3000){if(!before){before=q.frames();last=now;q.start();}else{intervals.push(now-last);last=now;}}if(elapsed>11000){q.stop();resolve();return;}requestAnimationFrame(tick);};requestAnimationFrame(tick);});
   const time=intervals.reduce((a,b)=>a+b,0),frames=q.frames()-before,sorted=[...intervals].sort((a,b)=>a-b),slow=sorted.slice(-Math.ceil(sorted.length*.01));
   const stats=Object.fromEntries(Object.entries(q.stats).map(([k,v])=>[k,{msPerFrame:v.total/frames,callsPerFrame:v.count/frames,maxCallMs:v.max}]));
   const gpu=[...q.gpu].sort((a,b)=>a-b);
   return {view,mode,fps:frames*1000/time,onePercentLow:1000/(slow.reduce((a,b)=>a+b,0)/slow.length),p95:sorted[Math.floor(sorted.length*.95)],drawCalls:q.renderer.info.render.calls,triangles:q.renderer.info.render.triangles,stats,gpu:{samples:gpu.length,mean:gpu.reduce((a,b)=>a+b,0)/gpu.length,p95:gpu[Math.floor(gpu.length*.95)]}};
  },{view,mode});results.push(result);
 }
 await page.unroute('**/src/folded.js*');await page.evaluate(()=>__game.manual(true));if(errors.length)throw Error(errors.join('\n'));return {results,errors};
}

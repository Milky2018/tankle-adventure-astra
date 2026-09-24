async page => {
  await page.setViewportSize({width:1280,height:720});
  await page.goto('http://127.0.0.1:5174/?chapter=folded&test&manual');await page.waitForFunction(()=>window.__game?.debug);
  await page.bringToFront();
  await page.evaluate(async()=>{const q=__game.debug;__game.scenario({player:{x:-17,y:0,z:-35,invincible:1e9}});q.renderer.setPixelRatio(1.75);__game.manual(false);await new Promise(resolve=>{let start;const tick=now=>{start??=now;q.follow.yaw=(now-start)/3000*Math.PI*2;if(now-start>=3000){resolve();return;}requestAnimationFrame(tick);};requestAnimationFrame(tick);});});
  const session=await page.context().newCDPSession(page);
  await session.send('Profiler.enable');await session.send('Profiler.setSamplingInterval',{interval:1000});await session.send('Profiler.start');
  await page.evaluate(async()=>{await new Promise(resolve=>{let start;const tick=now=>{start??=now;__game.debug.follow.yaw=(now-start)/8000*Math.PI*2;if(now-start>=8000){__game.manual(true);resolve();return;}requestAnimationFrame(tick);};requestAnimationFrame(tick);});});
  const {profile}=await session.send('Profiler.stop');await session.detach();
  const nodes=new Map(profile.nodes.map(n=>[n.id,n])),parents=new Map();
  for(const n of profile.nodes)for(const id of n.children||[])parents.set(id,n.id);
  const self=new Map(),inclusive=new Map();let duration=0;
  for(let i=0;i<profile.samples.length;i++){
    const id=profile.samples[i],dt=profile.timeDeltas[i];duration+=dt;self.set(id,(self.get(id)||0)+dt);
    const seen=new Set();
    for(let node=id;node!==undefined;node=parents.get(node)){
      const f=nodes.get(node).callFrame,key=[f.functionName,f.url,f.lineNumber].join('|');
      if(!seen.has(key)){inclusive.set(node,(inclusive.get(node)||0)+dt);seen.add(key);}
    }
  }
  function top(map){const grouped=new Map();for(const [id,us]of map){const n=nodes.get(id),f=n.callFrame,key=[f.functionName,f.url,f.lineNumber].join('|');const entry=grouped.get(key)||{function:f.functionName,url:f.url,line:f.lineNumber+1,us:0};entry.us+=us;grouped.set(key,entry);}return [...grouped.values()].sort((a,b)=>b.us-a.us).slice(0,55).map(v=>({...v,percent:v.us/duration*100}));}
  return {durationMs:duration/1000,samples:profile.samples.length,topSelf:top(self),topInclusive:top(inclusive),profile};
}

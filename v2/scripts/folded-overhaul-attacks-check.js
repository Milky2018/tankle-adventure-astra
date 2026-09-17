async page=>{
 const errors=[],runs=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/src/folded.js*',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replace('let manual=false','let manual=true')+'\nwindow.__audit={world,scene,T,get shots(){return shots;}};'});});
 for(const mode of ['stand','dodge','cover','barrage']){
  await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test');await page.waitForFunction(()=>window.__audit);
  const result=await page.evaluate(mode=>{
    const g=__game,w=__audit.world,e=w.enemies.find(e=>e.id=== (mode==='barrage'?'arsenal-2-artillery':'lens-2-sniper'));
    // Keep the open firing lane clear of the newly reserved Hive refuge.
    g.manual(true);g.scenario({enemies:Object.fromEntries(w.enemies.filter(o=>o!==e).map(o=>[o.id,0])),player:{x:e.x-(['stand','dodge'].includes(mode)?32:47),y:e.y,z:e.z-(mode==='barrage'?15:mode==='cover'?44:40),hp:50,invincible:0,heat:0}});g.step(.1);
    const p=g.snapshot().player;e.phase='warn';e.timer=.06;e.lock=new __audit.T.Vector3(p.x,p.y+(mode==='barrage'?.05:1.2),p.z);
    if(mode==='cover'){const o=new __audit.T.Vector3(e.x,e.y+1.5,e.z),d=e.lock.clone().sub(o);if(!w.cast(o,d.clone().normalize(),d.length(),{targets:false}))throw Error('Cover fixture has no physical cover');}
    g.step(.08,false);const before=g.snapshot().player.hp,launched=__audit.shots.filter(s=>s.hostile).map(s=>({speed:s.speed,target:s.target.toArray(),delay:s.delay,marker:!!s.marker}));
    if(mode==='dodge')g.setInput(['KeyS','KeyA']);
    g.step(mode==='barrage'?2.5:.8,false);g.setInput([]);g.step(0);
    return {mode,before,after:g.snapshot().player.hp,launched,markers:__audit.shots.filter(s=>s.marker).length};
  },mode);
  if(result.before!==50)throw Error('Shot was instantaneous '+JSON.stringify(result));
  if(mode==='stand'&&result.after!==39)throw Error('Rail failed to hit after flight '+JSON.stringify(result));
  if(['dodge','cover'].includes(mode)&&result.after!==50)throw Error('Dodge or cover failed '+JSON.stringify(result));
  if(mode==='barrage'&&(result.launched.length!==3||result.launched.some(s=>!s.marker)||result.markers!==0))throw Error('Barrage warnings/cleanup failed '+JSON.stringify(result));
  runs.push(result);
 }
 await page.unroute('**/src/folded.js*');if(errors.length)throw Error(errors.join('\n'));return {runs,errors};
}

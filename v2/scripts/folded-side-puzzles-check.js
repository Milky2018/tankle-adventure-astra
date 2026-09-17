async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/src/folded.js*',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replace('let manual=false','let manual=true')+'\nwindow.__audit={world,scene,T,p,hitEnemy};'});});
 await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test');await page.waitForFunction(()=>window.__audit);
 await page.evaluate(()=>{localStorage.removeItem('furnace-born-v2-city');});await page.reload();await page.waitForFunction(()=>window.__audit);
 const results=await page.evaluate(()=>{
  const g=__game,w=__audit.world,q=w.sidePuzzles;g.manual(true);
  g.scenario({enemies:Object.fromEntries(w.enemies.map(e=>[e.id,0]))});
  const shoot=(id,x,z)=>{const t=q.targets.find(t=>t.id===id);g.scenario({player:{x,y:t.y-1.3-(id==='rail-carrier'?.6:0),z,hp:50,heat:0,overheated:false,lastShot:-100,lastHeat:-100,weapon:'cannon'}});g.aimAt(t.x,t.z,t.y);g.setInput(['Mouse0']);g.step(.1,false);g.setInput([]);g.step(1,false);};
  g.scenario({player:{x:-391,y:8,z:-80,speed:1,overdrive:true,hp:50}});g.setInput(['KeyS','KeyD']);g.step(.8,false);g.setInput([]);if(q.rail.state.moving)throw Error('Walking released the detent');
  g.scenario({player:{x:-391,y:8,z:-80,speed:1.6,heat:0}});g.setInput(['KeyS','KeyD','ShiftLeft']);g.step(.5,false);g.setInput([]);if(!q.rail.state.moving)throw Error('Overdrive could not push the detent');
  shoot('rail-signal',-386,-69);g.step(8,false);if(q.rail.state.moving)throw Error('Carrier recall failed');
  shoot('rail-a',-376,-92);if(!q.rail.state.switches[0])throw Error('Rail paddle cannot be shot');
  // Drive onto a treadle, hold, withdraw, then cross again.
  g.scenario({player:{x:-368,y:8,z:-80}});g.step(.1,false);g.step(1,false);if(!q.rail.state.switches[1])throw Error('Treadle failed/debounced incorrectly');
  shoot('rail-carrier',-386,-88);if(!q.rail.state.moving)throw Error('Cart brake not hittable');
  g.scenario({player:{x:-386,y:8,z:-73}});g.interact();g.step(3,false);if(q.rail.state.moving)throw Error('Nearby recall failed');
  shoot('rail-carrier',-386,-88);
  g.scenario({player:{x:-386,y:8,z:-93}});g.step(7,false);if(!g.snapshot().state['rail-crossing'])throw Error('Cart failed to dock/open both gates');
  shoot('gutter-plug',39,44);shoot('gutter-a',37,30);shoot('gutter-b',49,32);shoot('gutter-b',49,32);
  g.step(3,false);if(!q.gutter.state.grown)throw Error('Gutter did not grow '+JSON.stringify(q.gutter.state));
  g.scenario({player:{x:44,y:-8,z:39}});g.step(0);g.save();
  return {rail:q.rail.serialize(),gutter:q.gutter.serialize(),state:g.snapshot().state['rail-crossing']};
 });
 await page.screenshot({path:'v2/output/playwright/completion/garden-care-overhead.png'});
 await page.reload();await page.waitForFunction(()=>window.__audit);
 const restored=await page.evaluate(()=>({rail:__audit.world.sidePuzzles.rail.serialize(),gutter:__audit.world.sidePuzzles.gutter.serialize()}));
 if(!restored.rail.solved||!restored.gutter.grown)throw Error('Restoration did not survive reload');
 await page.unroute('**/src/folded.js*');if(errors.length)throw Error(errors.join('\n'));return {results,restored,errors};
}

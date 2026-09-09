async(page)=>{
  const checks=[];
  await page.goto('http://127.0.0.1:5174/?chapter=2&test');await page.waitForFunction(()=>window.__game);
  await page.evaluate(()=>{const g=window.__game;g.scenario({player:{x:10,z:-119,weapon:'cannon',magnet:true,mortar:true,heat:0,lastHeat:-10},enemiesByIndex:Object.fromEntries(g.snapshot().enemies.map((_,i)=>[i,{hp:0}]))});g.step(.1);});
  await page.keyboard.press('KeyQ');checks.push({name:'Q switches through actual keyboard input',passed:await page.evaluate(()=>window.__game.snapshot().player.weapon==='mortar')});
  const target=await page.evaluate(()=>window.__game.project(40,-119));await page.mouse.move(target.x,target.y);
  checks.push(await page.evaluate(()=>{const g=window.__game;g.step(.05);const p=g.snapshot().player,expected=g.project(p.x+24,p.z),rect=document.querySelector('#reticle').getBoundingClientRect();return {name:'Single reticle clamps to actual Mortar landing range',passed:document.querySelectorAll('#reticle').length===1&&Math.hypot(rect.x+rect.width/2-expected.x,rect.y+rect.height/2-expected.y)<4};}));
  await page.evaluate(()=>{const g=window.__game;g.scenario({player:{x:-54,z:-196,lastShot:-10,heat:0,overheated:false}});g.aimAt(-54,-210);g.fire();g.step(.3);});
  checks.push({name:'Tall gantry structure intercepts rising shells',passed:await page.evaluate(()=>window.__game.snapshot().lobShots===0)});
  await page.evaluate(()=>{const g=window.__game;g.scenario({player:{x:8,z:-122,heat:0,lastHeat:-10,overheated:false},enemiesByIndex:{8:{x:8,z:-131,hp:1,state:'idle',timer:50}}});g.step(.02);});
  const enemy=await page.evaluate(()=>window.__game.project(8,-131));await page.mouse.move(enemy.x,enemy.y);await page.mouse.down({button:'right'});
  await page.waitForFunction(()=>window.__game.snapshot().magneticTarget==='scout');await page.mouse.up({button:'right'});
  checks.push({name:'Right mouse engages magnetic traction',passed:true});
  await page.keyboard.press('Escape');await page.screenshot({path:'output/playwright/r2-settings.png'});await page.keyboard.press('Escape');
  for(const [name,x,z]of [['crane',-81,-196],['loading',56,-84],['shore',-54,-258],['observatory',94,-240]]){
    await page.evaluate(({x,z})=>{const g=window.__game;g.setInput([]);g.scenario({player:{x,z,hp:50,heat:0,overheated:false,invincible:1e6},enemiesByIndex:Object.fromEntries(g.snapshot().enemies.map((_,i)=>[i,{hp:0}]))});g.step(.2);},{x,z});
    await page.screenshot({path:`output/playwright/r2-${name}.png`});
  }
  await page.keyboard.press('Tab');await page.screenshot({path:'output/playwright/r2-map.png'});await page.keyboard.press('Tab');
  await page.evaluate(()=>localStorage.removeItem('furnace-born-v2-transit-preview'));
  await page.goto('http://127.0.0.1:5174/?test');await page.waitForFunction(()=>window.__game);
  await page.evaluate(()=>{localStorage.setItem('furnace-born-v2-save',JSON.stringify({anchor:2,eliteDead:true,bossDead:true,finished:true,relays:[0,1],hives:[0,1,2]}));});
  await page.reload();await page.waitForFunction(()=>window.__game);
  checks.push(await page.evaluate(()=>{const g=window.__game;g.scenario({});g.setInput(['KeyW','KeyD']);g.step(7);g.setInput([]);return {name:'Legacy finished save walks through the old ending into R2',passed:g.snapshot().player.z<-108&&!g.snapshot().paused&&!g.snapshot().player.magnet};}));
  const oldSettings=await page.evaluate(()=>localStorage.getItem('furnace-born-v2-settings'));
  await page.evaluate(()=>localStorage.setItem('furnace-born-v2-settings',JSON.stringify({bindings:{fire:'Mouse2',map:'KeyQ'}})));await page.reload();await page.waitForFunction(()=>window.__game);
  checks.push(await page.evaluate(()=>{const b=window.__game.snapshot().bindings;return {name:'New tools preserve older custom controls without duplicate bindings',passed:b.fire==='Mouse2'&&b.map==='KeyQ'&&new Set(Object.values(b)).size===Object.keys(b).length};}));
  await page.evaluate(value=>{if(value===null)localStorage.removeItem('furnace-born-v2-settings');else localStorage.setItem('furnace-born-v2-settings',value);},oldSettings);
  if(checks.some(r=>!r.passed))throw new Error(JSON.stringify(checks));return checks;
}

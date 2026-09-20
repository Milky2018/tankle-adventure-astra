async page=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test');await page.waitForFunction(()=>!!window.__game);
  await page.evaluate(()=>{__game.manual(true);__game.scenario({player:{x:0,y:-56,z:0,hp:50,endingTime:0,phoenix:true},state:{keeper:true,phoenix:true,'last-cage':true}});__game.step(.1);});
  if(await page.locator('#ending').isVisible())throw Error('Keeper defeat alone completed the journey');
  await page.keyboard.down('e');await page.evaluate(()=>__game.step(.8));
  const progress=await page.evaluate(()=>Number(document.querySelector('.dock-fill').style.strokeDashoffset));if(Math.abs(progress-60)>1)throw Error('Dock hold has no matching progress feedback');
  await page.screenshot({path:'v2/output/playwright/ending/dock-hold.png'});
  await page.keyboard.up('e');await page.evaluate(()=>__game.step(.1));
  if((await page.evaluate(()=>__game.snapshot())).player.endingTime)throw Error('A cancelled hold committed the ending');
  await page.keyboard.down('e');await page.evaluate(()=>__game.step(2.2));await page.keyboard.up('e');await page.evaluate(()=>__game.step(8));
  const result=await page.evaluate(()=>({ending:__game.snapshot().state.endingSeen,paused:__game.snapshot().paused,heading:document.querySelector('#ending-title')?.textContent,shown:!!document.querySelector('#ending:not([hidden])'),hud:document.querySelector('#hud').classList.contains('ending-active')}));
  if(!result.ending||!result.shown||result.heading!=='Mission Accomplished'||!result.paused||!result.hud)throw Error('Completed journey lacks an explicit ending screen '+JSON.stringify(result));
  await page.waitForTimeout(1600);await page.screenshot({path:'v2/output/playwright/ending/complete.png'});
  await page.keyboard.press('Tab');if(await page.locator('#ending-menu').evaluate(e=>e!==document.activeElement))throw Error('Completion keyboard focus escaped');
  await page.keyboard.press('Shift+Tab');if(await page.locator('#ending-continue').evaluate(e=>e!==document.activeElement))throw Error('Completion reverse focus escaped');
  await page.keyboard.press('Escape');if(await page.locator('#settings').isVisible())throw Error('Pause menu covered completion');
  await page.locator('#ending-continue').click();
  const continued=await page.evaluate(()=>__game.snapshot());
  if(continued.player.endingTime||continued.paused||continued.player.y!==-40||!continued.state.keeper||!continued.state['last-cage']||!continued.player.phoenix)throw Error('Continue lost the pre-docking exploration state');
  if(await page.locator('#ending').isVisible())throw Error('Completion screen stayed over exploration');
  await page.evaluate(()=>{__game.scenario({player:{x:0,y:-56,z:0}});__game.step(.1);});
  await page.keyboard.down('e');await page.evaluate(()=>__game.step(2.2));await page.keyboard.up('e');await page.evaluate(()=>__game.step(8));
  await page.locator('#ending-menu').click();await page.waitForSelector('#journey-title');
  const label=await page.locator('#journey-continue').textContent();if(!label.includes('Mission Accomplished'))throw Error('Journey menu lost the completed status');
  await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test');await page.waitForFunction(()=>!!window.__game);await page.evaluate(()=>__game.manual(true));
  const reloaded=await page.evaluate(()=>__game.snapshot());if(!reloaded.state.endingSeen||reloaded.player.endingTime||reloaded.player.y!==-40||!reloaded.player.phoenix)throw Error('Reload lost completion or replayed the ending');
  if(errors.length)throw Error(JSON.stringify(errors));return {result,continued:{y:continued.player.y,keeper:continued.state.keeper,phoenix:continued.player.phoenix},menu:label,errors};
}

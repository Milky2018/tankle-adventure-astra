// Isolated real-input checks: fixtures set the location and prior progression.
// Mouse/keyboard events and the ordinary frame clock operate the relay and doorway.
async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1440,height:900});
 await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test');await page.waitForFunction(()=>window.__game?.debug.world);
 await page.evaluate(()=>localStorage.clear());await page.reload();await page.waitForFunction(()=>window.__game?.debug.world);
 await page.evaluate(()=>{__game.manual(true);__game.scenario({player:{x:-57,y:-16,z:118},state:{'relay-west':true},enemies:Object.fromEntries(__game.snapshot().enemies.map(e=>[e.id,0]))});__game.step(.5);});
 await page.screenshot({path:'v2/output/playwright/rooms/input-relay-before.png'});
 // The paddle center was selected from the preceding 1440 by 900 screenshot.
 await page.mouse.move(645,270);await page.evaluate(()=>__game.manual(false));await page.mouse.down();await page.waitForTimeout(650);await page.mouse.up();
 const opened=await page.evaluate(()=>__game.snapshot().state.relays);if(!opened)throw Error('Visible paddle did not open its door with mouse fire');
 await page.screenshot({path:'v2/output/playwright/rooms/input-relay-open.png'});
 await page.keyboard.down('s');await page.keyboard.down('a');await page.waitForTimeout(1150);await page.keyboard.up('a');await page.keyboard.up('s');
 await page.keyboard.down('s');await page.keyboard.down('d');await page.waitForTimeout(1900);await page.keyboard.up('d');await page.keyboard.up('s');await page.evaluate(()=>__game.manual(true));
 const entered=await page.evaluate(()=>__game.snapshot().player);if(entered.x<-49||entered.y!==-16)throw Error('Opened door cannot be walked through '+JSON.stringify(entered));
 await page.screenshot({path:'v2/output/playwright/rooms/input-entered.png'});
 await page.evaluate(()=>{__game.scenario({player:{x:-30,y:-16,z:136,overdrive:false},state:{prototype:false,overdrive:false}});__game.step(.1);});
 await page.keyboard.press('e');
 const locked=await page.evaluate(()=>{const p=__game.debug.world.pickups.find(p=>p.id==='overdrive');return {visible:p.root.visible,cage:p.cage.visible,acquired:__game.snapshot().player.overdrive};});
 if(!locked.visible||!locked.cage||locked.acquired)throw Error('Engine preview is hidden or collectible before release');
 await page.screenshot({path:'v2/output/playwright/rooms/input-engine-locked.png'});
 await page.evaluate(()=>{__game.scenario({state:{prototype:true}});__game.step(.1);});await page.keyboard.press('e');
 const acquired=await page.evaluate(()=>{const p=__game.debug.world.pickups.find(p=>p.id==='overdrive');return {cage:p.cage.visible,acquired:__game.snapshot().player.overdrive};});
 if(acquired.cage||!acquired.acquired)throw Error('Released engine cannot be collected');
 await page.screenshot({path:'v2/output/playwright/rooms/input-engine-acquired.png'});
 if(errors.length)throw Error(JSON.stringify(errors));return {opened,entered:{x:entered.x,y:entered.y,z:entered.z},locked,acquired,errors};
}

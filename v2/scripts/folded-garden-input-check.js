// Isolated camera and mechanism fixtures. Ordinary mouse input is exercised
// separately from the continuous route; neither is a blind playtest.
async page=>{
 const errors=[],result={};page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1440,height:900});
 await page.goto('http://127.0.0.1:5174/?chapter=folded&route=garden&view=third&test');await page.waitForFunction(()=>window.__game?.debug);
 await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForFunction(()=>window.__game?.debug);
 await page.evaluate(()=>{__game.manual(true);__game.scenario({player:{x:58,y:-8,z:4,deployed:false},enemies:Object.fromEntries(__game.snapshot().enemies.map(e=>[e.id,0]))});__game.look(Math.PI,.25);__game.step(.2);});
 result.walkCamera=await page.evaluate(()=>__game.snapshot().camera.distance);
 if(result.walkCamera<4)throw Error('Garden service walk compresses camera into hull: '+result.walkCamera);
 const covered=await page.evaluate(()=>{const c=__game.debug.world.controls.find(c=>c.id==='pump');return !!c.cover&&c.cover.position.y<.1;});
 if(!covered)throw Error('Unpressurized pump does not visibly cover its shot target');
 await page.evaluate(()=>{__game.scenario({player:{x:58,y:-8,z:8,pumpPressure:0},state:{pump:false}});__game.look(Math.PI,.13);__game.step(.1);});
 await page.mouse.click(720,450);await page.waitForFunction(()=>!!document.pointerLockElement);await page.mouse.move(700,435,{steps:10});
 await page.evaluate(()=>__game.manual(false));await page.mouse.down();await page.waitForTimeout(850);await page.mouse.up();await page.evaluate(()=>__game.manual(true));
 result.unweighted=await page.evaluate(()=>({open:__game.snapshot().state.pump,cover:__game.debug.world.controls.find(c=>c.id==='pump').cover.position.y}));
 if(result.unweighted.open||result.unweighted.cover>.1)throw Error('Unweighted pump opened');
 await page.screenshot({path:'v2/output/playwright/garden-polish/input-covered.png'});
 await page.evaluate(()=>__game.manual(false));await page.keyboard.down('w');await page.waitForTimeout(570);await page.keyboard.up('w');await page.waitForTimeout(1200);await page.evaluate(()=>__game.manual(true));
 result.weighted=await page.evaluate(()=>({p:__game.snapshot().player,ready:__game.debug.world.controls.find(c=>c.id==='pump').ready,cover:__game.debug.world.controls.find(c=>c.id==='pump').cover.position.y}));
 if(!result.weighted.ready||result.weighted.cover<1.3)throw Error('Driving onto plate did not expose the pin '+JSON.stringify(result.weighted));
 await page.screenshot({path:'v2/output/playwright/garden-polish/input-ready.png'});
 await page.evaluate(()=>__game.manual(false));await page.keyboard.down('s');await page.waitForTimeout(570);await page.keyboard.up('s');await page.waitForTimeout(450);await page.evaluate(()=>__game.manual(true));
 result.reset=await page.evaluate(()=>{const c=__game.debug.world.controls.find(c=>c.id==='pump');return !c.ready&&c.cover.position.y<.1&&!__game.snapshot().state.pump;});
 if(!result.reset)throw Error('Leaving the plate did not reset the unlatched pump');
 await page.evaluate(()=>__game.manual(false));await page.keyboard.down('w');await page.waitForTimeout(570);await page.keyboard.up('w');await page.waitForTimeout(1200);await page.evaluate(()=>__game.manual(true));
 await page.evaluate(()=>__game.manual(false));await page.mouse.down();await page.waitForTimeout(1300);await page.mouse.up();await page.evaluate(()=>__game.manual(true));
 result.open=await page.evaluate(()=>__game.snapshot().state.pump);if(!result.open)throw Error('Exposed pump pin cannot be shot with ordinary mouse input');
 await page.screenshot({path:'v2/output/playwright/garden-polish/input-open.png'});
 await page.reload();await page.waitForFunction(()=>window.__game?.debug);await page.evaluate(()=>__game.manual(true));
 result.saved=await page.evaluate(()=>__game.snapshot().state.pump);if(!result.saved)throw Error('Pump release did not survive reload');
 await page.goto('http://127.0.0.1:5174/?chapter=folded&route=garden&view=overhead&test');await page.waitForFunction(()=>window.__game?.debug);
 await page.evaluate(()=>{__game.manual(true);__game.scenario({player:{x:38,y:-16,z:-17,hp:50},enemies:{...Object.fromEntries(__game.snapshot().enemies.map(e=>[e.id,0])),'bank-scout':3}});__game.step(.05);});
 const shield=await page.evaluate(()=>{const e=__game.debug.world.enemies.find(e=>e.id==='bank-scout');return __game.project(e.x,e.z,e.y+1.5);});
 await page.mouse.move(shield.x,shield.y);await page.screenshot({path:'v2/output/playwright/garden-polish/input-shield-before.png'});
 await page.evaluate(()=>__game.manual(false));await page.mouse.down({button:'right'});await page.waitForTimeout(1100);await page.mouse.up({button:'right'});await page.evaluate(()=>__game.manual(true));
 result.stripped=await page.evaluate(()=>__game.debug.world.enemies.find(e=>e.id==='bank-scout').shieldRemoved);if(!result.stripped)throw Error('The landing guard cannot lose its blue shield to Magnetic Traction');
 await page.screenshot({path:'v2/output/playwright/garden-polish/input-shield-after.png'});
 if(errors.length)throw Error(JSON.stringify(errors));return {result,errors};
}

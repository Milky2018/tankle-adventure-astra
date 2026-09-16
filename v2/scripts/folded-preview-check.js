async page=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  async function enter(route){await page.goto(`http://127.0.0.1:5174/?chapter=folded&route=${route}&test`);await page.evaluate(route=>{localStorage.removeItem(`furnace-born-v2-folded-${route}`);localStorage.removeItem('furnace-born-v2-settings');},route);await page.reload();await page.waitForFunction(()=>!!window.__game);await page.evaluate(()=>__game.manual(true));return page.evaluate(()=>__game.snapshot());}
  const freight=await enter('freight');if(!freight.state.foundry||!freight.state.mortarModule)throw Error('Freight preview lacks its completed prerequisites');if(freight.player.x!==12||freight.player.y!==0||freight.player.z!==-34)throw Error('Freight preview misses its entrance');
  if(!freight.state['bridge-crane']||freight.state.freight)throw Error('Freight preview does not distinguish its completed rear route from its forward obstacle');
  await page.evaluate(()=>{__game.setInput(['KeyW','KeyA']);__game.step(1.7);__game.setInput(['KeyS','KeyA']);__game.step(3.5);__game.setInput([]);});
  if((await page.evaluate(()=>__game.snapshot())).player.z<-10)throw Error('Freight preview rear route still requires another Mortar shot');
  await page.evaluate(()=>{__game.setInput(['KeyW','KeyD']);__game.step(3.5);__game.setInput(['KeyS','KeyD']);__game.step(1.7);__game.setInput([]);});
  await page.keyboard.press('q');const shot=await page.evaluate(()=>__game.project(32,-34,1.3));await page.mouse.move(shot.x,shot.y);await page.mouse.down();await page.evaluate(()=>__game.step(1.25));await page.mouse.up();
  if(!(await page.evaluate(()=>__game.snapshot())).state.freight)throw Error('The first visible Mortar interaction cannot open');
  await page.screenshot({path:'v2/output/playwright/polish-preview-freight.png'});
  const garden=await enter('garden');if(!garden.state.foundry||!garden.state.magnetModule)throw Error('Garden preview lacks its completed prerequisites');if(garden.player.x!==-27||garden.player.y!==-8||garden.player.z!==-7)throw Error('Garden preview misses its entrance');
  const pull=await page.evaluate(()=>__game.project(-39.7,-8,-6.6));await page.mouse.move(pull.x,pull.y);await page.mouse.down({button:'right'});await page.evaluate(()=>__game.step(1));await page.mouse.up({button:'right'});
  if(!(await page.evaluate(()=>__game.snapshot())).state.magnet)throw Error('The first visible Magnetic interaction cannot open');
  await page.keyboard.down('w');await page.keyboard.down('a');await page.evaluate(()=>__game.step(2.65));await page.keyboard.up('w');await page.keyboard.up('a');
  const end=await page.evaluate(()=>__game.snapshot());if(!end.player.flotation)throw Error('Contact failed to install Flotation');
  const hud=await page.locator('#acquired').getAttribute('data-ability');if(hud!=='flotation')throw Error('Contact pickup lacks ability demonstration');
  await page.screenshot({path:'v2/output/playwright/polish-preview-garden.png'});
  await page.evaluate(()=>localStorage.setItem('furnace-born-v2-folded-garden',JSON.stringify({...__game.snapshot().state,anchor:'bank',foundry:false,magnetModule:false,mortarModule:true})));
  await page.reload();await page.waitForFunction(()=>!!window.__game);await page.evaluate(()=>__game.manual(true));
  const migrated=await page.evaluate(()=>__game.snapshot());if(!migrated.state.foundry||!migrated.player.magnet||!migrated.player.mortar||migrated.state.anchor!=='bank')throw Error('Preview prerequisite repair lost saved progress');
  if(errors.length)throw Error(JSON.stringify(errors));return {previewMigration:true,freightEntrance:true,mortarOpening:true,gardenEntrance:true,magnetOpening:true,contactInstallation:true,errors};
}

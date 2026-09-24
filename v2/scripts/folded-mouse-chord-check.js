async page=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1280,height:720});
  const load=async()=>{await page.goto('http://127.0.0.1:5174/?chapter=folded&route=foundry&view=third&test');await page.waitForFunction(()=>window.__game?.debug);await page.evaluate(()=>__game.manual(true));};
  await load();await page.locator('#game').click({position:{x:600,y:360}});await page.waitForFunction(()=>!!document.pointerLockElement);
  const yaw=()=>page.evaluate(()=>__game.snapshot().camera.yaw),rows=[];
  const reset=()=>page.evaluate(()=>{__game.scenario({player:{magnet:true,heat:0,overheated:false,lastShot:-100,lastHeat:-100,hp:100,invincible:1e9}});});
  for(const button of ['left','right']){
    await reset();await page.mouse.move(600,360);await page.mouse.down({button});const start=await yaw();await page.mouse.move(680,360);await page.evaluate(()=>__game.step(.05));
    const delta=Math.abs(await yaw()-start);if(delta<.15)throw Error(`Holding ${button} stopped captured look`);
    await page.mouse.up({button});rows.push({mode:'captured',button,delta});
  }
  await page.addInitScript(()=>{HTMLCanvasElement.prototype.requestPointerLock=()=>Promise.reject(new Error('Test capture denial'));});
  await load();await page.locator('#game').click({position:{x:600,y:360}});await page.waitForFunction(()=>__game.snapshot().camera.dragLook);
  for(const order of [['left','middle'],['middle','left'],['right','middle'],['middle','right'],['left','right','middle']]){
    await reset();await page.mouse.move(600,360);for(const button of order)await page.mouse.down({button});
    const start=await yaw();await page.mouse.move(680,360);await page.evaluate(()=>__game.step(.05));const delta=Math.abs(await yaw()-start);
    if(delta<.15)throw Error(`${order.join('+')} stopped fallback look`);
    const s=await page.evaluate(()=>({heat:__game.snapshot().player.heat,magnet:__game.debug.magneticActive()}));
    if(order.includes('left')&&s.heat<=0)throw Error('Orbiting swallowed the fire press');
    if(order.includes('right')&&!s.magnet)throw Error('Orbiting swallowed the magnetic press');
    for(const button of order.filter(b=>b!=='middle'))await page.mouse.up({button});await page.evaluate(()=>__game.step(.05));
    if(await page.evaluate(()=>__game.debug.magneticActive()))throw Error('Released magnet remained held');
    const next=await yaw();await page.mouse.move(740,360);if(Math.abs(await yaw()-next)<.1)throw Error('Releasing combat button stopped held middle drag');
    await page.mouse.up({button:'middle'});const stopped=await yaw();await page.mouse.move(780,360);if(await yaw()!==stopped)throw Error('Released middle drag remained active');
    rows.push({mode:'fallback',order,delta,...s});
  }
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'Adjust camera',exact:true}).click();const slider=page.getByRole('slider',{name:'Mouse sensitivity',exact:true});await slider.focus();await slider.press('Home');for(let i=0;i<10;i++)await slider.press('ArrowRight');
  await page.getByRole('button',{name:'Resume',exact:true}).click();await page.mouse.move(600,360);await page.mouse.down({button:'middle'});const start=await yaw();await page.mouse.move(680,360);await page.mouse.up({button:'middle'});
  const fast=Math.abs(await yaw()-start);if(Math.abs(fast-.4)>.01)throw Error(`Sensitivity did not double look: ${fast}`);
  await load();const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('furnace-born-v2-settings')).cameraSettings.third.sensitivity);if(saved!==2)throw Error('Sensitivity did not persist');
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'Adjust camera',exact:true}).click();await page.getByRole('button',{name:'Reset',exact:true}).click();
  const defaults=await page.evaluate(()=>JSON.parse(localStorage.getItem('furnace-born-v2-settings')).cameraSettings.third.sensitivity);if(defaults!==3)throw Error('Sensitivity reset failed');
  if(errors.length)throw Error(errors.join('\n'));return {rows,fast,saved,defaults,errors};
}

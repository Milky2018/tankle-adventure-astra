async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1440,height:900});
 await page.goto('http://127.0.0.1:5174/?chapter=folded&view=third&test&manual');await page.waitForFunction(()=>window.__game);
 await page.evaluate(()=>localStorage.clear());await page.reload();await page.waitForFunction(()=>window.__game);
 await page.evaluate(()=>__game.step(.1));
 if(!await page.locator('#look-hint').isVisible())throw Error('Initial look cue is missing');
 if(await page.locator('#camera-toggle kbd').textContent()!=='C')throw Error('Camera shortcut is not visible');
 await page.screenshot({path:'v2/output/playwright/player-review/opening-third.png'});
 await page.keyboard.down('w');await page.evaluate(()=>__game.step(2.5));await page.keyboard.up('w');
 const opening=await page.evaluate(()=>__game.snapshot());if(opening.player.x>-16||Math.abs(opening.player.z-86)>.1)throw Error('Opening forward movement still hits a wall');
 await page.keyboard.press('Tab');await page.screenshot({path:'v2/output/playwright/player-review/opening-map.png'});await page.keyboard.press('Tab');
 await page.keyboard.press('c');if(await page.evaluate(()=>__game.snapshot().camera.view)!=='overhead')throw Error('C did not switch view');
 const map=await page.locator('#minimap-wrap').boundingBox();await page.mouse.move(map.x+map.width/2,map.y+map.height/2);
 await page.waitForFunction(()=>document.querySelector('#minimap-wrap').classList.contains('aim-through'));await page.waitForTimeout(180);
 await page.screenshot({path:'v2/output/playwright/player-review/map-aim-through.png'});
 await page.mouse.move(500,500);await page.waitForFunction(()=>!document.querySelector('#minimap-wrap').classList.contains('aim-through'));
 const refuge=await page.evaluate(()=>{
  const g=__game,sounds=[],original=__game.debug.audio.event;
  g.scenario({player:{x:12,y:0,z:-34,weapon:'mortar',mortar:true,hp:50,heat:0,overheated:false,lastShot:-100},state:{freight:false}});g.step(.5);g.aimAt(32,-34,4.2);g.step(.1);
  const clipped=__game.debug.mortarGuide.geometry.drawRange.count;
  __game.debug.audio.event=name=>sounds.push(name);g.fire();g.step(.22);
  g.step(1.3);const insideOpen=g.snapshot().state.freight;
  g.scenario({player:{x:20,y:0,z:-34,hp:50,heat:0,overheated:false,lastShot:-100}});g.step(.5);g.aimAt(32,-34,4.2);g.step(.1);const restored=__game.debug.mortarGuide.geometry.drawRange.count;
  g.fire();g.step(1.5);__game.debug.audio.event=original;
  if(clipped>=25||restored!==25||insideOpen||!g.snapshot().state.freight||!sounds.includes('blocked'))throw Error('Sanctuary preview/interception regression '+JSON.stringify({clipped,restored,insideOpen,sounds}));
  return {clipped,restored,insideOpen,outsideOpen:g.snapshot().state.freight,blockedSound:sounds.includes('blocked')};
 });
 await page.locator('#settings-button').click();await page.getByRole('button',{name:'调整镜头',exact:true}).click();
 await page.getByRole('button',{name:'返回设置',exact:true}).click();await page.locator('#camera-view').selectOption('third');await page.getByRole('button',{name:'调整镜头',exact:true}).click();
 if(!(await page.locator('#camera-tuning').textContent()).includes('跟随距离保持不变'))throw Error('Camera settings contradict fixed boom');
 await page.evaluate(()=>localStorage.setItem('furnace-born-v2-city',JSON.stringify({endingSeen:true})));await page.goto('http://127.0.0.1:5174/');
 const completed=await page.locator('#journey-continue').textContent();if(!completed.includes('Mission Accomplished')||completed.includes('传火'))throw Error('Completed journey label regressed');
 if(errors.length)throw Error(errors.join('\n'));return {opening:{x:opening.player.x,z:opening.player.z},cameraShortcut:true,refuge,completed,errors};
}

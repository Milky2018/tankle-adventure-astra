async page=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5174/?chapter=hoist&test');await page.evaluate(()=>localStorage.removeItem('furnace-born-v2-hoist-preview'));await page.reload();await page.waitForFunction(()=>__game);await page.waitForTimeout(2000);
  async function walk(x,z){
    for(let i=0;i<500;i++){
      const p=await page.evaluate(()=>__game.snapshot().player),dx=x-p.x,dz=z-p.z;if(Math.hypot(dx,dz)<.3)return;
      const alongX=Math.abs(dx)>Math.abs(dz),d=alongX?dx:dz,keys=alongX?(d>0?['s','d']:['w','a']):(d>0?['s','a']:['w','d']);
      for(const key of keys)await page.keyboard.down(key);await page.waitForTimeout(Math.max(18,Math.min(90,Math.abs(d)/7*1000)));for(const key of keys)await page.keyboard.up(key);
    }throw Error('Keyboard route stalled '+x+','+z);
  }
  await walk(290,-88);await walk(282,-88);
  let point=await page.evaluate(()=>__game.project(282,-99,1));await page.mouse.move(point.x,point.y);await page.mouse.down({button:'right'});await page.waitForTimeout(2400);await page.mouse.up({button:'right'});
  let s=await page.evaluate(()=>__game.snapshot());if(s.hoist.state.ballast<5.8)throw Error('Mouse traction failed');
  await walk(287,-88);await walk(287,-103);await walk(284,-109);await page.keyboard.press('e');await page.waitForTimeout(2500);await walk(284,-120);await page.keyboard.press('e');
  await page.screenshot({path:'output/playwright/hoist/keyboard-gallery.png'});
  await walk(283,-127);await walk(296,-126);await page.waitForTimeout(250);
  point=await page.evaluate(()=>__game.project(310,-126,13.1));await page.mouse.click(point.x,point.y);await page.waitForTimeout(850);
  s=await page.evaluate(()=>__game.snapshot());if(!s.hoist.state.balance||!s.hoist.state.bridge||s.player.height!==8)throw Error('Keyboard/mouse ascent failed '+JSON.stringify(s.hoist));
  await page.keyboard.press('Tab');await page.screenshot({path:'output/playwright/hoist/floor-map.png'});await page.keyboard.press('Tab');
  await page.keyboard.press('Escape');await page.waitForTimeout(100);const before=await page.evaluate(()=>__game.snapshot().frames);await page.waitForTimeout(300);const after=await page.evaluate(()=>__game.snapshot().frames);
  if(before!==after)throw Error('Pause kept rendering');return {keyboardMovement:true,mouseTraction:true,liftInteraction:true,mouseLatchShot:true,pausedRenderingStopped:true,hp:s.player.hp,errors};
}

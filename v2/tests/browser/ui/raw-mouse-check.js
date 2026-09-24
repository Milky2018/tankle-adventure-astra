async page=>{
  await page.setViewportSize({width:1280,height:720});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    const original=HTMLCanvasElement.prototype.requestPointerLock;
    window.lockRequests=[];
    HTMLCanvasElement.prototype.requestPointerLock=function(options){
      lockRequests.push(options||null);
      const mode=new URLSearchParams(location.search).get('inputMode');
      if(mode==='unsupported'&&options?.unadjustedMovement){
        // A rejected raw request must not disable the ordinary-lock retry.
        document.dispatchEvent(new Event('pointerlockerror'));
        return Promise.reject(new DOMException('Raw input unsupported','NotSupportedError'));
      }
      if(mode==='denied')return Promise.reject(new DOMException('Capture denied','NotAllowedError'));
      return original.call(this,options);
    };
  });
  const rows=[];
  for(const mode of ['native','unsupported','denied']){
    await page.goto(`http://127.0.0.1:5174/?chapter=folded&view=third&test&inputMode=${mode}`);
    await page.waitForFunction(()=>window.__game);
    await page.evaluate(()=>{__game.manual(true);__game.look(Math.PI,.15);});
    await page.mouse.click(640,360);
    await page.waitForFunction(()=>document.pointerLockElement||__game.snapshot().camera.dragLook);
    const capture=await page.evaluate(()=>({requests:lockRequests,locked:!!document.pointerLockElement,drag:__game.snapshot().camera.dragLook}));
    if(!capture.requests[0]?.unadjustedMovement)throw Error('Raw mouse input was not requested');
    if(mode==='unsupported'&&(!capture.locked||capture.drag||capture.requests.length!==2||capture.requests[1]!==null))throw Error('Raw-input rejection broke normal capture: '+JSON.stringify(capture));
    if(mode==='denied'&&(!capture.drag||capture.requests.length!==1))throw Error('Capture denial did not preserve middle drag');
    if(!capture.locked)await page.mouse.down({button:'middle'});
    const before=await page.evaluate(()=>__game.snapshot().camera);
    await page.mouse.down({button:'left'});await page.mouse.move(648,368);await page.evaluate(()=>__game.step(1/60));await page.mouse.up({button:'left'});
    const after=await page.evaluate(()=>__game.snapshot().camera);
    if(Math.abs(after.pitch-before.pitch)<.001)throw Error('Vertical look stopped while firing');
    const still=await page.evaluate(()=>{const a=__game.snapshot().camera;__game.step(.1);const b=__game.snapshot().camera;return a.pitch===b.pitch&&a.yaw===b.yaw;});
    if(!still)throw Error('Aim drifted after mouse stopped');
    if(!capture.locked)await page.mouse.up({button:'middle'});
    rows.push({mode,capture,pitchDelta:after.pitch-before.pitch,still});
    await page.keyboard.press('Escape');
  }
  if(errors.length)throw Error(errors.join('\n'));
  return {rows,errors};
}

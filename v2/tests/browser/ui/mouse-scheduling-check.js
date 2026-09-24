async page=>{
  await page.setViewportSize({width:1280,height:720});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{HTMLCanvasElement.prototype.requestPointerLock=()=>Promise.reject(new Error('Test capture denial'));});
  await page.goto('http://127.0.0.1:5174/?chapter=folded&view=third&test&manual');await page.waitForFunction(()=>window.__game?.debug);
  await page.evaluate(()=>{
    const q=__game.debug;
    // Fix the fixture sensitivity independently of the configurable game default.
    q.follow.sensitivity=1;
    window.__mouseSchedule={
      get counts(){return {camera:q.profile.stats.camera?.count||0,aim:q.profile.stats.aim?.count||0};},
      reset:()=>q.profile.start({gpu:false}),
      sample:()=>{const direction=q.camera.getWorldDirection(new q.T.Vector3());return {yaw:q.follow.yaw,cameraYaw:Math.atan2(direction.x,direction.z),heading:q.p.heading,heat:q.p.heat};}
    };
  });
  await page.evaluate(()=>{__game.manual(true);__game.scenario({player:{x:0,y:-8,z:86,hp:100,heat:0,overheated:false,lastShot:-100,invincible:1e9}});__game.look(0,.15);});
  await page.locator('#game').click({position:{x:600,y:360}});await page.waitForFunction(()=>__game.snapshot().camera.dragLook);
  await page.mouse.down({button:'middle'});
  const burst=await page.evaluate(()=>{
    const q=__mouseSchedule,before=q.sample();q.reset();
    for(let i=0;i<100;i++)document.dispatchEvent(new MouseEvent('mousemove',{movementX:1,movementY:0,bubbles:true}));
    const input={...q.counts},pending=q.sample();__game.step(1/60);
    return {before,input,pending,frame:{...q.counts},rendered:q.sample()};
  });
  if(burst.input.camera||burst.input.aim)throw Error('Mouse events repeated scene queries: '+JSON.stringify(burst.input));
  if(burst.frame.camera!==1||burst.frame.aim!==1)throw Error('Frame did not resolve look exactly once');
  if(Math.abs(burst.pending.yaw-burst.before.yaw+.25)>1e-8)throw Error('Mouse deltas were dropped or rescaled');
  if(Math.abs(burst.rendered.cameraYaw-burst.pending.yaw)>1e-8)throw Error('Camera did not consume the latest look');
  if(burst.rendered.heading!==burst.before.heading)throw Error('Looking turned the stationary hull');
  // A press between animation frames must shoot using the latest mouse direction.
  await page.evaluate(()=>{__mouseSchedule.reset();document.dispatchEvent(new MouseEvent('mousemove',{movementX:40,bubbles:true}));});
  await page.mouse.down({button:'left'});
  const click=await page.evaluate(()=>({sample:__mouseSchedule.sample(),counts:{...__mouseSchedule.counts}}));
  if(Math.abs(click.sample.cameraYaw-click.sample.yaw)>1e-8||!click.sample.heat)throw Error('Immediate fire used an outdated camera');
  if(click.counts.camera!==1||click.counts.aim!==1)throw Error('Press refreshed the camera more than once');
  await page.mouse.up({button:'left'});
  const stunned=await page.evaluate(()=>{
    const q=__game.debug,before=q.follow.yaw;q.p.hurtAt=q.time;q.p.hurtUntil=q.time+.6;
    document.dispatchEvent(new MouseEvent('mousemove',{movementX:100,movementY:100,bubbles:true}));
    if(Math.abs(q.follow.yaw-before+.25)>1e-8)throw Error('Mouse look locked during hit recovery');
    __game.step(.65);document.dispatchEvent(new MouseEvent('mousemove',{movementX:40,bubbles:true}));
    if(Math.abs(q.follow.yaw-before+.35)>1e-8)throw Error('Mouse look did not recover');return true;
  });
  await page.mouse.up({button:'middle'});
  await page.keyboard.press('Escape');
  const paused=await page.evaluate(()=>{const before=__mouseSchedule.sample().yaw;document.dispatchEvent(new MouseEvent('mousemove',{movementX:100,bubbles:true}));return __mouseSchedule.sample().yaw===before;});
  if(!paused)throw Error('Paused mouse input changed the view');
  await page.evaluate(()=>__game.debug.profile.stop());
  if(errors.length)throw Error(errors.join('\n'));
  return {burst,click,stunned,paused,errors};
}

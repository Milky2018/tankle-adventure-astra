async page=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5174/?chapter=folded&route=foundry&test');
  await page.waitForFunction(()=>window.__game);
  await page.evaluate(()=>{localStorage.removeItem('furnace-born-v2-settings');localStorage.removeItem('furnace-born-v2-folded-foundry');});
  await page.reload();await page.waitForFunction(()=>window.__game);
  await page.evaluate(()=>__game.manual(true));
  const snapshot=()=>page.evaluate(()=>__game.snapshot());
  const start=await snapshot();if(start.camera.view!=='third')throw Error('Fresh settings did not select third person');
  await page.locator('#game').click({position:{x:640,y:360}});
  await page.waitForFunction(()=>document.pointerLockElement===document.getElementById('game'));
  await page.mouse.move(740,390);await page.evaluate(()=>__game.step(.05));
  const turned=await snapshot();if(Math.abs(turned.camera.yaw-start.camera.yaw)<.1)throw Error('Captured mouse did not turn the camera');
  if(Math.hypot(turned.player.x-start.player.x,turned.player.z-start.player.z)>.01)throw Error('Mouse look moved the hull');
  await page.keyboard.down('w');await page.evaluate(()=>__game.step(.4));await page.keyboard.up('w');
  const walked=await snapshot(),dx=walked.player.x-turned.player.x,dz=walked.player.z-turned.player.z;
  if(dx*Math.sin(turned.camera.yaw)+dz*Math.cos(turned.camera.yaw)<2.7)throw Error('W did not follow camera yaw');
  if(Math.abs(Math.hypot(dx,dz)-2.8)>.05)throw Error('Camera changed base speed');
  const reticle=await page.locator('#reticle').boundingBox();
  if(!reticle||Math.abs(reticle.x+reticle.width/2-640)>1||Math.abs(reticle.y+reticle.height/2-360)>1)throw Error('Third-person reticle is not centered');
  await page.keyboard.press('Tab');await page.waitForFunction(()=>!document.pointerLockElement);
  if(!(await snapshot()).mapOpen||(await snapshot()).paused)throw Error('Map unlock also paused the game');
  await page.getByRole('button',{name:'关闭地图',exact:true}).click();await page.waitForFunction(()=>!!document.pointerLockElement);
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.pointerLockElement);
  if(!(await snapshot()).paused)throw Error('Escape did not release and pause');
  await page.getByLabel('视角',{exact:true}).selectOption('overhead');
  await page.getByRole('button',{name:'继续',exact:true}).click();
  if((await snapshot()).camera.view!=='overhead'||(await snapshot()).camera.locked)throw Error('Overhead comparison retained pointer lock');
  await page.keyboard.press('Escape');await page.getByLabel('视角',{exact:true}).selectOption('third');
  await page.reload();await page.waitForFunction(()=>window.__game);await page.evaluate(()=>__game.manual(true));
  if((await snapshot()).camera.view!=='third')throw Error('View preference was not saved');
  await page.locator('#game').click({position:{x:640,y:360}});await page.waitForFunction(()=>!!document.pointerLockElement);

  const views=[];
  for(const [name,x,y,z,yaw,pitch]of [
    ['opening',0,-8,86,Math.PI,.32],['canal',0,-16,-4,Math.PI/2,.2],
    ['under-furnace',0,-16,50,Math.PI,.6],['wall',-40,-16,49,Math.PI/2,.1],
    ['ramp',59,8-18*8/38,-60,Math.PI,.32],['roof',28,24,8,Math.PI,.32]
  ]){
    await page.evaluate(({x,y,z,yaw,pitch})=>{
      __game.setInput([]);__game.scenario({player:{x,y,z,hp:50,invincible:1e9},state:{'relay-west':false}});__game.look(yaw,pitch);__game.step(.1);
    },{x,y,z,yaw,pitch});
    const s=await snapshot();
    if(s.surfaces.length)throw Error('Third-person mode retained the overhead floor aperture');
    if(name==='wall'&&s.camera.distance>7)throw Error('Camera passed through the closed wall');
    if(name==='under-furnace'&&s.camera.position[1]>-8.75)throw Error('Camera passed through the upper floor');
    if(s.player.y!==y)throw Error('Camera changed the supporting floor');
    views.push({name,camera:s.camera});await page.screenshot({path:`v2/output/playwright/third-person/${name}.png`});
  }
  // Looking away must not freeze a physically visible attacker behind the Tank.
  const rear=await page.evaluate(()=>{
    __game.scenario({player:{x:-18,y:-8,z:86,hp:50,invincible:1e9}});__game.look(Math.PI/2,.1);
    const phases=[];for(let i=0;i<20;i++){__game.step(.1,false);phases.push(__game.snapshot().enemies.find(e=>e.id==='foundry-west-scout').phase);}
    return phases;
  });
  if(rear.every(phase=>phase==='idle'))throw Error('Looking away froze the rear attacker');

  // Align the actual camera with a live target, then fire via the ordinary input path.
  await page.evaluate(()=>{__game.scenario({player:{x:-14,y:-8,z:86,hp:50,invincible:1e9,weapon:'cannon',heat:0,overheated:false,lastShot:-100},enemies:{'foundry-west-scout':1}});__game.look(-Math.PI/2,.1);});
  for(let i=0;i<16;i++)await page.evaluate(()=>{
    const s=__game.snapshot(),e=s.enemies.find(e=>e.id==='foundry-west-scout'),q=__game.project(e.x,e.z,e.y+1.5),f=innerHeight/(2*Math.tan(Math.PI/6));
    __game.look(s.camera.yaw-Math.atan((q.x-innerWidth/2)/f),s.camera.pitch+Math.atan((q.y-innerHeight/2)/f));__game.step(1/60);
  });
  await page.mouse.down();await page.evaluate(()=>__game.step(1.5));await page.mouse.up();
  const shot=await snapshot();if(shot.enemies.find(e=>e.id==='foundry-west-scout').hp!==0)throw Error('Centered third-person shot missed the live target');
  await page.screenshot({path:'v2/output/playwright/third-person/shot.png'});
  const traversals=[];
  for(const [name,x,y,z,yaw,seconds,endY]of [
    ['freight-descent',67,8,-84,0,7,0],
    ['foundry-ascent',-40,-16,49,0,5.2,-8],
    ['foundry-descent',-40,-8,85.4,Math.PI,5.2,-16]
  ]){
    await page.evaluate(({x,y,z,yaw})=>{__game.scenario({player:{x,y,z,hp:50,invincible:1e9}});__game.look(yaw,.32);},{x,y,z,yaw});
    await page.keyboard.down('w');await page.evaluate(t=>__game.step(t),seconds);await page.keyboard.up('w');
    const s=await snapshot();if(Math.abs(s.player.y-endY)>.01||Math.abs(s.player.z-z)<30)throw Error(name+' failed '+JSON.stringify(s.player));
    traversals.push({name,player:s.player,camera:s.camera});
  }
  await page.evaluate(()=>{__game.scenario({player:{x:78,y:8,z:-59,hp:50,invincible:1e9}});__game.look(Math.PI,.32);});
  await page.keyboard.down('w');await page.evaluate(()=>{for(let i=0;i<1800&&__game.snapshot().player.z> -70.9;i++)__game.step(1/60);});await page.keyboard.up('w');
  await page.evaluate(()=>{for(let i=0;i<600&&__game.snapshot().player.y<15.99;i++)__game.step(1/60);});
  const lift=await snapshot();if(Math.abs(lift.player.y-16)>.01)throw Error('Third-person carrier ride failed');
  await page.screenshot({path:'v2/output/playwright/third-person/lift.png'});
  await page.keyboard.press('Escape');
  // Embedded browsers can deny pointer lock; middle-button look remains playable.
  await page.addInitScript(()=>{HTMLCanvasElement.prototype.requestPointerLock=()=>Promise.reject(new Error('Pointer lock unavailable'));});
  await page.reload();await page.waitForFunction(()=>window.__game);await page.evaluate(()=>__game.manual(true));
  await page.locator('#game').click({position:{x:640,y:360}});
  await page.waitForFunction(()=>__game.snapshot().camera.dragLook);
  const fallback=await snapshot();if(fallback.paused)throw Error('Pointer lock denial stranded the player in Settings');
  await page.mouse.down({button:'middle'});await page.mouse.move(740,390);await page.mouse.up({button:'middle'});
  if(Math.abs((await snapshot()).camera.yaw-fallback.camera.yaw)<.1)throw Error('Middle-button fallback did not rotate');
  await page.keyboard.down('w');await page.evaluate(()=>__game.step(.3));await page.keyboard.up('w');
  if(Math.hypot((await snapshot()).player.x-fallback.player.x,(await snapshot()).player.z-fallback.player.z)<2)throw Error('Fallback lost movement');
  await page.mouse.down();await page.evaluate(()=>__game.step(.1));await page.mouse.up();
  if(!(await snapshot()).player.heat)throw Error('Fallback lost left-button fire');
  await page.keyboard.press('Escape');
  if(errors.length)throw Error(JSON.stringify(errors));
  return {defaultThirdPerson:true,mouseLook:true,cameraRelativeTravel:Math.hypot(dx,dz),singleCenteredReticle:true,mapAndPause:true,comparisonAndPersistence:true,views,rearPhases:rear,liveShot:true,traversals,automaticLift:true,deniedPointerLockFallback:true,errors};
}

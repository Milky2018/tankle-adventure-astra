async page=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.setViewportSize({width:1280,height:720});
  await page.goto('http://127.0.0.1:5174/?chapter=folded&route=foundry&test');await page.waitForFunction(()=>window.__game);
  await page.evaluate(()=>localStorage.removeItem('furnace-born-v2-settings'));await page.reload();await page.waitForFunction(()=>window.__game);
  await page.evaluate(()=>__game.manual(true));
  const before=await page.evaluate(()=>__game.snapshot());
  const prefs=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('furnace-born-v2-settings')).cameraSettings);
  const tune=()=>page.getByRole('button',{name:'Adjust camera',exact:true}).click();
  const change=async(name,steps)=>{const s=page.getByRole('slider',{name,exact:true});await s.focus();await s.press('Home');for(let i=0;i<steps;i++)await s.press('ArrowRight');};
  await page.keyboard.press('Escape');await tune();
  await change('Pitch',600);await change('Follow distance',20);await change('Camera height',30);await change('Shoulder offset',20);
  const third=await prefs(),preview=await page.evaluate(()=>__game.snapshot());
  if(third.third.pitch!==30||third.third.distance!==16||third.third.height!==3||third.third.shoulder!==-1)throw Error('Slider values did not persist');
  if(Math.abs(preview.camera.pitch-Math.PI/6)>.001||preview.camera.distance<15)throw Error('Paused camera did not preview the values');
  if(preview.time!==before.time||preview.player.x!==before.player.x||preview.player.z!==before.player.z)throw Error('Camera preview advanced the game');
  const overlay=await page.locator('#settings').evaluate(el=>({filter:getComputedStyle(el).backdropFilter,background:getComputedStyle(el).backgroundColor}));
  if(overlay.filter!=='none')throw Error('Camera preview is obscured by the pause blur');
  await page.screenshot({path:'output/playwright/camera-settings/third-person.png'});
  await page.reload();await page.waitForFunction(()=>window.__game);await page.evaluate(()=>__game.manual(true));
  if(Math.abs((await page.evaluate(()=>__game.snapshot())).camera.pitch-Math.PI/6)>.001)throw Error('Reload lost camera pitch');
  await page.keyboard.press('Escape');await page.getByLabel('Camera view',{exact:true}).selectOption('overhead');await tune();
  await change('Overhead angle',35);await change('View scale',24);
  const overhead=await prefs();if(overhead.overhead.angle!==65||overhead.overhead.scale!==24||overhead.third.distance!==16)throw Error('View settings are not independent');
  const pose=await page.evaluate(()=>__game.snapshot());
  const dx=pose.camera.position[0]-pose.player.x,dy=pose.camera.position[1]-pose.player.y,dz=pose.camera.position[2]-pose.player.z;
  if(Math.abs(Math.atan2(dy,Math.hypot(dx,dz))*180/Math.PI-65)>.01)throw Error('Overhead angle did not update');
  await page.screenshot({path:'output/playwright/camera-settings/overhead.png'});
  await page.getByRole('button',{name:'Reset',exact:true}).click();
  if((await prefs()).overhead.scale!==17||(await prefs()).third.distance!==15)throw Error('Reset did not restore both views');
  await page.getByRole('button',{name:'Back to settings',exact:true}).click();await page.getByLabel('Camera view',{exact:true}).selectOption('third');await tune();
  for(const name of ['Pitch','Follow distance','Camera height']){const slider=page.getByRole('slider',{name,exact:true});await slider.focus();await slider.press('End');}
  const ceiling=await page.evaluate(()=>{__game.scenario({player:{x:0,y:-16,z:50,hp:100,invincible:1e9}});__game.look(Math.PI,.95);__game.step(.1);return __game.snapshot().camera;});
  // Camera obstruction is resolved by transparency, without shortening the boom.
  if(Math.abs(ceiling.distance-Math.hypot(20,5,0))>1e-6)throw Error('Ceiling changed the configured camera distance');
  await page.getByRole('button',{name:'Reset',exact:true}).click();
  const defaults=await prefs();if(defaults.third.distance!==15||defaults.third.height!==2.5||defaults.third.shoulder!==0)throw Error('Third-person reset failed');
  await page.setViewportSize({width:640,height:600});
  const bounds=await page.locator('#camera-tuning').boundingBox();if(bounds.x<0||bounds.y<0||bounds.y+bounds.height>600)throw Error('Camera panel overflows the viewport');
  await page.screenshot({path:'output/playwright/camera-settings/narrow.png'});
  await page.getByRole('button',{name:'Resume',exact:true}).click();
  if(!(await page.locator('#settings').isHidden())||!(await page.locator('#camera-tuning').isHidden()))throw Error('Resume left camera settings visible');
  if(errors.length)throw Error(errors.join('\n'));
  return {third,overhead,defaults,ceiling,overlay,errors};
}

async page=>{
  await page.setViewportSize({width:1440,height:900});
  const errors=[],views=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/src/folded.js*',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replace('let manual=false','let manual=true')+'\nwindow.__artCheck={scene,world,get camera(){return camera;}};'});});
  await page.goto('http://127.0.0.1:5174/?chapter=folded&test');await page.waitForFunction(()=>window.__artCheck);
  await page.evaluate(()=>localStorage.clear());
  for(const view of ['overhead','third']){
    await page.goto(`http://127.0.0.1:5174/?chapter=folded&view=${view}&test`);await page.waitForFunction(()=>window.__artCheck);
    for(const [name,x,y,z]of [['foundry',0,-8,86],['transit',0,0,27],['garden',48,-8,20],['testworks',90,0,-18],['optics',218,24,-20],['circulation',231,-24,125],['furnace',0,-56,53]]){
      await page.evaluate(({x,y,z})=>{__game.scenario({player:{x,y,z,hp:100,invincible:1e9}});__game.look(Math.PI,.18);__game.step(.2);},{x,y,z});
      const s=await page.evaluate(()=>({camera:__game.snapshot().camera,region:__artCheck.world.presentation.region,bounds:__artCheck.world.presentation.bounds(),depth:__artCheck.scene.getObjectByName('city-architecture-depth').visible}));
      if(s.region!==name||s.bounds.rooms!==70||s.bounds.solids===0||!s.depth)throw Error('Regional presentation '+JSON.stringify({name,view,s}));
      if(view==='third'&&s.camera.distance<7)throw Error('Room envelope collapsed the camera '+name);
      if(name==='testworks'&&view==='overhead'){
        const white=await page.evaluate(async()=>{const im=new Image();im.src=__game.pixel();await im.decode();const c=document.createElement('canvas');c.width=1440;c.height=900;const ctx=c.getContext('2d');ctx.drawImage(im,0,0,1440,900);const a=ctx.getImageData(200,260,230,120).data;let white=0;for(let i=0;i<a.length;i+=4)if(a[i]>220&&a[i+1]>220&&a[i+2]>220)white++;return white;});
        if(white>4)throw Error('Depth/color wall striping returned: '+white);
      }
      await page.screenshot({path:`v2/output/playwright/regional-art/${name}-${view}.png`});views.push({name,view,...s});
    }
  }
  // Actual right-button input restores the optional rail; ordinary fire cannot do it.
  await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test');await page.waitForFunction(()=>window.__artCheck);
  await page.evaluate(()=>{__game.scenario({player:{x:-18,y:0,z:29,magnet:true,hp:100,invincible:1e9}});__game.aimAt(-18,23,1.4);__game.setInput(['Mouse0']);__game.step(.8);__game.setInput([]);});
  if(await page.evaluate(()=>__game.snapshot().state['rail-repair']))throw Error('Rail accepts cannon');
  await page.evaluate(()=>{__game.aimAt(-18,23,1.4);__game.setInput(['Mouse2']);__game.step(.8);__game.setInput([]);});
  if(!await page.evaluate(()=>__game.snapshot().state['rail-repair']))throw Error('Rail cannot be restored with magnetic traction');
  await page.reload();await page.waitForFunction(()=>window.__artCheck);if(!await page.evaluate(()=>__game.snapshot().state['rail-repair']))throw Error('Rail restoration was not saved');
  // The montage changes the rendering camera without moving the simulation player.
  const ending=[];
  for(const view of ['overhead','third']){
    await page.goto(`http://127.0.0.1:5174/?chapter=folded&view=${view}&test`);await page.waitForFunction(()=>window.__artCheck);
    await page.evaluate(()=>{__game.scenario({player:{x:0,y:-56,z:0,hp:50,endingTime:0,phoenix:true},state:{keeper:true,phoenix:true,'last-cage':true,signal:true}});__game.step(.1);});
    await page.keyboard.down('e');await page.evaluate(()=>__game.step(2.1));await page.keyboard.up('e');
    for(const [name,t]of [['dock',1],['carrier',3],['water',4],['signal',5.2],['tender',6.4]]){
      const shot=await page.evaluate(t=>{__game.step(t-__game.snapshot().player.endingTime);const s=__game.snapshot();return {player:[s.player.x,s.player.y,s.player.z],camera:__artCheck.camera.position.toArray(),perspective:__artCheck.camera.isPerspectiveCamera};},t);
      if(shot.player.some((v,i)=>Math.abs(v-[0,-56,0][i])>.1))throw Error('Montage moved player '+name);
      if(t>2.5&&!shot.perspective)throw Error('Montage did not use its perspective camera');
      if(t>2.5&&await page.evaluate(()=>__artCheck.world.occluders.some(o=>o.cameraSoft&&o.meshes.some(m=>m.cameraOpacity!==1))))throw Error('Montage subject faded as a player obstruction');
      await page.screenshot({path:`v2/output/playwright/regional-art/ending-${view}-${name}.png`});ending.push({view,name,...shot});
    }
    await page.evaluate(()=>__game.step(1));await page.locator('#ending-continue').click();
    const restored=await page.evaluate(()=>({s:__game.snapshot(),perspective:!!__artCheck.camera.isPerspectiveCamera,depth:__artCheck.scene.getObjectByName('city-architecture-depth').visible}));
    if(restored.perspective!==(view==='third')||!restored.depth||restored.s.player.endingTime||restored.s.player.y!==-40)throw Error('Continue failed to restore '+view);
  }
  await page.unroute('**/src/folded.js*');if(errors.length)throw Error(errors.join('\n'));
  return {views,ending,railRestored:true,errors};
}

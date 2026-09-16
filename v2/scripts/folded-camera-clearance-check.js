async page=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/src/folded.js*',async route=>{
    const response=await route.fetch();await route.fulfill({response,body:await response.text()+`\nwindow.__clearanceProbe={world,follow};`});
  });
  await page.goto('http://127.0.0.1:5174/?chapter=folded&view=third&route=foundry&test');
  await page.waitForFunction(()=>window.__clearanceProbe);await page.unroute('**/src/folded.js*');
  await page.evaluate(()=>{__game.manual(true);__game.scenario({player:{x:-4,y:-8,z:85.2,hp:100,invincible:1e9}});__game.look(Math.PI,.32);__game.step(.2);});
  await page.keyboard.down('d');
  const crossing=await page.evaluate(()=>{
    const samples=[];
    for(let i=0;i<75;i++){__game.step(1/60,false);const s=__game.snapshot();samples.push({x:s.player.x,distance:s.camera.distance});}
    return samples;
  });await page.keyboard.up('d');
  const minimum=Math.min(...crossing.map(s=>s.distance));
  if(minimum<10)throw Error(`Passing the save-point posts collapsed the camera to ${minimum}`);
  const views=[];
  for(const [name,x,y,z,yaw,pitch]of [
    ['save-post',2.4,-8,85.2,Math.PI,.32],['save-camera',1.25,-8,74,Math.PI,-.2],
    ['save-left',-2.4,-8,85.2,0,.32],['under-furnace',0,-16,50,Math.PI,.6],
    ['wall',-40,-16,49,Math.PI/2,.1]
  ]){
    await page.evaluate(({x,y,z,yaw,pitch})=>{__game.scenario({player:{x,y,z,hp:100,invincible:1e9},state:{'relay-west':false}});__game.look(yaw,pitch);__game.step(.5);},{x,y,z,yaw,pitch});
    const s=await page.evaluate(()=>__game.snapshot());
    if(name.startsWith('save')&&s.camera.distance<10)throw Error(`${name}: repair machinery still pushes the camera`);
    if(name==='save-camera'){
      const inside=await page.evaluate(()=>__clearanceProbe.world.occluders.filter(o=>o.owner?.id==='awakening').some(o=>o.meshes.some(m=>m.cameraBounds?.containsPoint(__clearanceProbe.follow.camera.position)&&m.mesh.material.opacity<.4)));
      if(!inside)throw Error('The inside-post fixture did not exercise translucent camera containment');
    }
    if(name==='wall'&&s.camera.distance>7)throw Error('Solid wall stopped obstructing the camera');
    if(name==='under-furnace'&&s.camera.position[1]>-8.75)throw Error('Camera crossed the ceiling');
    await page.screenshot({path:`v2/output/playwright/camera-clearance/${name}.png`});views.push({name,camera:s.camera});
  }
  await page.evaluate(()=>{__game.scenario({player:{x:2.4,y:-8,z:85.2}});__game.look(Math.PI,.32);__game.step(1);});
  const opacity=await page.evaluate(()=>{
    const h=__clearanceProbe.world.hives.find(h=>h.id==='awakening'),posts=[];
    h.root.traverse(m=>{if(m.isMesh&&Math.abs(m.position.x)===2.4&&m.position.y===1.4)posts.push({x:m.position.x,opacity:m.material.opacity});});return posts;
  });
  if(opacity.find(p=>p.x>0)?.opacity>.4)throw Error('The obstructing post did not become translucent');
  if(opacity.find(p=>p.x<0)?.opacity<.99)throw Error('The unobstructing opposite post also faded');
  const orbit=await page.evaluate(()=>{
    const distances=[];
    for(let i=0;i<72;i++){__game.look(i*Math.PI/36,.32);__game.step(1/60,false);distances.push(__game.snapshot().camera.distance);}
    return Math.min(...distances);
  });
  if(orbit<10)throw Error('Orbiting beside the save point collapsed the camera');
  await page.keyboard.press('Escape');await page.getByLabel('视角',{exact:true}).selectOption('overhead');
  const overhead=await page.evaluate(()=>__game.snapshot());if(overhead.camera.view!=='overhead')throw Error('Overhead view was lost');
  const restored=await page.evaluate(()=>{
    const h=__clearanceProbe.world.hives.find(h=>h.id==='awakening');let valid=true;
    h.root.traverse(m=>{if(m.isMesh&&Math.abs(m.position.x)===2.4&&m.position.y===1.4&&m.material.opacity<.99)valid=false;});return valid;
  });
  if(!restored)throw Error('Third-person prop fading leaked into overhead view');
  await page.getByLabel('视角',{exact:true}).selectOption('third');
  if(errors.length)throw Error(errors.join('\n'));
  return {minimum,orbit,restored,crossingSamples:crossing.length,views,opacity,errors};
}

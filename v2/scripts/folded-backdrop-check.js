async page=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1440,height:900});
  await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');await page.waitForFunction(()=>window.__game?.debug);
  const samples=[];
  for(const [name,x,y,z,view,yaw,pitch]of [
    ['opening',0,-8,86,'overhead',0,.32],['opening-eye',0,-8,86,'third',Math.PI,-.1],
    ['garden',-164,-8,88,'third',Math.PI/2,.1],['upper',204,40,146,'third',-.7,-.05],
    ['inspection',161,20,-146,'overhead',0,.32],['deep',150,-40,6,'third',0,.1],
    ['keeper',0,-56,54,'overhead',0,.32]
  ]){
    samples.push(await page.evaluate(({name,x,y,z,view,yaw,pitch})=>{
      const g=__game,a=g.debug;g.manual(true);a.setCameraView(view);
      g.scenario({player:{x,y,z,hp:50,invincible:1e9},enemies:Object.fromEntries(a.world.enemies.map(e=>[e.id,0]))});
      if(view==='third')g.look(yaw,pitch);g.step(.2);
      const backdrop=a.world.presentation.backdrop,root=backdrop.root;
      if(!root||!(view==='third'?a.scene.background?.isTexture:a.scene.background?.isColor))throw Error('Missing backdrop');
      const samples=[];
      for(const visible of [false,true]){
        root.visible=visible;for(let i=0;i<12;i++)a.draw();
        const times=[];for(let i=0;i<40;i++){const start=performance.now();a.draw();times.push(performance.now()-start);}times.sort((a,b)=>a-b);
        samples.push({visible,calls:a.renderer.info.render.calls,triangles:a.renderer.info.render.triangles,medianRenderMs:times[20]});
      }
      if(samples[1].calls-samples[0].calls>12)throw Error('Backdrop adds excessive draw submissions '+JSON.stringify(samples));
      if(a.camera.far>160)throw Error('Backdrop extended camera draw distance');
      return {name,view,backgroundIntensity:a.scene.backgroundIntensity,far:a.camera.far,samples};
    },{name,x,y,z,view,yaw,pitch}));
    await page.screenshot({path:`v2/output/playwright/regression/backdrop-${name}.png`});
  }
  const memory=await page.evaluate(()=>{
    const g=__game,a=g.debug;
    for(let i=0;i<4;i++){a.setCameraView(i%2?'third':'overhead');g.step(0);}
    const before={...a.renderer.info.memory};
    for(let i=0;i<20;i++){a.setCameraView(i%2?'third':'overhead');g.step(0);}
    const after={...a.renderer.info.memory};
    if(after.textures!==before.textures||after.geometries!==before.geometries)throw Error('Background resources accumulate on view changes '+JSON.stringify({before,after}));
    return {before,after};
  });
  const ending=await page.evaluate(()=>{
    const a=__game.debug,b=a.world.presentation.backdrop;
    b.update(0,{y:16,endingTime:0},{});const before=a.scene.backgroundIntensity;
    b.update(0,{y:16,endingTime:25},{});const after=a.scene.backgroundIntensity;
    return {before,after};
  });
  if(ending.after<=ending.before||errors.length)throw Error(JSON.stringify({ending,errors}));
  return {samples,memory,ending,errors};
}

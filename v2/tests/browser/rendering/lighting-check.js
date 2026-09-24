async page=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.setViewportSize({width:1280,height:720});
  const results=[];
  for(const view of ['third','overhead']){
    await page.goto(`http://127.0.0.1:5174/?chapter=folded&view=${view}&test`);await page.waitForFunction(()=>window.__game?.debug);await page.evaluate(()=>__game.manual(true));
    for(const [name,x,y,z,yaw,pitch]of [['under-furnace',0,-16,50,Math.PI,.32],['canal',0,-16,-4,Math.PI/2,.2],['opening',0,-8,86,Math.PI,.32]]){
      await page.evaluate(s=>{__game.scenario({player:{x:s.x,y:s.y,z:s.z,hp:100,invincible:1e9}});__game.look(s.yaw,s.pitch);__game.step(.1);},{x,y,z,yaw,pitch});
      const samples=[];
      for(const legacy of [false,true]){
        const sample=await page.evaluate(async legacy=>{
          const q=__game.debug,ambient=q.scene.children.find(o=>o.isAmbientLight),hemi=q.scene.children.find(o=>o.isHemisphereLight);
          ambient.intensity=legacy?0:1.2;hemi.groundColor.setHex(legacy?0x426171:0x7e948b);q.draw();
          const img=new Image();img.src=document.getElementById('game').toDataURL();await img.decode();const c=document.createElement('canvas');c.width=1280;c.height=720;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);const a=ctx.getImageData(240,160,800,500).data;let sum=0,white=0;for(let i=0;i<a.length;i+=4){sum+=(a[i]+a[i+1]+a[i+2])/3;if(a[i]>245&&a[i+1]>245&&a[i+2]>245)white++;}
          return {brightness:sum/(a.length/4),clipped:white/(a.length/4),shadows:q.renderer.shadowMap.enabled};
        },legacy);samples.push(sample);
        if(!legacy)await page.screenshot({path:`output/playwright/camera-input-light/${view}-${name}-fixed.png`});
      }
      await page.evaluate(()=>{const q=__game.debug;q.scene.children.find(o=>o.isAmbientLight).intensity=1.2;q.scene.children.find(o=>o.isHemisphereLight).groundColor.setHex(0x7e948b);q.draw();});
      if(samples[0].brightness<samples[1].brightness+5)throw Error(`${view}/${name}: shaded scene did not improve`);
      if(!samples[0].shadows||samples[0].clipped>.01)throw Error(`${view}/${name}: lighting lost shadowing or clipped highlights`);
      results.push({view,name,fixed:samples[0],legacy:samples[1]});
    }
  }
  if(errors.length)throw Error(errors.join('\n'));return {results,errors};
}

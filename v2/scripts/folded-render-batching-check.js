async page=>{
  await page.setViewportSize({width:1280,height:720});
  const errors=[],images=new Map(),results=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.addInitScript(()=>localStorage.clear());
  let unbatched=false;
  await page.route('**/src/folded-world.js*',async route=>{
    const response=await route.fetch();let body=await response.text();
    if(unbatched)body=body.replace('batchStatic(floorBatches,{preserveGeometry:true});','')
      .replace('batchStatic(floorTrimBatches);','')
      .replace(/batchRigidParts\(model.root,\[.*?\]\);/,'');
    await route.fulfill({response,body});
  });
  await page.route('**/src/folded.js*',async route=>{
    const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('let manual=false','let manual=true')+'\nwindow.__batchCheck={renderer,world};'});
  });
  for(const mode of ['unbatched','batched']){
    unbatched=mode==='unbatched';
    for(const [name,view,x,y,z]of [['opening','third',0,-8,86],['floor','overhead',0,-8,86],['hub','overhead',0,0,27],['canal','third',0,-16,-4],['carrier','third',90,0,-18],['optics','overhead',216,24,-20]]){
      await page.goto(`http://127.0.0.1:5174/?chapter=folded&view=${view}&test`);await page.waitForFunction(()=>window.__batchCheck);
      await page.evaluate(({x,y,z})=>{__game.scenario({player:{x,y,z,hp:100,invincible:1e9}});__game.look(Math.PI,.32);__game.step(.2);},{x,y,z});
      const pixels=await page.evaluate(async()=>{
        const image=new Image();image.src=__game.pixel();await image.decode();
        const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;
        const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0,320,180);
        return Array.from(ctx.getImageData(0,0,320,180).data);
      });
      await page.screenshot({path:`v2/output/playwright/render-optimization/${name}-${mode}.png`});
      if(unbatched)images.set(name,pixels);
      else{
        const before=images.get(name);let total=0,changed=0;
        for(let i=0;i<pixels.length;i+=4){const delta=[0,1,2].map(c=>Math.abs(pixels[i+c]-before[i+c]));total+=delta.reduce((a,b)=>a+b,0);if(Math.max(...delta)>30)changed++;}
        const meanDifference=total/(pixels.length/4*3),changedFraction=changed/(pixels.length/4);
        if(meanDifference>.8||changedFraction>.01)throw Error(`${name}: batching changed the image ${JSON.stringify({meanDifference,changedFraction})}`);
        results.push({name,meanDifference,changedFraction,drawCalls:await page.evaluate(()=>__game.snapshot().drawCalls)});
      }
    }
  }
  await page.unroute('**/src/folded.js*');await page.unroute('**/src/folded-world.js*');
  if(errors.length)throw Error(errors.join('\n'));
  return {results,errors};
}

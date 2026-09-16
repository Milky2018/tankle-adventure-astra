async page=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.route('**/src/folded.js*',async route=>{
    const response=await route.fetch();
    await route.fulfill({response,body:await response.text()+`
      window.__floorCheck={world,scene,renderer,camera};
    `});
  });
  await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test');
  await page.waitForFunction(()=>window.__floorCheck);
  await page.unroute('**/src/folded.js*');
  await page.evaluate(()=>{
    __game.manual(true);__floorCheck.renderer.shadowMap.enabled=false;
    __game.scenario({player:{x:0,y:-8,z:86,hp:50}});__game.step(.1);
  });
  async function sample(){
    return page.evaluate(async()=>{
      const image=new Image();image.src=__game.pixel();await image.decode();
      const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
      const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
      return [[-8,80],[-8,90]].map(([x,z])=>{
        const q=__game.project(x,z,-7.99),px=Math.round(q.x*canvas.width/innerWidth),py=Math.round(q.y*canvas.height/innerHeight);
        const data=ctx.getImageData(px-2,py-2,5,5).data;
        return [0,1,2].map(c=>Array.from({length:25},(_,i)=>data[i*4+c]).sort((a,b)=>a-b)[12]);
      });
    });
  }
  const fixed=await sample(),difference=colors=>Math.max(...colors[0].map((v,i)=>Math.abs(v-colors[1][i])));
  if(difference(fixed)>14)throw Error('Continuous awakening floor has a false hole: '+JSON.stringify(fixed));
  await page.screenshot({path:'v2/output/playwright/polish-pass/floor-fixed.png'});
  // Counterfactual: removing only the depth pass must reproduce the original false hole.
  await page.evaluate(()=>__floorCheck.scene.traverse(o=>{if(o.name.startsWith('folded-floor-depth:'))o.visible=false;}));
  const broken=await sample();
  if(difference(broken)<30)throw Error('Floor reproduction no longer exercises lower-structure overdraw: '+JSON.stringify(broken));
  await page.screenshot({path:'v2/output/playwright/polish-pass/floor-counterfactual.png'});
  await page.evaluate(()=>{__floorCheck.scene.traverse(o=>{if(o.name.startsWith('folded-floor-depth:'))o.visible=true;});__floorCheck.renderer.shadowMap.enabled=true;});
  const samples=[];
  for(const [name,x,y,z] of [['relay',-35,-16,49],['hub',0,0,27],['canal',0,-16,-4],['carrier',90,0,-18],['optics',216,24,-20],['inner',254,-24,132]]){
    await page.evaluate(([x,y,z])=>{__game.scenario({player:{x,y,z,hp:50,invincible:1e9}});__game.step(.7);},[x,y,z]);
    const snapshot=await page.evaluate(()=>__game.snapshot());
    samples.push({name,drawCalls:snapshot.drawCalls,translucent:snapshot.surfaces.length});
    await page.screenshot({path:`v2/output/playwright/polish-pass/floor-${name}.png`});
  }
  const before=await page.evaluate(()=>{__game.scenario({player:{x:90,y:0,z:-18,hp:50,invincible:1e9}});__game.manual(false);return {frames:__game.snapshot().frames,at:performance.now()};});
  await page.waitForTimeout(1500);
  const performanceSample=await page.evaluate(before=>{__game.manual(true);const s=__game.snapshot();return {fps:(s.frames-before.frames)*1000/(performance.now()-before.at),drawCalls:s.drawCalls};},before);
  if(errors.length)throw Error(JSON.stringify(errors));
  return {fixed,broken,samples,performanceSample,errors};
}

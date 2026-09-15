async page=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.route('**/src/main.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+`\nwindow.__hoistRender=()=>{const reset=renderer.info.autoReset;renderer.info.autoReset=false;renderer.info.reset();renderer.render(scene,camera);const {calls,triangles}=renderer.info.render;renderer.info.autoReset=reset;const buffers=new Set();scene.traverse(m=>{if(m.isMesh)for(const a of [...Object.values(m.geometry.attributes),m.geometry.index].filter(Boolean))buffers.add(a.array.buffer);});return {calls,triangles,shadows:renderer.shadowMap.enabled,geometryMiB:[...buffers].reduce((s,b)=>s+b.byteLength,0)/1048576};};`});});
  await page.goto('http://127.0.0.1:5174/?chapter=hoist&test');await page.waitForFunction(()=>__game);await page.unroute('**/src/main.js*');
  await page.locator('#settings-button').click();await page.locator('#quality').selectOption('high');await page.locator('#resume').click();
  const samples=[];
  for(const [name,x,z,y]of [['entry',290,-78,0],['gallery',296,-126,8],['upper',305,-171,16],['crown',324,-109,24],['sump',300,-106,-8]]){
    await page.evaluate(([x,z,y])=>{__game.scenario({player:{x,z,hoistY:y,hp:50,weapon:'mortar',mortar:true}});__game.step(.3);},[x,z,y]);
    const before=await page.evaluate(()=>({frames:__game.snapshot().frames,at:performance.now()}));await page.waitForTimeout(1000);const stats=await page.evaluate(()=>({...__hoistRender(),frames:__game.snapshot().frames,at:performance.now()}));
    const fps=(stats.frames-before.frames)*1000/(stats.at-before.at);samples.push({name,shadows:stats.shadows,calls:stats.calls,triangles:stats.triangles,geometryMiB:stats.geometryMiB,fps});
    if(stats.triangles>2e6||stats.geometryMiB>64||fps<40)throw Error('Rendering budget '+JSON.stringify(samples));
    if(name==='gallery'||name==='crown')await page.screenshot({path:`v2/output/playwright/hoist/final-${name}.png`});
  }
  await page.keyboard.press('Tab');await page.screenshot({path:'v2/output/playwright/hoist/final-map.png'});await page.keyboard.press('Tab');
  await page.locator('#settings-button').click();await page.locator('#quality').selectOption('low');await page.locator('#resume').click();await page.waitForTimeout(300);await page.screenshot({path:'v2/output/playwright/hoist/low-quality.png'});await page.keyboard.press('Escape');
  await page.locator('#quality').selectOption('high');
  if(errors.length)throw Error(JSON.stringify(errors));return {samples,errors};
}

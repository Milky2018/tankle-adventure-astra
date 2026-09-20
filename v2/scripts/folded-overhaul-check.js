async page=>{
  const errors=[],views=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5174/?chapter=folded&view=third&test&manual');await page.waitForFunction(()=>window.__game?.debug);
  await page.setViewportSize({width:1280,height:800});
  const start=await page.evaluate(()=>{__game.manual(true);__game.scenario({player:{x:0,y:-8,z:86}});__game.step(.1);return __game.snapshot().camera;});
  await page.keyboard.press('c');const overhead=await page.evaluate(()=>__game.snapshot().camera);
  await page.keyboard.press('c');const third=await page.evaluate(()=>__game.snapshot().camera);
  if(start.view!=='third'||overhead.view!=='overhead'||third.view!=='third')throw Error('C toggle failed '+JSON.stringify({start,overhead,third}));
  for(const [name,x,y,z]of [['hive',0,-8,86],['arsenal',-212,8,18],['reservoir',-212,-8,-174],['proving',64,16,-206],['lens',344,24,-32],['coolant',344,-24,132],['hearth',-124,-40,52]]){
    const result=await page.evaluate(({x,y,z})=>{__game.scenario({player:{x,y,z,hp:100,invincible:1e9}});__game.look(Math.PI/2,.22);__game.step(.1);const distances=[];for(const yaw of [0,Math.PI/2,Math.PI,Math.PI*1.5]){__game.look(yaw,.22);__game.step(.05);distances.push(__game.snapshot().camera.distance);}__game.look(Math.PI/2,.22);__game.step(.1);return {camera:__game.snapshot().camera,distances,region:__game.debug.world.presentation.region};},{x,y,z});
    if(Math.max(...result.distances)-Math.min(...result.distances)>.001)throw Error('Camera retracts '+name);
    await page.screenshot({path:`v2/output/playwright/overhaul/${name}.png`});views.push({name,...result});
  }
  const circuits=await page.evaluate(()=>__game.debug.scene.children.filter(c=>c.name.startsWith('folded-circuit:')).map(c=>c.name));
  if(!circuits.some(n=>n==='folded-circuit:load:carrier')||circuits.some(n=>n==='folded-circuit:mirror-index:return-index'))throw Error('Missing linked circuits');
  if(errors.length)throw Error(errors.join('\n'));
  return {views,circuits:circuits.length,errors};
}

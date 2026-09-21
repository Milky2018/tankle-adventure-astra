async page=>{
 await page.setViewportSize({width:1280,height:800});
 const errors=[],views=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error'&&/THREE|WebGL|shader/i.test(m.text()))errors.push(m.text());});
 const cases=[
  ['foundry-opening',0,-8,86,Math.PI],['foundry',-36,-16,49,Math.PI],
  ['transit',-112,8,13,Math.PI],['magnet-installation',-120,8,-48,Math.PI],
  ['garden',-76,-8,64,-Math.PI/2],['garden-ruins',-128,-8,60,Math.PI],['flotation-installation',-164,-8,69,Math.PI],
  ['testworks',148,16,-176,Math.PI/2],['phoenix-installation',218,16,-110,Math.PI],['phoenix-runway',238,16,-105,0],
  ['optics',271,24,-65,Math.PI/2],['laser-installation',324,24,-32,0],
  ['circulation',312,-24,186,Math.PI],['circulation-installation',374,-24,121,Math.PI],
  ['predecessors',68,-40,6,Math.PI],['furnace',0,-56,53,Math.PI]
 ];
 for(const view of ['overhead','third']){
  await page.goto(`http://127.0.0.1:5174/?chapter=folded&view=${view}&test&manual`);
  await page.waitForFunction(()=>window.__game?.debug);
  for(const [name,x,y,z,yaw]of cases){
   await page.evaluate(({x,y,z,yaw,name})=>{
    const g=__game;g.setInput([]);g.scenario({player:{x,y,z,hp:100,invincible:1e9,deployed:name==='garden-ruins',flotation:name==='garden-ruins'}});
    g.look(yaw,15.3*Math.PI/180);g.step(.3);
   },{x,y,z,yaw,name});
   const result=await page.evaluate(()=>{
    const g=__game,d=g.debug,s=g.snapshot();
    return {camera:s.camera,region:d.world.presentation.region,drawCalls:d.renderer.info.render.calls,triangles:d.renderer.info.render.triangles,lights:d.world.presentation.localLights.slots.length,player:[s.player.x,s.player.y,s.player.z]};
   });
   if(Math.abs(result.player[1]-y)>.1)throw Error(`${name}: unsupported fixture ${result.player}`);
   if(result.lights!==3)throw Error('Unbounded local light count');
   if(view==='third'&&result.camera.distance<14.95)throw Error(`${name}: camera shortened ${result.camera.distance}`);
   await page.screenshot({path:`v2/output/playwright/regional-identity/${name}-${view}.png`});
   views.push({name,view,...result});
  }
 }
 if(errors.length)throw Error(errors.join('\n'));
 return {views,errors};
}

async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));

  await page.setViewportSize({width:1440,height:900});await page.goto('http://127.0.0.1:5174/?chapter=folded&test&manual&view=third');await page.waitForFunction(()=>window.__game?.debug);
  const results=[];
  for(const view of ['third','overhead'])for(const [id,x,y,z,yaw]of [['opening',0,-8,86,Math.PI],['arsenal',-110,8,15,-Math.PI/2],['magnet',-128,8,-54,Math.PI/2],['flotation',-164,-8,84,Math.PI],['laser',324,24,-36,0],['rig',226,-24,118,Math.PI],['keeper',0,-56,53,Math.PI]]){
   results.push(await page.evaluate(async({view,id,x,y,z,yaw})=>{
    const {foldedSupport}=await import('/src/world/terrain.js');if(!foldedSupport(x,z,y,false))throw Error(id+' fixture has no floor');
    const g=__game;g.scenario({enemies:Object.fromEntries(__game.debug.world.enemies.map(e=>[e.id,0])),player:{x,y,z,hp:50,heat:0,endingTime:0}});__game.debug.setCameraView(view);g.look(yaw,.32);g.step(.1);
    return {id,view,camera:g.snapshot().camera,drawCalls:g.snapshot().drawCalls};
   },{view,id,x,y,z,yaw}));
   await page.screenshot({path:`output/playwright/enclosed-bosses/room-${id}-${view}.png`});
  }
  if(errors.length)throw Error(errors.join('\n'));return {results,errors};
}

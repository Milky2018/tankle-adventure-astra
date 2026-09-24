async page=>{
 const errors=[],views=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1440,height:900});
 for(const view of ['overhead','third']){
  await page.goto(`http://127.0.0.1:5174/?chapter=folded&view=${view}&test&manual`);await page.waitForFunction(()=>window.__game?.debug);
  await page.evaluate(()=>{const state=JSON.parse(localStorage.getItem('furnace-born-v2-city')||'{}');state.maintenance=true;state.sidePuzzles={gutter:{grown:true},rail:{solved:true},coverX:116};localStorage.setItem('furnace-born-v2-city',JSON.stringify(state));});
  await page.reload();await page.waitForFunction(()=>window.__game?.debug);
  for(const [name,x,y,z,yaw]of [['yard',-374,8,-74,Math.PI],['care',44,-8,39,Math.PI],['sorter',116,24,-112,Math.PI/2],['tender',134,-16,14,-Math.PI/4]]){
   const result=await page.evaluate(({x,y,z,yaw})=>{__game.scenario({player:{x,y,z,hp:50,invincible:1e9}});__game.look(yaw,.3);__game.step(.2);return {camera:__game.snapshot().camera,position:__game.snapshot().player.height};},{x,y,z,yaw});
   if(result.position!==y||result.camera.distance<11)throw Error('Optional-room camera/support regression '+name);
   await page.screenshot({path:`output/playwright/completion/${name}-${view}.png`});views.push({name,view,...result});
  }
  if(view==='third'){
   const result=await page.evaluate(()=>{
    const {world:w,camera:c,T}=__game.debug;__game.scenario({player:{x:36,y:-8,z:38}});__game.look(Math.PI/2,.15);__game.step(.2);const p=__game.snapshot().player,origin=c.position.clone(),delta=new T.Vector3(p.x,p.y+1.6,p.z).sub(origin),distance=delta.length();delta.normalize();
    const physical=w.cast(origin,delta,distance,{targets:false}),aim=w.cast(origin,delta,distance,{targets:false,aiming:true});return {physical:physical?.distance,aim:aim?.distance,distance};
   });
   if(!result.physical||result.aim&&result.aim<result.distance-1)throw Error('Transparent care wall still intercepts camera aiming '+JSON.stringify(result));
  }
 }
 if(errors.length)throw Error(errors.join('\n'));return {views,errors};
}

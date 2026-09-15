async page=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/src/main.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+`
window.__reticleProbe=()=>{
  const point=player.weapon==='mortar'?aim.clone():hoist.aimPoint(player,aim),screen=point.clone().project(camera);
  return {point:point.toArray(),intent:aim.toArray(),direction:hoist.direction(player,aim).toArray(),pitch:model.barrel.rotation.x,pointer:{x:pointer.x,y:pointer.y},expected:{x:(screen.x*.5+.5)*innerWidth,y:(.5-screen.y*.5)*innerHeight},actual:{x:parseFloat($('reticle').style.left),y:parseFloat($('reticle').style.top)},reticles:document.querySelectorAll('#reticle').length};
};`});});
  await page.goto('http://127.0.0.1:5174/?chapter=hoist&test');await page.evaluate(()=>localStorage.removeItem('furnace-born-v2-hoist-preview'));await page.reload();await page.waitForFunction(()=>window.__reticleProbe);await page.unroute('**/src/main.js*');
  const checks=[];
  for(const [name,weapon,x,z,y,tx,tz,ty,limit]of [
    ['upper limit','cannon',306,-126,8,310,-126,13.1,1],
    ['lower limit','cannon',291,-99,8,282,-99,1,-1],
    ['Laser upper limit','laser',306,-126,8,310,-126,13.1,1],
    ['return inside range','cannon',306,-126,8,302,-128,8,0],
    ['level aim','cannon',290,-84,0,297,-84,0,0],
    ['Mortar landing','mortar',290,-84,0,297,-84,0,0]
  ]){
    await page.evaluate(([weapon,x,z,y])=>{__game.scenario({player:{x,z,hoistY:y,weapon,mortar:true,laser:true}});__game.step(1);},[weapon,x,z,y]);
    const cursor=await page.evaluate(([x,z,y])=>__game.project(x,z,y),[tx,tz,ty]);await page.mouse.move(cursor.x,cursor.y);
    await page.evaluate(()=>__game.step(1));
    const probe=await page.evaluate(()=>__reticleProbe());
    const pixelError=Math.hypot(probe.actual.x-probe.expected.x,probe.actual.y-probe.expected.y);
    const angle=Math.asin(probe.direction[1])*180/Math.PI;
    if(pixelError>.1||probe.reticles!==1)throw Error('Reticle projection '+JSON.stringify(probe));
    if(limit&&(Math.abs(angle-limit*40)>.01||Math.hypot(probe.actual.x-probe.pointer.x,probe.actual.y-probe.pointer.y)<1))throw Error('Angle boundary '+JSON.stringify(probe));
    if(weapon!=='mortar'&&Math.abs(probe.pitch+angle*Math.PI/180)>.01)throw Error('Barrel disagrees '+JSON.stringify(probe));
    if(!limit&&probe.point.some((v,i)=>Math.abs(v-probe.intent[i])>.001))throw Error('Reachable target moved '+JSON.stringify(probe));
    checks.push({name,angle,pixelError,probe});
    if(name==='upper limit'||name==='return inside range')await page.screenshot({path:`v2/output/playwright/hoist-reticle/${name.replaceAll(' ','-')}.png`});
  }
  await page.keyboard.press('Escape');if(errors.length)throw Error(JSON.stringify(errors));return {checks,errors};
}

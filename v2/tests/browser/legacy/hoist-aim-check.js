async page=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/src/legacy/main.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+`\nwindow.__aimProbe=()=>({pitch:model.barrel.rotation.x,direction:hoist.direction(player,aim).toArray(),aim:aim.toArray()});`});});
  await page.goto('http://127.0.0.1:5174/?chapter=hoist&test');
  await page.evaluate(()=>localStorage.removeItem('furnace-born-v2-hoist-preview'));await page.reload();await page.waitForFunction(()=>window.__aimProbe);await page.unroute('**/src/legacy/main.js*');
  const checks=[];
  for(const [name,weapon,x,z,y,tx,tz,ty,expected]of [
    ['ground Cannon','cannon',290,-84,0,297,-84,0,'level'],
    ['gallery under transparent decks','cannon',296,-126,8,299,-126,8,'level'],
    ['ground Laser','laser',290,-84,0,297,-84,0,'level'],
    ['upper latch','cannon',296,-126,8,310,-126,13.1,'up'],
    ['lower ballast','cannon',296,-126,8,282,-99,1,'down'],
    ['Mortar landing','mortar',290,-84,0,297,-84,0,'mortar']
  ]){
    await page.evaluate(([weapon,x,z,y,tx,tz,ty])=>{__game.scenario({player:{x,z,hoistY:y,weapon,mortar:true,laser:true}});__game.step(.5);__game.aimAt(tx,tz,ty);__game.step(.8);},[weapon,x,z,y,tx,tz,ty]);
    const probe=await page.evaluate(()=>__aimProbe());
    const valid=expected==='level'?Math.abs(probe.pitch)<.01&&Math.abs(probe.direction[1])<.001:expected==='up'?probe.pitch<-.1&&probe.direction[1]>.1:expected==='down'?probe.pitch>.1&&probe.direction[1]<-.1:Math.abs(probe.pitch+.35)<.01&&Math.abs(probe.aim[1])<.001;
    checks.push({name,...probe,passed:valid});if(!valid)throw Error(JSON.stringify(checks));
  }
  await page.keyboard.press('Escape');if(errors.length)throw Error(JSON.stringify(errors));return {checks,errors};
}

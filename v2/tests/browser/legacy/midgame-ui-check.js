async(page)=>{
  await page.goto('http://127.0.0.1:5174/?chapter=4&test');await page.waitForFunction(()=>window.__game);
  const checks=[];
  await page.evaluate(()=>{const g=window.__game;g.setInput([]);g.scenario({player:{x:190,z:-134,hp:50,weapon:'cannon',mortar:true,laser:true,phoenix:true,circulation:true,heat:0,overheated:false,lastHeat:-10,speed:1},enemiesByIndex:Object.fromEntries(g.snapshot().enemies.map((_,i)=>[i,{hp:0}]))});g.step(.1);});
  await page.keyboard.press('KeyQ');checks.push({name:'Q selects Mortar',passed:await page.evaluate(()=>window.__game.snapshot().player.weapon==='mortar')});
  await page.keyboard.press('KeyQ');checks.push({name:'Q selects Laser',passed:await page.evaluate(()=>window.__game.snapshot().player.weapon==='laser')});
  const aim=await page.evaluate(()=>window.__game.project(202,-134));await page.mouse.move(aim.x,aim.y);await page.mouse.down();
  await page.waitForFunction(()=>window.__game.snapshot().laser.length===2);
  await page.screenshot({path:'output/playwright/midgame-calibration.png'});
  checks.push({name:'Held mouse produces the reflected beam and one warm reticle',passed:await page.evaluate(()=>window.__game.snapshot().laser[0].kind==='mirror'&&document.querySelectorAll('#reticle').length===1)});
  await page.mouse.up();await page.waitForFunction(()=>window.__game.snapshot().laser.length===0);
  checks.push({name:'Mouse release stops the beam',passed:true});
  await page.keyboard.press('KeyQ');checks.push({name:'Q returns to Cannon',passed:await page.evaluate(()=>window.__game.snapshot().player.weapon==='cannon')});
  await page.evaluate(()=>{const g=window.__game;g.scenario({player:{x:228,z:-428,heat:98,overheated:false,lastHeat:g.snapshot().time,speed:3.2}});g.step(.02);});
  await page.keyboard.down('KeyS');await page.keyboard.down('KeyA');await page.keyboard.down('ShiftLeft');
  await page.waitForFunction(()=>window.__game.snapshot().player.overheated&&window.__game.snapshot().player.z>-421);
  await page.screenshot({path:'output/playwright/midgame-circulation.png'});
  await page.keyboard.up('KeyS');await page.keyboard.up('KeyA');await page.keyboard.up('ShiftLeft');
  checks.push({name:'Real movement input sustains red-hot Phoenix',passed:await page.evaluate(()=>window.__game.snapshot().player.overheated&&window.__game.snapshot().player.speed>3)});
  for(const [name,x,z]of [['testworks',-15,-412],['guardian',232,-226],['junction',104,-406]]){
    await page.evaluate(({name,x,z})=>{const g=window.__game;g.setInput([]);g.scenario({player:{x,z,heat:0,overheated:false,lastHeat:-10,speed:1,weapon:'laser'}});if(name==='guardian')g.scenario({enemies:{guardian:{hp:18,state:'idle',timer:20,x:232,z:-235,heading:0}}});g.step(.1);if(name==='guardian'){g.aimAt(211,-256);g.setInput(['Mouse0']);g.step(.2);}},{name,x,z});
    await page.screenshot({path:`output/playwright/midgame-${name}.png`});
  }
  await page.keyboard.press('Escape');
  if(checks.some(c=>!c.passed))throw Error(JSON.stringify(checks));return checks;
}

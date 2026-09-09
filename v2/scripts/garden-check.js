async(page)=>{
  await page.goto('http://127.0.0.1:5174/?chapter=3&test');await page.waitForFunction(()=>window.__game);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const results=await page.evaluate(()=>{
    const g=window.__game,checks=[],check=(name,passed,detail)=>checks.push({name,passed:!!passed,detail});
    const initial=g.snapshot(),quiet=Object.fromEntries(initial.enemies.map((_,i)=>[i,{hp:0}])),turret=initial.enemies.findIndex(e=>e.encounter==='r3-bank'&&e.type==='turret'),mortar=initial.enemies.findIndex(e=>e.encounter==='r3-lower'&&e.type==='mortar');
    const setup=(x,z,deployed=false)=>{g.setInput([]);g.scenario({enemiesByIndex:quiet,player:{x,z,hp:50,heat:0,overheated:false,speed:1,flotation:true,deployed,afloat:false,lastShot:-10,lastHeat:-10,invincible:0,weapon:'cannon',underpass:false}});g.step(.01);};
    setup(-160,-218);g.setInput(['KeyW','KeyD','ShiftLeft']);g.step(1);g.setInput([]);
    check('Ordinary tracks cannot enter the first crossing even with Overdrive',g.snapshot().player.z>-220);
    g.toggleFlotation();g.setInput(['KeyW','KeyD','ShiftLeft']);g.step(1);g.setInput([]);
    check('Deployed floats cross the unsupported water',g.snapshot().player.afloat&&g.snapshot().player.z<-222);
    check('Water travel cannot engage Overdrive',g.snapshot().player.speed===1);
    check('Retraction is rejected in deep water',!g.toggleFlotation()&&g.snapshot().player.deployed);
    setup(-155,-177,true);g.setInput(['KeyW','KeyD','ShiftLeft']);g.step(1);g.setInput([]);
    check('Current is visible movement pressure but remains reversible',Math.abs(g.snapshot().player.z-(-181.05))<.15,g.snapshot().player.z);
    check('Flotation itself generates no heat',g.snapshot().player.heat===0);
    setup(-158,-277,true);g.scenario({enemiesByIndex:{[turret]:{hp:2,state:'idle',timer:20}}});g.aimAt(-168,-277);g.fire();g.step(.4);
    check('Cannon crosses water to damage a bank defender',g.snapshot().enemies[turret].hp===1,g.snapshot().enemies[turret].hp);
    check('Firing afloat still uses the shared heat budget',g.snapshot().player.heat===20);
    setup(-158,-277,true);g.scenario({enemiesByIndex:{[turret]:{hp:2,state:'burst',shotsLeft:3,cooldown:0,aim:Math.PI/2}}});g.step(1.1);
    check('Floating chassis remains vulnerable to direct fire across water',g.snapshot().player.hp<50,g.snapshot().player.hp);
    setup(-158,-277,true);g.scenario({enemiesByIndex:{[mortar]:{x:-168,z:-277,hp:2,state:'idle',timer:0}}});g.step(2.5);
    check('Overhead mortar strikes still damage floating tanks',g.snapshot().player.hp===42,g.snapshot().player.hp);
    setup(-160,-233,true);g.scenario({player:{heat:100,overheated:true}});g.setInput(['KeyW','KeyD']);g.step(.5);g.setInput([]);
    check('Overheated flotation remains mobile',g.snapshot().player.z<-235&&g.snapshot().player.overheated);
    setup(-160,-233,true);g.hitPlayer(50,-160,-233);g.step(3.7);
    check('Death returns to a dry checkpoint with floats retracted',g.snapshot().player.hp===50&&!g.snapshot().player.deployed&&!g.snapshot().player.afloat&&!g.collides(g.snapshot().player.x,g.snapshot().player.z));
    setup(-154,-205);return checks;
  });
  await page.keyboard.press('f');results.push(await page.evaluate(()=>({name:'Real F input deploys the chassis',passed:window.__game.snapshot().player.deployed})));
  await page.keyboard.press('f');results.push(await page.evaluate(()=>({name:'Real F input retracts on supported ground',passed:!window.__game.snapshot().player.deployed})));
  await page.keyboard.press('Tab');results.push({name:'Map opens with the garden discovered',passed:await page.locator('#region').isVisible()});await page.keyboard.press('Tab');
  await page.locator('#settings-button').click();results.push({name:'Flotation has a visible rebind control',passed:await page.getByText('展开 / 收起浮航底盘',{exact:true}).isVisible()});await page.locator('#resume').click();
  if(errors.length||results.some(r=>!r.passed))throw new Error(JSON.stringify({errors,results}));return results;
}

async page=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test');await page.waitForFunction(()=>!!window.__game);
  await page.evaluate(()=>{const g=__game;g.manual(true);g.scenario({player:{x:44,y:-40,z:-10,speed:1,circulation:false,overheated:false,endingTime:0},state:{keeper:true,'last-cage':true}});});
  await page.keyboard.press('e');
  let s=await page.evaluate(()=>__game.snapshot());if(s.state.anchor!=='last-refuge')throw Error('Final refuge not saved');
  await page.evaluate(()=>{__game.scenario({player:{x:37,y:-16,z:-10,hp:1,speed:1,invincible:0,deployed:false},enemies:{'bank-gunner':3}});__game.step(.1);});
  s=await page.evaluate(()=>__game.snapshot());if(s.player.hp!==0)throw Error('Damage did not cause death');
  await page.evaluate(()=>__game.step(3));s=await page.evaluate(()=>__game.snapshot());
  if(s.player.hp!==50||s.player.y!==-40||s.enemies.find(e=>e.id==='keeper').hp!==0||!s.state['last-cage'])throw Error('Death did not preserve final return '+JSON.stringify(s));
  await page.reload();await page.waitForFunction(()=>!!window.__game);s=await page.evaluate(()=>__game.snapshot());
  if(s.player.y!==-40||!s.state.keeper||!s.state['last-cage'])throw Error('Reload lost the final return');
  await page.keyboard.press('Escape');if(errors.length)throw Error(JSON.stringify(errors));return {actualDeath:true,refugeHeight:-40,keeperRemainsDefeated:true,finalCagePersists:true,reload:true,errors};
}

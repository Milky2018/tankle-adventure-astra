async page=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test');
  await page.waitForFunction(()=>window.__game);
  await page.evaluate(()=>localStorage.removeItem('furnace-born-v2-city'));
  await page.reload();await page.waitForFunction(()=>window.__game);
  await page.evaluate(()=>__game.manual(true));
  const views=[];
  for(const [name,x,y,z]of [
    ['west-relay',-35,-16,49],['sorting-relay',-57,-16,118],
    ['mortar-cradle',0,0,18],['loading-apron',32,-8,-72],
    ['garden-bank',40,-16,-18],['carrier-fight',90,8,-59],
    ['roof-landing',28,24,8],['roof-junction',32,24,-35],['optical-return',254,24,-30]
  ]){
    await page.evaluate(([x,y,z])=>{
      __game.scenario({player:{x,y,z,hp:50,invincible:1e9}});__game.step(1);
    },[x,y,z]);
    const s=await page.evaluate(()=>__game.snapshot());
    views.push({name,player:s.player,drawCalls:s.drawCalls});
    await page.screenshot({path:`output/playwright/layout-pass/${name}.png`});
  }
  if(errors.length)throw Error(JSON.stringify(errors));
  return {views,errors,isolated:true};
}

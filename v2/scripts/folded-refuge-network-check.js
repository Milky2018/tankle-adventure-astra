async page => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5174/?chapter=folded&test&manual&view=overhead');
  await page.waitForFunction(()=>window.__game);
  const report=await page.evaluate(()=>{
    const g=__game,w=g.debug.world;
    if(w.hives.length!==4)throw Error('Expected exactly four repair rooms');
    const expected=['awakening','turntable','distribution','last-refuge'];
    if(w.hives.some(h=>!expected.includes(h.id)))throw Error('Retired repair post remains interactive');
    g.step(.1);
    return {hives:w.hives.map(h=>({id:h.id,x:h.x,y:h.y,z:h.z})),controls:w.controls.length,lifts:w.lifts.map(l=>({id:l.id,y:l.y,settle:!!l.settle})),player:g.snapshot().player};
  });
  await page.screenshot({path:'v2/output/playwright/refuge-network-opening.png'});
  if(errors.length)throw Error(errors.join('\n'));
  return report;
}

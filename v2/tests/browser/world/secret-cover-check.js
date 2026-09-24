async page=>{
 await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');await page.waitForFunction(()=>window.__game?.debug);
 return page.evaluate(()=>{
  const g=__game,a=g.debug;g.manual(true);a.traceCombat();
  const e=a.world.enemies.find(e=>e.id==='stores-watch');
  g.scenario({enemies:Object.fromEntries(a.world.enemies.map(e=>[e.id,e.id==='stores-watch'?e.max:0])),player:{x:-166,y:8,z:-86,hp:50,invincible:1e9,mortar:true,weapon:'mortar',heat:0}});
  e.stunnedUntil=1e9;g.aimAt(e.x,e.z,e.y+.2);g.setInput(['Mouse0']);g.step(.02);g.setInput([]);g.step(2);
  if(e.hp!==e.max)throw Error('Roof explosion damages sheltered sniper '+JSON.stringify({hp:e.hp,max:e.max,impacts:a.hitLog,position:[e.x,e.y,e.z]}));
  g.scenario({player:{x:-150,y:8,z:-73,weapon:'cannon',heat:0,lastShot:-100}});g.aimAt(e.x,e.z,e.y+1.5);g.setInput(['Mouse0']);g.step(1.5);g.setInput([]);
  if(e.hp>0)throw Error('Sheltered sniper cannot be shot through open front '+e.hp);
  return {roofBlocksMortar:true,frontAcceptsCannon:true};
 });
}

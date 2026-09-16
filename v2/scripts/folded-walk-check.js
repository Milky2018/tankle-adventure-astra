async page=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5174/?chapter=folded&route=garden&test');
  await page.evaluate(()=>localStorage.removeItem('furnace-born-v2-folded-garden'));await page.reload();await page.waitForFunction(()=>!!window.__game);
  await page.evaluate(()=>window.__game.manual(true));
  const results=[];
  async function snapshot(){return page.evaluate(()=>window.__game.snapshot());}
  async function move(x,z,label,boost=false){
    const result=await page.evaluate(({x,z,boost})=>{
      const g=window.__game,start=g.snapshot().time;
      for(let i=0;i<1800;i++){
        const s=g.snapshot(),p=s.player,dx=x-p.x,dz=z-p.z;
        if(Math.hypot(dx,dz)<.45){g.setInput([]);return {p,time:s.time-start};}
        // Move along the larger remaining axis; corners have explicit waypoints.
        const keys=Math.abs(dx)>Math.abs(dz)?dx>0?['KeyS','KeyD']:['KeyW','KeyA']:dz>0?['KeyS','KeyA']:['KeyW','KeyD'];
        if(boost)keys.push('ShiftLeft');
        const foe=s.enemies.find(e=>e.hp>0&&e.readable&&Math.hypot(e.x-p.x,e.z-p.z)<26&&Math.abs(e.y-p.y)<10);
        if(foe){g.aimAt(foe.x,foe.z,foe.y+1.5);keys.push('Mouse0');}
        g.setInput(keys);g.step(1/30,false);
        if(g.snapshot().player.hp<=0)return {error:'died',state:g.snapshot()};
      }
      return {error:'stuck',state:g.snapshot()};
    },{x,z,boost});
    if(result.error)throw Error(`${label}: ${JSON.stringify(result)}`);
    results.push({label,x:result.p.x,y:result.p.y,z:result.p.z,hp:result.p.hp,seconds:result.time});
  }
  async function settle(){await page.evaluate(()=>{window.__game.setInput([]);window.__game.step(3);});}
  async function shoot(id){
    const targets={load:[90,-40.9,6.8],brake:[78,-77.7,18],gangway:[86,31,-6.6],cage:[22,20,25.4]};
    const target=targets[id];if(id!=='brake')await settle();
    const result=await page.evaluate(({id,target})=>{const g=window.__game;g.aimAt(...target);g.setInput(['Mouse0']);g.step(1.2);g.setInput([]);return g.snapshot();},{id,target});
    if(!result.state[id])throw Error(`${id} failed ${JSON.stringify(result)}`);
  }
  await move(-26,27,'west landing');await move(-26,-8,'garden descent');await move(-30,-8,'panel approach');
  await page.evaluate(()=>{const g=window.__game;g.aimAt(-39.7,-8,-6.6);g.setInput(['Mouse2']);g.step(1.2);g.setInput([]);});
  if(!(await snapshot()).state.magnet)throw Error('magnet panel failed');
  await move(-46,-8,'ferry cradle');await page.evaluate(()=>window.__game.interact());
  if(!(await snapshot()).player.flotation)throw Error('flotation acquisition failed');
  await page.evaluate(()=>window.__game.toggleFlotation());
  await move(-46,27,'launch into water');await move(-36,27,'pool');await move(-36,-4,'canal bend');await move(0,-4,'below the same bridge');
  await page.screenshot({path:'v2/output/playwright/folded-city/under-bridge.png'});
  await move(30,-7,'shore approach');await move(36,-7,'east sill');await move(36,-16,'foot of bank');await move(46,-16,'onto bank ramp');await move(46,20,'garden far bank');
  await move(56,20,'bank refuge');await page.evaluate(()=>window.__game.interact());
  await move(86,20,'rear dock across sluice');await page.evaluate(()=>window.__game.toggleFlotation());
  await move(89,30,'inside gangway release');await shoot('gangway');
  await move(88,-19,'dock ascent');await move(94,-18,'bench refuge');await page.evaluate(()=>window.__game.interact());
  await move(90,-34,'under the hanging load');await shoot('load');await move(90,-59,'upper landing');await move(78,-59,'carrier approach');
  await move(78,-71,'carrier boarding');
  await page.evaluate(()=>{const g=window.__game;g.setInput([]);for(let i=0;i<300&&g.snapshot().player.y<15.99;i++)g.step(1/60);});
  await shoot('brake');await move(77,-87,'phoenix cradle');await page.evaluate(()=>window.__game.interact());
  if(!(await snapshot()).player.phoenix)throw Error('Phoenix acquisition failed');
  await move(85,-86,'launch runup');await settle();await move(164,-86,'full-speed supported launch',true);
  if(!(await snapshot()).state.launch)throw Error('launch shutter failed');
  await move(166,-32,'roof ascent');await move(32,-28,'roof return',true);await move(32,22,'roof refuge');await page.evaluate(()=>window.__game.interact());
  await move(24,20,'upper cage release');await shoot('cage');
  await page.screenshot({path:'v2/output/playwright/folded-city/roof.png'});
  await page.evaluate(()=>{window.__game.setInput([]);window.__game.step(6);});
  await move(10,20,'return cage boarding');await page.evaluate(()=>window.__game.interact());await page.evaluate(()=>window.__game.step(6));
  await move(0,27,'same original refuge');
  const s=await snapshot();if(Math.abs(s.player.y)>.1)throw Error(`wrong return layer ${s.player.y}`);
  await page.evaluate(()=>window.__game.interact());
  const shortcutStart=(await snapshot()).time;
  await move(10,27,'restored cage approach');await move(10,18,'restored cage boarding');
  await page.evaluate(()=>window.__game.interact());await page.evaluate(()=>window.__game.step(5.4));
  await move(24,20,'roof through restored cage');
  const end=await snapshot(),shortcutSeconds=end.time-shortcutStart;
  if(end.player.y!==24||shortcutSeconds>15)throw Error(`Return cage did not shorten travel: ${shortcutSeconds}`);
  await page.keyboard.press('Escape');if(errors.length)throw Error(JSON.stringify(errors));
  return {legs:results,state:s.state,player:s.player,shortcutSeconds,errors};
}

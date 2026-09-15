async(page)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5174/?chapter=4&test');
  await page.evaluate(()=>localStorage.removeItem('furnace-born-v2-midgame-preview'));
  await page.reload();await page.waitForFunction(()=>window.__game);
  const checks=await page.evaluate(()=>{
    const g=window.__game,checks=[],check=(name,passed,detail)=>checks.push({name,passed:!!passed,detail});
    // Only the player is positioned. Enemies retain their natural health, spawns and AI.
    const setup=(x,z,extra={})=>{g.setInput([]);g.scenario({player:{x,z,hp:50,heat:0,lastHeat:-10,overheated:false,phoenix:true,laser:false,weapon:'cannon',circulation:false,speed:1,invincible:0,...extra}});};
    setup(50,-406);g.setInput(['KeyS','KeyD','ShiftLeft']);g.step(3);g.setInput([]);
    check('Holding boost against a shutter cannot create momentum',!g.snapshot().midgame.opened.includes('launch')&&g.snapshot().player.speed<1.1,g.snapshot().player);
    setup(12,-406);g.setInput(['KeyS','KeyD','ShiftLeft']);g.step(4.1);g.setInput([]);
    check('First Phoenix run breaks the shutter and its defenders',g.snapshot().midgame.opened.includes('launch')&&g.snapshot().enemies.filter(e=>e.encounter==='r5-launch').every(e=>e.hp===0),g.snapshot().enemies.filter(e=>e.encounter==='r5-launch'));
    const hives=[[-82,-351,12],[66,-352,13],[-30,-412,14],[140,-202,15],[173,-118,16],[234,-164,17],[146,-389,18],[235,-446,19],[236,-326,20]];
    for(const [x,z,id] of hives){
      setup(x,z+2);g.step(1.1);g.repair();const anchor=g.snapshot().anchor;
      g.step(12);check(`Hive ${id} provides a safe rest pocket`,anchor===id&&g.snapshot().player.hp===50,{anchor,hp:g.snapshot().player.hp});
    }
    setup(230,-198,{laser:true,weapon:'laser'});
    let active=false;for(let i=0;i<150;i++){g.aimAt(232,-235);g.setInput(['Mouse0']);g.step(.1);active ||= g.snapshot().enemies.find(e=>e.type==='guardian').active;}
    g.setInput([]);let guardian=g.snapshot().enemies.find(e=>e.type==='guardian');
    check('Long-range Laser provokes guardian defence instead of an idle kill',active&&guardian.hp>0,guardian);
    setup(232,-226,{laser:true,weapon:'laser'});g.step(1.1);
    for(let i=0;i<300;i++){g.aimAt(211,-256);g.setInput(['Mouse0']);g.step(.1);const s=g.snapshot();if(s.deathTime>=0||s.enemies.find(e=>e.type==='guardian').hp===0)break;}
    g.setInput([]);check('Stationary reflected fire loses the damage trade',g.snapshot().deathTime>=0&&g.snapshot().enemies.find(e=>e.type==='guardian').hp>0,g.snapshot().enemies.find(e=>e.type==='guardian'));
    document.querySelector('#settings-button').click();return checks;
  });
  if(errors.length||checks.some(c=>!c.passed))throw Error(JSON.stringify({errors,checks}));return checks;
}

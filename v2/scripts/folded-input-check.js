async page=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5174/?chapter=folded&route=freight&view=overhead&test');
  await page.evaluate(()=>localStorage.removeItem('furnace-born-v2-folded-freight'));await page.reload();await page.waitForFunction(()=>!!window.__game);
  await page.evaluate(()=>window.__game.manual(true));
  async function step(seconds){await page.evaluate(s=>window.__game.step(s),seconds);}
  async function walk(x,z){
    for(let i=0;i<500;i++){
      const p=await page.evaluate(()=>window.__game.snapshot().player),dx=x-p.x,dz=z-p.z;if(Math.hypot(dx,dz)<.25)return;
      const alongX=Math.abs(dx)>Math.abs(dz),d=alongX?dx:dz,keys=alongX?(d>0?['s','d']:['w','a']):(d>0?['s','a']:['w','d']);
      for(const k of keys)await page.keyboard.down(k);await step(Math.min(.3,Math.abs(d)/7));for(const k of keys)await page.keyboard.up(k);
    }throw Error(`Keyboard route stuck ${x},${z}`);
  }
  async function click(x,z,y){await step(.3);const point=await page.evaluate(([x,z,y])=>window.__game.project(x,z,y),[x,z,y]);await page.mouse.click(point.x,point.y);await step(1.4);}
  await walk(0,-34);await walk(18,-34);
  await click(32,-34,4.2);
  if((await page.evaluate(()=>window.__game.snapshot())).state.freight)throw Error('Cannon bypassed the freight screen');
  await step(3);await page.keyboard.press('q');await click(32,-34,4.2);
  let s=await page.evaluate(()=>window.__game.snapshot());if(!s.state.freight||s.player.magnet||s.player.flotation)throw Error('Independent Mortar entry failed '+JSON.stringify(s));
  await page.keyboard.press('q');await walk(59,-34);await walk(59,-84);await walk(67,-84);await walk(67,-34);await walk(70,-34);await walk(70,-19);
  // Defeat the guard with real clicks from its exposed side, then reach the refuge.
  for(let i=0;i<4;i++){await click(87,-23,1.5);await step(.7);}
  await walk(94,-18);await page.keyboard.press('e');
  s=await page.evaluate(()=>window.__game.snapshot());if(s.state.anchor!=='benches')throw Error('Refuge interaction failed');
  await walk(88,-18);await walk(88,20);await walk(89,35);await click(86,31,-6.6);
  if(!(await page.evaluate(()=>window.__game.snapshot())).state.gangway)throw Error('Inside gangway shot failed');
  await walk(60,35);await walk(56,20);
  s=await page.evaluate(()=>window.__game.snapshot());if(s.player.flotation||s.player.magnet||Math.abs(s.player.y+8)>.01)throw Error('Dry retreat used an unearned ability');
  await page.keyboard.press('Tab');
  const before=await page.evaluate(()=>window.__game.snapshot());
  await page.getByRole('button',{name:'查看已发现的上一层'}).click();
  const after=await page.evaluate(()=>window.__game.snapshot());
  if(before.chosenLayer===after.chosenLayer||before.player.y!==after.player.y||before.aim.y!==after.aim.y)throw Error('Map selection changed physical height or aim');
  await page.screenshot({path:'v2/output/playwright/folded-city/floor-map.png'});
  await page.keyboard.press('Tab');await page.keyboard.press('Escape');
  if(!(await page.evaluate(()=>window.__game.snapshot())).paused)throw Error('Escape failed');
  await page.reload();await page.waitForFunction(()=>!!window.__game);s=await page.evaluate(()=>window.__game.snapshot());
  if(!s.state.freight||!s.state.gangway||s.state.anchor!=='benches'||s.player.y!==0)throw Error('Reload lost gate or anchor height');
  await page.keyboard.press('Escape');
  if(errors.length)throw Error(JSON.stringify(errors));
  return {cannonRejected:true,mortarEntry:true,keyboardTraversal:true,dryGangwayRetreat:true,independentMapLayers:true,reload:true,errors};
}

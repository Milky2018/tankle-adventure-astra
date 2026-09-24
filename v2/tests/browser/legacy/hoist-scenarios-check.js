async page=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5174/?chapter=hoist&test');await page.waitForFunction(()=>window.__game);
  const checks=await page.evaluate(()=>{
    const g=__game,checks=[];const ok=(name,value)=>{checks.push({name,passed:!!value});if(!value)throw Error(name+' '+JSON.stringify({p:g.snapshot().player,h:g.snapshot().hoist,aim:g.snapshot().aim}));};
    g.scenario({player:{x:305,z:-171,hoistY:16,laser:true,weapon:'laser',heat:0,overheated:false,hp:50}});g.step(.5);g.aimAt(305,-176,17.5);g.setInput(['Mouse0']);g.step(.2);g.setInput([]);
    ok('aiming through the single reticle opens the reflected vertical laser receiver',g.snapshot().hoist.state.optical);
    g.scenario({player:{x:300,z:-128,hoistY:0,mortar:true,weapon:'mortar',heat:0,overheated:false}});g.step(.3);g.aimAt(300,-140,0);
    ok('roof obstruction appears before a mortar shot',document.querySelector('#reticle').classList.contains('blocked'));
    g.fire();g.step(.4);ok('shell hits the roof instead of passing through it',g.snapshot().hoist.shots===0);
    g.scenario({player:{x:288,z:-130,hoistY:24,phoenix:true,circulation:true,heat:100,overheated:true,speed:1,weapon:'cannon'}});g.setInput(['KeyS','KeyD','ShiftLeft']);g.step(3.1);g.setInput([]);
    ok('a real red-hot run-up destroys the optional sorter',g.snapshot().hoist.state.sorter);
    g.hitPlayer(999,g.snapshot().player.x,g.snapshot().player.z,true);g.step(3.3);
    ok('death returns to a supported ground checkpoint',g.snapshot().player.hp===50&&g.snapshot().player.height===0&&Math.abs(g.snapshot().player.x-290)<1);
    ok('death preserves the restored hoist and optical room',g.snapshot().hoist.state.main&&g.snapshot().hoist.state.optical);
    ok('ordinary enemies return while the defeated sorter stays dead',g.snapshot().hoist.enemies.find(e=>e.id==='balcony').hp===3&&g.snapshot().hoist.enemies.find(e=>e.id==='sorter').hp===0);
    return checks;
  });
  await page.reload();await page.waitForFunction(()=>window.__game);
  const state=await page.evaluate(()=>__game.snapshot().hoist.state);
  if(!state.main||!state.optical||!state.sorter||!state.hot)throw Error('Reload lost progress '+JSON.stringify(state));
  checks.push({name:'reload retains solved puzzles, optional encounter, and shortcuts',passed:true});
  await page.keyboard.press('Escape');return {checks,errors};
}

async page=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5174/?chapter=3&test');await page.evaluate(()=>localStorage.removeItem('furnace-born-v2-garden-preview'));await page.reload();await page.waitForFunction(()=>window.__game);
  const checks=[];
  async function shoot(name,player,target,test){
    await page.evaluate(p=>{const g=__game;g.scenario({player:{x:p[0],z:p[1],heat:0,overheated:false,lastShot:-10,weapon:'cannon'},enemiesByIndex:Object.fromEntries(g.snapshot().enemies.map((_,i)=>[i,{hp:0}]))});g.step(.5);},player);
    const point=await page.evaluate(p=>__game.project(p[0],p[1],1.25),target);
    await page.mouse.click(point.x,point.y);await page.waitForTimeout(650);
    const state=await page.evaluate(()=>__game.snapshot().puzzles);if(!test(state))throw Error(name+' '+JSON.stringify(state));checks.push(name);
  }
  await shoot('First rail paddle',[-28,-113],[-28,-108],s=>s.rail.switches[0]);
  await shoot('Second rail paddle',[-20,-110],[-20,-104],s=>s.rail.switches[1]);
  await shoot('First gutter crank',[-180,-244],[-180,-248],s=>s.gutter.angles[0]===1);
  await shoot('Second gutter crank',[-165,-246],[-165,-251],s=>s.gutter.angles[1]===1);
  await shoot('Repeat gutter impact',[-165,-246],[-165,-251],s=>s.gutter.angles[1]===2);
  await shoot('Pipe opens and water follows the gutters',[-178,-247],[-181,-251],s=>s.gutter.unplugged);
  await page.waitForTimeout(3000);if(!await page.evaluate(()=>__game.snapshot().puzzles.gutter.grown))throw Error('Plant did not grow');
  await page.screenshot({path:'v2/output/playwright/hoist-wordless/gutters.png'});
  await shoot('Pump responds briefly to a shot',[-190,-300],[-190,-295],s=>s.basin.level>0&&s.basin.level<.2);
  await page.waitForTimeout(1000);if(await page.evaluate(()=>__game.snapshot().puzzles.basin.level)!==0)throw Error('Pump did not drain');
  await page.keyboard.press('Escape');return {checks,errors};
}

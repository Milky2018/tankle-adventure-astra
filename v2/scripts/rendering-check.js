async(page)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.route('**/src/main.js*',async route=>{
    const response=await route.fetch();
    await route.fulfill({response,body:await response.text()+`\nwindow.__renderCheck=()=>{
      const reset=renderer.info.autoReset;renderer.info.autoReset=false;renderer.info.reset();renderer.render(scene,camera);
      const triangles=renderer.info.render.triangles;renderer.info.autoReset=reset;
      const buffers=new Set();scene.traverse(m=>{if(m.isMesh)for(const a of [...Object.values(m.geometry.attributes),m.geometry.index].filter(Boolean))buffers.add(a.array.buffer);});
      return {triangles,geometryBytes:[...buffers].reduce((n,b)=>n+b.byteLength,0)};
    };`});
  });
  await page.goto('http://127.0.0.1:5174/?chapter=4&test');await page.waitForFunction(()=>window.__game);
  await page.unroute('**/src/main.js*');
  const checks=[],check=(name,passed)=>checks.push({name,passed:!!passed});
  for(const [name,x,z] of [['foundry',0,6],['hub',-34,-122],['garden',-153,-266],['observatory',140,-200],['phoenix',45,-406]]){
    const stats=await page.evaluate(([x,z])=>{
      window.__game.scenario({player:{x,z,hp:50,invincible:1e9}});window.__game.step(1/60);return window.__renderCheck();
    },[x,z]);
    check(`${name}: main and shadow passes stay below two million triangles`,stats.triangles<2e6);
    check(`${name}: scene geometry buffers stay below 64 MiB`,stats.geometryBytes<64*1048576);
  }
  await page.locator('#settings-button').click();await page.waitForTimeout(150);
  let before=await page.evaluate(()=>window.__game.snapshot());await page.waitForTimeout(400);
  let after=await page.evaluate(()=>window.__game.snapshot());
  check('Pause stops repeated rendering and simulation',after.paused&&after.frames===before.frames&&after.time===before.time);
  await page.setViewportSize({width:1440,height:800});await page.waitForTimeout(200);
  after=await page.evaluate(()=>window.__game.snapshot());
  check('Resizing a paused scene redraws it',after.frames>before.frames);
  before=after;await page.waitForTimeout(300);after=await page.evaluate(()=>window.__game.snapshot());
  check('Paused scene becomes idle again after resize',after.frames===before.frames);
  await page.locator('#quality').selectOption('low');await page.waitForTimeout(200);
  after=await page.evaluate(()=>window.__game.snapshot());
  check('Changing quality while paused redraws the scene',after.frames>before.frames);
  await page.locator('#quality').selectOption('high');await page.locator('#resume').click();await page.waitForTimeout(250);
  after=await page.evaluate(()=>window.__game.snapshot());
  check('Resume restarts rendering without accumulated simulation time',!after.paused&&after.frames>before.frames&&after.time-before.time<.8);
  await page.keyboard.press('Tab');await page.waitForTimeout(150);before=await page.evaluate(()=>window.__game.snapshot());
  await page.waitForTimeout(350);after=await page.evaluate(()=>window.__game.snapshot());
  check('Open map freezes rendering and simulation',after.mapOpen&&after.frames===before.frames&&after.time===before.time);
  await page.keyboard.press('Tab');await page.waitForTimeout(200);after=await page.evaluate(()=>window.__game.snapshot());
  check('Closing the map resumes play',!after.mapOpen&&after.frames>before.frames&&after.time>before.time);
  await page.locator('#settings-button').click();
  check('No runtime or shader errors',errors.length===0);
  if(checks.some(c=>!c.passed))throw Error(JSON.stringify({checks,errors}));return checks;
}

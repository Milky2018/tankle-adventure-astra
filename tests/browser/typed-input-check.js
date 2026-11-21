async page => {
  const errors=[];
  page.on('pageerror',error=>errors.push(String(error)));
  await page.goto('http://127.0.0.1:5175/?chapter=folded&test&view=third');
  await page.waitForFunction(()=>typeof window.__typedRead==='function');
  const before=await page.evaluate(()=>__typedRead());
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(2000);
  await page.keyboard.up('KeyW');
  const moved=await page.evaluate(()=>__typedRead());
  if(Math.hypot(moved.x-before.x,moved.z-before.z)<17)throw new Error('Keyboard movement did not drive the typed simulation');
  await page.mouse.move(600,420);
  await page.mouse.down();
  await page.waitForTimeout(650);
  await page.mouse.up();
  const fired=await page.evaluate(()=>__typedRead());
  if(fired.heat<20)throw new Error('Mouse fire did not generate weapon heat');
  await page.keyboard.press('KeyC');
  await page.screenshot({path:'output/playwright/typed-input-overhead.png'});
  if(errors.length)throw new Error(errors.join('\n'));
  await page.evaluate(data=>{window.__typedEvidence=data},{before,moved,fired,errors});
}

async page => {
  const errors=[]; page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width:1280,height:900});
  await page.goto('http://127.0.0.1:5174/output/audio/sfx-comparison/index.html');
  if(await page.locator('article').count()!==35)throw Error('Missing sound comparison rows');
  await page.locator('#weapons header button').click();
  await page.waitForFunction(()=>{const a=document.querySelector('#main');return !a.paused&&a.currentTime>.1&&a.readyState>=2;});
  await page.waitForFunction(()=>document.querySelector('#now').textContent.includes('主炮 · 旧版'));
  await page.locator('#main').evaluate(el=>el.currentTime=3.5);
  await page.waitForFunction(()=>document.querySelector('#now').textContent.includes('主炮 · 新版'));
  const duration=await page.locator('#main').evaluate(el=>el.duration);
  if(duration<60)throw Error('Weapon montage incomplete');
  await page.screenshot({path:'v2/output/audio/sfx-comparison/audition-desktop.png'});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'v2/output/audio/sfx-comparison/audition-mobile.png'});
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Audition page overflows');
  await page.locator('#main').evaluate(el=>el.pause());
  if(errors.length)throw Error(errors.join('\n'));
  return {rows:35,duration,playable:true,errors};
}

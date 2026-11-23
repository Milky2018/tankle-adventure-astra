// Run through playwright-cli against the running game. Read-only instrumentation.
async page => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1280,height:720});
  const version='v3';
  const base=page.url().startsWith('http')?new URL(page.url()).origin:'http://127.0.0.1:5175';
  await page.goto(base+'/?chapter=folded&test');
  await page.waitForFunction(()=>window.__typedRead,{},{timeout:60000});
  await page.waitForFunction(()=>!document.body.classList.contains('starting'),{},{timeout:60000});
  const startup=await page.evaluate(()=>({ready:performance.getEntriesByName('moonbit-first-frame')[0]?.startTime??performance.now(),resources:performance.getEntriesByType('resource').map(r=>({name:r.name.split('/').pop(),bytes:r.transferSize,end:r.responseEnd})).filter(r=>r.bytes>200000)}));
  await page.waitForTimeout(1000);
  await page.evaluate(()=>{window.__frameTimes=[];let prev=performance.now();window.__measure=true;function tick(t){if(!window.__measure)return;__frameTimes.push(t-prev);prev=t;requestAnimationFrame(tick)}requestAnimationFrame(tick)});
  await page.mouse.move(680,280);
  await page.mouse.down();
  // A small loop on the repair platform, with real firing and movement.
  for(let i=0;i<3;i++)for(const key of ['KeyA','KeyW','KeyD','KeyS']){
    await page.keyboard.down(key);await page.waitForTimeout(300);await page.keyboard.up(key);
  }
  await page.mouse.up();
  await page.waitForTimeout(1200);
  const result=await page.evaluate(()=>{window.__measure=false;const a=__frameTimes.filter(n=>n>0).sort((a,b)=>a-b);return{frames:a.length,p50:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],p99:a[Math.floor(a.length*.99)],max:Math.max(...a),over33:a.filter(n=>n>33.5).length}});
  await page.screenshot({path:`output/playwright/${version}-performance.png`});
  await page.keyboard.press('Escape');
  await page.evaluate(data=>window.__performanceEvidence=data,{version,startup,result,errors});
  if(errors.length)throw Error(errors.join('\n'));
}

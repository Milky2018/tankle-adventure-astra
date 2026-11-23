// Real browser input only. The diagnostic callback is read-only.
async page => {
  await page.setViewportSize({width:1280,height:720});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5175/?chapter=folded&test');
  await page.waitForFunction(()=>window.__typedRead);
  await page.keyboard.press('Escape');
  await Promise.all([page.waitForEvent('load'),page.locator('#new-game').click()]);
  await page.waitForFunction(()=>window.__typedRead);
  if(Object.keys(await page.evaluate(()=>__typedRead().flags)).length)throw Error('Opening run must start without progress');
  await page.addScriptTag({path:'tests/browser/driving-controls.js'});
  const legs=[];
  async function move(x,z){
    let previous=null,stuck=0;
    for(let i=0;i<150;i++){
      const p=await page.evaluate(()=>__typedRead());
      const dx=x-p.x,dz=z-p.z;
      if(Math.hypot(dx,dz)<.45){await page.mouse.up();legs.push({x:p.x,y:p.y,z:p.z,hp:p.hp});return}
      if(previous&&Math.hypot(p.x-previous.x,p.z-previous.z)<.01)stuck++;else stuck=0;
      if(stuck>12)throw Error(`Stuck heading to ${x},${z}: ${JSON.stringify(p)}`);
      previous=p;
      const enemy=p.enemies.filter(e=>e.hp>0&&Math.abs(e.y-p.y)<2.5&&Math.hypot(e.x-p.x,e.z-p.z)<23).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];
      if(enemy){await aim(enemy.x,enemy.y+1.5,enemy.z);await page.mouse.down()}else{await page.mouse.up()}
      const keys=await page.evaluate(d=>window.drivingControls.keys(d),[dx,dz]);
      for(const k of keys)await page.keyboard.down(k);
      await page.waitForTimeout(Math.min(160,Math.max(18,Math.max(Math.abs(dx),Math.abs(dz))/10*1000)));
      for(const k of keys)await page.keyboard.up(k);
    }
    throw Error('Route timeout');
  }
  async function aim(x,y,z){
    await page.evaluate(p=>window.drivingControls.aim(p),[x,y,z]);
  }
  try {
    await move(-40,86);await move(-40,49);
    for(let i=0;i<100;i++){
      const p=await page.evaluate(()=>__typedRead());
      if(p.flags['relay-west']||p.pending.includes('relay-west'))break;
      const threat=p.enemies.find(e=>e.hp>0&&Math.abs(e.y-p.y)<2&&Math.hypot(e.x-p.x,e.z-p.z)<10);
      if(threat)await aim(threat.x,threat.y+1.5,threat.z);else await aim(-46.28,-14,49);
      await page.mouse.down();await page.waitForTimeout(100);
    }
    await page.mouse.up();await page.waitForTimeout(1500);
    const state=await page.evaluate(()=>__typedRead());
    await page.screenshot({path:'output/playwright/typed-opening-relay.png'});
    if(!state.flags['relay-west'])throw Error('Real cannon did not activate west relay');
    await move(-51,50);
    const passage=await page.evaluate(()=>__typedRead());
    if(passage.x >= -48 || passage.hp <= 0)throw Error('Tank did not clear the west door');
    await page.evaluate(data=>window.__openingEvidence=data,{legs,state,passage,errors});
    if(errors.length)throw Error(errors.join('\n'));
  } finally {await page.keyboard.press('Escape')}
}

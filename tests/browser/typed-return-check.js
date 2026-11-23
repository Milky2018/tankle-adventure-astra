// Continues the fresh opening run using only keyboard and mouse events.
async page => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.locator('#resume').click();
  await page.addScriptTag({path:'tests/browser/driving-controls.js'});
  const legs=[];
  async function move(x,z,boost=false){
    if (boost) {
      const start = await page.evaluate(() => __typedRead());
      const dx = x - start.x, dz = z - start.z, length = Math.hypot(dx,dz);
      await page.evaluate(d => window.drivingControls.face(d), [dx,dz]);
      await page.keyboard.down('ShiftLeft');
      await page.keyboard.down('KeyW');
      try {
        await page.waitForFunction(([x,z,dx,dz,length]) => {
          const p = __typedRead();
          return (x-p.x)*dx+(z-p.z)*dz < 0.45*length;
        }, [x,z,dx,dz,length], {timeout:18000});
      } finally {
        await page.keyboard.up('KeyW');
        await page.keyboard.up('ShiftLeft');
      }
      const p = await page.evaluate(() => __typedRead());
      if(Math.hypot(x-p.x,z-p.z)>2)throw Error(`Missed boost exit at ${p.x},${p.z}`);
      legs.push({x:p.x,y:p.y,z:p.z,hp:p.hp});
      return;
    }
    let previous=null,stuck=0;
    for(let i=0;i<220;i++){
      const p=await page.evaluate(()=>__typedRead());
      const dx=x-p.x,dz=z-p.z;
      if(Math.hypot(dx,dz)<.65){await page.mouse.up();legs.push({x:p.x,y:p.y,z:p.z,hp:p.hp});return}
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
    const p=await page.evaluate(()=>__typedRead());
    throw Error(`Route to ${x},${z} timed out at ${p.x},${p.y},${p.z} (HP ${p.hp})`);
  }
  async function aim(x,y,z){
    await page.evaluate(p=>window.drivingControls.aim(p),[x,y,z]);
  }

  async function use(){await page.keyboard.press('KeyE')}
  async function shoot(x,y,z,id){
    for(let i=0;i<220;i++){
      const p=await page.evaluate(()=>__typedRead());
      if(p.flags[id]||p.pending.includes(id))break;
      const e=p.enemies.filter(e=>e.hp>0&&Math.abs(e.y-p.y)<2&&Math.hypot(e.x-p.x,e.z-p.z)<8)[0];
      await aim(e?.x??x,e?e.y+1.5:y,e?.z??z);
      await page.mouse.down();await page.waitForTimeout(100);
    }
    await page.mouse.up();await page.waitForTimeout(1600);
    const p=await page.evaluate(()=>__typedRead());
    if(!p.flags[id])throw Error('Could not operate '+id);
  }
  try{
    await move(-28,100,true);
    await move(-28,66);await shoot(-28,-12.75,59.1,"prototype-shortcut");await move(-28,52);await move(-40,52);await move(-40,86,true);await move(0,86);await use();
    const state=await page.evaluate(()=>__typedRead());
    if(state.hp!==25)throw Error('Repair hive did not restore hull');
    await page.screenshot({path:'output/playwright/typed-repair-return.png'});
    await page.evaluate(data=>window.__returnEvidence=data,{legs,state,errors});
    if(errors.length)throw Error(errors.join('\n'));
  } finally {
    for(const k of ['KeyW','KeyA','KeyS','KeyD','ShiftLeft'])await page.keyboard.up(k);
    await page.mouse.up();await page.keyboard.press('Escape');
  }
}

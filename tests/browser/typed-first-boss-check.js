// Continues the fresh opening run using only keyboard and mouse events.
async page => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.locator('#resume').click();
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
      const keys=Math.abs(dx)>Math.abs(dz)?dx>0?['KeyS','KeyD']:['KeyW','KeyA']:dz>0?['KeyS','KeyA']:['KeyW','KeyD'];
      for(const k of keys)await page.keyboard.down(k);
      await page.waitForTimeout(Math.min(160,Math.max(18,Math.max(Math.abs(dx),Math.abs(dz))/10*1000)));
      for(const k of keys)await page.keyboard.up(k);
    }
    throw Error('Route timeout');
  }
  async function aim(x,y,z){
    const [screenX,screenY]=await page.evaluate(([x,y,z])=>window.__typedProject(x,y,z), [x,y,z]);
    await page.mouse.move(screenX,screenY);
  }

  async function clearReclaim(){
    const orbit=[[-59,98],[-59,113],[-53,113],[-53,98]];let corner=0;
    for(let i=0;i<500;i++){
      const p=await page.evaluate(()=>__typedRead());
      const enemies=p.enemies.filter(e=>e.hp>0&&['reclaim-guard','reclaim-scout'].includes(e.id));
      if(!enemies.length){
        await page.mouse.up();
        // Reach the aisle before crossing behind the reclaim cover.
        await move(p.x,104);
        await move(-66,104);
        await move(-57,104);
        return;
      }
      if(p.y!==-16||p.hp<=0)throw Error('Lost reclaim fight: '+JSON.stringify(p));
      const e=enemies.find(e=>e.id==='reclaim-scout')??enemies[0];
      if(Math.hypot(p.x-orbit[corner][0],p.z-orbit[corner][1])<.7)corner=(corner+1)%4;
      const dx=orbit[corner][0]-p.x,dz=orbit[corner][1]-p.z;
      const keys=Math.abs(dx)>Math.abs(dz)?dx>0?['KeyS','KeyD']:['KeyW','KeyA']:dz>0?['KeyS','KeyA']:['KeyW','KeyD'];
      await aim(e.x,e.y+1.5,e.z);
      if(e.id==='reclaim-scout'||e.vent)await page.mouse.down();else await page.mouse.up();
      for(const k of keys)await page.keyboard.down(k);await page.waitForTimeout(85);for(const k of keys)await page.keyboard.up(k);
    }
    throw Error('Reclaim fight timeout');
  }
  async function use(){await page.keyboard.press('KeyE')}
  async function shoot(x,y,z,id){
    for(let i=0;i<150;i++){
      const p=await page.evaluate(()=>__typedRead());
      if(p.flags[id]||p.pending.includes(id))break;
      const e=p.enemies.filter(e=>e.hp>0&&Math.abs(e.y-p.y)<2&&Math.hypot(e.x-p.x,e.z-p.z)<8)[0];
      await aim(e?.x??x,e?e.y+1.5:y,e?.z??z);
      await page.mouse.down();await page.waitForTimeout(100);
    }
    await page.mouse.up();await page.waitForTimeout(1600);
    const p=await page.evaluate(()=>__typedRead());
    if(!p.flags[id])throw Error('Could not operate '+id+' '+JSON.stringify(p));
  }
  try{
    await move(-57,52);await move(-57,76);await use();
    await move(-57,95);await clearReclaim();await move(-57,118);await shoot(-65,-14.5,114,'relay-east');
    await move(-57,128);await move(-43,132);
    await page.screenshot({path:'output/playwright/typed-prototype-entry.png'});
    const orbit=[[-39,136],[-23,136],[-23,123],[-39,123]];let corner=0;
    for(let i=0;i<1800;i++){
      const p=await page.evaluate(()=>__typedRead()),boss=p.enemies.find(e=>e.id==='prototype');
      if(!boss||boss.hp<=0)break;
      if(p.hp<=0)throw Error('Died in prototype fight');
      if(Math.hypot(p.x-orbit[corner][0],p.z-orbit[corner][1])<.8)corner=(corner+1)%orbit.length;
      const dx=orbit[corner][0]-p.x,dz=orbit[corner][1]-p.z;
      const keys=Math.abs(dx)>Math.abs(dz)?dx>0?['KeyS','KeyD']:['KeyW','KeyA']:dz>0?['KeyS','KeyA']:['KeyW','KeyD'];
      await aim(boss.x,boss.y+1.5,boss.z);
      if(boss.vent)await page.mouse.down();else await page.mouse.up();
      for(const k of keys)await page.keyboard.down(k);
      await page.waitForTimeout(90);
      for(const k of keys)await page.keyboard.up(k);
      if(i%50===0)await page.evaluate(data=>window.__fightEvidence=data,{hp:p.hp,boss:boss.hp,x:p.x,z:p.z,iteration:i});
    }
    await page.mouse.up();
    let state=await page.evaluate(()=>__typedRead());
    if(!state.flags.prototype)throw Error('Prototype did not fall');
    await move(-28,124);await use();
    state=await page.evaluate(()=>__typedRead());
    if(!state.flags.overdrive)throw Error('Overdrive module was not acquired');
    await page.waitForTimeout(100);
    if(!await page.locator('#acquired').isVisible()||(await page.locator('#acquired-title').textContent())!=='Overdrive')throw Error('Acquired module prompt was missing');
    await page.screenshot({path:'output/playwright/typed-overdrive-acquired.png'});
    await page.evaluate(data=>window.__campaignEvidence=data,{legs,state,errors});
    if(errors.length)throw Error(errors.join('\n'));
  } finally {
    for(const k of ['KeyW','KeyA','KeyS','KeyD'])await page.keyboard.up(k);
    await page.mouse.up();await page.keyboard.press('Escape');
  }
}

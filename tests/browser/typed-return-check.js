// Continues the fresh opening run using only keyboard and mouse events.
async page => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.locator('#resume').click();
  const legs=[];
  async function move(x,z,boost=false){
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
      const keys=Math.abs(dx)>Math.abs(dz)?dx>0?['KeyS','KeyD']:['KeyW','KeyA']:dz>0?['KeyS','KeyA']:['KeyW','KeyD'];
      if(boost&&Math.hypot(dx,dz)>2)await page.keyboard.down('ShiftLeft');
      for(const k of keys)await page.keyboard.down(k);
      await page.waitForTimeout(Math.min(160,Math.max(18,Math.max(Math.abs(dx),Math.abs(dz))/(boost?16:10)*1000)));
      for(const k of keys)await page.keyboard.up(k);
      await page.keyboard.up('ShiftLeft');
    }
    throw Error('Route timeout');
  }
  async function aim(x,y,z){
    const [screenX,screenY]=await page.evaluate(([x,y,z])=>window.__typedProject(x,y,z), [x,y,z]);
    await page.mouse.move(screenX,screenY);
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

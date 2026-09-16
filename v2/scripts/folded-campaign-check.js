async page=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5174/?chapter=folded&test');await page.waitForFunction(()=>!!window.__game);
  await page.evaluate(()=>localStorage.removeItem('furnace-born-v2-city'));await page.reload();await page.waitForFunction(()=>!!window.__game);await page.evaluate(()=>window.__game.manual(true));
  const legs=[];
  async function move(x,z,boost=false){
    const result=await page.evaluate(({x,z,boost})=>{
      const g=window.__game,start=g.snapshot().time;
      for(let i=0;i<3600;i++){
        const s=g.snapshot(),p=s.player,dx=x-p.x,dz=z-p.z;
        if(Math.hypot(dx,dz)<.4){g.setInput([]);return {x:p.x,y:p.y,z:p.z,hp:p.hp,seconds:s.time-start};}
        const keys=Math.abs(dx)>Math.abs(dz)?dx>0?['KeyS','KeyD']:['KeyW','KeyA']:dz>0?['KeyS','KeyA']:['KeyW','KeyD'];if(boost)keys.push('ShiftLeft');
        const e=s.enemies.find(e=>e.hp>0&&e.readable&&Math.abs(e.y-p.y)<3&&Math.hypot(e.x-p.x,e.z-p.z)<24);
        if(e&&!boost){const t=e.parts.find(part=>part.hp>0)||{x:e.x,z:e.z,y:e.y+1.5};g.aimAt(t.x,t.z,t.y);keys.push('Mouse0');}
        g.setInput(keys);g.step(1/30,false);if(g.snapshot().player.hp<=0)return {error:'died',at:g.snapshot().player};
      }return {error:'stuck',at:g.snapshot().player};
    },{x,z,boost});if(result.error)throw Error(JSON.stringify({target:[x,z],...result}));legs.push(result);
  }
  async function shoot(x,z,y,id){
    const s=await page.evaluate(({x,z,y,id})=>{const g=window.__game;g.setInput([]);g.step(3,false);for(let i=0;i<180;i++){g.aimAt(x,z,y);g.setInput(['Mouse0']);g.step(1/60,false);if(g.snapshot().state[id])break;}g.setInput([]);g.step(.1);return g.snapshot();},{x,z,y,id});
    if(!s.state[id])throw Error('Latch '+id+' '+JSON.stringify({p:s.player,aim:s.aim}));
  }
  async function fight(id,x0,x1,z){
    const result=await page.evaluate(({id,x0,x1,z})=>{
      const g=window.__game;let destination=x0;
      for(let i=0;i<3600;i++){
        const s=g.snapshot(),e=s.enemies.find(e=>e.id===id),p=s.player;if(!e.hp){g.setInput([]);return {hp:p.hp,enemy:e};}
        if(p.hp<=0)return {error:'died',p,e};
        if(Math.abs(p.x-destination)<.6)destination=destination===x0?x1:x0;
        const dx=destination-p.x,dz=z-p.z,keys=Math.abs(dz)>1?dz>0?['KeyS','KeyA']:['KeyW','KeyD']:dx>0?['KeyS','KeyD']:['KeyW','KeyA'];
        const t=e.parts.find(part=>part.hp>0)||{x:e.x,y:e.y+1.5,z:e.z};g.aimAt(t.x,t.z,t.y);keys.push('Mouse0');g.setInput(keys);g.step(1/30,false);
      }return {error:'fight timeout',s:g.snapshot()};
    },{id,x0,x1,z});if(result.error)throw Error(id+' '+JSON.stringify(result));return result;
  }
  await move(-40,86);await move(-40,49);await shoot(-35,44,-14.5,'relay-west');
  await move(-17,49);await page.keyboard.press('e');await move(0,52);await move(36,52);await shoot(43,44,-14.5,'relay-east');
  await move(-55,52);await move(-55,128);await move(-43,132);const prototype=await fight('prototype',-43,-20,132);
  await move(-30,128);await page.keyboard.press('e');
  if(!(await page.evaluate(()=>window.__game.snapshot())).player.overdrive)throw Error('Overdrive was not acquired');
  await move(-20,128);await move(-20,86,true);await move(0,86);await page.keyboard.press('e');
  await move(0,54,true);const foundry=await fight('foundry',-10,10,55);
  await move(6,48);await page.keyboard.press('e');await move(24,48);await move(24,4);await move(10,4);await move(0,27);await page.keyboard.press('e');
  await page.screenshot({path:'v2/output/playwright/city-foundry-complete.png'});
  await move(0,12);if(!(await page.evaluate(()=>__game.snapshot())).player.mortar)throw Error('Hub Mortar missed');
  await move(0,-6);await page.keyboard.press('q');await shoot(0,-24,1.3,'bridge-crane');await page.keyboard.press('q');await move(0,27);
  await move(-26,27);await shoot(-29,27,1.3,'ballast');await move(-38,27);await page.keyboard.press('e');await page.evaluate(()=>window.__game.step(2.5));
  await shoot(-45.5,27,9.3,'ratchet');await move(-50,27);await move(-50,33);await page.keyboard.press('e');
  if(!(await page.evaluate(()=>window.__game.snapshot())).player.magnet)throw Error('Magnet was not acquired');
  await move(-50,27);await move(-38,27);await move(-26,27);await move(0,27);await page.keyboard.press('e');
  await move(0,-34);await move(-12,-34);await move(-12,-72);await move(-8,-72);await move(34,-72,true);await page.keyboard.press('e');
  if(!(await page.evaluate(()=>window.__game.snapshot())).player.mortar)throw Error('Mortar was not acquired');
  await move(34,-58);await shoot(32,-58,-6.7,'loading-return');await move(28,-46);await page.keyboard.press('e');await page.evaluate(()=>window.__game.step(2.5));await move(20,-46);await page.keyboard.press('e');await page.evaluate(()=>window.__game.step(2.5));await move(20,-34);
  const final=await page.evaluate(()=>window.__game.snapshot());if(final.player.y!==0)throw Error('Loading return failed');
  await page.keyboard.press('Escape');if(errors.length)throw Error(JSON.stringify(errors));return {legs,prototype,foundry,abilities:final.player,state:final.state,errors};
}

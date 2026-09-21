// Continuous route regression in both views. No teleport, granted abilities or
// invulnerability. Known waypoints and target coordinates do not constitute a blind playtest.
async page=>{
 const errors=[],runs=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1440,height:900});
 for(const view of ['overhead','third']){
  await page.goto(`http://127.0.0.1:5174/?chapter=folded&view=${view}&test`);await page.waitForFunction(()=>window.__game);
  await page.evaluate(()=>localStorage.clear());await page.reload();await page.waitForFunction(()=>window.__game);
  await page.evaluate(()=>{
   __game.manual(true);
   window.__flowAim=(x,y,z)=>{
    if(__game.snapshot().camera.view==='overhead'){__game.aimAt(x,z,y);return;}
    for(let i=0;i<5;i++){const c=__game.snapshot().camera.position,dx=x-c[0],dy=y-c[1],dz=z-c[2];__game.look(Math.atan2(dx,dz),Math.atan2(-dy,Math.hypot(dx,dz)));}
   };
   window.__flowKeys=(dx,dz)=>{
    const c=__game.snapshot().camera,yaw=c.view==='third'?c.yaw:Math.PI*1.25;
    const h=-Math.cos(yaw)*dx+Math.sin(yaw)*dz,v=-Math.sin(yaw)*dx-Math.cos(yaw)*dz,m=Math.max(Math.abs(h),Math.abs(v)),k=[];
    if(Math.abs(h)>m*.4)k.push(h>0?'KeyD':'KeyA');if(Math.abs(v)>m*.4)k.push(v>0?'KeyS':'KeyW');return k;
   };
  });
  const milestones=[];
  async function capture(name){await page.evaluate(()=>{__game.setInput([]);__game.step(0);});const s=await page.evaluate(()=>__game.snapshot());await page.screenshot({path:`v2/output/playwright/rooms/flow-${view}-${name}.png`});milestones.push({name,hp:s.player.hp,time:s.time,position:[s.player.x,s.player.y,s.player.z]});}
  async function move(x,z,boost=false){
   const r=await page.evaluate(({x,z,boost})=>{
    const g=__game;let stall=0,last=Infinity;
    for(let i=0;i<4500;i++){
     const s=g.snapshot(),p=s.player,dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz);if(d<.38){g.setInput([]);g.step(0);return {hp:p.hp};}
     if(!p.hp)return {error:'died',p};
     const e=s.enemies.find(e=>e.hp>0&&Math.abs(e.y-p.y)<2.5&&Math.hypot(e.x-p.x,e.z-p.z)<22&&e.readable);
     if(e&&!boost){const t=e.parts.find(t=>t.hp>0)||{x:e.x,y:e.y+1.5,z:e.z};__flowAim(t.x,t.y,t.z);}
     else if(s.camera.view==='third')__flowAim(p.x+dx/d*80,p.y+1.5,p.z+dz/d*80);
     const keys=__flowKeys(dx,dz);if(boost)keys.push('ShiftLeft');if(e&&!boost)keys.push('Mouse0');g.setInput(keys);g.step(d<2?1/120:1/30,false);
     stall=Math.abs(last-d)<.001?stall+1:0;last=d;if(stall>120)return {error:'stuck',p,target:[x,z]};
    }return {error:'timeout',p:g.snapshot().player,target:[x,z]};
   },{x,z,boost});if(r.error)throw Error(view+' move '+JSON.stringify(r));
  }
  async function shoot(id,x,y,z){
   const r=await page.evaluate(({id,x,y,z})=>{const g=__game;g.setInput([]);g.step(2,false);for(let i=0;i<300;i++){__flowAim(x,y,z);g.setInput(['Mouse0']);g.step(1/60,false);if(g.snapshot().state[id]){g.setInput([]);return true;}}return g.snapshot();},{id,x,y,z});if(r!==true)throw Error(view+' latch '+id+' '+JSON.stringify(r));
  }
  async function fight(id,x0,x1,z){
   const r=await page.evaluate(({id,x0,x1,z})=>{const g=__game;let destination=x0;for(let i=0;i<5400;i++){const s=g.snapshot(),p=s.player,e=s.enemies.find(e=>e.id===id);if(!e.hp){g.setInput([]);return {hp:p.hp};}if(!p.hp)return {error:'died',p,e};if(Math.abs(p.x-destination)<.8)destination=destination===x0?x1:x0;const t=e.parts.find(t=>t.hp>0)||{x:e.x,y:e.y+1.5,z:e.z};__flowAim(t.x,t.y,t.z);const keys=__flowKeys(destination-p.x,z-p.z);keys.push('Mouse0');g.setInput(keys);g.step(1/30,false);}return {error:'timeout',s:g.snapshot()};},{id,x0,x1,z});if(r.error)throw Error(view+' fight '+JSON.stringify(r));
  }
  await capture('awakening');await move(-40,86);await move(-40,52);
  const rejection=await page.evaluate(()=>{__game.setInput(__flowKeys(0,1));__game.step(4,false);__game.setInput([]);return {z:__game.snapshot().player.z,overdrive:__game.snapshot().player.overdrive};});
  if(rejection.overdrive||rejection.z>64.5)throw Error('Walking escapes the inward conveyor');await capture('belt-rejection');
  await move(-40,53);await capture('entry-landing');await move(-40,53);await capture('workshop');await move(-40,49);await shoot('relay-west',-35,-14.5,44);await capture('first-door');
  await move(-57,52);await move(-57,76);await capture('reclaim-track');await move(-57,96);await capture('sorting-entry');await move(-57,118);await shoot('relay-east',-65,-14.5,114);await capture('prototype-door');
  await move(-57,126);await move(-43,126);await capture('prototype-entry');await fight('prototype',-43,-20,132);
  await move(-28,124);await page.keyboard.press('e');if(!(await page.evaluate(()=>__game.snapshot())).player.overdrive)throw Error('Engine was missed');await capture('engine');
  await move(-28,100,true);await move(-28,52);await move(-40,52);await move(-40,86,true);await move(0,86);await page.keyboard.press('e');await capture('returned');
  await move(0,54,true);await fight('foundry',-10,10,55);await move(6,48);await page.keyboard.press('e');await move(24,48);await move(24,4);await move(36,4);await move(36,30);await move(22,30);await move(0,27);await page.keyboard.press('e');await capture('hub');
  await move(0,12);if(!(await page.evaluate(()=>__game.snapshot())).player.mortar)throw Error('Hub Mortar was missed');await capture('mortar');
  await move(0,-6);await page.keyboard.press('q');await shoot('bridge-crane',0,4.2,-24);await capture('bridge-open');
  await page.keyboard.press('q');await move(0,-34);await move(18,-34);await page.keyboard.press('q');await shoot('freight',32,4.2,-34);await capture('freight-open');
  await page.keyboard.press('q');await move(44,-34);await move(54,-34);await capture('freight-fight');await move(18,-34);await move(0,-34);await move(0,27);await page.keyboard.press('e');
  const final=await page.evaluate(()=>__game.snapshot());if(!final.state.foundry||!final.player.overdrive)throw Error('Opening did not complete');
  await page.reload();await page.waitForFunction(()=>window.__game);await page.evaluate(()=>__game.manual(true));const saved=await page.evaluate(()=>__game.snapshot());if(!saved.player.overdrive||!saved.state.foundry||!saved.player.mortar||!saved.state['bridge-crane']||!saved.state.freight)throw Error('Opening progress did not persist');runs.push({view,rejection,milestones,reload:true});
 }
 if(errors.length)throw Error(JSON.stringify(errors));return {runs,errors};
}

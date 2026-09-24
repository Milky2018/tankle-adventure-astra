// Continuous garden loop from a completed Foundry save in both views.
// Magnet and Flotation are acquired through play; no teleports or invulnerability.
// Known waypoints and coordinate aiming are regression evidence, not blind play.
async page=>{
 const errors=[],runs=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1440,height:900});
 for(const view of ['overhead','third']){
  await page.goto(`http://127.0.0.1:5174/?chapter=folded&view=${view}&test`);await page.waitForFunction(()=>window.__game);
  await page.evaluate(()=>{localStorage.clear();localStorage.setItem('furnace-born-v2-city',JSON.stringify({anchor:'turntable',discovered:['turntable'],foundry:true,prototype:true,overdrive:true,'overdrive-return':true,'relay-west':true,'relay-east':true,relays:true}));});await page.reload();await page.waitForFunction(()=>window.__game);
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
  async function capture(name){await page.evaluate(()=>{__game.setInput([]);__game.step(0);});const s=await page.evaluate(()=>__game.snapshot());await page.screenshot({path:`output/playwright/garden-polish/flow-${view}-${name}.png`});milestones.push({name,hp:s.player.hp,time:s.time,position:[s.player.x,s.player.y,s.player.z]});}
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
     stall=Math.abs(last-d)<.001?stall+1:0;last=d;if(stall>900)return {error:'stuck',p,target:[x,z]};
    }return {error:'timeout',p:g.snapshot().player,target:[x,z]};
   },{x,z,boost});if(r.error)throw Error(view+' move '+JSON.stringify(r));
  }
  async function shoot(id,x,y,z){
   const r=await page.evaluate(({id,x,y,z})=>{const g=__game;g.setInput([]);if(id!=='ratchet')g.step(2,false);for(let i=0;i<300;i++){__flowAim(x,y,z);g.setInput(['Mouse0']);g.step(1/60,false);if(g.snapshot().state[id]){g.setInput([]);return true;}}return g.snapshot();},{id,x,y,z});if(r!==true)throw Error(view+' latch '+id+' '+JSON.stringify(r));
  }
  async function arrive(y){const r=await page.evaluate(y=>{for(let i=0;i<1800;i++){if(Math.abs(__game.snapshot().player.y-y)<.01)return true;__game.setInput([]);__game.step(1/60,false);}return __game.snapshot().player;},y);if(r!==true)throw Error('Lift '+JSON.stringify(r));}
  async function pull(x,y,z,id){const r=await page.evaluate(({x,y,z,id})=>{__game.setInput([]);__game.step(2,false);for(let i=0;i<120;i++){__flowAim(x,y,z);__game.setInput(['Mouse2']);__game.step(1/60,false);if(__game.snapshot().state[id]){__game.setInput([]);return true;}}return __game.snapshot();},{x,y,z,id});if(r!==true)throw Error('Pull '+id+' '+JSON.stringify(r));}
  await capture('hub');await move(0,12);await move(0,27);await move(-26,27);await shoot('ballast',-29,1.3,27);await move(-38,27);await arrive(8);
  await shoot('ratchet',-45.5,9.3,27);await move(-50,27);await move(-50,33);await capture('magnet');
  if(!(await page.evaluate(()=>__game.snapshot())).player.magnet)throw Error('Magnet not acquired');
  await move(-50,27);await move(-38,27);await arrive(0);await move(-26,27);await move(-26,-8);await page.keyboard.press('e');await capture('ferry-entry');
  await move(-30,-8);await pull(-39.7,-6.6,-8,'magnet');await move(-46,-8);await capture('flotation');
  if(!(await page.evaluate(()=>__game.snapshot())).player.flotation)throw Error('Flotation not acquired');
  await page.keyboard.press('f');await move(-46,27);await move(-36,27);await move(-36,-4);await capture('first-water');
  await move(0,-4);await move(18,-4);await capture('landing-fight');await move(30,-7);await move(36,-7);await move(36,-16);await move(46,-16);
  await page.keyboard.press('f');await move(46,20);await move(56,20);await page.keyboard.press('e');await capture('bank');
  await move(58,4);await capture('pump-room');await shoot('pump',58,-5.5,-4);await capture('pump-open');
  const returnStart=await page.evaluate(()=>__game.snapshot().time);
  await move(58,-28);await move(-26,-28,true);await move(-26,-8);await page.keyboard.press('e');await capture('dry-return');
  const returnSeconds=(await page.evaluate(()=>__game.snapshot().time))-returnStart;
  if((await page.evaluate(()=>__game.snapshot())).player.afloat)throw Error('Dry return still needs Flotation');
  await move(-26,-28);await move(58,-28,true);await move(58,20);await page.keyboard.press('e');await page.keyboard.press('f');
  await move(86,20);await page.keyboard.press('f');await capture('rear-dock');await move(89,30);await shoot('gangway',86,-6.6,31);
  await move(89,36);await move(86,36);await move(60,36);await move(60,20);await move(56,20);await page.keyboard.press('e');await capture('gangway-return');
  const final=await page.evaluate(()=>__game.snapshot());
  if(final.player.hp<=0||!final.state.pump||!final.state.gangway)throw Error('Garden loop incomplete');
  await page.reload();await page.waitForFunction(()=>window.__game);await page.evaluate(()=>__game.manual(true));
  const saved=await page.evaluate(()=>__game.snapshot());if(!saved.player.flotation||!saved.player.magnet||!saved.state.pump||!saved.state.gangway)throw Error('Garden loop did not persist');
  runs.push({view,returnSeconds,milestones,reload:true});
 }
 if(errors.length)throw Error(JSON.stringify(errors));return {runs,errors};
}

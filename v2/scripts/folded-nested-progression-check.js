async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');await page.waitForFunction(()=>!!window.__game);
 await page.evaluate(()=>localStorage.removeItem('furnace-born-v2-city'));await page.reload();await page.waitForFunction(()=>!!window.__game);
 const results=await page.evaluate(async()=>{
  const g=window.__game;g.manual(true);
  const {foldedControls}=await import('/src/folded-layout.js');
  const checks=[];
  function pose(values,state={}){g.setInput([]);g.scenario({player:{...values,hp:25,heat:0,overheated:false,speed:1,lastShot:-100,actionHeatAt:-100,invincible:1e9},state,enemies:Object.fromEntries(g.snapshot().enemies.map(e=>[e.id,0]))});}
  function move(x,z,boost=false){for(let i=0;i<2400;i++){const p=g.snapshot().player,dx=x-p.x,dz=z-p.z;if(Math.hypot(dx,dz)<.3){g.setInput([]);return;}
   const keys=Math.abs(dx)>Math.abs(dz)?dx>0?['KeyS','KeyD']:['KeyW','KeyA']:dz>0?['KeyS','KeyA']:['KeyW','KeyD'];if(boost)keys.push('ShiftLeft');g.setInput(keys);g.step(1/60,false);}
   throw Error(`Blocked toward ${x},${z}: ${JSON.stringify(g.snapshot().player)}`);}
  function rest(n=3){g.setInput([]);g.step(n,false);}
  function shoot(id,weapon,at){const c=foldedControls.find(c=>c.id===id);g.scenario({player:{weapon:weapon==='magnet'?'cannon':weapon}});rest();g.aimAt(...(at||[c.x,c.z,c.y]));g.setInput([weapon==='magnet'?'Mouse2':'Mouse0']);g.step(2,false);rest(12);return g.snapshot().state[id];}
  const middle={x:74,y:0,z:-26,overdrive:true,magnet:true,mortar:true,flotation:true,weapon:'cannon'};
  pose(middle,{freight:true,'bridge-crane':true,overdrive:true,magnetModule:true,mortarModule:true,flotation:true});
  if(!shoot('magnet','magnet'))throw Error('Magnetic grille did not detach');checks.push('Magnet physically removes the inspection grille');
  if(!g.toggleFlotation())throw Error('Flotation did not deploy');
  for(const [x,z]of [[74,-16],[98,-16],[98,-5],[110,-5]])move(x,z);
  g.toggleFlotation();
  if(shoot('load','cannon'))throw Error('Cannon bypassed the protected top tray');
  if(!shoot('load','mortar'))throw Error('Mortar did not release the supported load');
  for(const [x,z]of [[110,-24],[110,-48],[110,-62],[78,-62],[78,-84]])move(x,z);
  for(let i=0;g.snapshot().player.y<16&&i<30;i++)rest(1);
  if(g.snapshot().player.y!==16)throw Error('Carrier did not reach Testworks');checks.push('Mortar lands on tray, load settles, carrier reaches R4 before Overseer');
  pose({x:324,y:24,z:-28,overdrive:true,phoenix:true,laser:true,weapon:'laser'},{phoenix:true,laser:true,'lens-return':false});
  if(!shoot('lens-return','laser',[324,-14,26]))throw Error('First reflection did not open the optical return');if(g.snapshot().state.guardian)throw Error('Laser bypassed Guardian');checks.push('Actual broad-mirror reflection restores the C return without opening R6');
  pose({x:218,y:16,z:-114,overdrive:true,phoenix:true},{foundry:true,phoenix:true,'proving-endurance':true,pressure:false,'phoenix-departure':false});
  move(238,-114);move(238,-82);move(180,-82,true);rest();
  for(const [x,z]of [[96,-82],[96,-74],[62,-74],[-22,-74],[-22,2],[38,2],[38,6]])move(x,z);rest();
  if(g.snapshot().state.pressure)throw Error('The original wall opened before the remembered return');move(140,6,true);
  for(const [x,z]of [[154,6],[154,-98],[126,-98],[126,-32],[150,-28]])move(x,z);
  if(g.snapshot().player.y!==24||!g.snapshot().state.pressure)throw Error('Phoenix did not reconnect at C');checks.push('Phoenix lesson and roof return resolve the original orange bulkhead');
  return {checks,fixture:'Acquired abilities and completed combat are provided; movement, projectiles, reflections, machinery and heat use the live game.'};
 });
 await page.screenshot({path:'v2/output/playwright/nested-progression.png'});
 if(errors.length)throw Error(errors.join('\n'));return {...results,errors};
}

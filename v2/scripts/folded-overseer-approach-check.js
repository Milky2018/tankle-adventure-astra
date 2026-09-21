async page=>{
 await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');await page.waitForFunction(()=>window.__game?.debug);
 const result=await page.evaluate(()=>{
  const g=__game,a=g.debug;g.manual(true);g.setInput([]);a.setCameraView('overhead');
  g.scenario({player:{x:77,y:16,z:-124,hp:25,overdrive:true,magnet:true,mortar:true,flotation:true,phoenix:false,heat:0,overheated:false,weapon:'cannon'},state:{sorter:true,load:true,'bridge-crane':true,'proving-transfer':false,'proving-inspection':false,foundry:false},enemies:Object.fromEntries(a.world.enemies.map(e=>[e.id,e.id==='foundry'?e.max:0]))});
  function walk(x,z,boost=false){for(let n=0;n<2400;n++){const dx=x-a.p.x,dz=z-a.p.z;if(Math.hypot(dx,dz)<.25){g.setInput([]);return;}const keys=Math.abs(dx)>Math.abs(dz)?dx>0?['KeyS','KeyD']:['KeyW','KeyA']:dz>0?['KeyS','KeyA']:['KeyW','KeyD'];if(boost)keys.push('ShiftLeft');g.setInput(keys);g.step(1/60,false);}throw Error('Blocked '+JSON.stringify({at:[a.p.x,a.p.y,a.p.z],target:[x,z]}));}
  function shoot(id){const c=a.world.controls.find(c=>c.id===id);g.setInput([]);g.step(3,false);for(let n=0;n<90&&!a.state[id]&&!a.state.pendingSignals[id];n++){g.aimAt(c.x+(c.facing?.x||0)*.5,c.z+(c.facing?.z||0)*.5,c.y+(c.facing?.y||0)*.5);g.setInput(['Mouse0']);g.step(1/60,false);}g.setInput([]);g.step(20,false);if(!a.state[id])throw Error('Latch '+id);}
  walk(77,-158);shoot('proving-transfer');
  for(const [x,z]of [[94,-158],[94,-180],[112,-180],[112,-172],[130,-172],[152,-172],[182,-172],[182,-182],[198,-182],[198,-174]])walk(x,z);
  walk(200,-174);walk(200,-154);shoot('proving-inspection');
  for(const [x,z]of [[198,-154],[198,-152],[9,-152],[9,-34],[0,-34],[0,27]])walk(x,z);
  const start=a.time;walk(0,-34);walk(3,-34);walk(3,-146,true);walk(3,-154.5);walk(198,-154.5);walk(198,-182,true);walk(218,-182);walk(218,-174);
  if(a.p.y!==16||a.state.foundry||a.state.combatArena)throw Error('Retry entered the wrong encounter');a.draw();return {retrySeconds:a.time-start,position:[a.p.x,a.p.y,a.p.z],fixture:'Middle abilities and previous machinery provided; ordinary opposition disabled; actual counterweight, remote signal and both walking directions tested.'};
 });await page.screenshot({path:'v2/output/playwright/regression/overseer-preparation.png'});return result;
}

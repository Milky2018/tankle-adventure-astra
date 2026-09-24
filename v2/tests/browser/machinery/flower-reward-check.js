async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const url='http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual';
 await page.goto(url);await page.waitForFunction(()=>window.__game?.debug);
 await page.evaluate(()=>localStorage.removeItem('furnace-born-v2-city'));await page.reload();await page.waitForFunction(()=>window.__game?.debug);
 const bloom=await page.evaluate(()=>{
  const g=__game,q=g.debug,w=q.world,puzzle=w.sidePuzzles;
  g.manual(true);q.setCameraView('overhead');
  g.scenario({enemies:Object.fromEntries(w.enemies.map(e=>[e.id,0])),player:{x:46,y:-8,z:34,hp:25,invincible:1e9}});g.step(.1);
  const reward=w.views.pickups.find(p=>p.id==='armor-foundry');
  if(reward.root.visible||q.state[reward.id])throw Error('Armour appeared or was collected before bloom');
  g.scenario({player:{x:46,y:-8,z:24}});g.setInput(['KeyS','KeyA']);g.step(1.4,false);g.setInput([]);
  if(q.p.z<36)throw Error('Unbloomed reward blocks the garden passage');
  const shoot=(id,x,z)=>{
   const t=puzzle.targets.find(t=>t.id===id);
   g.scenario({player:{x,y:-8,z,heat:0,overheated:false,lastShot:-100,lastHeat:-100,weapon:'cannon'}});
   g.aimAt(t.x,t.z,t.y);g.setInput(['Mouse0']);g.step(.1,false);g.setInput([]);g.step(1,false);
  };
  shoot('gutter-plug',39,44);shoot('gutter-a',37,30);shoot('gutter-b',49,32);
  if(reward.root.visible||q.state['garden-bloom'])throw Error('Incomplete alignment unlocked reward');
  shoot('gutter-b',49,32);g.step(3);
  if(!puzzle.gutter.state.grown||!q.state['garden-bloom']||!reward.root.visible||!reward.item.visible)throw Error('Bloom did not reveal armour');
  if(q.state[reward.id])throw Error('Reward was granted without collecting it');
  g.save();return {grown:puzzle.gutter.state.grown,visible:reward.root.visible,position:[reward.x,reward.y,reward.z]};
 });
 await page.screenshot({path:'output/playwright/flower-armour-reward.png'});
 await page.reload();await page.waitForFunction(()=>window.__game?.debug);
 const collected=await page.evaluate(()=>{
  const g=__game,q=g.debug,w=q.world;g.manual(true);q.setCameraView('overhead');
  if(!q.state['garden-bloom']||!w.sidePuzzles.gutter.state.grown)throw Error('Uncollected reward lost after reload');
  g.scenario({enemies:Object.fromEntries(w.enemies.map(e=>[e.id,0])),player:{x:46,y:-8,z:30,hp:25,invincible:1e9}});
  const reward=w.views.pickups.find(p=>p.id==='armor-foundry');if(!reward.root.visible)throw Error('Restored reward invisible');
  g.setInput(['KeyS','KeyA']);g.step(.6);g.setInput([]);
  if(!q.state['armor-foundry']||q.p.armorPacks!==1||q.p.hp!==30)throw Error('Cannot collect the armour from the shore');
  g.step(.1);if(reward.item.visible)throw Error('Collected armour still visible');
  g.save();return {armorPacks:q.p.armorPacks,hp:q.p.hp};
 });
 await page.reload();await page.waitForFunction(()=>window.__game?.debug);
 const restored=await page.evaluate(()=>{
  const g=__game,q=g.debug;g.manual(true);g.scenario({player:{x:46,y:-8,z:34,invincible:1e9}});g.step(.1);
  const reward=q.world.views.pickups.find(p=>p.id==='armor-foundry');
  if(q.p.armorPacks!==1||!q.state['armor-foundry']||reward.item.visible)throw Error('Reload duplicated or lost collected armour');
  return {armorPacks:q.p.armorPacks,itemVisible:reward.item.visible};
 });
 if(errors.length)throw Error(errors.join('\n'));return {bloom,collected,restored,errors};
}

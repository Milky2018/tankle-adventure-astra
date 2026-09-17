async page=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/src/folded.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+`
window.__polish={
  enemy:id=>{const e=world.enemies.find(e=>e.id===id);return {hp:e.hp,visible:e.model.root.visible,height:e.model.root.scale.y};},
  carrier:y=>{const l=world.lifts.find(l=>l.id==='carrier');l.y=l.destination=y;l.wait=10;world.update(1,time,p);},
  brake:()=>{const c=world.controls.find(c=>c.id==='brake');return {cover:c.cover.position.y,color:c.lamp.material.color.getHex()};},
  hive:()=>{const h=world.hives.find(h=>h.id===state.anchor);return {pulse:h.pulse,kind:h.pulseKind,arms:h.arms.map(a=>a.pivot.rotation.z),scan:h.scan.position.y};},
  shot:()=>shots.filter(s=>!s.hostile).map(s=>({radius:s.mesh.geometry.parameters.radius,scale:s.mesh.scale.x,tail:s.mesh.children[0]?.geometry.parameters.depth})),
  occlusion:()=>world.occluders.filter(o=>o.opacity<.4&&o.root.visible).map(o=>({name:o.root.name,opacity:o.opacity,meshes:o.meshes.length,valid:o.meshes.every(m=>m.materials.every(a=>a.material.transparent&&Math.abs(a.material.opacity-a.opacity*o.opacity)<.001&&!a.material.depthWrite))})),
  belt:()=>world.belts.map(b=>({id:b.id,phase:b.phase,slope:b.segments[0].root.rotation.x,slats:b.segments[0].mesh.count})),
};`});});
  await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test');await page.waitForFunction(()=>!!window.__polish);await page.unroute('**/src/folded.js*');
  await page.evaluate(()=>{__game.manual(true);__game.scenario({player:{x:0,y:-8,z:86,hp:25},state:{anchor:'awakening'}});__game.step(.3);});
  const result={};result.hiveBefore=await page.evaluate(()=>__polish.hive());
  await page.keyboard.press('e');await page.evaluate(()=>__game.step(.45));result.repair=await page.evaluate(()=>__polish.hive());
  if(result.repair.pulse<=0||Math.abs(result.repair.arms[0]-result.hiveBefore.arms[0])<.1)throw Error('Repair motion missing');
  await page.screenshot({path:'v2/output/playwright/polish-repair.png'});
  await page.evaluate(()=>{__game.respawn();__game.step(.5);});result.respawn=await page.evaluate(()=>__polish.hive());
  if(result.respawn.kind!=='respawn'||result.respawn.pulse<1)throw Error('Respawn animation missing');
  await page.screenshot({path:'v2/output/playwright/polish-respawn.png'});
  await page.evaluate(()=>{__game.aimAt(-8,86,-6);__game.fire();__game.step(.01);});result.shots=await page.evaluate(()=>__polish.shot());
  if(!result.shots.some(s=>s.radius===.23&&s.scale===1.3&&s.tail===2.2))throw Error('Cannon silhouette regression');
  for(const [name,x,y,z]of [['relay',-35,-16,49],['conveyor',0,-8,72],['canal',0,-16,-4],['sloped-belt',211,-20,64]]){
    await page.evaluate(([x,y,z])=>{__game.scenario({player:{x,y,z,hp:50}});__game.step(.7);},[x,y,z]);
    const faded=await page.evaluate(()=>__polish.occlusion());if(faded.some(o=>!o.valid))throw Error('Incomplete object transparency');result[name]={fadedCount:faded.length};
    await page.screenshot({path:`v2/output/playwright/polish-${name}.png`});
  }
  const before=await page.evaluate(()=>__polish.belt());await page.evaluate(()=>__game.step(.2));const after=await page.evaluate(()=>__polish.belt());
  result.slopedBelts=after.filter(b=>Math.abs(b.slope)>.01);if(!result.slopedBelts.some(b=>b.phase!==before.find(a=>a.id===b.id).phase))throw Error('Sloped belt animation missing');
  await page.evaluate(()=>{__game.scenario({player:{x:-13,y:-8,z:85,weapon:'cannon',heat:0,overheated:false,lastHeat:-100,lastShot:-100},enemies:{'foundry-west-scout':1}});__game.aimAt(-23,85,-6.5);__game.fire();__game.step(.9);});
  result.wreck=await page.evaluate(()=>__polish.enemy('foundry-west-scout'));if(result.wreck.hp!==0||!result.wreck.visible||result.wreck.height>.4)throw Error('Enemy defeat has no lasting wreck feedback');
  await page.evaluate(()=>{__game.scenario({state:{load:true,brake:false}});__polish.carrier(8);});result.brakeClosed=await page.evaluate(()=>__polish.brake());await page.evaluate(()=>__polish.carrier(16));result.brakeReady=await page.evaluate(()=>__polish.brake());
  if(result.brakeClosed.cover>.01||result.brakeReady.cover<1.3||result.brakeClosed.color===result.brakeReady.color)throw Error('Carrier brake availability is not visible');
  await page.evaluate(()=>{__game.scenario({player:{x:78,y:8,z:-71,weapon:'cannon',heat:0,overheated:false,lastShot:-100},state:{load:true,brake:false}});__polish.carrier(8);__game.step(.01);});
  await page.keyboard.press('e');await page.evaluate(()=>__game.step(2.5));
  const automatic=await page.evaluate(()=>__game.snapshot());if(automatic.player.y!==16)throw Error('Manual input interrupted the automatic demonstration');
  await page.evaluate(()=>{__game.aimAt(78,-77.7,18);__game.fire();__game.step(.3);});
  if(!(await page.evaluate(()=>__game.snapshot())).state.brake)throw Error('Aligned carrier brake cannot be released');
  result.carrierModes=await page.evaluate(()=>{const levels=[];for(let i=0;i<80;i++){__game.step(.2,false);levels.push(__game.snapshot().player.y);}return {min:Math.min(...levels),max:Math.max(...levels)};});
  if(result.carrierModes.min!==8||result.carrierModes.max!==16)throw Error('Released carrier did not keep cycling');
  if(errors.length)throw Error(JSON.stringify(errors));return {...result,errors};
}

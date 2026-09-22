async page=>{
 await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');await page.waitForFunction(()=>window.__game?.debug);
 const report=await page.evaluate(()=>{
  const g=__game,a=g.debug;g.manual(true);a.setCameraView('overhead');g.setInput([]);
  g.scenario({player:{x:340,y:-24,z:177,magnet:true,hp:25,heat:0,overheated:false},enemies:Object.fromEntries(a.world.enemies.map(e=>[e.id,0]))});
  const body=a.state.bodies.solids.find(b=>b.id==='coolant-transfer'),control=a.world.controls.find(c=>c.id===body.id),enemy=a.world.enemies.find(e=>e.type==='miner');
  body.z=180;a.state.slidePositions[body.id]=180;a.world.update(.1,0,a.p);
  Object.assign(enemy,{x:335.5,y:-24,z:178.5,hp:3,awake:true,stunnedUntil:1e9});
  const start=enemy.z,ends=[];
  function walk(z){for(let i=0;i<900&&Math.abs(a.p.z-z)>.2;i++){g.setInput(a.p.z<z?['KeyS','KeyA']:['KeyW','KeyD']);g.step(1/60,false);}g.setInput([]);if(Math.abs(a.p.z-z)>.3)throw Error('Blocked walk');}
  for(const [sign,end]of [[-1,166],[1,180],[-1,166]]){
   walk(body.z+6+sign*9);
   for(let i=0;i<2400&&Math.abs(body.z-end)>.05;i++){
    const target=body.z+6+sign*9,keys=[];
    if(Math.abs(a.p.z-target)>.2)keys.push(...(a.p.z<target?['KeyS','KeyA']:['KeyW','KeyD']));
    if(!a.p.overheated)keys.push('Mouse2');
    g.aimAt(control.x,control.z,control.y);g.setInput(keys);g.step(1/60,false);
   }
   g.setInput([]);g.step(2,false);ends.push(body.z);
   if(Math.abs(body.z-end)>.1)throw Error('Magnet blocked '+JSON.stringify({box:body.z,end,enemy:[enemy.x,enemy.z],player:[a.p.x,a.p.z],heat:a.p.heat}));
  }
  if(enemy.z>=start-5)throw Error('Enemy was not pushed');
  const marker=a.scene.getObjectByName('slide-destination:coolant-transfer:166');
  if(marker.children[0].material.color.getHex()!==0x85db58)throw Error('Goal color '+marker.children[0].material.color.getHex().toString(16));
  a.draw();return {boxPositions:ends,enemyMoved:start-enemy.z,fixture:'One living enemy has AI stunned to isolate collision; real Magnet and driving inputs; unrelated enemies disabled'};
 });
 await page.screenshot({path:'output/playwright/machinery-slide-complete.png'});return report;
}

async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));

 await page.setViewportSize({width:1440,height:900});
 await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test');await page.waitForFunction(()=>window.__game?.debug);
 await page.evaluate(()=>{__game.manual(true);__game.scenario({player:{x:0,y:-56,z:53,hp:50,invincible:10000}});__game.step(.2);});
 const coverage=await page.evaluate(async()=>{
  const pixels=async()=>{const image=new Image();image.src=__game.pixel();await image.decode();const c=document.createElement('canvas');c.width=1440;c.height=900;const ctx=c.getContext('2d');ctx.drawImage(image,0,0,1440,900);return [[350,300],[400,420]].map(([x,y])=>[...ctx.getImageData(x,y,1,1).data].slice(0,3));};
  const visible=await pixels(),masses=__game.debug.world.walls.filter(w=>w.mass),depth=__game.debug.scene.getObjectByName('folded-mass-depth');
  // The temporary reference isolates foreground structural coverage; it is not the game rendering policy.
  masses.forEach(w=>w.mesh.visible=false);if(depth)depth.visible=false;const reference=await pixels();
  masses.forEach(w=>w.mesh.visible=true);if(depth)depth.visible=true;
  return {visible,reference,errors:visible.map((pixel,i)=>pixel.reduce((sum,value,c)=>sum+Math.abs(value-reference[i][c]),0)/3)};
 });
 await page.evaluate(()=>__game.step(0));await page.screenshot({path:'output/playwright/craft/arena-visibility.png'});
 if(coverage.errors.some(e=>e>12))throw Error('Upper foundation masks the arena outside the hull ray '+JSON.stringify(coverage));
 const target=await page.evaluate(()=>{
  for(const e of __game.debug.world.enemies)e.hp=0;
  const e=__game.debug.world.enemies.find(e=>e.type==='turret');Object.assign(e,{x:-15,y:-56,z:57,hp:2,max:2,phase:'idle',timer:100,deadAt:null});e.model.root.visible=true;e.model.root.scale.copy(e.baseScale);
  __game.scenario({player:{weapon:'cannon',heat:0,overheated:false,lastShot:-100,lastHeat:-100}});__game.step(.02);
  return {id:e.id,...__game.project(e.x,e.z,e.y+1.5)};
 });
 await page.mouse.move(target.x,target.y);await page.mouse.down();await page.evaluate(()=>__game.step(1.2));await page.mouse.up();
 const remaining=await page.evaluate(id=>__game.debug.world.enemies.find(e=>e.id===id).hp,target.id);
 if(remaining!==0)throw Error('Visible enemy under the faded foundation cannot be aimed at '+remaining);
 const movement=[];
 await page.keyboard.down('s');await page.keyboard.down('d');
 for(let i=0;i<3;i++){await page.evaluate(()=>__game.step(.4));await page.screenshot({path:`output/playwright/craft/arena-movement-${i}.png`});movement.push(await page.evaluate(()=>__game.snapshot().player.x));}
 await page.keyboard.up('s');await page.keyboard.up('d');
 if(movement[2]-movement[0]<5)throw Error('Visibility movement fixture did not move');
 if(errors.length)throw Error(JSON.stringify(errors));return {coverage,remaining,movement,errors};
}

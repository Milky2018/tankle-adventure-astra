async page=>{
 const errors=[],fixtures=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5174/?chapter=folded&view=third&test&manual');await page.waitForFunction(()=>window.__game?.debug);
 await page.evaluate(()=>localStorage.removeItem('furnace-born-v2-city'));await page.reload();await page.waitForFunction(()=>window.__game?.debug);
 await page.setViewportSize({width:1280,height:800});
 for(const [name,x,y,z,yaw,pitch]of [['hive-through',0,-8,90,0,.22],['upper-floor',110,-8,18,Math.PI,.9],['arsenal-wall',-241,8,18,Math.PI/2,.22],['lens-wall',315,24,-32,Math.PI/2,.22]]){
   const s=await page.evaluate(({x,y,z,yaw,pitch})=>{__game.manual(true);__game.scenario({player:{x,y,z,hp:50,invincible:1e9}});__game.look(yaw,pitch);__game.step(.2);return __game.snapshot();},{x,y,z,yaw,pitch});
   if(s.camera.distance<12)throw Error('Obstacle shortened boom '+name);
   await page.screenshot({path:`v2/output/playwright/overhaul/${name}.png`});fixtures.push({name,camera:s.camera});
 }
 await page.keyboard.press('c');if(await page.evaluate(()=>__game.snapshot().camera.view)!=='overhead')throw Error('C did not select overhead');
 await page.goto('http://127.0.0.1:5174/?chapter=folded&test&manual');await page.waitForFunction(()=>window.__game?.debug);
 if(await page.evaluate(()=>__game.snapshot().camera.view)!=='overhead')throw Error('View preference did not persist');
 await page.keyboard.press('c');await page.mouse.down();await page.keyboard.press('c');await page.mouse.up();
 if(await page.evaluate(()=>__game.snapshot().camera.view)!=='overhead')throw Error('Firing blocks C toggle');
 const propagation=await page.evaluate(()=>{
   __game.scenario({player:{x:58,y:-8,z:-4,invincible:1e9},state:{pump:false}});__game.step(.1);
   const feed=__game.debug.world.controlFeeds.find(f=>f.id==='pump'&&f.target==='pump'&&f.points.at(-1)[0]<0);
   const colors=()=>feed.lamps.map((l,i)=>{const gpu=feed.mesh.instanceColor.array;for(let j=0;j<3;j++)if(Math.abs(gpu[i*3+j]-l.color.toArray()[j])>1e-6)throw Error('Instance color did not update');return l.color.getHex();});
   const before=colors();__game.scenario({state:{pump:true}});__game.step(.2);const early=colors();__game.step(2);const middle=colors();__game.step(8);const after=colors();
   return {before,early,middle,after};
 });
 if(!propagation.middle.includes(0xf3d250)||!propagation.middle.includes(0x85db58)||propagation.after.some(c=>c!==0x85db58))throw Error('Circuit did not propagate '+JSON.stringify(propagation));
 if(errors.length)throw Error(errors.join('\n'));return {fixtures,preferenceSaved:true,toggleWhileFiring:true,circuitPropagates:true,errors};
}

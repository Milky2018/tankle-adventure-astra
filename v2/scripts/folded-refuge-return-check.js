async page => {
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');await page.waitForFunction(()=>window.__game);
 await page.evaluate(()=>{localStorage.removeItem('furnace-born-v2-city');});await page.reload();await page.waitForFunction(()=>window.__game);
 await page.evaluate(()=>__game.scenario({state:{foundry:true,prototype:true,phoenix:true,circulation:true,laser:true,overdrive:true,anchor:'distribution'},player:{x:150,y:24,z:-28,hp:25,phoenix:true,circulation:true,laser:true,mortar:true,overdrive:true},enemies:{foundry:0,prototype:0}}));
 async function weapon(name){for(let i=0;i<3&&(await page.evaluate(()=>__game.snapshot())).player.weapon!==name;i++)await page.keyboard.press('q');}
 async function move(x,z,boost=false){
  const r=await page.evaluate(({x,z,boost})=>{const g=__game,start=g.snapshot().time;
   for(let i=0;i<4800;i++){
    const p=g.snapshot().player,dx=x-p.x,dz=z-p.z;if(Math.hypot(dx,dz)<.2){g.setInput([]);return {x:p.x,y:p.y,z:p.z,seconds:g.snapshot().time-start};}
    const keys=Math.abs(dx)>Math.abs(dz)?dx>0?['KeyS','KeyD']:['KeyW','KeyA']:dz>0?['KeyS','KeyA']:['KeyW','KeyD'];if(boost)keys.push('ShiftLeft');
    g.setInput(keys);g.step(Math.hypot(dx,dz)<2?1/120:1/30,false);
   }throw Error('Blocked '+JSON.stringify({target:[x,z],p:g.snapshot().player,lifts:g.debug.world.lifts.map(l=>({id:l.id,y:l.y}))}));
  },{x,z,boost});return r;
 }
 async function shoot(id,kind='cannon',via){await weapon(kind);const r=await page.evaluate(({id,via})=>{const g=__game,c=g.debug.world.controls.find(c=>c.id===id);g.setInput([]);g.step(3,false);
  for(let i=0;i<240&&!g.snapshot().state[id];i++){g.aimAt(via?.[0]??c.x,via?.[2]??c.z,via?.[1]??c.y);g.setInput(['Mouse0']);g.step(1/60,false);}g.setInput([]);return {open:g.snapshot().state[id],p:g.snapshot().player,aim:g.debug.aim.toArray()};},{id,via});if(!r.open)throw Error(id+' '+JSON.stringify(r));}
 async function arrive(y){await page.evaluate(y=>{const g=__game;g.setInput([]);for(let i=0;i<3600;i++){if(Math.abs(g.snapshot().player.y-y)<.01)return;g.step(1/60,false);}throw Error('Lift '+y);},y);}
 await move(122,-28);await move(122,32,true);await shoot('inner-transit');
 await move(138,32);await move(138,-28);await move(150,-28);
 if(await page.evaluate(()=>__game.snapshot().state['inner-optics']))throw Error('Thermal work unlocked the optical circuit');
 await move(122,-28);await shoot('inner-optics','laser');await move(122,32);
 await move(122,30);await move(94,30);await move(94,46);await arrive(-40);await move(82,46);await move(82,6);await move(44,6);await move(44,-10);await page.keyboard.press('e');
 await shoot('last-cage');await move(34,-18);await move(22,-18);await arrive(-8);await move(22,-8);await move(18,-8);await move(18,-2);await move(16,-2);await move(16,80);await move(16,86);await move(0,86);await page.keyboard.press('e');
 const a=await page.evaluate(()=>__game.snapshot().state.anchor);if(a!=='awakening')throw Error('Shaft did not reach A');
 await move(16,80);await move(16,-2);await move(18,-2);await move(18,-8);await move(22,-8);await move(22,-18);await arrive(-40);await move(34,-18);await move(44,-10);await page.keyboard.press('e');
 await page.evaluate(()=>__game.step(.1));await page.screenshot({path:'v2/output/playwright/refuge-deep-room.png'});
 if(errors.length)throw Error(errors.join('\n'));const final=await page.evaluate(()=>__game.snapshot());if(final.state.anchor!=='last-refuge'||Math.abs(final.player.y+40)>.1||final.player.hp!==25)throw Error('D repair failed');return {anchor:final.state.anchor,roundTrip:true,errors};
}

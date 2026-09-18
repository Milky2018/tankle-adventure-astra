// Isolated mechanisms and camera fixtures, followed by input-driven bay walks.
// The full campaign runner separately checks acquisition order and normal combat.
async page=>{
  const errors=[],runs=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1440,height:900});
  for(const view of ['overhead','third']){
    await page.goto(`http://127.0.0.1:5174/?chapter=folded&view=${view}&test`);await page.waitForFunction(()=>window.__game?.debug);
    await page.evaluate(()=>{__game.manual(true);__game.scenario({state:{keeper:false,'last-cage':false,endingSeen:false},player:{endingTime:0},enemies:Object.fromEntries(__game.snapshot().enemies.map(e=>[e.id,0]))});});
    async function aim(x,z,y){
      if(view==='third'&&!await page.evaluate(()=>!!document.pointerLockElement)){await page.mouse.click(720,450);await page.waitForFunction(()=>!!document.pointerLockElement);}
      const point=await page.evaluate(({x,z,y,view})=>{
        if(view==='overhead')return __game.aimAt(x,z,y);
        for(let i=0;i<24;i++){const c=__game.snapshot().camera.position,dx=x-c[0],dy=y-c[1],dz=z-c[2];__game.look(Math.atan2(dx,dz),Math.atan2(-dy,Math.hypot(dx,dz)));}
        return null;
      },{x,z,y,view});
      if(point)await page.mouse.move(point.x,point.y);
    }
    async function shot(x,z,y,id){
      await aim(x,z,y);await page.mouse.down();await page.evaluate(()=>__game.step(1.2));await page.mouse.up();
      if(!await page.evaluate(id=>__game.snapshot().state[id],id))throw Error(view+' could not shoot '+id+' '+JSON.stringify(await page.evaluate(({x,z,y})=>({point:__game.project(x,z,y),s:__game.snapshot()}),{x,z,y})));
    }
    await page.evaluate(()=>{
      __game.scenario({player:{x:78,y:8,z:-61,hp:50},state:{load:false,brake:false}});
      const l=__game.debug.world.lifts.find(l=>l.id==='carrier');l.y=l.destination=8;l.wait=3;__game.step(.1);
    });
    const covered=await page.evaluate(()=>{
      const {world,T}=__game.debug,c=world.controls.find(c=>c.id==='brake');
      const hit=world.cast(new T.Vector3(78,18,-70),new T.Vector3(0,0,-1),12);
      return {ready:c.ready,cover:c.cover.position.y,blocked:hit?.blockedTarget?.id};
    });
    if(covered.ready||covered.cover>.1||covered.blocked!=='brake')throw Error('Unaligned carrier target is not physically covered '+JSON.stringify(covered));
    await page.evaluate(()=>{
      __game.scenario({player:{x:78,y:16,z:-71,weapon:'cannon',heat:0,overheated:false},state:{load:true,brake:false}});
      const l=__game.debug.world.lifts.find(l=>l.id==='carrier');l.y=16;l.destination=8;l.wait=3;__game.step(.4);
    });
    await shot(78,-77.7,18,'brake');
    await page.screenshot({path:`v2/output/playwright/late-polish/carrier-${view}.png`});
    await page.evaluate(()=>{__game.scenario({player:{x:242,y:24,z:-4,weapon:'cannon',laser:true,heat:0,overheated:false},state:{'mirror-index':false}});__game.step(1);});
    const original=await page.evaluate(()=>__game.debug.world.mirrors.find(m=>m.index).normal.toArray());
    await shot(238,-4,25.3,'mirror-index');
    const rotation=await page.evaluate(original=>{
      const m=__game.debug.world.mirrors.find(m=>m.index),lamp=__game.debug.scene.getObjectByName('folded-mirror-link').children.at(-1);
      return {distance:m.normal.distanceTo(new __game.debug.T.Vector3(...original)),lamp:lamp.material.color.getHex()};
    },original);
    if(rotation.distance<.1)throw Error('Shot paddle did not turn the actual mirror');
    await page.screenshot({path:`v2/output/playwright/late-polish/mirror-${view}.png`});
    await page.evaluate(()=>{__game.scenario({player:{x:156,y:-8,z:34,hp:50,invincible:0,weapon:'cannon',heat:0,overheated:false},state:{pressure:true},enemies:{'yard-inlet-gunner':2,'yard-inlet-flanker':2}});__game.look(0,.22);__game.step(.1);});
    for(const id of ['yard-inlet-gunner','yard-inlet-flanker']){
      for(let i=0;i<24;i++){
        const enemy=await page.evaluate(id=>__game.snapshot().enemies.find(e=>e.id===id),id);if(!enemy.hp)break;
        await aim(enemy.x,enemy.z,enemy.y+1.5);await page.mouse.down();await page.evaluate(()=>__game.step(.25));await page.mouse.up();
      }
      const s=await page.evaluate(()=>__game.snapshot());
      if(s.player.hp<=0||s.enemies.find(e=>e.id===id).hp)throw Error('Unplayable inlet encounter '+view+' '+id);
    }
    const fightHp=await page.evaluate(()=>__game.snapshot().player.hp);
    await page.screenshot({path:`v2/output/playwright/late-polish/inlet-${view}.png`});
    await page.evaluate(()=>{__game.scenario({player:{x:250,y:-40,z:6,hp:50,heat:0,overheated:false,overdrive:true,phoenix:true,circulation:true}});__game.look(-Math.PI/2,.22);__game.step(.1);});
    async function move(x,z,boost=false){
      return await page.evaluate(({x,z,boost})=>{
        const g=__game,start=g.snapshot().time;
        for(let i=0;i<1800;i++){
          const s=g.snapshot(),p=s.player,dx=x-p.x,dz=z-p.z;if(Math.hypot(dx,dz)<.25){g.setInput([]);g.step(.1);return s.time-start;}
          const yaw=s.camera.view==='third'?s.camera.yaw:Math.PI*1.25,h=-Math.cos(yaw)*dx+Math.sin(yaw)*dz,v=-Math.sin(yaw)*dx-Math.cos(yaw)*dz,m=Math.max(Math.abs(h),Math.abs(v)),keys=[];
          if(Math.abs(h)>m*.4)keys.push(h>0?'KeyD':'KeyA');if(Math.abs(v)>m*.4)keys.push(v>0?'KeyS':'KeyW');if(boost)keys.push('ShiftLeft');
          g.setInput(keys);g.step(Math.hypot(dx,dz)<2?1/120:1/30,false);
        }
        throw Error('Bay route blocked '+JSON.stringify({target:[x,z],p:g.snapshot().player}));
      },{x,z,boost});
    }
    const transit=await move(44,6,true);
    if(transit>15)throw Error('Final rail interrupted the Phoenix run '+transit);
    await move(250,6,true);
    for(const x of [210,146,82]){
      await move(x,6);await move(x,-2);await move(x-6,-2);await move(x-6,-9);await move(x-6,-2);await move(x,6);
      const clearance=await page.evaluate(()=>{__game.look(Math.PI,.22);__game.step(.3);return __game.snapshot().camera.distance;});
      if(view==='third'&&clearance<7)throw Error('Bay viewing point collapses the camera '+x+' '+clearance);
      await page.screenshot({path:`v2/output/playwright/late-polish/bay-${x}-${view}.png`});
    }
    await move(44,6);await move(44,-10);
    await shot(40,-12,-38.6,'last-cage');
    if(await page.evaluate(()=>__game.snapshot().state.keeper))throw Error('Bay traversal incorrectly granted keeper completion');
    runs.push({view,covered,rotation,fightHp,transit});
  }
  if(errors.length)throw Error(errors.join('\n'));return {runs,errors};
}

async(page)=>{
  await page.goto('http://127.0.0.1:5174/?chapter=2&test');await page.evaluate(()=>localStorage.removeItem('furnace-born-v2-transit-preview'));await page.reload();await page.waitForFunction(()=>window.__game);
  const result=await page.evaluate(()=>{
    const g=window.__game,checks=[],legs=[];const check=(name,passed)=>checks.push({name,passed:!!passed});
    const quiet=Object.fromEntries(g.snapshot().enemies.map((_,i)=>[i,{hp:0}]));
    const setup=(x,z)=>g.scenario({player:{x,z,hp:50,heat:0,overheated:false,speed:1,overdrive:false,magnet:false,mortar:false,flotation:false,deployed:false,afloat:false,underpass:false},enemiesByIndex:quiet});
    const walk=(tx,tz)=>{
      const p=g.snapshot().player,candidates=[];for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){const x=Math.round(p.x)+dx,z=Math.round(p.z)+dz;if(!g.collides(x,z,.98))candidates.push([x,z]);}candidates.sort((a,b)=>Math.hypot(a[0]-p.x,a[1]-p.z)-Math.hypot(b[0]-p.x,b[1]-p.z));const start=candidates[0],key=(x,z)=>`${x},${z}`,queue=[start],parent=new Map([[key(...start),null]]);let end;
      for(let i=0;i<queue.length;i++){
        const [x,z]=queue[i],k=key(x,z);if(x===tx&&z===tz){end=k;break;}
        for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,nk=key(nx,nz);if(nx<-206||nx>114||nz<-350||nz>-65||parent.has(nk)||g.collides(nx,nz,.98))continue;parent.set(nk,k);queue.push([nx,nz]);}
      }
      if(!end)throw new Error(`No route from ${p.x},${p.z} to ${tx},${tz}`);
      const path=[];for(let k=end;k!==null;k=parent.get(k))path.push(k.split(',').map(Number));path.reverse();
      const corners=path.filter((p,i)=>i===0||i===path.length-1||(path[i-1][0]===p[0])!==(p[0]===path[i+1][0]));
      for(const [x,z]of corners)for(let n=0;n<500;n++){
        const p=g.snapshot().player,dx=x-p.x,dz=z-p.z;if(Math.hypot(dx,dz)<.18)break;const alongX=Math.abs(dx)>Math.abs(dz),d=alongX?dx:dz;
        g.setInput(alongX?(d>0?['KeyS','KeyD']:['KeyW','KeyA']):(d>0?['KeyS','KeyA']:['KeyW','KeyD']));g.step(Math.min(.1,Math.abs(d)/7));
        if(n===499)throw new Error(`Stuck at ${p.x},${p.z} toward ${x},${z}`);
      }g.setInput([]);legs.push([tx,tz]);
    };
    const bump=()=>{g.setInput(['KeyW','KeyD']);g.step(.18);g.setInput([]);g.step(.7);};
    const shoot=(x,z)=>{g.aimAt(x,z);g.fire();g.step(.7);};
    setup(-10,-117);walk(-40,-99);g.interact();check('E cannot release a parked carrier',!g.snapshot().puzzles.rail.moving);
    shoot(-38,-104);check('Cannon releases the carrier brake',g.snapshot().puzzles.rail.moving);g.step(12);
    check('Wrong routing returns to the signal',!g.snapshot().puzzles.rail.moving&&!g.snapshot().puzzles.rail.secured);
    walk(-28,-108);g.step(.5);check('Weight selects the first branch once',g.snapshot().puzzles.rail.switches[0]);
    walk(-28,-110);walk(-20,-104);check('Weight selects the second branch',g.snapshot().puzzles.rail.switches[1]);walk(-40,-99);shoot(-38,-104);g.step(7);
    check('Docking directly opens both crossing barriers',g.snapshot().puzzles.rail.solved&&!g.collides(-44,-98)&&!g.collides(-72,-98));walk(-76,-98);
    check('The crossing needs no acquired module',!g.snapshot().player.overdrive&&!g.snapshot().player.magnet);walk(-10,-117);g.repair();g.scenario({enemiesByIndex:quiet});check('Repair retains the rail crossing',g.snapshot().puzzles.rail.solved);
    setup(-175,-294);walk(-190,-292);shoot(-190,-286);check('The covered retaining pin rejects an early shot',!g.snapshot().puzzles.basin.locked);
    walk(-190,-295);g.step(3.2);check('Tank weight pumps the basin full',g.snapshot().puzzles.basin.level===1&&g.collides(-199,-299));
    walk(-187,-295);g.step(3.2);check('Leaving before shooting lowers the deck for a retry',g.snapshot().puzzles.basin.level===0&&!g.snapshot().puzzles.basin.solved);
    walk(-190,-295);g.step(3.2);shoot(-190,-286);check('Cannon engages the exposed retaining pin',g.snapshot().puzzles.basin.locked);
    walk(-187,-295);g.step(3.2);walk(-199,-305);walk(-199,-275);walk(-190,-261);
    check('Walking off the pump drains and opens the dry passage',g.snapshot().puzzles.basin.solved&&!g.snapshot().player.flotation);
    walk(-180,-245);walk(-180,-246);bump();g.step(1);check('Hull contact rotates the first gutter once',g.snapshot().puzzles.gutter.angles[0]===1);walk(-180,-244);
    walk(-165,-248);walk(-165,-249);bump();walk(-165,-248);walk(-165,-249);bump();g.step(2.2);
    check('Aligned gutters cannot grow through a plugged pipe',g.snapshot().puzzles.gutter.angles[1]===2&&!g.snapshot().puzzles.gutter.grown);
    walk(-178,-247);shoot(-181,-251);g.step(3);check('Shooting the rust plug starts water and restores the plant',g.snapshot().puzzles.gutter.unplugged&&g.snapshot().puzzles.gutter.grown);
    check('Restoration grants no health or module',g.snapshot().player.hp===50&&!g.snapshot().player.flotation&&!g.snapshot().player.magnet&&!g.snapshot().player.mortar);
    if(checks.some(c=>!c.passed))throw new Error(JSON.stringify(checks));return {checks,legs};
  });
  await page.reload();await page.waitForFunction(()=>window.__game);
  result.checks.push(await page.evaluate(()=>{const p=window.__game.snapshot().puzzles;return {name:'Reload retains all three completed puzzles',passed:p.rail.solved&&p.basin.solved&&p.gutter.grown}}));
  await page.goto('http://127.0.0.1:5174/?chapter=3&test');await page.evaluate(()=>localStorage.removeItem('furnace-born-v2-garden-preview'));await page.reload();await page.waitForFunction(()=>window.__game);
  result.checks.push(await page.evaluate(()=>{const g=window.__game;g.scenario({player:{x:-168,z:-266,weapon:'cannon'},enemiesByIndex:Object.fromEntries(g.snapshot().enemies.map((_,i)=>[i,{hp:0}]))});g.aimAt(-181,-251);g.fire();g.step(1);return {name:'The bed wall blocks shots before they can hit the plug',passed:!g.snapshot().puzzles.gutter.unplugged}}));
  await page.evaluate(()=>{const g=window.__game;g.scenario({player:{x:-181,z:-253.3,weapon:'cannon'},enemiesByIndex:Object.fromEntries(g.snapshot().enemies.map((_,i)=>[i,{hp:0}]))});g.aimAt(-181,-251);});
  await page.mouse.click(...Object.values(await page.evaluate(()=>window.__game.project(-181,-251))));await page.waitForTimeout(500);
  result.checks.push(await page.evaluate(()=>({name:'Real mouse input can break the plug at close range',passed:window.__game.snapshot().puzzles.gutter.unplugged})));
  if(result.checks.some(c=>!c.passed))throw new Error(JSON.stringify(result));return result;
}

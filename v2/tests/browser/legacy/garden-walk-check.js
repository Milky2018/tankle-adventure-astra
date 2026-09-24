async(page)=>{
  await page.goto('http://127.0.0.1:5174/?chapter=3&test');await page.evaluate(()=>localStorage.removeItem('furnace-born-v2-garden-preview'));await page.reload();await page.waitForFunction(()=>window.__game);
  const result=await page.evaluate(()=>{
    const g=window.__game,results=[];
    const quiet=()=>g.scenario({enemiesByIndex:Object.fromEntries(g.snapshot().enemies.map((_,i)=>[i,{hp:0}]))});quiet();
    const pathTo=(tx,tz)=>{
      const p=g.snapshot().player,water=p.deployed,start=[Math.round(p.x),Math.round(p.z)],key=(x,z)=>`${x},${z}`,queue=[start],parent=new Map([[key(...start),null]]);let end;
      for(let i=0;i<queue.length;i++){
        const [x,z]=queue[i],k=key(x,z);if(x===tx&&z===tz){end=k;break;}
        for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,nk=key(nx,nz);if(nx<-185||nx>114||nz<-350||nz>-65||parent.has(nk)||g.collides(nx,nz,.98,null,water))continue;parent.set(nk,k);queue.push([nx,nz]);}
      }
      if(!end)throw new Error(`No route from ${p.x},${p.z} to ${tx},${tz} deployed=${water}`);
      const path=[];for(let k=end;k!==null;k=parent.get(k))path.push(k.split(',').map(Number));path.reverse();
      const corners=path.filter((p,i)=>i===path.length-1||i===0||(path[i-1][0]===p[0])!==(p[0]===path[i+1][0]));
      for(const [x,z]of corners)for(let step=0;step<600;step++){
        const p=g.snapshot().player,dx=x-p.x,dz=z-p.z;if(Math.hypot(dx,dz)<.18)break;
        const alongX=Math.abs(dx)>Math.abs(dz),d=alongX?dx:dz;
        g.setInput(alongX?(d>0?['KeyS','KeyD']:['KeyW','KeyA']):(d>0?['KeyS','KeyA']:['KeyW','KeyD']));g.step(Math.min(.1,Math.abs(d)/(p.deployed?5.25:7)));
        if(step===599)throw new Error(`Stuck at ${p.x},${p.z} heading for ${x},${z}`);
      }
      g.setInput([]);results.push({target:[tx,tz],steps:path.length,position:[g.snapshot().player.x,g.snapshot().player.z]});
    };
    const pull=(x,z,seconds)=>{g.aimAt(x,z);g.setInput(['Mouse2']);g.step(seconds);g.setInput([]);g.step(.05);};
    pathTo(-78,-249);pull(-90,-249,1);pathTo(-76,-249);pull(g.snapshot().transit.rails['garden-panel'],-249,4);
    if(!g.snapshot().transit.opened.includes('garden-service'))throw new Error('Service panel did not open');
    pathTo(-154,-205);g.interact();if(!g.snapshot().player.flotation||g.snapshot().player.mortar)throw new Error('Flotation acquisition order');
    pathTo(-142,-200);g.repair();quiet();pathTo(-159,-217);g.toggleFlotation();pathTo(-159,-249);g.toggleFlotation();
    pathTo(-175,-294);g.repair();quiet();pathTo(-163,-335);pathTo(-119,-316);g.repair();quiet();
    // Cross the reservoir itself as well as the supported outer shore.
    g.toggleFlotation();pathTo(-159,-300);g.interact();if(!g.snapshot().gardens.tender)throw new Error('Tender did not restart');pathTo(-152,-275);pathTo(-132,-278);g.toggleFlotation();
    pull(-143,-281,3);pathTo(-130,-278);pull(g.snapshot().transit.rails['garden-feed'],-281,2);
    pathTo(-113,-273);g.interact();if(!g.snapshot().gardens.restored)throw new Error('Pump control did not restore');
    pathTo(-57,-250);pathTo(-159,-196);g.toggleFlotation();pathTo(-158,-133);g.repair();quiet();
    pathTo(-80,-123);pathTo(45,-108);g.toggleFlotation();pathTo(73,-102);pathTo(73,-90);pathTo(54,-78);g.interact();if(!g.snapshot().player.mortar)throw new Error('Water outlet missed the original Mortar rig');
    pathTo(55,-83);g.aimAt(59,-93);g.fire();g.step(1.3);
    if(!g.snapshot().transit.opened.includes('foundry-return'))throw new Error('Normal garden route did not reconnect to Foundry');
    return results;
  });
  await page.reload();await page.waitForFunction(()=>window.__game);
  const saved=await page.evaluate(()=>window.__game.snapshot());
  if(!saved.player.flotation||!saved.player.mortar||!saved.gardens.restored||!saved.gardens.tender||saved.anchor!==11)throw new Error('Garden progression did not survive reload');
  return {legs:result,persisted:true};
}

async(page)=>{
  await page.goto('http://127.0.0.1:5174/?chapter=2&test');await page.evaluate(()=>localStorage.removeItem('furnace-born-v2-transit-preview'));await page.reload();await page.waitForFunction(()=>window.__game);
  return await page.evaluate(()=>{
    const g=window.__game,results=[];g.scenario({enemiesByIndex:Object.fromEntries(g.snapshot().enemies.map((_,i)=>[i,{hp:0}]))});
    const pathTo=(tx,tz)=>{
      const p=g.snapshot().player,start=[Math.round(p.x),Math.round(p.z)],key=(x,z)=>`${x},${z}`,queue=[start],parent=new Map([[key(...start),null]]);let end;
      for(let i=0;i<queue.length;i++){
        const [x,z]=queue[i],k=key(x,z);if(Math.hypot(x-tx,z-tz)<.5){end=k;break;}
        for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,nk=key(nx,nz);if(nx<-113||nx>118||nz<-284||nz>-65||parent.has(nk)||g.collides(nx,nz,.95))continue;parent.set(nk,k);queue.push([nx,nz]);}
      }
      if(!end)throw new Error(`No route to ${tx},${tz}`);
      const path=[];for(let k=end;k!==null;k=parent.get(k))path.push(k.split(',').map(Number));path.reverse();
      const corners=path.filter((p,i)=>i===path.length-1||i===0||(path[i-1][0]===p[0])!==(p[0]===path[i+1][0]));
      for(const [x,z]of corners){
        for(let step=0;step<500;step++){
          const p=g.snapshot().player,dx=x-p.x,dz=z-p.z;if(Math.hypot(dx,dz)<.09)break;
          const alongX=Math.abs(dx)>Math.abs(dz),d=alongX?dx:dz;
          const input=alongX?(d>0?['KeyS','KeyD']:['KeyW','KeyA']):(d>0?['KeyS','KeyA']:['KeyW','KeyD']);
          if(p.x>42&&p.x<71&&p.z>-100&&p.z<-93)input.push('ShiftLeft');
          g.setInput(input);g.step(Math.min(.15,Math.abs(d)/7));
          if(step===499)throw new Error(`Stuck near ${p.x},${p.z} heading for ${x},${z}`);
        }
      }
      g.setInput([]);results.push({target:[tx,tz],steps:path.length,position:[g.snapshot().player.x,g.snapshot().player.z]});
    };
    pathTo(-84,-194);g.interact();if(!g.snapshot().player.magnet)throw new Error('Magnet pickup unreachable');
    pathTo(-63,-191);g.aimAt(-75,-191);g.setInput(['Mouse2']);g.step(1);g.setInput([]);pathTo(-60,-191);g.aimAt(g.snapshot().transit.rails.crane,-191);g.setInput(['Mouse2']);g.step(4);g.setInput([]);
    pathTo(-23,-218);g.aimAt(-34,-218);g.setInput(['Mouse2']);g.step(3.5);g.setInput([]);
    pathTo(-57,-248);g.repair();g.scenario({enemiesByIndex:Object.fromEntries(g.snapshot().enemies.map((_,i)=>[i,{hp:0}]))});
    // Return by the western loop, then explore the independent southern loading works.
    pathTo(54,-76);g.interact();if(!g.snapshot().player.mortar)throw new Error('Mortar pickup unreachable');
    pathTo(55,-83);g.aimAt(59,-93);g.fire();g.step(1.2);
    pathTo(92,-181);g.aimAt(94,-187);g.fire();g.step(1.2);
    pathTo(61,-230);g.interact();pathTo(28,-225);
    pathTo(10,-186);g.aimAt(-8,-186);g.setInput(['Mouse2']);g.step(.1);g.setInput([]);pathTo(4,-186);g.aimAt(-8,-186);g.setInput(['Mouse2']);g.step(2);g.setInput([]);pathTo(8,-186);g.aimAt(g.snapshot().transit.rails.spine,-186);g.setInput(['Mouse2']);g.step(3);g.setInput([]);
    pathTo(-10,-117);return results;
  });
}

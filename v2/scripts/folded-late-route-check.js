async page=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5174/?chapter=folded&route=freight&test');await page.waitForFunction(()=>!!window.__game);
  const runs=[];
  for(const first of ['laser','circulation']){
    await page.evaluate(()=>localStorage.removeItem('furnace-born-v2-folded-freight'));await page.reload();await page.waitForFunction(()=>!!window.__game);
    await page.evaluate(()=>{const g=window.__game;g.manual(true);g.scenario({player:{x:132,y:24,z:-30,overdrive:true,phoenix:true,mortar:false,magnet:false,flotation:false},state:{phoenix:true,launch:true,brake:true,load:true,cage:true}});});
    const legs=[];
    async function move(x,z,boost=false){
      const r=await page.evaluate(({x,z,boost})=>{
        const g=window.__game,start=g.snapshot().time;
        for(let i=0;i<4200;i++){
          const s=g.snapshot(),p=s.player,dx=x-p.x,dz=z-p.z;if(Math.hypot(dx,dz)<.4){g.setInput([]);return {x:p.x,y:p.y,z:p.z,hp:p.hp,seconds:s.time-start};}
          const keys=Math.abs(dx)>Math.abs(dz)?dx>0?['KeyS','KeyD']:['KeyW','KeyA']:dz>0?['KeyS','KeyA']:['KeyW','KeyD'];if(boost)keys.push('ShiftLeft');
          const e=s.enemies.find(e=>e.hp>0&&e.readable&&!['guardian','keeper'].includes(e.id)&&Math.abs(e.y-p.y)<3&&Math.hypot(e.x-p.x,e.z-p.z)<24);
          if(e&&!boost){g.aimAt(e.x,e.z,e.y+1.5);keys.push('Mouse0');}
          g.setInput(keys);g.step(1/30,false);if(g.snapshot().player.hp<=0)return {error:'died',s:g.snapshot()};
        }return {error:'stuck',s:g.snapshot()};
      },{x,z,boost});if(r.error)throw Error(first+' to '+x+','+z+' '+JSON.stringify(r));legs.push(r);
    }
    async function use(){await page.keyboard.press('e');}
    async function settle(t=3){await page.evaluate(t=>{__game.setInput([]);__game.step(t,false);},t);}
    async function shoot(x,z,y,id,weapon='cannon'){
      await settle();const s=await page.evaluate(({x,z,y,id,weapon})=>{const g=window.__game;g.scenario({player:{weapon}});for(let i=0;i<180;i++){g.aimAt(x,z,y);g.setInput(['Mouse0']);g.step(1/60,false);if(g.snapshot().state[id])break;}g.setInput([]);g.step(.1);return g.snapshot();},{x,z,y,id,weapon});
      if(!s.state[id])throw Error(first+' latch '+id+' '+JSON.stringify({p:s.player,aim:s.aim}));
    }
    async function getLaser(){
      await move(132,-30);await settle();await move(228,-30,true);await move(228,-20);await use();
      if(!(await page.evaluate(()=>__game.snapshot())).player.laser)throw Error('Laser acquisition');
      await move(202,-24);await use();await move(216,-20);await shoot(216,-4,26,'gallery','laser');
      await move(228,-20);await move(228,-66);await move(64,-66);await move(64,-86);await shoot(63,-86,25.4,'emitter-cage');
      await settle(7);await move(52,-86);await use();await settle(7);await move(52,-72);await move(40,-72);
      if((await page.evaluate(()=>__game.snapshot())).player.y!==-8)throw Error('C08 did not return to loading apron');
      await use();await settle(7);await move(52,-72);await move(52,-86);await use();await settle(7);await move(64,-86);await move(64,-66);await move(228,-66);await move(228,-20);
      await move(242,-20);await move(242,6);await move(230,6);await move(230,38);
      await shoot(206,32,17.5,'garden-optical','laser');await shoot(228,38,17.5,'yard-optical','laser');
      // Both returns open before the tracking guardian.
      if((await page.evaluate(()=>__game.snapshot())).state.guardian)throw Error('Guardian was unexpectedly required');
      await move(202,38);await move(202,6);await move(110,6);await move(110,18);await use();await settle(5);await move(98,18);
      if((await page.evaluate(()=>__game.snapshot())).player.y!==-8)throw Error('C09 did not reach the garden bank');
      await move(110,18);await use();await settle(5);await move(110,6);await move(202,6);await move(202,38);await move(230,38);
    }
    async function rigFromYard(){
      await move((await page.evaluate(()=>__game.snapshot())).player.x,48);await move(242,48);await move(210,48);await move(210,44);await use();await move(210,48);await move(242,48);await move(242,95);await shoot(242,96,-21,'rig');
      await move(242,120);await move(222,120);await use();await move(214,116);await use();
      if(!(await page.evaluate(()=>__game.snapshot())).player.circulation)throw Error('Circulation acquisition');
    }
    async function pressureReturn(){
      await move(211,128);await move(211,25,true);await move(211,8);await move(218,8);await move(218,12);await shoot(218,18,-14.6,'pressure-return');
    }
    if(first==='laser'){
      await getLaser();await settle(5);await move(242,38);await move(242,30);await use();await settle(5);await move(242,42);await rigFromYard();await pressureReturn();
    }else{
      await move(166,-30);await move(166,-64);await settle();await move(166,30,true);await move(174,30);await move(174,-18);await move(190,-18);await move(190,30);await rigFromYard();await pressureReturn();
      await move(211,8);await move(211,18);await move(134,18);await move(134,30);await move(122,30);await move(122,-30);await move(110,-30);await move(110,4);await move(10,4);await move(10,18);await use();await settle(5.5);await move(24,20);await move(32,20);await move(32,-28);await getLaser();
      await settle(5);await move(242,38);await move(242,30);await use();await settle(5);await move(242,48);await move(242,120);await move(254,120);await move(254,13);
    }
    await move(234,13);await move(234,18);await use();await move(234,13);await move(254,13);await move(254,120);await move(266,120);await move(266,6,true);await move(44,6,true);await move(44,-10);await use();
    await shoot(40,-12,-38.6,'last-cage');await settle(9);await move(34,-18);await use();await settle(9);await move(22,-18);await use();await settle(9);await move(22,-4);
    if((await page.evaluate(()=>__game.snapshot())).player.y!==0)throw Error('Final return cage failed');
    await use();await settle(9);await move(22,-18);await use();await settle(9);await move(34,-18);await move(34,6);await move(34,68);await move(0,68);await move(0,52);
    const fight=await page.evaluate(()=>{
      const g=window.__game;g.scenario({player:{weapon:'cannon'}});let corner=0;const orbit=[[-10,54],[-10,44],[10,44],[10,54]];
      for(let i=0;i<7200;i++){
        const s=g.snapshot(),e=s.enemies.find(e=>e.id==='keeper'),p=s.player;if(!e.hp){g.setInput([]);return {hp:p.hp,time:s.time};}if(p.hp<=0)return {error:'keeper death',s};
        if(Math.hypot(p.x-orbit[corner][0],p.z-orbit[corner][1])<.6)corner=(corner+1)%orbit.length;const dx=orbit[corner][0]-p.x,dz=orbit[corner][1]-p.z;const keys=Math.abs(dx)>Math.abs(dz)?dx>0?['KeyS','KeyD']:['KeyW','KeyA']:dz>0?['KeyS','KeyA']:['KeyW','KeyD'];const t=e.parts.find(t=>t.hp>0)||{x:e.x,y:e.y+1.5,z:e.z};g.aimAt(t.x,t.z,t.y);keys.push('Mouse0');g.setInput(keys);g.step(1/30,false);
      }return {error:'keeper timeout',s:g.snapshot()};
    });if(fight.error)throw Error(JSON.stringify(fight));await move(0,8);await move(0,0);await settle();await page.keyboard.down('e');await page.evaluate(()=>__game.step(2.2));await page.keyboard.up('e');
    const end=await page.evaluate(()=>__game.snapshot());runs.push({first,legs:legs.length,hp:end.player.hp,keeper:end.state.keeper,laser:end.player.laser,circulation:end.player.circulation,shortcuts:['emitter-cage','garden-optical','yard-optical','pressure-return','last-cage'].map(id=>[id,end.state[id]])});
  }
  await page.keyboard.press('Escape');if(errors.length)throw Error(JSON.stringify(errors));return {runs,errors};
}

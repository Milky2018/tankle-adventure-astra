async page=>{
 await page.unroute('**/src/folded.js*');
 await page.route('**/src/folded.js*',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replace('let manual=false','let manual=true')});});
 try{return await (async()=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));const runs=[];
 for(const [approach,first]of [['dry','laser'],['dry','circulation'],['water','circulation']]){
  await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test');await page.waitForFunction(()=>window.__game);
  await page.evaluate(()=>{localStorage.removeItem('furnace-born-v2-city');localStorage.removeItem('furnace-born-v2-settings');});await page.reload();await page.waitForFunction(()=>window.__game);await page.evaluate(()=>__game.manual(true));
  const legs=[],milestones=[];let expeditionMoving=false;
  async function choose(weapon){
    for(let i=0;i<3;i++){
      if((await page.evaluate(()=>__game.snapshot())).player.weapon===weapon)return;
      await page.keyboard.press('q');
    }
    throw Error('Weapon unavailable: '+weapon);
  }
  async function settle(t=3){await page.evaluate(t=>{__game.setInput([]);__game.step(t,false);},t);}
  async function use(){await page.keyboard.press('e');}
  async function arrive(y){
    const result=await page.evaluate(y=>{const g=__game;g.setInput([]);for(let i=0;i<1800;i++){if(Math.abs(g.snapshot().player.y-y)<.001)return true;g.step(1/60,false);}return g.snapshot().player;},y);
    if(result!==true)throw Error('Automatic lift failed to reach '+y+' '+JSON.stringify(result));
  }
  async function record(label){const s=await page.evaluate(()=>__game.snapshot());milestones.push({label,hp:s.player.hp,time:s.time,abilities:['overdrive','mortar','magnet','flotation','phoenix','laser','circulation'].filter(k=>s.player[k])});}
  async function move(x,z,boost=false){
    await choose(expeditionMoving&&(await page.evaluate(()=>__game.snapshot())).player.mortar?"mortar":"cannon");
    const result=await page.evaluate(({x,z,boost})=>{
      const g=window.__game,start=g.snapshot().time;let last=null,blocked=0,detour=false;
      for(let i=0;i<3600;i++){
        const s=g.snapshot(),p=s.player,dx=x-p.x,dz=z-p.z;
        if(Math.hypot(dx,dz)<.4){g.setInput([]);return {x:p.x,y:p.y,z:p.z,hp:p.hp,seconds:s.time-start};}
        if(last&&Math.hypot(p.x-last.x,p.z-last.z)<.002)blocked++;else blocked=0;last={x:p.x,z:p.z};
        if(blocked>8&&Math.abs(dx)>.4&&Math.abs(dz)>.4)detour=true;
        if(Math.min(Math.abs(dx),Math.abs(dz))<.4)detour=false;
        const alongX=Math.abs(dx)>Math.abs(dz),keys=(detour?!alongX:alongX)?dx>0?['KeyS','KeyD']:['KeyW','KeyA']:dz>0?['KeyS','KeyA']:['KeyW','KeyD'];if(boost)keys.push('ShiftLeft');
        const e=s.enemies.find(e=>e.hp>0&&e.readable&&Math.abs(e.y-p.y)<3&&Math.hypot(e.x-p.x,e.z-p.z)<24);
        if(e&&!boost){const t=e.parts.find(part=>part.hp>0)||{x:e.x,z:e.z,y:e.y+1.5};g.aimAt(t.x,t.z,t.y);keys.push('Mouse0');}
        g.setInput(keys);g.step(Math.hypot(dx,dz)<2?1/120:1/30,false);if(g.snapshot().player.hp<=0)return {error:'died',at:g.snapshot().player};
      }return {error:'stuck',at:g.snapshot().player};
    },{x,z,boost});if(result.error)throw Error(JSON.stringify({target:[x,z],...result}));legs.push(result);
  }
  async function shoot(x,z,y,id,weapon="cannon"){
    await choose(weapon);
    const s=await page.evaluate(({x,z,y,id})=>{const g=window.__game;g.setInput([]);if(!["brake","ratchet"].includes(id))g.step(3,false);for(let i=0;i<(id==="brake"?900:180);i++){g.aimAt(x,z,y);g.setInput(['Mouse0']);g.step(1/60,false);if(g.snapshot().state[id])break;}g.setInput([]);g.step(.1);return g.snapshot();},{x,z,y,id});
    if(!s.state[id])throw Error('Latch '+id+' '+JSON.stringify({p:s.player,aim:s.aim}));
  }
  async function fight(id,x0,x1,z){
    const result=await page.evaluate(({id,x0,x1,z})=>{
      const g=window.__game;let destination=x0;
      for(let i=0;i<3600;i++){
        const s=g.snapshot(),e=s.enemies.find(e=>e.id===id),p=s.player;if(!e.hp){g.setInput([]);return {hp:p.hp,enemy:e};}
        if(p.hp<=0)return {error:'died',p,e};
        if(Math.abs(p.x-destination)<.6)destination=destination===x0?x1:x0;
        const dx=destination-p.x,dz=z-p.z,keys=Math.abs(dz)>1?dz>0?['KeyS','KeyA']:['KeyW','KeyD']:dx>0?['KeyS','KeyD']:['KeyW','KeyA'];
        const t=e.parts.find(part=>part.hp>0)||{x:e.x,y:e.y+1.5,z:e.z};g.aimAt(t.x,t.z,t.y);if(id!=='foundry'||e.phase==='vent')keys.push('Mouse0');g.setInput(keys);g.step(1/30,false);
      }return {error:'fight timeout',s:g.snapshot()};
    },{id,x0,x1,z});if(result.error)throw Error(id+' '+JSON.stringify(result));return result;
  }
  async function expedition(id){
    const route=await page.evaluate(async id=>(await import('/src/folded-expansion-layout.js')).expansionRoutes.find(r=>r.id===id),id);
    expeditionMoving=true;
    for(const [x,z]of route.approach)await move(x,z);
    async function action(name,x,z){
      if(!name||name==='boost')return;
      if(name==='repair'){
        const h=await page.evaluate(async ({id,x,z})=>(await import('/src/folded-expansion-layout.js')).expansionHives.filter(h=>h.id.startsWith(id+'-')).sort((a,b)=>Math.hypot(a.x-x,a.z-z)-Math.hypot(b.x-x,b.z-z))[0],{id,x,z});
        await move(h.x,z);await move(h.x,h.z);await use();await move(h.x,z);await move(x,z);return;
      }
      if(name==='pickup'){await use();return;}
      if(name==='float'){await page.keyboard.press('f');return;}
      if(name==='battle'){
        await choose('mortar');
        const result=await page.evaluate(({id,x,z})=>{
          const g=__game,orbit=id==='proving'?[[210,-280],[216,-280],[216,-260],[210,-260]]:[[x-8,z-10],[x-8,z+12],[x+2,z+12],[x+2,z-10]];let corner=0;
          for(let i=0;i<7200;i++){
            const s=g.snapshot(),p=s.player;if(s.state[id+'-endurance']){g.setInput([]);return {hp:p.hp};}if(p.hp<=0)return {error:'wave death',p};
            if(Math.hypot(p.x-orbit[corner][0],p.z-orbit[corner][1])<.7)corner=(corner+1)%orbit.length;
            const dx=orbit[corner][0]-p.x,dz=orbit[corner][1]-p.z,keys=Math.abs(dx)>Math.abs(dz)?dx>0?['KeyS','KeyD']:['KeyW','KeyA']:dz>0?['KeyS','KeyA']:['KeyW','KeyD'];
            const e=s.enemies.filter(e=>e.id.startsWith(id+'-endurance-')&&e.hp>0&&e.readable).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];
            if(e){g.aimAt(e.x,e.z,e.y+.2);keys.push('Mouse0');}g.setInput(keys);g.step(1/30,false);
          }return {error:'wave timeout',s:g.snapshot()};
        },{id,x,z});if(result.error)throw Error(JSON.stringify(result));await record(id+'-waves');return;
      }
      const c=await page.evaluate(async name=>(await import('/src/folded-expansion-layout.js')).expansionControls.find(c=>c.id===name),name);
      if(c.kind==='magnet'){
        await page.evaluate(c=>{__game.aimAt(c.x,c.z,c.y);__game.setInput(['Mouse2']);__game.step(1.2);__game.setInput([]);},c);
      }else{const [cx,cy,cz]=c.via||[c.x,c.y,c.z];await shoot(cx,cz,cy,c.id,c.kind==='laser'?'laser':c.surface==='top'?'mortar':'cannon');}
      if(!(await page.evaluate(()=>__game.snapshot())).state[name])throw Error('District mechanism '+name);
    }
    for(const [x,z,name]of route.path){await move(x,z);await action(name,x,z);}
    if(route.ability&&!(await page.evaluate(()=>__game.snapshot())).player[route.ability])throw Error('Missing module '+id);
    for(const [x,z,name]of route.returns){await move(x,z,name==='boost');await action(name,x,z);}
    expeditionMoving=false;await record('district-'+id);
  }

  await move(-40,86);await move(-40,49);await shoot(-35,44,-14.5,'relay-west');
  await move(-57,52);await move(-57,76);await page.keyboard.press('e');await move(-57,118);await shoot(-65,114,-14.5,'relay-east');
  await move(-57,128);await move(-43,132);const prototype=await fight('prototype',-43,-20,132);
  await move(-30,136);await page.keyboard.press('e');
  if(!(await page.evaluate(()=>window.__game.snapshot())).player.overdrive)throw Error('Overdrive was not acquired');
  await move(-20,128);await move(-20,86,true);await move(0,86);await page.keyboard.press('e');
  await move(0,54,true);const foundry=await fight('foundry',-10,10,55);
  await move(6,48);await page.keyboard.press('e');await move(24,48);await move(24,4);await move(36,4);await move(36,30);await move(22,30);await move(0,27);await page.keyboard.press('e');

  await move(0,12);if(!(await page.evaluate(()=>__game.snapshot())).player.mortar)throw Error('Hub Mortar missed');await record('hub-mortar');
  await page.screenshot({path:`v2/output/playwright/completion/${approach}-pickup.png`});
  if(approach==='water'){

  await move(0,27);await move(-26,27);await shoot(-29,27,1.3,'ballast');await move(-38,27);await arrive(8);
  await shoot(-45.5,27,9.3,'ratchet');await move(-50,27);await move(-50,33);await move(-50,31);await expedition('arsenal');
  await move(-50,27);await move(-38,27);await move(-26,27);
  await move(-26,-8);await move(-30,-8);await settle();
  await page.evaluate(()=>{__game.aimAt(-39.7,-8,-6.6);__game.setInput(['Mouse2']);__game.step(1.2);__game.setInput([]);});
  if(!(await page.evaluate(()=>__game.snapshot())).state.magnet)throw Error('Ferry panel');
  await move(-46,-8);await expedition('reservoir');await move(-46,-8);await page.keyboard.press('f');
  for(const [x,z]of [[-46,27],[-36,27],[-36,-4],[0,-4],[30,-7],[36,-7],[36,-16],[46,-16],[46,20],[56,20]])await move(x,z);
  await use();await move(86,20);await page.keyboard.press('f');await move(89,30);await shoot(86,31,-6.6,'gangway');await move(88,-19);await move(94,-18);await use();
  await record('water-approach');

  }else{

  await move(0,-6);await shoot(0,-24,4.2,'bridge-crane','mortar');await move(0,-34);await move(18,-34);await shoot(32,-34,4.2,'freight','mortar');
  for(const [x,z]of [[59,-34],[59,-84],[67,-84],[67,-34],[70,-34],[70,-19],[94,-18]])await move(x,z);
  await use();await record('dry-approach');

  }

  await move(90,-23);await shoot(90,-34,7,'load','mortar');await record('mortar-reuse');
  await move(90,-59);await move(78,-59);await move(78,-71);
  for(let i=0;i<20&&(await page.evaluate(()=>__game.snapshot())).player.y<15.99;i++)await settle(.5);
  await shoot(78,-77.7,18,'brake');await move(77,-87);await expedition('proving');await move(77,-87);await record('phoenix');
  await move(85,-86);await settle();await move(164,-86,true);await move(166,-35);await move(32,-35,true);await move(32,6);await use();await move(24,12);await shoot(22,8,25.4,'cage');
  await move(32,6);await move(32,-35);await move(136,-35);await move(136,-30);
    async function getLaser(){
      await move(136,-35);await move(136,-30);await settle();await move(228,-30,true);await move(228,-20);await move(242,-20);await move(242,-24);await expedition('lens');await move(242,-24);await move(228,-24);await move(228,-20);
      if(!(await page.evaluate(()=>__game.snapshot())).player.laser)throw Error('Laser acquisition');
      await move(202,-24);await use();await move(216,-20);await shoot(216,-4,26,'gallery','laser');
      await move(242,-20);await move(242,-4);await shoot(238,-4,25.3,'mirror-index');await move(242,-20);await move(216,-20);await shoot(216,-4,26,'garden-optical','laser');
      await move(242,-20);await move(242,-30);await move(254,-30);await move(254,-98);await move(64,-98,true);await move(64,-86);await shoot(63,-86,25.4,'emitter-cage');
      await move(52,-86);await arrive(-8);await move(52,-72);await move(40,-72);
      if((await page.evaluate(()=>__game.snapshot())).player.y!==-8)throw Error('C08 did not return to loading apron');
      await move(52,-72);await move(52,-86);await arrive(24);await move(64,-86);await move(64,-98);await move(254,-98,true);await move(254,-30);await move(242,-30);await move(242,-20);await move(228,-20);
      await move(242,-20);await move(242,6);await move(230,6);await move(230,38);
      await shoot(228,38,17.5,'yard-optical','laser');
      // Both returns open before the tracking guardian.
      if((await page.evaluate(()=>__game.snapshot())).state.guardian)throw Error('Guardian was unexpectedly required');
      await move(202,38);await move(202,6);await move(110,6);await move(110,18);await arrive(-8);await move(98,18);
      if((await page.evaluate(()=>__game.snapshot())).player.y!==-8)throw Error('C09 did not reach the garden bank');
      await move(110,18);await arrive(16);await move(110,6);await move(202,6);await move(202,38);await move(230,38);
    }
    async function rigFromYard(){
      await move((await page.evaluate(()=>__game.snapshot())).player.x,48);await move(242,48);await move(210,48);await move(210,44);await use();await move(210,48);await move(242,48);await move(242,95);await shoot(242,96,-21,'rig');
      await move(242,120);await move(222,120);await move(248,120);await move(248,117);await expedition('coolant');await move(248,117);await move(222,117);await move(214,116);await use();
      if(!(await page.evaluate(()=>__game.snapshot())).player.circulation)throw Error('Circulation acquisition');
    }
    async function pressureReturn(){
      await move(211,128);await move(211,25,true);await move(211,8);await move(218,8);await move(218,12);await shoot(218,18,-14.6,'pressure-return');
    }
    if(first==='laser'){
      await getLaser();await settle(5);await move(242,38);await move(242,30);await arrive(-8);await move(242,42);await rigFromYard();await pressureReturn();
    }else{
      await move(166,-30);await move(166,-64);await settle();await move(166,30,true);await move(174,30);await move(174,-18);await move(190,-18);await move(190,30);await rigFromYard();await pressureReturn();
      await move(211,8);await move(211,18);await move(134,18);await move(134,30);await move(122,30);await move(122,-30);await move(110,-30);await move(110,4);await move(10,4);await move(10,18);await arrive(24);await move(10,12);await move(24,12);await move(32,6);await move(32,-35);await getLaser();
      await settle(5);await move(242,38);await move(242,30);await arrive(-8);await move(242,48);await move(242,120);await move(254,120);await move(254,13);
    }
    await move(234,13);await move(234,18);await use();await move(234,13);await move(254,13);await move(254,120);await move(254,132);await shoot(254,124,-22,"inner-optics","laser");await record("optical-and-thermal-convergence");await move(266,132);await move(266,120);await move(266,6,true);await move(44,6,true);await move(44,-10);await use();
    await shoot(40,-12,-38.6,'last-cage');await move(34,-18);await move(22,-18);await arrive(0);await move(22,-4);
    if((await page.evaluate(()=>__game.snapshot())).player.y!==0)throw Error('Final return cage failed');
    await move(22,-18);await arrive(-40);await move(34,-18);await move(34,-10);await expedition('hearth');await move(34,-10);await move(34,6);await move(34,68);await move(0,68);await move(0,52);
    await choose('cannon');const keeperFight=await page.evaluate(()=>{
      const g=window.__game;let corner=0;const orbit=[[-10,54],[-10,44],[10,44],[10,54]];
      for(let i=0;i<7200;i++){
        const s=g.snapshot(),e=s.enemies.find(e=>e.id==='keeper'),p=s.player;if(!e.hp){g.setInput([]);return {hp:p.hp,time:s.time};}if(p.hp<=0)return {error:'keeper death',s};
        if(Math.hypot(p.x-orbit[corner][0],p.z-orbit[corner][1])<.6)corner=(corner+1)%orbit.length;const dx=orbit[corner][0]-p.x,dz=orbit[corner][1]-p.z;const keys=Math.abs(dx)>Math.abs(dz)?dx>0?['KeyS','KeyD']:['KeyW','KeyA']:dz>0?['KeyS','KeyA']:['KeyW','KeyD'];const t=e.parts.find(t=>t.hp>0)||{x:e.x,y:e.y+1.5,z:e.z};g.aimAt(t.x,t.z,t.y);keys.push('Mouse0');g.setInput(keys);g.step(1/30,false);
      }return {error:'keeper timeout',s:g.snapshot()};
    });if(keeperFight.error)throw Error(JSON.stringify(keeperFight));await move(0,8);await move(0,0);await settle();await page.keyboard.down('e');await page.evaluate(()=>__game.step(2.2));await page.keyboard.up('e');

  await page.evaluate(()=>__game.step(8));const end=await page.evaluate(()=>__game.snapshot());
  if(!end.state.endingSeen||!end.state['inner-optics']||!end.state.load||!end.player.mortar)throw Error('Missing progression milestone');
  if(approach==='water'&&(!end.player.flotation||!end.player.magnet))throw Error('Water acquisitions missing');
  if(approach==='dry'&&(end.player.flotation||end.player.magnet))throw Error('Dry run unexpectedly granted water equipment');
  await record('completed');await page.screenshot({path:`v2/output/playwright/completion/${approach}-${first}-ending.png`});
  await page.reload();await page.waitForFunction(()=>window.__game);await page.evaluate(()=>__game.manual(true));const saved=await page.evaluate(()=>__game.snapshot());
  if(!saved.state.endingSeen||!saved.state['inner-optics']||!saved.player.mortar)throw Error('Reload lost progression');
  const run={approach,first,legs:legs.length,milestones,reload:true};runs.push(run);
  await page.evaluate(run=>sessionStorage.setItem('completed-journey-'+run.approach+'-'+run.first,JSON.stringify(run)),run);
 }
 if(errors.length)throw Error(JSON.stringify(errors));return {runs,errors};
 })();}finally{await page.unroute('**/src/folded.js*');}
}

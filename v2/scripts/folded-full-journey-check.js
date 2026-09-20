async page=>{

 return await (async()=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));const runs=[];
 try { for(const [approach,first]of [['dry','laser'],['dry','circulation'],['water','circulation']]){
  await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');await page.waitForFunction(()=>window.__game);
  await page.evaluate(()=>{localStorage.removeItem('furnace-born-v2-city');localStorage.removeItem('furnace-born-v2-settings');});await page.reload();await page.waitForFunction(()=>window.__game);await page.evaluate(()=>__game.manual(true));
  const legs=[],milestones=[];
  async function choose(weapon){
    for(let i=0;i<3;i++){
      // Manual stepping must allow the real hit recovery to finish before Q.
      await page.evaluate(()=>{const g=__game,s=g.snapshot();if(s.player.hurtUntil>s.time){g.setInput([]);g.step(s.player.hurtUntil-s.time+1/60,false);}});
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
    const equipment=(await page.evaluate(()=>__game.snapshot())).player;
    await choose(equipment.laser?"laser":equipment.mortar?"mortar":"cannon");
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
        g.setInput(keys);g.step(Math.hypot(dx,dz)<2?1/120:1/30,false);if(g.snapshot().player.hp<=0)return {error:'died',at:g.snapshot().player,lifts:g.debug.world.lifts.map(l=>({id:l.id,y:l.y,destination:l.destination,wait:l.wait})),near:g.snapshot().enemies.filter(e=>e.hp>0&&Math.hypot(e.x-x,e.z-z)<100)};
      }return {error:'stuck',at:g.snapshot().player,rails:g.debug.state.bodies.solids.filter(b=>b.rail&&Math.hypot(b.x-x,b.z-z)<50).map(b=>({id:b.id,x:b.x,z:b.z,rail:b.rail}))};
    },{x,z,boost});if(result.error)throw Error(JSON.stringify({target:[x,z],...result}));legs.push(result);
  }
  async function shoot(x,z,y,id,weapon="cannon"){
    await choose(weapon);
    const s=await page.evaluate(({x,z,y,id})=>{const g=window.__game,c=g.debug.world.controls.find(c=>c.id===id);if(c?.mount){x=c.x+c.facing.x*.5;y=c.y+c.facing.y*.5;z=c.z+c.facing.z*.5;}g.setInput([]);if(!["brake","ratchet"].includes(id))g.step(3,false);for(let i=0;i<(id==="brake"?900:180);i++){g.aimAt(x,z,y);g.setInput(['Mouse0']);g.step(1/60,false);if(g.snapshot().state[id]||id==='return-index'&&g.snapshot().state.mirrorTurns[id]%2===1)break;}g.setInput([]);g.step(.1);return g.snapshot();},{x,z,y,id});
    if(!s.state[id]&&!(id==='return-index'&&s.state.mirrorTurns[id]%2===1))throw Error('Latch '+id+' '+JSON.stringify({p:s.player,aim:s.aim}));
  }
  async function fight(id,x0,x1,z){
    const result=await page.evaluate(({id,x0,x1,z})=>{
      const g=window.__game;let destination=x0,corner=0;const orbit=[[-39,136],[-23,136],[-23,123],[-39,123]];
      for(let i=0;i<3600;i++){
        const s=g.snapshot(),e=s.enemies.find(e=>e.id===id),p=s.player;if(!e.hp){g.setInput([]);return {hp:p.hp,enemy:e};}
        if(p.hp<=0)return {error:'died',p,e};
        if(Math.abs(p.x-destination)<.6)destination=destination===x0?x1:x0;
        if(id==='prototype'&&Math.hypot(p.x-orbit[corner][0],p.z-orbit[corner][1])<.65)corner=(corner+1)%orbit.length;
        const dx=(id==='prototype'?orbit[corner][0]:destination)-p.x,dz=(id==='prototype'?orbit[corner][1]:z)-p.z,keys=Math.abs(dz)>Math.abs(dx)?dz>0?['KeyS','KeyA']:['KeyW','KeyD']:dx>0?['KeyS','KeyD']:['KeyW','KeyA'];
        const t=e.parts.find(part=>part.hp>0)||{x:e.x,y:e.y+1.5,z:e.z};g.aimAt(t.x,t.z,t.y);if(id!=='foundry'||e.phase==='vent')keys.push('Mouse0');g.setInput(keys);g.step(1/30,false);
      }return {error:'fight timeout',s:g.snapshot()};
    },{id,x0,x1,z});if(result.error)throw Error(id+' '+JSON.stringify(result));return result;
  }
  async function opticalFight(){
    await choose('laser');
    const result=await page.evaluate(()=>{
      const g=__game,orbit=[[222,37],[222,29],[216,29],[216,37]];let corner=0;
      for(let i=0;i<3600;i++){
        const s=g.snapshot(),p=s.player,enemies=s.enemies.filter(e=>['gallery-repairer','gallery-sentry','gallery-scout'].includes(e.id)&&e.hp>0);
        if(!enemies.length){g.setInput([]);return {hp:p.hp};}if(p.hp<=0)return {error:'optical fight death',p};
        if(Math.hypot(p.x-orbit[corner][0],p.z-orbit[corner][1])<.6)corner=(corner+1)%orbit.length;
        const dx=orbit[corner][0]-p.x,dz=orbit[corner][1]-p.z,keys=Math.abs(dx)>Math.abs(dz)?dx>0?['KeyS','KeyD']:['KeyW','KeyA']:dz>0?['KeyS','KeyA']:['KeyW','KeyD'];
        const e=enemies.sort((a,b)=>['gallery-repairer','gallery-sentry','gallery-scout'].indexOf(a.id)-['gallery-repairer','gallery-sentry','gallery-scout'].indexOf(b.id))[0];g.aimAt(e.x,e.z,e.y+1.5);keys.push('Mouse0');g.setInput(keys);g.step(1/30,false);
      }return {error:'optical fight timeout',s:g.snapshot()};
    });if(result.error)throw Error(JSON.stringify(result));await record('optical-gallery-cleared');
  }
  async function expedition(id){
    const route=await page.evaluate(async id=>(await import('/src/folded-expansion-layout.js')).expansionRoutes.find(r=>r.id===id),id);
    for(const [x,z]of route.approach)await move(x,z);
    async function action(name,x,z){
      if(!name||name==='boost')return;
      if(name==='repair')return;
      if(name==='pickup'){await use();return;}
      if(name==='float'){await page.keyboard.press('f');return;}
      if(name==='battle'){
        await choose('mortar');
        const result=await page.evaluate(({id,x,z})=>{
          const g=__game,orbit=id==='proving'?[[139,-177],[160,-177],[160,-173],[139,-173]]:[[x-8,z-10],[x-8,z+12],[x+2,z+12],[x+2,z-10]];let corner=0;
          for(let i=0;i<7200;i++){
            const s=g.snapshot(),p=s.player;if(s.state[id+'-endurance']){g.setInput([]);return {hp:p.hp};}if(p.hp<=0)return {error:'wave death',p};
            if(Math.hypot(p.x-orbit[corner][0],p.z-orbit[corner][1])<.7)corner=(corner+1)%orbit.length;
            const dx=orbit[corner][0]-p.x,dz=orbit[corner][1]-p.z,keys=Math.abs(dx)>Math.abs(dz)?dx>0?['KeyS','KeyD']:['KeyW','KeyA']:dz>0?['KeyS','KeyA']:['KeyW','KeyD'];
            const e=s.enemies.filter(e=>e.id.startsWith(id+'-endurance-')&&e.hp>0&&e.readable).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];
            if(e){g.aimAt(e.x,e.z,e.y+.2);keys.push('Mouse0');}g.setInput(keys);g.step(1/30,false);
          }return {error:'wave timeout',s:g.snapshot()};
        },{id,x,z});if(result.error)throw Error(JSON.stringify(result));await record(id+'-waves');return;
      }
      const c=await page.evaluate(async name=>(await import('/src/folded-layout.js')).foldedControls.find(c=>c.id===name),name);
      if(c.slide){
        await move(-106,-54);
        const opened=await page.evaluate(()=>{const g=__game;for(let i=0;i<900&&!g.snapshot().state['arsenal-return'];i++){const c=g.debug.world.controls.find(c=>c.id==='arsenal-return');g.aimAt(c.x,c.z,c.y);const keys=['Mouse2'];g.setInput(keys);g.step(1/60,false);}g.setInput([]);return g.snapshot().state['arsenal-return'];});
        if(!opened)throw Error('Magnetic workshop return did not open');
        await move(-106,-54);await move(x,z);
      }else if(c.kind==='magnet'){
        await page.evaluate(c=>{__game.aimAt(c.x,c.z,c.y);__game.setInput(['Mouse2']);__game.step(1.2);__game.setInput([]);},c);
      }else{const [cx,cy,cz]=c.via||[c.x,c.y,c.z];await shoot(cx,cz,cy,c.id,c.kind==='laser'?'laser':c.surface==='top'?'mortar':'cannon');}
      if(!(await page.evaluate(()=>__game.snapshot())).state[name])throw Error('District mechanism '+name);
    }
    for(const [x,z,name]of route.path){
      await move(x,z);await action(name,x,z);
      if(id==='proving'&&z===-158){
        await shoot(65,-154,17.3,'proving-inspection');await move(77,-154);await move(6,-154);await move(6,-34);
        if(!(await page.evaluate(()=>__game.snapshot())).state['bridge-crane']){await move(0,-34);await shoot(0,-24,6.8,'bridge-crane','mortar');}
        await move(0,-34);await move(0,27);await use();await record('proving-refuge-return');
        await move(0,-34);await move(6,-34);await move(6,-154);await move(77,-154);await move(x,z);
      }
    }
    if(route.ability&&!(await page.evaluate(()=>__game.snapshot())).player[route.ability])throw Error('Missing module '+id);
    for(const [x,z,name]of route.returns){await move(x,z,name==='boost');await action(name,x,z);}
    await record('district-'+id);
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
  await move(-50,27);await move(-50,33);await move(-50,31);await expedition('arsenal');
  await use();await move(-26,27);
  await move(-26,-8);await move(-30,-8);await settle();
  await page.evaluate(()=>{__game.aimAt(-39.7,-8,-6.6);__game.setInput(['Mouse2']);__game.step(1.2);__game.setInput([]);});
  if(!(await page.evaluate(()=>__game.snapshot())).state.magnet)throw Error('Ferry panel');
  await move(-46,-8);await expedition('reservoir');await move(-46,-8);
  await move(-26,-8);await move(-26,27);await move(0,27);await use();await record('water-refuge-return');
  await move(-26,27);await move(-26,-8);await move(-46,-8);await page.keyboard.press('f');
  for(const [x,z]of [[-46,27],[-36,27],[-36,-4],[0,-4],[30,-7],[36,-7],[36,-16],[46,-16],[46,20],[56,20]])await move(x,z);
  await use();await move(86,20);await page.keyboard.press('f');await move(89,30);await shoot(86,31,-6.6,'gangway');await move(88,-19);await move(94,-18);await use();
  await record('water-approach');
  await choose('mortar');await fight('bench-guard',72,94,-18);await fight('bench-scout',72,94,-18);await record('water-reception-cleared');

  }else{

  await move(0,-6);await shoot(0,-24,6.8,'bridge-crane','mortar');await move(0,-34);await move(18,-34);await shoot(32,-34,4.2,'freight','mortar');
  for(const [x,z]of [[59,-34],[59,-63],[67,-63],[67,-34],[70,-34],[70,-19],[94,-18]])await move(x,z);
  await use();await record('dry-approach');

  }

  await move(90,-23);await shoot(90,-34,7,'load','mortar');await record('mortar-reuse');
  await move(90,-59);await move(78,-59);await move(78,-71);
  for(let i=0;i<20&&(await page.evaluate(()=>__game.snapshot())).player.y<15.99;i++)await settle(.5);
  await move(77,-87);await expedition('proving');await use();await record('phoenix');
    async function getLaser(){
      await move(136,-35);await move(136,-30);await settle();await move(228,-30,true);await move(228,-20);await move(242,-20);await move(242,-24);await expedition('lens');await move(242,-24);await move(228,-24);await move(228,-20);
      if(!(await page.evaluate(()=>__game.snapshot())).player.laser)throw Error('Laser acquisition');
      await move(150,-28);await use();await move(202,-28);await move(202,-24);await move(225.2376,-20);await shoot(214,-10,25.3,'optical-screen');await shoot(216,-4,26,'gallery','laser');
      await move(242,-20);await move(242,-4);await shoot(232,-4,26,'return-index');await move(242,-20);await move(225.2376,-20);await shoot(216,-4,26,'garden-optical','laser');
      await move(242,-20);await move(242,-30);await move(254,-30);await move(254,-98);await move(64,-98,true);await move(64,-86);await shoot(63,-86,25.4,'emitter-cage');
      await move(52,-86);await arrive(-8);await move(52,-72);await move(40,-72);
      if((await page.evaluate(()=>__game.snapshot())).player.y!==-8)throw Error('C08 did not return to loading apron');
      await move(52,-72);await move(52,-86);await arrive(24);await move(64,-86);await move(64,-98);await move(254,-98,true);await move(254,-30);await move(242,-30);await move(242,-20);await move(228,-20);
      await move(150,-28);await use();await move(202,-28);await move(202,-24);await move(216,-20);await move(228,-20);await move(242,-20);await move(242,6);await move(230,6);await move(230,38);await opticalFight();
      await shoot(228,38,17.5,'yard-optical','laser');
      // Both returns open before the tracking guardian.
      if((await page.evaluate(()=>__game.snapshot())).state.guardian)throw Error('Guardian was unexpectedly required');
      await move(218,38);await move(218,29);await move(202,29);await move(202,6);await move(110,6);await move(110,18);await arrive(-8);await move(98,18);
      if((await page.evaluate(()=>__game.snapshot())).player.y!==-8)throw Error('C09 did not reach the garden bank');
      await move(110,18);await arrive(16);await move(110,6);await move(202,6);await move(202,29);await move(218,29);await move(218,38);await move(230,38);
    }
    async function rigFromYard(){
      await move((await page.evaluate(()=>__game.snapshot())).player.x,48);await move(242,48);await move(210,48);await move(210,44);await use();await move(210,48);await move(242,48);await move(242,95);
      await move(242,120);await move(222,120);await move(248,120);await move(248,117);await expedition('coolant');
      await move(284,117);await shoot(278,117,-22.7,'coolant-bypass');await move(290,117);await move(290,106);await arrive(24);await move(278,106);await move(278,-28);await move(150,-28);await use();
      if(!(await page.evaluate(()=>__game.snapshot())).player.circulation)throw Error('Circulation acquisition');
    }
    if(first==='laser'){
      await getLaser();await settle(5);await move(242,38);await move(242,30);await arrive(-8);await move(242,42);await rigFromYard();
    }else{
      await move(166,-30);await move(166,-64);await settle();await move(166,30,true);await move(174,30);await move(174,-18);await move(190,-18);await move(190,30);await rigFromYard();
      await getLaser();
      await move(230,6);await move(242,6);await move(242,-28);await move(150,-28);await use();
    }
    await move(122,-28);await shoot(126,-16,26,'inner-optics','laser');await settle();await move(122,32,true);await move(138,32);await move(138,-8);await shoot(138,-18.4,28.25,'inner-transit');
    await record('optical-and-thermal-convergence');await move(122,30);await move(94,30);await move(94,46);await arrive(-40);await move(82,46);await move(82,6);await move(44,6);await move(44,-10);await use();
    await shoot(40,-12,-38.6,'last-cage');await move(34,-18);await move(22,-18);await arrive(-8);await move(22,-8);await move(18,-8);await move(18,-2);await move(16,-2);await move(16,80);await move(16,86);await move(0,86);await use();
    await record('deep-shaft-returns-to-opening');
    await move(16,80);await move(16,-2);await move(18,-2);await move(18,-8);await move(22,-8);await move(22,-18);await arrive(-40);await move(34,-18);await move(34,-10);await expedition('hearth');await move(34,-10);await move(44,-10);await use();await record('last-refuge-repaired');await move(34,-10);await move(34,6);await move(34,68);await move(0,68);await move(0,52);
    await choose('laser');const keeperFight=await page.evaluate(async()=>{
      const {keeperDodge}=await import('/test-fixtures/keeper-dodge.js');
      const g=window.__game,start=g.snapshot();let corner=0;const orbit=[[-8,40],[-8,28],[8,28],[8,40]];
      for(let i=0;i<7200;i++){
        const s=g.snapshot(),e=g.debug.world.enemies.find(e=>e.id==='keeper'),p=s.player;if(!e.hp){g.setInput([]);return {hp:p.hp,time:s.time,seconds:s.time-start.time,entryHp:start.player.hp};}if(p.hp<=0)return {error:'keeper death',seconds:s.time-start.time,entryHp:start.player.hp,s};
        if(Math.hypot(p.x-orbit[corner][0],p.z-orbit[corner][1])<.6)corner=(corner+1)%orbit.length;const dx=orbit[corner][0]-p.x,dz=orbit[corner][1]-p.z;const keys=Math.abs(dx)>Math.abs(dz)?dx>0?['KeyS','KeyD']:['KeyW','KeyA']:dz>0?['KeyS','KeyA']:['KeyW','KeyD'];const t=e.parts.find(t=>t.hp>0)||{x:e.x,y:e.y+1.5,z:e.z};g.aimAt(t.x,t.z,t.y);keys.push('Mouse0');g.setInput(keeperDodge(p,e)||keys);g.step(1/30,false);
      }return {error:'keeper timeout',s:g.snapshot()};
    });if(keeperFight.error)throw Error(JSON.stringify(keeperFight));milestones.push({label:'keeper-defeated',...keeperFight});await move(0,8);await move(0,0);await settle();await page.keyboard.down('e');await page.evaluate(()=>__game.step(2.2));await page.keyboard.up('e');

  await page.evaluate(()=>__game.step(27));const end=await page.evaluate(()=>__game.snapshot());
  if(!await page.getByRole('heading',{name:'Mission Accomplished'}).isVisible())throw Error('Completion screen missing');
  if(!end.state.endingSeen||!end.state['inner-optics']||!end.state.load||!end.player.mortar)throw Error('Missing progression milestone');
  if(approach==='water'&&(!end.player.flotation||!end.player.magnet))throw Error('Water acquisitions missing');
  if(approach==='dry'&&(end.player.flotation||end.player.magnet))throw Error('Dry run unexpectedly granted water equipment');
  await record('completed');await page.screenshot({path:`v2/output/playwright/completion/${approach}-${first}-ending.png`});
  await page.reload();await page.waitForFunction(()=>window.__game);await page.evaluate(()=>__game.manual(true));const saved=await page.evaluate(()=>__game.snapshot());
  if(!saved.state.endingSeen||!saved.state['inner-optics']||!saved.player.mortar)throw Error('Reload lost progression');
  const run={approach,first,legs:legs.length,milestones,reload:true};runs.push(run);
  await page.evaluate(run=>sessionStorage.setItem('completed-journey-'+run.approach+'-'+run.first,JSON.stringify(run)),run);
 }
 } catch(error) { throw Error(JSON.stringify({completedRuns:runs,error:error.message})); }
 if(errors.length)throw Error(JSON.stringify(errors));return {runs,errors};
 })();
}

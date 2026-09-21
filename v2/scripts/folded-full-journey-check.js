async page=>{

 return await (async()=>{
 const resume=await page.evaluate(()=>sessionStorage.getItem('nestedJourneyResume'));
 const routeAudit=!!resume||page.url().includes('routeAudit');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));const runs=[];
 try { for(const [approach,first]of [['nested','laser']]){
  if(!resume){
    await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');await page.waitForFunction(()=>window.__game);
    await page.evaluate(()=>{localStorage.removeItem('furnace-born-v2-city');localStorage.removeItem('furnace-born-v2-settings');});await page.reload();await page.waitForFunction(()=>window.__game);
  }
  await page.evaluate(({routeAudit,resume})=>{__game.manual(true);if(resume)__game.respawn();if(routeAudit)Object.defineProperty(__game.debug.p,'invincible',{configurable:true,get:()=>1e9,set:()=>{}});},{routeAudit,resume});
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
  async function move(x,z,boost=false,axis=null){
    const equipment=(await page.evaluate(()=>__game.snapshot())).player;
    await choose(equipment.laser?"laser":equipment.mortar?"mortar":"cannon");
    const result=await page.evaluate(({x,z,boost,axis})=>{
      const g=window.__game,start=g.snapshot().time;let last=null,blocked=0,detour=false;
      for(let i=0;i<3600;i++){
        const s=g.snapshot(),p=s.player,dx=x-p.x,dz=z-p.z;
        if(Math.hypot(dx,dz)<.4){g.setInput([]);return {x:p.x,y:p.y,z:p.z,hp:p.hp,seconds:s.time-start};}
        if(last&&Math.hypot(p.x-last.x,p.z-last.z)<.002)blocked++;else blocked=0;last={x:p.x,z:p.z};
        if(blocked>8&&Math.abs(dx)>.4&&Math.abs(dz)>.4)detour=true;
        if(Math.min(Math.abs(dx),Math.abs(dz))<.4)detour=false;
        const beltCrossing=g.debug.world.belts.some(b=>b.vx&&Math.abs(p.y-b.y)<1&&p.x>=b.x&&p.x<=b.x+b.w&&p.z>=b.z&&p.z<=b.z+b.d&&(z<b.z||z>b.z+b.d));
        const alongX=(axis==='z'||beltCrossing)&&Math.abs(dz)>.4?false:Math.abs(dx)>Math.abs(dz),keys=(detour?!alongX:alongX)?dx>0?['KeyS','KeyD']:['KeyW','KeyA']:dz>0?['KeyS','KeyA']:['KeyW','KeyD'];if(boost)keys.push('ShiftLeft');
        const e=s.enemies.find(e=>e.hp>0&&e.readable&&Math.abs(e.y-p.y)<3&&Math.hypot(e.x-p.x,e.z-p.z)<24);
        if(e&&!boost){const t=e.parts.find(part=>part.hp>0)||{x:e.x,z:e.z,y:e.y+1.5};g.aimAt(t.x,t.z,t.y);keys.push('Mouse0');}
        g.setInput(keys);g.step(Math.hypot(dx,dz)<2?1/120:1/30,false);if(g.snapshot().player.hp<=0)return {error:'died',at:g.snapshot().player,lifts:g.debug.world.lifts.map(l=>({id:l.id,y:l.y,destination:l.destination,wait:l.wait})),near:g.snapshot().enemies.filter(e=>e.hp>0&&Math.hypot(e.x-x,e.z-z)<100)};
      }return {error:'stuck',at:g.snapshot().player,rails:g.debug.state.bodies.solids.filter(b=>b.rail&&Math.hypot(b.x-x,b.z-z)<50).map(b=>({id:b.id,x:b.x,z:b.z,rail:b.rail}))};
    },{x,z,boost,axis});if(result.error)throw Error(JSON.stringify({target:[x,z],...result}));legs.push(result);
  }
  async function shoot(x,z,y,id,weapon="cannon"){
    await choose(weapon);
    const s=await page.evaluate(({x,z,y,id})=>{const g=window.__game,c=g.debug.world.controls.find(c=>c.id===id);if(c?.mount){x=c.x+c.facing.x*.5;y=c.y+c.facing.y*.5;z=c.z+c.facing.z*.5;}g.setInput([]);if(!["brake","ratchet"].includes(id))g.step(3,false);for(let i=0;i<(id==="brake"?900:180);i++){g.aimAt(x,z,y);g.setInput(['Mouse0']);g.step(1/60,false);if(g.snapshot().state[id]||g.snapshot().state.pendingSignals?.[id]||id==='return-index'&&g.snapshot().state.mirrorTurns[id]%2===1)break;}g.setInput([]);g.step(.4,false);const pending=g.snapshot().state.pendingSignals?.[id];if(pending)g.step(pending.remaining+.1,false);return g.snapshot();},{x,z,y,id});
    if(!s.state[id]&&!(id==='return-index'&&s.state.mirrorTurns[id]%2===1))throw Error('Latch '+id+' '+JSON.stringify({p:s.player,aim:s.aim}));
  }
  async function fight(id,x0,x1,z){
    const result=await page.evaluate(({id,x0,x1,z})=>{
      const g=window.__game;let destination=x0,corner=0;const orbit=id==='sorter'?[[59,-148],[32,-148],[32,-160],[56,-160],[59,-140]]:[[-39,136],[-23,136],[-23,123],[-39,123]];
      for(let i=0;i<3600;i++){
        const s=g.snapshot(),e=s.enemies.find(e=>e.id===id),p=s.player;if(!e.hp){g.setInput([]);return {hp:p.hp,enemy:e};}
        if(p.hp<=0)return {error:'died',p,e};
        if(Math.abs(p.x-destination)<.6)destination=destination===x0?x1:x0;
        if(['prototype','sorter'].includes(id)&&Math.hypot(p.x-orbit[corner][0],p.z-orbit[corner][1])<.65)corner=(corner+1)%orbit.length;
        const dx=(['prototype','sorter'].includes(id)?orbit[corner][0]:destination)-p.x,dz=(['prototype','sorter'].includes(id)?orbit[corner][1]:z)-p.z,keys=Math.abs(dz)>Math.abs(dx)?dz>0?['KeyS','KeyA']:['KeyW','KeyD']:dx>0?['KeyS','KeyD']:['KeyW','KeyA'];
        const t=e.parts.find(part=>part.hp>0)||{x:e.x,y:e.y+1.5,z:e.z};g.aimAt(t.x,t.z,t.y);if(!['foundry','sorter'].includes(id)||e.phase==='vent')keys.push('Mouse0');g.setInput(keys);g.step(1/30,false);
      }return {error:'fight timeout',s:g.snapshot()};
    },{id,x0,x1,z});if(result.error)throw Error(id+' '+JSON.stringify(result));return result;
  }
  async function expedition(id){
    const route=await page.evaluate(async id=>(await import('/src/folded-expansion-layout.js')).expansionRoutes.find(r=>r.id===id),id);
    for(const [x,z]of route.approach)await move(x,z);
    async function action(name,x,z){
      if(!name||name==='boost')return;
      if(name==='repair')return;
      if(name==='pickup'){await use();return;}
      if(name==='float'){await page.keyboard.press('f');return;}
      if(name==='overseer'){await choose('cannon');await fight('foundry',210,236,-132);await record('overseer');return;}
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
      if(name==='hearth-return')await move(24,64);
      const c=await page.evaluate(async name=>(await import('/src/folded-layout.js')).foldedControls.find(c=>c.id===name),name);
      if(c.slide){
        await move(-106,-54);
        const opened=await page.evaluate(()=>{const g=__game;for(let i=0;i<900&&!g.snapshot().state['arsenal-return'];i++){const c=g.debug.world.controls.find(c=>c.id==='arsenal-return');g.aimAt(c.x,c.z,c.y);const keys=['Mouse2'];g.setInput(keys);g.step(1/60,false);}g.setInput([]);return g.snapshot().state['arsenal-return'];});
        if(!opened)throw Error('Magnetic workshop return did not open');
        await move(-106,-54);await move(x,z);
      }else if(c.kind==='magnet'){
        await page.evaluate(c=>{__game.aimAt(c.x,c.z,c.y);__game.setInput(['Mouse2']);__game.step(1.2);__game.setInput([]);__game.step(12,false);},c);
      }else{const [cx,cy,cz]=c.via||[c.x,c.y,c.z];await shoot(cx,cz,cy,c.id,c.kind==='laser'?'laser':c.surface==='top'?'mortar':'cannon');}
      if(!(await page.evaluate(()=>__game.snapshot())).state[name])throw Error('District mechanism '+name);
    }
    for(const [x,z,name]of route.path){
      if(id==='arsenal'&&name==='pickup'){
        await choose('cannon');
        for(const [tx,tz]of [[-170,-54],[-168,-54],[-168,-88]])await move(tx,tz);
        for(const [switchId,sx,sz]of [['rail-a',-166,-88],['rail-b',-154,-76],['rail-carrier',-176,-83]]){
          const approach=switchId==='rail-a'?[[-166,-88]]:switchId==='rail-b'?[[-166,-94],[-154,-94],[-154,-76]]:[[-154,-94],[-166,-94],[-166,-83],[-176,-83]];
          for(const [x,z]of approach)await move(x,z);await choose('cannon');
          await page.evaluate(id=>{
            const g=__game,q=g.debug.world.sidePuzzles,t=q.targets.find(t=>t.id===id),index=id==='rail-a'?0:1;
            if(id!=='rail-carrier'&&q.rail.state.switches[index])return;
            g.step(3,false);g.aimAt(t.x,t.z,t.y);g.setInput(['Mouse0']);g.step(.1,false);g.setInput([]);g.step(1,false);
          },switchId);
        }
        await page.evaluate(()=>__game.step(12,false));
        if(!(await page.evaluate(()=>__game.snapshot())).state['rail-crossing'])throw Error('Shunting reward was not delivered');
        for(const [tx,tz]of [[-180,-84],[-180,-60],[-156,-60]])await move(tx,tz);
      }
      await move(x,z);await action(name,x,z);
      if(id==='proving'&&x===218&&z===-170){
        await move(198,-174);await move(200,-174);await move(200,-154);await shoot(195.1,-154,20.25,'proving-inspection');
        await move(198,-154);await move(198,-152);await move(9,-152);await move(9,-34);await move(0,-34);await move(0,27);await use();await record('proving-refuge-return');
        await move(0,-34);await move(3,-34);await move(3,-154.5);await move(198,-154.5);await move(198,-182);await move(218,-182);await move(x,z);
      }
    }
    if(route.ability&&!(await page.evaluate(()=>__game.snapshot())).player[route.ability])throw Error('Missing module '+id);
    for(const [x,z,name]of route.returns){await move(x,z,name==='boost');await action(name,x,z);}
    await record('district-'+id);
  }

  if(!['east','thermal'].includes(resume)){
  if(!resume){
  await move(-40,86);await move(-40,53);await shoot(-35,44,-14.5,'relay-west');
  await move(-57,52);await move(-57,76);await page.keyboard.press('e');await move(-57,118);await shoot(-65,114,-14.5,'relay-east');
  await move(-57,128);await move(-43,132);const prototype=await fight('prototype',-43,-20,132);
  await move(-28,124);await page.keyboard.press('e');
  if(!(await page.evaluate(()=>window.__game.snapshot())).player.overdrive)throw Error('Overdrive was not acquired');
  await move(-28,100,true);await move(-28,52);await move(-40,52);await move(-40,86,true);await move(0,86);await page.keyboard.press('e');
  await move(0,54,true);
  await move(6,48);await page.keyboard.press('e');await move(24,48);await move(24,4);await move(36,4);await move(36,30);await move(22,30);await move(0,27);await page.keyboard.press('e');

  for(const [x,z]of [[-12,27],[-12,-8],[-12,-24],[-14,-36],[-12,-40],[-12,-72]])await move(x,z);
  await move(6,-72,true);await settle(2);await move(34,-72,true);
  for(const [x,z]of [[34,-98],[54,-98],[54,-118],[32,-118]])await move(x,z);
  await shoot(24.6,-118,-4.75,'sorter-retry');await move(54,-118);await move(54,-132);
  await choose('cannon');await fight('sorter',32,56,-146);await record('sorter');
  await move(59,-146);await move(32,-146);await move(32,-178);await use();
  for(const [x,z]of [[32,-146],[59,-146],[59,-124],[54,-124],[54,-98],[34,-98],[34,-72]])await move(x,z);
  if(!(await page.evaluate(()=>__game.snapshot())).player.mortar)throw Error('Cargo Mortar missed');await record('cargo-mortar');
  await shoot(32,-58,-2,'loading-return','mortar');await move(28,-58);await move(28,-46);await move(18,-46);await arrive(0);await move(18,-34);await move(0,-34);await move(0,27);await use();
  await page.screenshot({path:`v2/output/playwright/completion/${approach}-pickup.png`});
  }
  if(!['water','combined','proving'].includes(resume)){
  await move(-26,27);await shoot(-29,27,1.3,'ballast');await move(-38,27);await arrive(8);
  await move(-50,31);await expedition('arsenal');await use();
  }
  if(!['combined','proving'].includes(resume)){
  await move(-26,27);await move(-26,-8);await move(-46,-8);await expedition('reservoir');
  await move(-26,-8);await move(-26,27);await move(0,27);await use();await record('three-middle-loops');
  }
  if(resume!=='proving'){
  await move(0,-34);await move(18,-34);
  if(!(await page.evaluate(()=>__game.snapshot())).state['bridge-crane'])throw Error('Cargo first use did not open freight');
  for(const [x,z]of [[59,-34],[59,-63],[67,-63],[67,-34],[74,-34],[74,-26]])await move(x,z);
  await page.evaluate(()=>{const g=__game,c=g.debug.world.controls.find(c=>c.id==='magnet');g.setInput([]);g.step(3,false);for(let i=0;i<90;i++){g.aimAt(c.x,c.z,c.y);g.setInput(['Mouse2']);g.step(1/60,false);}g.setInput([]);});
  if(!(await page.evaluate(()=>__game.snapshot())).state.magnet)throw Error('Inspection grille');
  await page.keyboard.press('f');for(const [x,z]of [[74,-16],[98,-16],[98,-5],[110,-5]])await move(x,z);await page.keyboard.press('f');
  await shoot(123,-13,6.8,'load','mortar');await record('combined-inspection');
  for(const [x,z]of [[110,-24],[110,-48],[110,-62],[78,-62],[78,-84]])await move(x,z);await arrive(16);
  await move(77,-94);
  }else{await move(0,-34);await move(3,-34);await move(3,-154.5);await move(77,-154.5);await move(77,-164,false,'z');}
  await expedition('proving');await use();await record('phoenix-original-boundary');
  }
    async function getLaser(){
      await move(202,-28);await move(242,-24);await expedition('lens');
      if(!(await page.evaluate(()=>__game.snapshot())).player.laser)throw Error('Laser acquisition');
      await move(242,-24);await move(202,-28);await move(150,-28);await use();await record('laser-reopens-C-return');
    }
    async function rigFromYard(){
      await move((await page.evaluate(()=>__game.snapshot())).player.x,48);await move(242,48);await move(210,48);await move(210,44);await use();await move(210,48);await move(242,48);await move(242,95);
      await move(242,120);await move(222,120);await move(248,120);await move(248,117);await expedition('coolant');
      await move(284,117);await shoot(278,117,-22.7,'coolant-bypass');await move(290,117);await move(290,106);await arrive(24);await move(278,106);await move(278,-28);await move(150,-28);await use();
      if(!(await page.evaluate(()=>__game.snapshot())).player.circulation)throw Error('Circulation acquisition');
    }
    if(resume!=='thermal'){
    await getLaser();
    for(const [x,z]of [[202,-28],[225,-20]])await move(x,z);
    await shoot(219.7,-5.6,26.25,'optical-screen','cannon');
    await shoot(216,-4,26,'gallery','laser');
    for(const [x,z]of [[242,-20],[242,6],[230,6],[230,38],[202,38],[202,48]])await move(x,z);
    await choose('laser');
    const guardianFight=await page.evaluate(()=>{
      const g=__game,a=g.debug,e=a.world.enemies.find(e=>e.id==='guardian'),start=a.time;let cycle=-1,destination=194;
      for(let n=0;n<60*120&&e.hp>0;n++){
        if(a.p.hp<=0)throw Error('Guardian death');
        if(e.attackCycle!==cycle){cycle=e.attackCycle;destination=a.p.x<202?210:194;}
        const moving=e.phase==='warn'||e.attack==='seekers'&&e.phase==='vent'&&e.timer>.5;
        const keys=moving&&Math.abs(a.p.x-destination)>.4?(destination>a.p.x?['KeyS','KeyD']:['KeyW','KeyA']):[];
        const origin=a.weaponOrigin();let target=null;
        for(const [x,z,nx,nz]of [[210,70,1.1417430631,1.5397934235],[190,68,-1.4631790535,1.1737206917]]){
          const normal=new a.T.Vector3(nx,0,nz).normalize(),center=new a.T.Vector3(x,18,z),real=new a.T.Vector3(e.x,18,e.z);
          const virtual=real.clone().addScaledVector(normal,-2*real.clone().sub(center).dot(normal)),ray=virtual.sub(origin);
          const t=center.clone().sub(origin).dot(normal)/ray.dot(normal),point=origin.clone().addScaledVector(ray,t);
          if(t>0&&t<1&&point.distanceTo(center)<4.4&&Math.cos(Math.atan2(point.x-e.x,point.z-e.z)-e.aim)<-.45){target=point;break;}
        }
        if(target)g.aimAt(target.x,target.z,target.y);if(target&&!a.p.overheated)keys.push('Mouse0');g.setInput(keys);g.step(1/60,false);
      }
      g.setInput([]);if(e.hp>0)throw Error('Guardian timeout');return {hp:a.p.hp,seconds:a.time-start};
    });milestones.push({label:'guardian',...guardianFight});await settle();
    for(const [x,z]of [[218,48],[218,70],[254,70],[254,12],[242,12],[242,48]])await move(x,z);
    await rigFromYard();
    }
    for(const [x,z]of [[162,-28],[162,30],[174,30],[174,-18],[190,-18],[190,46],[154,46]])await move(x,z);
    await settle();await move(154,108,true);await move(170,108);await move(170,58);await shoot(170,56,-6.7,'inner-transit');await move(170,108);
    await record('progressive-inner-route');
    for(const [x,z]of [[154,108],[106,108],[94,108]])await move(x,z);await arrive(-40);
    for(const [x,z]of [[82,108],[82,6],[44,6],[44,-10]])await move(x,z);await use();
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
  if(!end.state.endingSeen||!end.state['lens-return']||!end.state['inner-thermal']||!end.state.load||!end.player.mortar)throw Error('Missing progression milestone');
  if(['overdrive','magnet','mortar','flotation','phoenix','laser','circulation'].some(id=>!end.player[id]))throw Error('Required ability missing');
  if(['prototype','sorter','foundry','guardian','keeper'].some(id=>!end.state[id]))throw Error('Required Boss missing');
  await record('completed');await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('#ending')).opacity)>.99);await page.screenshot({path:`v2/output/playwright/completion/${approach}-${first}-ending.png`});
  await page.reload();await page.waitForFunction(()=>window.__game);await page.evaluate(()=>__game.manual(true));const saved=await page.evaluate(()=>__game.snapshot());
  if(!saved.state.endingSeen||!saved.state['lens-return']||!saved.state['inner-thermal']||!saved.player.mortar)throw Error('Reload lost progression');
  const run={approach,first,resume,legs:legs.length,milestones,reload:true};runs.push(run);
  await page.evaluate(run=>sessionStorage.setItem('completed-journey-'+run.approach+'-'+run.first,JSON.stringify(run)),run);
 }
 } catch(error) { throw Error(JSON.stringify({completedRuns:runs,error:error.message})); }
 if(errors.length)throw Error(JSON.stringify(errors));return {runs,errors,routeAudit};
 })();
}

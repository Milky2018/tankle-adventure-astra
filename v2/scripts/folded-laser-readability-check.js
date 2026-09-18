async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||m.type()==='warning'&&/THREE|WebGL/.test(m.text()))errors.push(m.text());});
 await page.route('**/src/folded.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+`\nwindow.__laserReview={world,p,state,T,traceFoldedLaser,castWeapon,laserGuide,laserEndpoint,laserBeam,aim,weaponOrigin,updateLaser,beginBossAttack,updateEnemies,setCameraView,follow,keys,clearShots};`});});
 await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test');await page.waitForFunction(()=>window.__laserReview);await page.unroute('**/src/folded.js*');
 await page.evaluate(()=>{__game.manual(true);for(const e of __laserReview.world.enemies){e.hp=0;e.model.root.visible=false;}});
 const assert=(ok,message)=>{if(!ok)throw Error(message);};
 const cases=[
  {id:'lens-return',from:[324,24,-32],mirror:[324,26,-14],state:{'lens-return':false}},
  {id:'gallery',from:[225.2376,24,-20],mirror:[216,26,-4],state:{gallery:false,'mirror-index':false,'garden-optical':false}},
  {id:'garden-optical',from:[225.2376,24,-20],mirror:[216,26,-4],state:{gallery:true,'mirror-index':true,'garden-optical':false}},
  {id:'inner-optics',from:[254,-24,134],mirror:[254,-22,124],state:{'inner-optics':false}}
 ];
 async function fixture(c,view){await page.evaluate(({c,view})=>{
  const a=__laserReview,g=__game;g.setInput([]);a.clearShots();a.setCameraView(view);
  g.scenario({player:{x:c.from[0],y:c.from[1],z:c.from[2],hp:50,heat:0,lastHeat:-100,overheated:false,speed:1,laser:true,weapon:'laser',deployed:false},state:c.state});g.step(1.6);
 },{c,view});
 if(view==='third'&&!await page.evaluate(()=>!!document.pointerLockElement)){await page.mouse.click(600,427);await page.waitForFunction(()=>!!document.pointerLockElement||__game.snapshot().camera.dragLook);}
 }
 async function aimAt(point,view){
  if(view==='overhead'){
   const q=await page.evaluate(p=>__game.project(p[0],p[2],p[1]),point);assert(q.x>0&&q.x<1200&&q.y>0&&q.y<855,'Mirror outside the viewport');await page.mouse.move(q.x,q.y);
  }else{
   await page.mouse.move(600,427);
   await page.evaluate(point=>{
    const a=__laserReview,g=__game;let yaw=Math.atan2(point[0]-a.p.x,point[2]-a.p.z),pitch=0;
    for(let i=0;i<24;i++){g.look(yaw,pitch);const q=g.project(point[0],point[2],point[1]);yaw-=(q.x/innerWidth*2-1)*Math.tan(Math.PI/6)*(innerWidth/innerHeight)*.8;pitch+=(q.y/innerHeight*2-1)*Math.tan(Math.PI/6)*.8;}
    g.look(yaw,pitch);
   },point);
   await page.mouse.down({button:'middle'});await page.mouse.move(602,428);await page.mouse.up({button:'middle'});
  }
  await page.evaluate(()=>__game.step(.02));
 }
 const views=[];
 for(const view of ['overhead','third'])for(const c of cases){
  await fixture(c,view);await aimAt(c.mirror,view);
  const before=await page.evaluate(id=>{
   const a=__laserReview,g=__game;g.step(.25);return {heat:a.p.heat,open:a.state[id],guide:a.laserGuide.visible,path:Array.from(a.laserGuide.geometry.attributes.position.array.slice(0,a.laserGuide.geometry.drawRange.count*3)),hp:a.world.enemies.map(e=>e.hp)};
  },c.id);
  assert(before.guide&&before.heat===0&&!before.open,`${view}/${c.id}: preview changed heat or the mechanism`);
  await page.screenshot({path:`v2/output/playwright/laser/${c.id}-${view}-preview.png`});
  await page.mouse.down({button:'left'});await page.evaluate(()=>__game.step(1/60));await page.mouse.up({button:'left'});
  const after=await page.evaluate(id=>({open:__laserReview.state[id],heat:__laserReview.p.heat,path:__game.snapshot().laserSegments,hp:__laserReview.world.enemies.map(e=>e.hp)}),c.id);
  assert(after.open,`${view}/${c.id}: firing along the guide did not operate the receiver: ${JSON.stringify({before,after})}`);
  assert(Math.abs(after.heat-.4)<1e-8,'Laser heat cost changed');
  assert(after.path.length===before.path.length&&after.path.every((n,i)=>Math.abs(n-before.path[i])<.001),`${view}/${c.id}: Preview and live beam diverged ${JSON.stringify({before:before.path,after:after.path})}`);
  views.push({view,id:c.id,segments:before.path.length/6});
 }
 const mechanics=await page.evaluate(()=>{
  const a=__laserReview,g=__game,check=(ok,msg)=>{if(!ok)throw Error(msg);};
  const trace=(from,to)=>a.traceFoldedLaser(new a.T.Vector3(...from),new a.T.Vector3(...to).sub(new a.T.Vector3(...from)),(o,d,r)=>a.castWeapon(o,d,r));
  g.setInput([]);g.scenario({player:{x:225.2376,y:24,z:-20,weapon:'laser',heat:0,overheated:false},state:{gallery:true,'mirror-index':false,'garden-optical':false}});g.step(2);
  check(trace([225.2376,26,-20],[216,26,-4]).at(-1).hit?.target?.id!=='garden-optical','Unindexed mirror solved the return');
  for(const from of [[232,26,-16],[238,26,-9.5],[232,26,6]])check(trace(from,[232,26,-9.5]).at(-1).hit?.target?.id!=='garden-optical','A direct shot bypasses the receiver housing');
  a.state['mirror-index']=true;g.step(2);
  const areas=[];
  // Find physically valid aim points from a broad supported strip. The game
  // never uses this inverse construction: it only verifies authored tolerance.
  for(const id of ['gallery','garden-optical']){
   a.state.gallery=id!=='gallery';const receiver=a.world.controls.find(c=>c.id===id),mirrors=id==='gallery'?['calibration']:['calibration','return-index'];
   let count=0;
   for(const dx of [-2,-1,0,1,2])for(const dz of [-2,0,2]){
    let virtual=new a.T.Vector3(receiver.x,receiver.y,receiver.z);
    for(const mid of [...mirrors].reverse()){const m=a.world.mirrors.find(m=>m.id===mid),center=new a.T.Vector3(m.x,m.y,m.z);virtual.addScaledVector(m.normal,-2*virtual.clone().sub(center).dot(m.normal));}
    const from=[225.2376+dx,26,-20+dz],start=new a.T.Vector3(...from),dir=virtual.sub(start).normalize();
    for(const angle of [-.02,0,.02]){
     const varied=dir.clone().applyAxisAngle(new a.T.Vector3(0,1,0),angle),path=a.traceFoldedLaser(start,varied,(o,d,r)=>a.castWeapon(o,d,r));
     if(path.at(-1).hit?.target?.id===id)count++;
    }
   }
   check(count>=36,`${id}: too narrow, ${count}/45 rays`);areas.push({id,hits:count,total:45});
  }
  // Existing final feed still accepts direct light from its approach.
  a.state['core-feed']=false;check(trace([24,-38,110],[24,-38,118]).at(-1).hit?.target?.id==='core-feed','Final feed facing is inaccessible');
  g.scenario({player:{x:225.2376,y:24,z:-20,weapon:'cannon'}});g.step(.02);check(!a.laserGuide.visible&&!a.laserEndpoint.visible,'Guide survives switching weapons');
  g.scenario({player:{weapon:'laser',heat:100,overheated:true,lastHeat:g.snapshot().time}});g.step(.02);check(a.laserGuide.visible&&!a.laserBeam.visible,'Overheat hides planning or permits fire');
  return {areas};
 });
 const guardian=await page.evaluate(()=>{
  const a=__laserReview,g=__game,e=a.world.enemies.find(e=>e.guardian),check=(ok,msg)=>{if(!ok)throw Error(msg);};
  a.setCameraView('overhead');g.setInput([]);a.clearShots();g.scenario({player:{x:202,y:16,z:48,hp:50,heat:0,overheated:false,weapon:'laser',invincible:1e9},state:{guardian:false}});
  for(const m of a.world.mirrors.filter(m=>m.id.startsWith('guardian'))){const q=g.project(m.x,m.z,m.y);check(q.x>20&&q.x<innerWidth-20&&q.y>20&&q.y<innerHeight-20,'Guardian mirror centre is outside the playable view');}
  Object.assign(e,{hp:e.max,phase:'idle',timer:0,stunnedUntil:0});e.model.root.visible=true;for(let i=0;i<120&&e.phase==='idle';i++)g.step(1/60);check(e.phase==='warn','Guardian never committed');const locked=e.aim;
  g.scenario({player:{x:194,z:54}});g.step(.2);check(Math.abs(e.aim-locked)<1e-8,'Guardian tracks during its warning');
  for(let i=0;i<120&&e.phase!=='vent';i++)g.step(1/60);check(e.phase==='vent','Guardian did not expose recovery');
  g.scenario({player:{x:210,z:54}});g.step(.2);g.step(1.3);check(e.phase==='vent'&&Math.abs(e.aim-locked)<1e-8,'Guardian tracks before its recovery window ends');
  // A single reflection reaches its rear from the broad approach-side mirror.
  g.scenario({player:{x:202,z:48}});e.aim=Math.PI;e.phase='vent';e.timer=1;
  const start=new a.T.Vector3(202,18,48),to=new a.T.Vector3(210,18,70),path=a.traceFoldedLaser(start,to.sub(start),(o,d,r)=>a.castWeapon(o,d,r));
  check(path.at(-1).hit?.target===e,'Rear reflection misses the guardian');
  a.aim.set(210,18,70);a.keys.add('Mouse0');const hp=e.hp;a.updateLaser(.2);a.keys.clear();const rearDamage=hp-e.hp;check(Math.abs(rearDamage-.9)<1e-6,'Reflected rear damage changed');
  g.scenario({player:{x:194,z:54}});e.timer=.01;g.step(.05);g.step(.05);check(Math.abs(e.aim-locked)>.1,'Guardian never reacquires after recovery');
  return {locked,rearDamage,segments:path.length,hp:e.hp};
 });
 const battle=await page.evaluate(()=>{
  const a=__laserReview,g=__game,e=a.world.enemies.find(e=>e.guardian);g.setInput([]);a.clearShots();a.setCameraView('overhead');
  g.scenario({player:{x:196,y:16,z:50,hp:50,overdrive:true,phoenix:true,heat:0,overheated:false,lastHeat:-100,invincible:0,speed:1,weapon:'laser'},state:{guardian:false}});
  Object.assign(e,{hp:e.max,phase:'idle',timer:1.2,stunnedUntil:0,attackCycle:0});
  const orbit=[[196,50],[210,50]],phases=new Set(),outcomes={};let corner=0,cooling=false,previousPhase='idle',start=g.snapshot().time;
  for(let i=0;i<75*30&&e.hp>0&&a.p.hp>0;i++){
   const p=a.p;if(e.phase==='warn'&&previousPhase!=='warn')corner=p.x<203?1:0;previousPhase=e.phase;
   const dx=orbit[corner][0]-p.x,dz=orbit[corner][1]-p.z,keys=Math.hypot(dx,dz)<.35?[]:Math.abs(dx)>Math.abs(dz)?dx>0?['KeyS','KeyD']:['KeyW','KeyA']:dz>0?['KeyS','KeyA']:['KeyW','KeyD'];
   const side=e.aim>0?'west':'east',first=a.world.mirrors.find(m=>m.id===`guardian-${side}-b`);let virtual=new a.T.Vector3(e.x,e.y+1.5,e.z);
   for(const id of [`guardian-${side}-b`]){const m=a.world.mirrors.find(m=>m.id===id);virtual.addScaledVector(m.normal,-2*virtual.clone().sub(new a.T.Vector3(m.x,m.y,m.z)).dot(m.normal));}
   const origin=a.weaponOrigin(),point=new a.T.Ray(origin,virtual.sub(origin).normalize()).intersectPlane(new a.T.Plane().setFromNormalAndCoplanarPoint(first.normal,new a.T.Vector3(first.x,first.y,first.z)),new a.T.Vector3());
   if(point)g.aimAt(point.x,point.z,point.y);
   const path=a.traceFoldedLaser(origin,a.aim.clone().sub(origin),(o,d,r)=>a.castWeapon(o,d,r)),last=path.at(-1),hit=last.hit?.target;
   const rear=hit===e&&Math.cos(Math.atan2(last.start.x-e.x,last.start.z-e.z)-e.aim)<-.45;
   const outcome=hit?.id||last.hit?.mirror?.id||'structure';outcomes[outcome]=(outcomes[outcome]||0)+1;
   if(p.heat>88)cooling=true;if(p.heat<15)cooling=false;if(rear&&!cooling)keys.push('Mouse0');
   g.setInput(keys);g.step(1/30,false);phases.add(e.attack);
  }
  g.setInput([]);g.step(.001);return {won:e.hp<=0,hp:a.p.hp,bossHp:e.hp,seconds:g.snapshot().time-start,phases:[...phases],outcomes};
 });
 assert(battle.won&&battle.hp>0,'Scripted reflected guardian fight failed '+JSON.stringify(battle));
 await page.evaluate(()=>{__game.setInput([]);__laserReview.setCameraView('third');__game.look(0,.2);__game.step(.01);});
 await page.screenshot({path:'v2/output/playwright/laser/guardian-third.png'});
 assert(!errors.length,errors.join('\n'));return {views,...mechanics,guardian,battle,errors};
}

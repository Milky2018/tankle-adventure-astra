async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.unroute('**/src/folded.js*');
 await page.route('**/src/folded.js*',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replace('let manual=false','let manual=true')+'\nwindow.__authored={world,renderer,scene,p,resetEnemies,clearShots,setCameraView,get camera(){return camera;},reveal(){for(const d of foldedDecks)discovered.add(d.id);setMap(true);},layer(y){chosenLayer=y;drawMap(true);},closeMap(){setMap(false);}};'});});
 try{
 await page.setViewportSize({width:1440,height:900});await page.goto('http://127.0.0.1:5174/?chapter=folded&test&view=overhead');await page.waitForFunction(()=>window.__authored);
 const result={};
 result.prototype=await page.evaluate(()=>{
  const a=__authored,g=__game,runs=[];
  for(const moving of [false,true]){
   g.scenario({state:{prototype:false,relays:true,'relay-west':true,'relay-east':true},player:{x:-43,y:-16,z:132,hp:50,heat:0,overheated:false,overdrive:false,phoenix:false,circulation:false,deployed:false,weapon:'cannon',invincible:0,shotCooldown:0}});
   a.resetEnemies();a.clearShots();for(const e of a.world.enemies)if(e.id!=='prototype'){e.hp=0;e.model.root.visible=false;}
   const e=a.world.enemies.find(e=>e.id==='prototype'),start=g.snapshot().time;let destination=-20,warnings=0,highPlate=0;
   for(let i=0;i<1800&&e.hp>0&&a.p.hp>0;i++){
    const p=a.p;g.aimAt(e.x,e.z,e.y+1.5);const keys=['Mouse0'];
    if(moving){if(Math.abs(p.x-destination)<.7)destination=destination===-20?-43:-20;keys.push(...(p.x<destination?['KeyS','KeyD']:['KeyW','KeyA']));}
    g.setInput(keys);g.step(1/60,false);if(e.phase==='warn')warnings++;highPlate=Math.max(highPlate,e.model.frontArmor.position.y);
   }
   g.setInput([]);g.step(0);runs.push({moving,hp:a.p.hp,enemyHp:e.hp,seconds:g.snapshot().time-start,warnings,highPlate});
  }return runs;
 });
 if(result.prototype.some(r=>!r.warnings||r.highPlate<2.5)||result.prototype[1].enemyHp>0||result.prototype[1].hp<=result.prototype[0].hp)throw Error('Prototype does not reward evasion '+JSON.stringify(result.prototype));
 result.map=await page.evaluate(()=>{
  const g=__game,a=__authored;g.scenario({player:{x:0,y:-40,z:0,hp:50}});a.reveal();
  const ctx=document.querySelector('#region-map').getContext('2d'),fill=ctx.fill,rect=ctx.fillRect,samples=[];let arrows=0,first=null;
  ctx.fill=function(...args){if(this.fillStyle==='#ffe19b')arrows++;return fill.apply(this,args);};
  ctx.fillRect=function(...args){if(!first&&this.fillStyle==='#829185')first={args,matrix:Array.from([this.getTransform().a,this.getTransform().d,this.getTransform().e,this.getTransform().f])};return rect.apply(this,args);};
  for(const layer of [-40,0,-40]){arrows=0;first=null;a.layer(layer);samples.push({layer,arrows,first});}
  ctx.fill=fill;ctx.fillRect=rect;return samples;
 });
 if(result.map.map(r=>r.arrows).join()!=='1,0,1')throw Error('Map misidentifies the current floor '+JSON.stringify(result.map));
 await page.screenshot({path:'v2/output/playwright/overhaul/map-current-floor.png'});await page.evaluate(()=>__authored.layer(0));await page.screenshot({path:'v2/output/playwright/overhaul/map-other-floor.png'});await page.evaluate(()=>__authored.closeMap());
 result.rampMap=await page.evaluate(()=>{__game.scenario({player:{x:-40,y:-12,z:68}});__authored.reveal();return {layer:__game.snapshot().chosenLayer,marked:document.querySelector('.layer-bar.player-layer').getAttribute('aria-label')};});
 if(result.rampMap.layer!==-16||!result.rampMap.marked.includes('-16'))throw Error('Ramp map layer disagrees with marker');
 await page.evaluate(()=>__authored.closeMap());
 result.views=[];
 for(const view of ['overhead','third'])for(const [id,x,y,z,yaw]of [['arsenal',-220,8,-40,-Math.PI/2],['magnet',-152,8,-118,0],['flotation',-304,-8,-208,Math.PI],['laser',431,24,-27,0],['guardian',202,16,54,0]]){
  const sample=await page.evaluate(({view,id,x,y,z,yaw})=>{
   const a=__authored,g=__game;g.scenario({player:{x,y,z,hp:50,heat:0,weapon:'cannon'},state:{guardian:false}});a.setCameraView(view);g.look(yaw,.4);g.step(.1);
   if(id==='guardian'){const e=a.world.enemies.find(e=>e.id==='guardian');e.hp=e.max;e.model.root.visible=true;g.step(.01);}
   const floors=a.world.surfaces.filter(s=>s.mesh.material.transparent);return {id,view,floorsBeforeFixtures:floors.every(s=>s.mesh.renderOrder<0),mirrors:id==='guardian'?a.world.mirrors?.map(m=>m.id):null};
  },{view,id,x,y,z,yaw});result.views.push(sample);await page.screenshot({path:`v2/output/playwright/overhaul/${id}-${view}.png`});
 }
 for(const view of ['overhead','third'])for(const active of [false,true]){
  await page.evaluate(({view,active})=>{__game.scenario({player:{x:-240,y:8,z:-40,hp:50},state:{'arsenal-transfer':active}});__authored.setCameraView(view);__game.look(-Math.PI/2,.4);__game.step(2);},{view,active});
  await page.screenshot({path:`v2/output/playwright/overhaul/cable-${view}-${active}.png`});
 }
 if(result.views.some(r=>!r.floorsBeforeFixtures))throw Error('Transparent floors can repaint fixtures');
 if(errors.length)throw Error(JSON.stringify(errors));return {...result,errors};
 }finally{await page.unroute('**/src/folded.js*');}
}

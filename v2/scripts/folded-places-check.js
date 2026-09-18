async page=>{
 const errors=[],views=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/src/folded.js*',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replace('let manual=false','let manual=true')+'\nwindow.__places={world,p,scene,resetEnemies,clearShots,setCameraView};'});});
 try{
 await page.setViewportSize({width:1280,height:800});await page.goto('http://127.0.0.1:5174/?chapter=folded&test&view=overhead');await page.waitForFunction(()=>window.__places);
 for(const view of ['overhead','third'])for(const [name,x,y,z,yaw]of [['press',-40,-16,53,Math.PI],['dispatch',-104,8,20,Math.PI],['reservoir',-76,-8,82,-Math.PI/2],['proving',152,16,-172,Math.PI/2],['gallery',145,20,-146,Math.PI],['calibration',271,24,-68,Math.PI/2],['separator',292,-24,165,Math.PI/2],['feed',48,-40,90,-Math.PI/2]]){
  const sample=await page.evaluate(({view,x,y,z,yaw})=>{
   __game.setInput([]);__game.scenario({player:{x,y,z,hp:50,invincible:100,heat:0,overheated:false,deployed:false},state:{'proving-transfer':true}});__places.setCameraView(view);__game.look(yaw,.28);__game.step(.05);
   return {camera:__game.snapshot().camera,readable:__game.snapshot().enemies.filter(e=>e.hp>0&&e.readable).map(e=>e.id),region:__places.world.presentation.region};
  },{view,x,y,z,yaw});views.push({name,view,...sample});await page.screenshot({path:`v2/output/playwright/places-${name}-${view}.png`});
 }
 const freight=await page.evaluate(async()=>{
  const w=__places.world.walls.find(w=>w.id==='dispatch-carrier-a'),s=w;
  __game.scenario({player:{x:-104,y:8,z:31,hp:50}});const x=s.x;__game.step(1);if(Math.abs(x-s.x)<1)throw Error('Carrier does not move');
  const rays=[];for(let i=0;i<15;i++){__places.world.transport(.2,{x:Infinity,y:8,z:0});const origin=new (__places.scene.position.constructor)(s.x+s.w/2,9.5,20),dir=new (__places.scene.position.constructor)(0,0,-1);rays.push(__places.world.cast(origin,dir,30,{targets:false})?.object===w.mesh);}
  if(!rays.every(Boolean))throw Error('Moving cover left the ray index');return {from:x,to:s.x,raySamples:rays.length};
 });
 const guardian=await page.evaluate(()=>{
  const g=__game,e=__places.world.enemies.find(e=>e.guardian);
  g.respawn();g.scenario({player:{x:218,y:16,z:29,hp:50,invincible:0},enemies:Object.fromEntries(__places.world.enemies.filter(q=>q!==e).map(q=>[q.id,0]))});
  Object.assign(e,{hp:e.max,alertUntil:g.snapshot().time+20,lastSeen:{x:218,y:16,z:29}});
  g.setInput([]);g.step(4,false);const moved=Math.hypot(e.x-e.spawn.x,e.z-e.spawn.z);
  if(moved>.01)throw Error('Optional guardian pursued into the service gallery');return {moved};
 });
 const gallery=await page.evaluate(()=>{
  const V=__places.scene.position.constructor,origin=new V(145,22,-146),target=new V(169,17.5,-183),delta=target.clone().sub(origin);
  const hit=__places.world.cast(origin,delta.clone().normalize(),delta.length()-1,{targets:false});
  if(hit)throw Error('Gallery firing line blocked by '+hit.object?.name);return {clear:true};
 });
 if(errors.length)throw Error(errors.join('\n'));return {views,freight,guardian,gallery,errors};
 }finally{await page.unroute('**/src/folded.js*');}
}

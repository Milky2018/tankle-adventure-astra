async page=>{
 const errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||m.type()==='warning'&&/THREE|WebGL/.test(m.text()))errors.push(m.text());});
 await page.goto('http://127.0.0.1:5174/?chapter=folded&test&manual');await page.waitForFunction(()=>window.__game?.debug);
 await page.evaluate(()=>{__game.manual(true);__game.scenario({enemies:Object.fromEntries(__game.snapshot().enemies.map(e=>[e.id,0]))});});
 for(const view of ['overhead','third']){
  const result=await page.evaluate(view=>{
   const g=__game,q=g.debug,T=q.T,w=q.world,check=(x,m)=>{if(!x)throw Error(view+': '+m);};
   g.setInput([]);q.setCameraView(view);q.clearShots();
   const hunter=w.enemies.find(e=>e.id==='condensate-hunter'),pump=w.enemies.find(e=>e.id==='condensate-dredger');
   function fixture(e,x,z,px,pz){
    for(const a of w.enemies){a.hp=0;a.model.root.visible=false;}
    q.clearShots();g.setInput([]);
    g.scenario({player:{x:px,y:-24,z:pz,hp:25,invincible:0,hurtUntil:0,knockX:0,knockZ:0,flotation:true,deployed:true,afloat:true,magnet:true,mortar:true,laser:true,weapon:'cannon',heat:0,lastShot:-100,lastHeat:-100,overheated:false}});
    Object.assign(e,{x,y:-24,z,hp:e.max,phase:'idle',timer:1,awake:true,aim:Math.atan2(px-x,pz-z),stunnedUntil:0,alertUntil:0,shieldRemoved:false,shieldPull:0,travelHeading:null});
    e.spawn={x,y:-24,z};e.model.root.visible=true;g.step(.01);
   }
   function aim(x,y,z){if(view==='overhead'){g.aimAt(x,z,y);return;}let yaw=Math.atan2(x-q.p.x,z-q.p.z),pitch=0;for(let i=0;i<30;i++){g.look(yaw,pitch);const p=g.project(x,z,y);yaw-=(p.x/innerWidth*2-1)*Math.tan(Math.PI/6)*(innerWidth/innerHeight)*.8;pitch+=(p.y/innerHeight*2-1)*Math.tan(Math.PI/6)*.8;}g.look(yaw,pitch);}
   fixture(hunter,440,90,440,102);hunter.phase='warn';hunter.timer=.02;hunter.aim=0;hunter.lock=new T.Vector3(440,-22.8,102);g.step(.04);
   check(q.shots.filter(s=>s.torpedo).length===2,'Hunter did not launch its pair');
   check(q.shots.filter(s=>s.torpedo).every(s=>s.damage===5),'Torpedo damage changed');
   const held=[hunter.x,hunter.z];g.step(.2);check(Math.hypot(hunter.x-held[0],hunter.z-held[1])<.001,'Hunter moves during recovery');
   const intercept=[];
   for(const weapon of ['cannon','laser','magnet']){
    fixture(hunter,440,90,440,102);hunter.hp=0;hunter.model.root.visible=false;
    g.scenario({player:{weapon:weapon==='magnet'?'cannon':weapon}});
    q.shootEnemy(hunter,0,new T.Vector3(440,-23.4,96),new T.Vector3(440,-23.4,108),0,false,{torpedo:true,speed:12,range:30});
    aim(440,-23.4,96);g.setInput([weapon==='magnet'?'Mouse2':'Mouse0']);g.step(weapon==='cannon'?1/60:.15);g.setInput([]);g.step(.45);
    check(!q.shots.some(s=>s.torpedo),weapon+' did not intercept torpedo');check(q.p.hp===25,weapon+' interception still hurt player');intercept.push(weapon);
   }
   fixture(hunter,440,90,440,102);hunter.hp=0;
   q.shootEnemy(hunter,0,new T.Vector3(440,-23.4,50),new T.Vector3(440,-23.4,40),0,false,{torpedo:true,speed:12,range:30});g.step(.4);
   check(!q.shots.some(s=>s.torpedo),'Torpedo crossed the dry bank');
   fixture(pump,440,78,440,84);pump.phase='suction';pump.timer=2.8;pump.aim=0;
   const z=q.p.z;g.step(.35);check(q.p.z<z-.5&&q.p.hp===25,'Suction must move without damaging');
   pump.phase='bite';pump.timer=.6;g.step(.2);check(q.p.hp===25,'Bite damaged during its warning');
   g.scenario({player:{x:440,z:81,hp:25,invincible:0,hurtUntil:0}});pump.phase='bite';pump.timer=.02;pump.aim=0;g.step(.04);check(q.p.hp===20,'Bite does not deal exactly one segment');
   fixture(pump,440,78,440,84);pump.phase='suction';pump.timer=2.8;pump.aim=0;
   if(view==='third')g.look(0,0);
   g.setInput(view==='third'?['KeyD']:['KeyS','KeyD']);g.step(.8);g.setInput([]);
   check(Math.abs(q.p.x-440)>6&&q.p.hp===25,'Normal water steering could not escape suction sideways '+JSON.stringify({x:q.p.x,z:q.p.z,hp:q.p.hp,heading:q.p.heading,view:g.snapshot().camera}));
   fixture(pump,446,83,446,94);pump.phase='suction';pump.timer=2.8;pump.aim=0;const covered=q.p.z;g.step(.5);check(Math.abs(q.p.z-covered)<.001,'Suction passed through pier');
   fixture(pump,440,78,440,84);aim(pump.x,pump.y+1.5,pump.z);g.setInput(['Mouse2']);g.step(.85);g.setInput([]);
   check(pump.shieldRemoved&&pump.stunnedUntil>q.time,'Magnet did not tear grille and stop pump '+JSON.stringify({pull:pump.shieldPull,removed:pump.shieldRemoved,stun:pump.stunnedUntil,time:q.time,aim:q.aim.toArray(),magnetic:g.snapshot().magnetic,heat:q.p.heat,phase:pump.phase}));check(!pump.model.frontArmor.visible,'Removed grille is still visible');
   fixture(pump,440,78,440,88);pump.phase='suction';pump.timer=2.8;pump.aim=0;
   g.scenario({player:{weapon:'mortar'}});aim(pump.x,pump.y,pump.z);g.setInput(['Mouse0']);g.step(1/60);g.setInput([]);g.step(1.3);
   check(pump.hp<5&&pump.stunnedUntil>q.time,'Mortar did not interrupt suction');
   fixture(pump,451,76,440,84);pump.phase='suction';pump.timer=2.8;pump.aim=Math.atan2(-11,8);
   Object.assign(hunter,{x:440,y:-24,z:96,hp:hunter.max,phase:'warn',timer:1.2,aim:Math.PI,awake:true,lock:new T.Vector3(440,-23.4,84)});hunter.model.root.visible=true;g.step(.05);aim(451,-22.5,76);g.step(.01);
   return {view,intercept,pumpHp:pump.hp,errors:[]};
  },view);results.push(result);
  await page.screenshot({path:`output/playwright/regression/aquatic-${view}.png`});
 }
 const reset=await page.evaluate(()=>{const q=__game.debug;q.resetEnemies();const e=q.world.enemies.find(e=>e.id==='condensate-dredger');return {hp:e.hp,shield:e.shieldRemoved,visible:e.model.frontArmor.visible};});
 if(reset.hp!==5||reset.shield||!reset.visible)throw Error('Aquatic enemies did not reset');
 if(errors.length)throw Error(errors.join('\n'));return {results,errors};
}

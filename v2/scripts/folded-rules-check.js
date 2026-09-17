async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||m.type()==='warning'&&/THREE|WebGL/.test(m.text()))errors.push(m.text());});
 await page.route('**/src/folded.js*',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:await r.text()+`\nwindow.__rules={world,magneticBeam,shots,mines,layMine,shootEnemy,renderer,laserBeam,resetEnemies,clearShots};`});});
 await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test');await page.waitForFunction(()=>!!window.__rules);await page.unroute('**/src/folded.js*');
 await page.evaluate(()=>{__game.manual(true);for(const e of __rules.world.enemies){e.hp=0;e.deadAt=null;e.model.root.visible=false;}});
 async function fixture(player,state={}){await page.evaluate(({player,state})=>{__game.setInput([]);__rules.clearShots();__game.scenario({player:{hp:50,heat:0,overheated:false,lastHeat:-100,lastShot:-100,deployed:false,speed:1,...player},state});__game.step(.2);},{player,state});}
 async function aim(x,z,y){const q=await page.evaluate(([x,z,y])=>__game.project(x,z,y),[x,z,y]);await page.mouse.move(q.x,q.y);await page.evaluate(()=>__game.step(.01));}
 async function hold(button,seconds){await page.mouse.down({button});await page.evaluate(t=>__game.step(t),seconds);await page.mouse.up({button});}
 const result={};
 await fixture({x:0,y:-8,z:86,magnet:true});await aim(0,94,-6);await hold('right',.3);
 result.emptyMagnet=await page.evaluate(()=>({visible:__rules.magneticBeam.visible,pulses:__rules.magneticBeam.children.length,heat:__game.snapshot().player.heat}));if(!result.emptyMagnet.visible||result.emptyMagnet.pulses<5)throw Error('Empty magnetic scan invisible');
 await page.screenshot({path:'v2/output/playwright/rules-revision/magnet-empty.png'});
 await fixture({x:73,y:0,z:-14,magnet:true});await page.evaluate(()=>{const e=__rules.world.enemies.find(e=>e.id==='bench-guard');Object.assign(e,{x:73,y:0,z:-24,hp:3,phase:'idle',timer:10,shieldRemoved:false,shieldPull:0});e.model.root.visible=true;__game.step(.01);});
 await aim(73,-24,1.5);await hold('right',.35);await page.screenshot({path:'v2/output/playwright/rules-revision/magnet-shield.png'});await hold('right',.5);
 result.shield=await page.evaluate(()=>{const e=__rules.world.enemies.find(e=>e.id==='bench-guard');return {removed:e.shieldRemoved,visible:e.model.frontArmor.visible,phase:e.phase};});if(!result.shield.removed||result.shield.visible)throw Error('Blue shield did not detach');
 await fixture({x:73,y:0,z:-14,magnet:true},{'bench-cover':false});await aim(78.5,-23,2.4);await hold('right',.9);if(!(await page.evaluate(()=>__game.snapshot())).state['bench-cover'])throw Error('Blue cover did not move');result.cover=true;
 await fixture({x:0,y:-8,z:86,magnet:true});await page.evaluate(()=>__rules.layMine({id:'fixture',x:5,y:-8,z:86}));await aim(5,86,-7.7);await hold('right',.6);result.mine=await page.evaluate(()=>__rules.mines.length);if(result.mine)throw Error('Magnetic mine disarm failed');
 await fixture({x:0,y:-8,z:86,magnet:true,weapon:'cannon'});await page.evaluate(()=>__rules.layMine({id:'fixture',x:5,y:-8,z:86}));await aim(5,86,-7.7);await hold('left',.4);result.shotMine=await page.evaluate(()=>__rules.mines.length);if(result.shotMine)throw Error('Cannon cannot detonate a visible mine');
 await page.evaluate(()=>{for(const e of __rules.world.enemies){e.hp=0;e.model.root.visible=false;}});
 await fixture({x:202,y:16,z:78,magnet:true});
 const shell=await page.evaluate(()=>{const e=__rules.world.enemies.find(e=>e.type==='artillery');Object.assign(e,{x:202,y:16,z:69});e.lock=e.model.root.position.clone().set(202,16,78);__rules.shootEnemy(e);__game.step(.025);const s=__rules.shots[0];return {x:s.position.x,y:s.position.y,z:s.position.z};});
 await aim(shell.x,shell.z,shell.y);await hold('right',.04);result.shellCaptured=await page.evaluate(()=>!__rules.shots.some(s=>s.hostile));if(!result.shellCaptured)throw Error('Blue mortar shell cannot be captured');
 await fixture({x:0,y:-8,z:86});
 result.enemyBelt=await page.evaluate(()=>{const e=__rules.world.enemies.find(e=>e.type==='turret');Object.assign(e,{x:0,y:-8,z:67,hp:e.max,stunnedUntil:100000});e.model.root.visible=true;__game.step(.5,false);const live=e.z-67;e.hp=0;e.x=0;e.y=-8;e.z=67;__game.step(.5,false);return {live,wreck:e.z-67};});
 if(Math.abs(result.enemyBelt.live-3.9)>.01||Math.abs(result.enemyBelt.wreck-3.9)>.01)throw Error('Live enemy or wreck ignores conveyor');
 await fixture({x:216,y:24,z:-20,laser:true,weapon:'laser'},{gallery:false,'garden-optical':false,'mirror-index':false});await aim(216,-4,26);await hold('left',.5);
 result.singleMirror=await page.evaluate(()=>__game.snapshot().state.gallery);if(!result.singleMirror)throw Error('First visible mirror puzzle failed');if((await page.evaluate(()=>__game.snapshot())).state['garden-optical'])throw Error('Unaligned second mirror released the return');
 await page.screenshot({path:'v2/output/playwright/rules-revision/laser-first.png'});
 await fixture({x:238,y:24,z:-13,weapon:'cannon'});await aim(238,-4,25.3);await hold('left',.5);await page.evaluate(()=>__game.step(1.5));if(!(await page.evaluate(()=>__game.snapshot())).state['mirror-index'])throw Error('Mirror indexing mechanism failed');
 await fixture({x:216,y:24,z:-20,weapon:'laser'});await aim(216,-4,26);await hold('left',.5);
 result.twoMirrors=await page.evaluate(()=>({open:__game.snapshot().state['garden-optical'],segments:__game.snapshot().laserSegments.length/6}));if(!result.twoMirrors.open||result.twoMirrors.segments<3)throw Error('Two-mirror return puzzle failed '+JSON.stringify(result.twoMirrors));
 await page.screenshot({path:'v2/output/playwright/rules-revision/laser-second.png'});
 for(const [x,z]of [[232,-16],[238,-9.5],[232,6]]){await fixture({x,y:24,z,weapon:'laser'},{'garden-optical':false});await aim(232,-9.5,29.39411255);await hold('left',.3);if((await page.evaluate(()=>__game.snapshot())).state['garden-optical'])throw Error('Direct ray bypasses return mirror housing');}
 result.receiverScreen=true;
 await fixture({x:196,y:16,z:50,weapon:'laser'},{guardian:false});await page.evaluate(()=>{const e=__rules.world.enemies.find(e=>e.id==='guardian');e.hp=36;e.model.root.visible=true;e.timer=10;__game.step(.1);});await aim(202,64,18);await hold('left',.5);
 const frontal=await page.evaluate(()=>__rules.world.enemies.find(e=>e.id==='guardian').hp);await fixture({x:196,y:16,z:50,weapon:'laser'});await aim(222,50,18);await hold('left',1);
 result.boss=await page.evaluate(()=>({hp:__rules.world.enemies.find(e=>e.id==='guardian').hp,segments:__game.snapshot().laserSegments.length/6}));if(frontal!==36||result.boss.hp>=36)throw Error('Reflected rear attack does not beat protected front '+JSON.stringify({frontal,...result.boss}));
 await page.screenshot({path:'v2/output/playwright/rules-revision/laser-boss.png'});
 await page.evaluate(()=>{for(const e of __rules.world.enemies){e.hp=0;e.model.root.visible=false;}});
 await fixture({x:78,y:8,z:-71},{load:true,brake:true});
 result.lift=await page.evaluate(()=>{const l=__rules.world.lifts.find(l=>l.id==='carrier');l.y=l.destination=8;l.wait=0;const samples=[];for(let i=0;i<110;i++){__game.step(.2,false);samples.push(l.y);}return {min:Math.min(...samples),max:Math.max(...samples),changes:samples.filter((y,i)=>i&&Math.abs(y-samples[i-1])>.01).length,player:__game.snapshot().player.y};});
 if(result.lift.min!==8||result.lift.max!==16||result.lift.changes<25)throw Error('Activated lift did not keep cycling');
 const enemyResults=[];
 for(const type of ['scout','turret','guard','skirmisher','sniper','artillery','miner','welder','repairer','reflector']){
  await fixture({x:202,y:16,z:type==='welder'?72:78,weapon:'cannon',invincible:100000});
  const trace=await page.evaluate(type=>{
   const w=__rules.world;for(const e of w.enemies){e.hp=0;e.model.root.visible=false;}
   const e=w.enemies.find(e=>e.type===type&&!e.persistent);Object.assign(e,{x:202,y:16,z:63,hp:e.max,phase:'idle',timer:.2,stunnedUntil:0,shieldPull:0,shieldRemoved:false,encounter:'test',spawn:{x:202,y:16,z:63}});e.model.root.visible=true;
   let ally;if(type==='repairer'){ally=w.enemies.find(o=>o!==e&&o.type==='guard'&&!o.persistent);Object.assign(ally,{x:206,y:16,z:64,hp:1,max:3,encounter:'test',stunnedUntil:100000});ally.model.root.visible=true;}
   const phases=new Set(),start={x:e.x,z:e.z};let shots=0,mines=0,healed=1;
   for(let i=0;i<100;i++){__game.step(.1,false);phases.add(e.phase);shots=Math.max(shots,__rules.shots.filter(s=>s.hostile).length);mines=Math.max(mines,__rules.mines.length);if(ally)healed=Math.max(healed,ally.hp);}
   __game.step(0);return {type,phases:[...phases],shots,mines,healed,moved:Math.hypot(e.x-start.x,e.z-start.z),hp:__game.snapshot().player.hp};
  },type);
  const required={scout:'charge',turret:'warn',guard:'warn',skirmisher:'burst',sniper:'rail',artillery:'warn',miner:'warn',welder:'flame',repairer:'repair',reflector:'warn'}[type];
  if(!trace.phases.includes(required))throw Error('Enemy never used its distinct attack '+JSON.stringify(trace));if(type==='repairer'&&trace.healed<=1)throw Error('Repairer did not heal its living ally');if(type==='miner'&&!trace.mines)throw Error('Miner laid no mines');
  await page.screenshot({path:`v2/output/playwright/rules-revision/enemy-${type}.png`});enemyResults.push(trace);
 }
 result.enemies=enemyResults;
 const rail=[];
 for(const evade of [false,true]){
  await fixture({x:202,y:16,z:78,invincible:0});
  rail.push(await page.evaluate(evade=>{for(const e of __rules.world.enemies){e.hp=0;e.model.root.visible=false;}const e=__rules.world.enemies.find(e=>e.type==='sniper');Object.assign(e,{x:202,y:16,z:63,hp:e.max,phase:'warn',timer:.7,stunnedUntil:0});e.lock=e.model.root.position.clone().set(202,17.2,78);e.model.root.visible=true;__game.setInput(evade?['KeyS','KeyD']:[]);__game.step(.9);__game.setInput([]);return __game.snapshot().player.hp;},evade));
 }
 if(rail[0]!==39||rail[1]!==50)throw Error('Locked sniper rail is harmless or cannot be sidestepped '+JSON.stringify(rail));result.railCounterplay=rail;
 await fixture({x:202,y:16,z:69,invincible:0});
 result.flameDamage=await page.evaluate(()=>{for(const e of __rules.world.enemies){e.hp=0;e.model.root.visible=false;}const e=__rules.world.enemies.find(e=>e.type==='welder');Object.assign(e,{x:202,y:16,z:63,hp:e.max,phase:'flame',timer:1.8,aim:0,stunnedUntil:0});e.model.root.visible=true;__game.step(1.2);return {hp:__game.snapshot().player.hp,visible:e.flame.visible};});
 if(result.flameDamage.hp>=50||!result.flameDamage.visible)throw Error('Welder sweep lacks visible damaging flame');await page.screenshot({path:'v2/output/playwright/rules-revision/welder-sweep.png'});
 await page.evaluate(()=>__game.setInput([]));if(errors.length)throw Error(JSON.stringify(errors));return {...result,errors};
}

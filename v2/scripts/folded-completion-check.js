async page=>{
 const errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/src/folded.js*',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replace('let manual=false','let manual=true')+'\nwindow.__audit={world,scene,T,p,hitEnemy,audio};'});});
 await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test');await page.waitForFunction(()=>window.__audit);
 await page.evaluate(()=>localStorage.clear());await page.reload();await page.waitForFunction(()=>window.__audit);
 results.push(await page.evaluate(()=>{
  const g=__game,w=__audit.world;g.manual(true);const e=w.enemies.find(e=>e.id==='arsenal-0-skirmisher');
  g.scenario({enemies:Object.fromEntries(w.enemies.filter(o=>o!==e).map(o=>[o.id,0])),player:{x:e.x+7,y:e.y,z:e.z,magnet:true,heat:0,overheated:false,hp:50}});const x=e.x;
  g.aimAt(e.x,e.z,e.y+1.5);g.setInput(['Mouse2']);g.step(.65,false);g.setInput([]);
  if(e.x<x+1.5)throw Error('Light enemy was not pulled '+(e.x-x));
  // Damaging a nearly defeated unarmoured body must not play the armour sound.
  const sounds=[],event=__audit.audio.event;__audit.audio.event=n=>sounds.push(n);e.hp=.1;__audit.hitEnemy(e,1,new __audit.T.Vector3(e.x+5,e.y,e.z),'cannon');__audit.audio.event=event;
  if(sounds.includes('armor'))throw Error('Lethal ordinary hit still reports armour');return {pull:e.x-x,sounds};
 }));
 results.push(await page.evaluate(()=>{
  const g=__game,w=__audit.world,e=w.enemies.find(e=>e.id==='arsenal-5-turret');
  g.scenario({enemies:{[e.id]:4},player:{x:e.x+5,y:e.y,z:e.z,hp:50,heat:0,overheated:false,speed:1.6,overdrive:true,phoenix:false}});e.stunnedUntil=g.snapshot().time+5;
  g.setInput(['KeyW','KeyA','ShiftLeft']);g.step(.8,false);g.setInput([]);
  const p=g.snapshot().player;if(e.hp>=4||e.hp<=0||Math.hypot(p.x-e.x,p.z-e.z)<e.radius+.79)throw Error('Ordinary ram/body blocking failed '+JSON.stringify({hp:e.hp,p}));
  return {ordinaryRamHp:e.hp,separation:Math.hypot(p.x-e.x,p.z-e.z)};
 }));
 results.push(await page.evaluate(()=>{
  const g=__game,w=__audit.world;g.scenario({player:{x:110,y:-24,z:24,hp:50,heat:0,overheated:false,lastShot:-100,lastHeat:-100,weapon:'cannon'},state:{maintenance:false,'maintenance-started':false}});
  g.aimAt(110,30,-22.1);g.setInput(['Mouse0']);g.step(.1,false);g.setInput([]);g.step(1,false);
  if(!g.snapshot().state['maintenance-started'])throw Error('Maintenance brake not hittable');
  g.scenario({player:{x:106,y:-24,z:26}});g.step(25,false);g.save();
  if(!g.snapshot().state.maintenance)throw Error('Delivery did not arrive');return {delivery:w.sidePuzzles.delivery.position};
 }));
 await page.reload();await page.waitForFunction(()=>window.__audit);
 if(!await page.evaluate(()=>__game.snapshot().state.maintenance&&__audit.world.sidePuzzles.delivery.complete))throw Error('Delivery state not restored');
 results.push(await page.evaluate(()=>{
  const g=__game,w=__audit.world,e=w.enemies.find(e=>e.id==='sorter');g.manual(true);
  // Stand on the exposed east flank; the central lane can now jam the arm on its cover.
  g.scenario({enemies:Object.fromEntries(w.enemies.filter(o=>o!==e).map(o=>[o.id,0])),player:{x:141,y:24,z:-114,hp:50,heat:0,overheated:false,lastShot:-100,lastHeat:-100,weapon:'cannon',invincible:0}});
  const phases=new Set();for(let i=0;i<80;i++){g.step(.1,false);phases.add(e.phase);}if(!phases.has('sweep')||!phases.has('vent'))throw Error('Sorter never attacked '+[...phases]);
  if(g.snapshot().player.hp>=50)throw Error('Stationary hull ignored physical sweep');
  e.phase='vent';e.timer=20;g.scenario({player:{x:130,y:24,z:-109,hp:50,heat:0,overheated:false,lastShot:-100,lastHeat:-100}});g.aimAt(e.x,e.z,e.y+1.5);const before=e.hp;g.setInput(['Mouse0']);g.step(.1,false);g.setInput([]);g.step(1,false);if(e.hp>=before)throw Error('Exposed sorting drive cannot be hit');g.step(0);
  const damage=before-e.hp,sounds=[],event=__audit.audio.event;e.phase='idle';e.timer=20;e.stunnedUntil=g.snapshot().time+2;
  g.scenario({player:{weapon:'laser',laser:true,heat:0,overheated:false}});__audit.audio.event=n=>sounds.push(n);g.setInput(['Mouse0']);g.step(.8,false);g.setInput([]);__audit.audio.event=event;
  const armorSounds=sounds.filter(n=>n==='armor').length;if(!armorSounds||armorSounds>7||e.hp!==before-damage)throw Error('Closed sorting armour laser feedback failed '+JSON.stringify({armorSounds,hp:e.hp}));
  return {phases:[...phases],damage,armorSounds};
 }));
 results.push(await page.evaluate(()=>{
  const g=__game,w=__audit.world,e=w.enemies.find(e=>e.id==='sorter'),c=w.sidePuzzles.targets.find(t=>t.id==='sorting-cover');e.stunnedUntil=g.snapshot().time+10;
  const before=c.x;g.scenario({player:{x:c.x+6,y:24,z:-101,magnet:true,heat:0,overheated:false,weapon:'laser',laser:true,hp:50}});
  g.aimAt(c.x,c.z,c.y);g.setInput(['Mouse2']);g.step(.8,false);g.setInput([]);g.step(.1,false);if(c.x<before+2)throw Error('Rail cover did not move');
  const sounds=[],event=__audit.audio.event;__audit.audio.event=n=>sounds.push(n);g.aimAt(c.x,c.z,c.y);g.setInput(['Mouse0']);g.step(1,false);g.setInput([]);__audit.audio.event=event;
  if(sounds.filter(n=>n==='armor').length>9)throw Error('Rejected laser plays armour sound every frame');g.save();return {coverShift:c.x-before,armorSounds:sounds.filter(n=>n==='armor').length,coverX:g.snapshot().state.sidePuzzles.coverX};
 }));
 await page.screenshot({path:'v2/output/playwright/completion/sorter-overhead.png'});
 await page.reload();await page.waitForFunction(()=>window.__audit);const savedCover=await page.evaluate(()=>__game.snapshot().state.sidePuzzles.coverX);if(savedCover!==results.at(-1).coverX)throw Error('Magnetic cover arrangement not saved');
 await page.unroute('**/src/folded.js*');if(errors.length)throw Error(errors.join('\n'));return {results,errors};
}

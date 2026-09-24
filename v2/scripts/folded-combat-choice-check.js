async page=>{

 await page.goto('http://127.0.0.1:5174/?chapter=folded&test&manual&view=overhead');await page.waitForFunction(()=>window.__game?.debug);
 const result=await page.evaluate(()=>{
  const a=__game.debug,g=__game,runs=[];
  for(const weapon of ['mortar','cannon']){
   a.resetEnemies();a.clearShots();for(const e of a.world.enemies){e.hp=0;e.model.root.visible=false;}
   const e=a.world.enemies.find(e=>e.type==='skirmisher');Object.assign(e,{x:202,y:16,z:70,hp:3,phase:'idle',timer:.2,spawn:{x:202,y:16,z:70},stunnedUntil:0,awake:true});e.model.root.visible=true;
   g.scenario({player:{x:202,y:16,z:54,hp:50,heat:0,overheated:false,weapon,mortar:true,laser:true,shotCooldown:0},state:{guardian:false}});g.step(.02);const start={x:e.x,z:e.z};
   const flight=Math.hypot(e.x-a.p.x,e.z-a.p.z)/38,angle=Math.atan2(a.p.x-e.x,a.p.z-e.z)+(e.id.length%2?1:-1)*Math.PI/2;
   // Lead a moving target with Cannon; Mortar deliberately tests its old position.
   g.aimAt(e.x+(weapon==='cannon'?Math.sin(angle)*6.2*flight:0),e.z+(weapon==='cannon'?Math.cos(angle)*6.2*flight:0),e.y+.3);g.fire();g.setInput([]);g.step(1.3);runs.push({weapon,hp:e.hp,moved:Math.hypot(e.x-start.x,e.z-start.z)});
  }
  a.resetEnemies();a.clearShots();for(const e of a.world.enemies){e.hp=0;e.model.root.visible=false;}
  const e=a.world.enemies.find(e=>e.id==='guardian');e.hp=e.max;e.model.root.visible=true;
  g.scenario({player:{x:202,y:16,z:54,hp:50,heat:0,overheated:false,weapon:'laser',laser:true},state:{guardian:false}});g.step(.05);
  const before=e.hp;g.aimAt(214,54,18);g.setInput(['Mouse0']);g.step(.3);g.setInput([]);return {runs,guardian:{before,after:e.hp,segments:g.snapshot().laserSegments}};
 });await page.screenshot({path:'output/playwright/overhaul/guardian-reflection.png'});result.repairs=await page.evaluate(()=>{
  const a=__game.debug,g=__game,runs=[];
  for(const district of ['arsenal','lens','coolant','hearth']){
   a.resetEnemies();a.clearShots();const healer=a.world.enemies.find(e=>e.id.startsWith(district+'-')&&e.type==='repairer'),ally=a.world.enemies.find(e=>e.type==='guard'&&e.encounter===healer.encounter);
   for(const e of a.world.enemies){e.hp=0;e.model.root.visible=false;}
   Object.assign(healer,{hp:healer.max,awake:true,phase:'idle',timer:.01});Object.assign(ally,{hp:1,awake:true,stunnedUntil:100000});healer.model.root.visible=ally.model.root.visible=true;
   g.scenario({player:{x:healer.x+8,y:healer.y,z:healer.z,hp:50,heat:0,weapon:'cannon'}});g.setInput([]);g.step(6,false);runs.push({district,hp:ally.hp,healerPhase:healer.phase});
  }return runs;
 });if(result.repairs.some(r=>r.hp<=1.5))throw Error('Repair support cannot reach its ally '+JSON.stringify(result.repairs));if(result.runs[0].hp!==3||result.runs[1].hp!==2||result.runs.some(r=>r.moved<4)||result.guardian.after>=result.guardian.before||result.guardian.segments.length<18)throw Error(JSON.stringify(result));return result;
}

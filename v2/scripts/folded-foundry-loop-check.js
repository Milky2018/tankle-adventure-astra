// Isolated collision and conveyor fixtures; these do not represent a playthrough.
async page=>{
 const errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:5174/?chapter=folded&test&manual');await page.waitForFunction(()=>window.__game?.debug);
 for(const view of ['overhead','third']){
  results.push(await page.evaluate(view=>{
   const g=__game,q=g.debug,check=(ok,msg)=>{if(!ok)throw Error(`${view}: ${msg}`);};
   g.manual(true);q.setCameraView(view);g.setInput([]);
   g.scenario({enemies:Object.fromEntries(g.snapshot().enemies.map(e=>[e.id,0])),state:{prototype:false,'overdrive-return':false},player:{x:-40,y:-34/3,z:70,overdrive:false,heat:0,speed:1}});
   if(view==='third')g.look(0,0);
   const keys=(x,z)=>view==='overhead'?(x?x>0?['KeyS','KeyD']:['KeyW','KeyA']:z>0?['KeyS','KeyA']:['KeyW','KeyD']):(x?x>0?['KeyA']:['KeyD']:z>0?['KeyW']:['KeyS']);
   function drive(x,z,seconds,boost=false){g.setInput(x||z?[...keys(x,z),...boost?['ShiftLeft']:[]]:[]);g.step(seconds,false);g.setInput([]);}
   drive(0,0,1.2);check(q.p.z<64&&q.p.y<-13.3,'Passive entry does not carry downhill');
   drive(0,1,3);check(q.p.z<64.5,'Ordinary reverse movement escaped');
   g.scenario({player:{x:-40,y:-12,z:68}});drive(1,0,2);check(q.p.x<-34.9,'Return rail can be crossed sideways');
   g.scenario({player:{x:-28,y:-16,z:60}});drive(0,1,8);check(q.p.z<116,'Return shutter admits a premature Boss approach');
   g.scenario({state:{prototype:true,'overdrive-return':true},player:{x:-28,y:-16,z:122,overdrive:true,heat:0,speed:1}});
   drive(0,-1,4);check(q.p.z>103,'Short reverse lesson can be walked');
   function reach(x,z,boost=true){for(let i=0;i<900&&Math.hypot(q.p.x-x,q.p.z-z)>.35;i++){
    const dx=x-q.p.x,dz=z-q.p.z;drive(Math.abs(dx)>Math.abs(dz)?Math.sign(dx):0,Math.abs(dx)>Math.abs(dz)?0:Math.sign(dz),1/60,boost);
   }check(Math.hypot(q.p.x-x,q.p.z-z)<.5,`Return blocked at ${q.p.x},${q.p.y},${q.p.z}`);}
   reach(-28,100);check(q.p.y===-16,'First lesson is not level');reach(-28,52,false);reach(-40,52,false);reach(-40,86);reach(0,86,false);check(q.p.y===-8,'Return reached another floor');
   for(const e of q.world.enemies.filter(e=>e.encounter==='prototype-approach')){
    Object.assign(e,e.spawn);
    for(let i=0;i<600;i++)q.moveEnemy(e,Math.atan2(-28-e.x,124-e.z),6,1/60);
    check(e.x<=-52&&e.z<=112,'Workshop enemy pursued into the Boost lesson');
    const from=new q.T.Vector3(-52,-14.5,112),to=new q.T.Vector3(-28,-14.8,124),dir=to.clone().sub(from);
    check(q.world.cast(from,dir.clone().normalize(),dir.length(),{targets:false}),'Workshop boundary exposes the engine cradle to fire');
   }
   g.step(.1);q.draw();return {view,passiveEntry:true,noOrdinaryReturn:true,solidRail:true,sealedBeforeVictory:true,boostLoop:true,shelteredCradle:true};
  },view));
  await page.screenshot({path:`v2/output/playwright/regression/foundry-loop-${view}.png`});
  for(const location of ['shared-ramp','level-return']){
   await page.evaluate(({view,location})=>{const g=__game;g.scenario({player:location==='shared-ramp'?{x:-40,y:-13.3333333333,z:64}:{x:-28,y:-16,z:108}});if(view==='third')g.look(location==='shared-ramp'?0:Math.PI,.15);g.step(1);g.debug.draw();if(location==='shared-ramp'){const belt=g.debug.world.occluders.find(o=>o.owner?.beltSurface?.id==='foundry-entry');if(belt.opacity<.95)throw Error('The supporting conveyor fades like an overhead obstruction');}},{view,location});
   await page.screenshot({path:`v2/output/playwright/regression/foundry-${location}-${view}.png`});
  }
 }
 if(errors.length)throw Error(errors.join('\n'));return {fixture:true,results,errors};
}

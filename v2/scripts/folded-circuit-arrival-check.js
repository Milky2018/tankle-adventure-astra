async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');
 await page.waitForFunction(()=>window.__game?.debug);
 const result=await page.evaluate(async()=>{
  const g=__game,a=g.debug;g.manual(true);g.setInput([]);
  const {activeSolid,initialFoldedState}=await import('/src/folded-layout.js');
  const {circuitReady,circuitTargetKey,createCircuitSignals}=await import('/src/folded-circuits.js');
  const {stepLifts}=await import('/src/folded-machinery.js');
  const check=(ok,message)=>{if(!ok)throw Error(message);};
  g.scenario({player:{x:218,y:16,z:70,hp:25},state:{guardian:false,combatArena:null},enemies:Object.fromEntries(a.world.enemies.map(e=>[e.id,0]))});
  delete a.state.pendingSignals.guardian;a.progression.advance(0,a.time);
  a.progression.complete('guardian',a.time);
  const feeds=a.world.controlFeeds.filter(f=>f.id==='guardian').sort((a,b)=>a.duration-b.duration),start=a.time;
  const pending=a.progression.signals.pending('guardian');check(!!pending,'Boss victory did not start its circuits');
  check(feeds[0].duration<feeds.at(-1).duration,'Guardian destinations still share one duration');
  const timings=[];
  for(const feed of feeds){
   const before=feed.duration-.01;
   if(a.time-start<before)g.step(before-(a.time-start));
   check(feed.lamps.at(-1).color.getHexString()==='f3d250','Endpoint turned green before arrival');
   check(!circuitReady(a.state,'guardian',feed),'Destination activated early');
   g.step(feed.duration+.001-(a.time-start));
   check(feed.lamps.at(-1).color.getHexString()==='85db58','Arrived endpoint did not turn green');
   check(circuitReady(a.state,'guardian',feed),'Destination still waiting after arrival');
   const wall=a.world.walls.find(w=>circuitTargetKey(w)===feed.targetKey);
   if(wall){check(!activeSolid(wall,a.state),'Door collision outlasted its signal');check(wall.open>0,'Door animation did not start on arrival');}
   const lift=a.world.lifts.find(l=>circuitTargetKey(l)===feed.targetKey);
   if(lift){const old=lift.wait;stepLifts([lift],a.state,{x:-1000,y:0,z:-1000},.05);check(lift.wait!==old||lift.y!==lift.stops[0],'Powered lift did not start');}
   if(a.progression.signals.pending('guardian')){
    const restored=initialFoldedState(JSON.parse(JSON.stringify(a.state)));
    createCircuitSignals(restored,[]);
    check(circuitReady(restored,'guardian',feed),'Arrived destination closed after restoring save');
    const later=feeds.find(f=>f.duration>feed.duration+.01);
    if(later)check(!circuitReady(restored,'guardian',later),'Distant destination opened early after restoring save');
   }
   timings.push({target:feed.target,key:feed.targetKey,seconds:feed.duration});
  }
  check(!a.progression.signals.pending('guardian'),'Completed signal was not retired');
  return {timings,method:'Real Boss-victory signal path, rendered endpoint colors, door collision, lift cycle and partial-save restoration; combat disabled.'};
 });
 if(errors.length)throw Error(errors.join('\n'));return {...result,errors};
}

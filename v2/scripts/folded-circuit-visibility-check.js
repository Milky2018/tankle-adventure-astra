async page => {
 await page.goto('http://127.0.0.1:5174/');await page.evaluate(()=>localStorage.clear());
 await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');
 await page.waitForFunction(()=>window.__game?.debug);
 return await page.evaluate(async()=>{
  const g=__game,a=g.debug,L=await import('/src/folded-layout.js'),{stepLifts}=await import('/src/folded-machinery.js');
  g.manual(true);g.setInput([]);const enemies=Object.fromEntries(a.world.enemies.map(e=>[e.id,0]));
  const check=(ok,message)=>{if(!ok)throw Error(message);};
  const colors=id=>{const out=[];a.scene.getObjectByName('side-circuit:'+id).traverse(m=>{if(m.isMesh)out.push(m.material.color.getHexString());});return new Set(out);};
  g.scenario({player:{x:-166,y:8,z:-87,hp:25,heat:0,overheated:false,shotCooldown:0,weapon:'cannon'},enemies});
  const t=a.world.sidePuzzles.targets.find(t=>t.id==='rail-a');g.aimAt(t.x,t.z,t.y);g.setInput(['Mouse0']);g.step(.3,false);g.setInput([]);g.step(2,false);
  check(a.world.sidePuzzles.rail.state.switches[0],'Cannon did not turn the track');check(colors('rail-a').has('85db58')&&!colors('rail-a').has('f3d250'),'Actual rail cable material did not become green');
  const side=a.world.sidePuzzles,far={x:10000,y:0,z:10000};
  check(side.act('rail-a'),'Second rail hit rejected');side.update(2,far,[]);check(!side.rail.state.switches[0]&&colors('rail-a').has('f3d250'),'Repeated rail operation did not return the line to yellow');
  for(const id of ['rail-b','gutter-a','gutter-b','gutter-b','gutter-plug']){check(side.act(id),`${id} rejected`);side.update(2,far,[]);}
  for(const id of ['rail-b','gutter-a','gutter-b','gutter-plug'])check(colors(id).has('85db58'),`${id} rendered cable not green`);
  side.rail.state.moving=true;check(side.act('rail-signal'),'Recall rejected');side.update(2,far,[]);
  check(colors('rail-signal').has('85db58')===!!(side.rail.state.moving||side.rail.state.solved),'Recall cable does not reflect the drive state');
  const connections=a.world.controlFeeds;
  for(const lift of a.world.lifts)check(connections.some(f=>f.target===lift.id),`${lift.id} has no feed`);
  for(const c of a.world.controls.filter(c=>c.mount&&!c.slide)){
   check(c.localLamps.length>0,`${c.id} has no embedded door feed`);c.root.updateWorldMatrix(true,true);
   c.root.traverse(m=>{if(m.name!=='circuit-segment')return;const start=m.position.clone().set(0,0,-.5),end=start.clone().set(0,0,.5);m.localToWorld(start);m.localToWorld(end);check(end.sub(start).toArray().filter(v=>Math.abs(v)>1e-7).length===1,`${c.id} has an inclined embedded cable`);});
  }
  for(const f of connections)for(let i=1;i<f.points.length;i++)check(f.points[i].filter((v,j)=>Math.abs(v-f.points[i-1][j])>1e-7).length===1,`${f.id} has a diagonal cable`);
  const timings=[];
  for(const id of [...new Set(connections.map(f=>f.id))].filter(id=>!['cargo-battery','inner-thermal','sorter','guardian','rail-crossing','coolant-return'].includes(id))){
    a.state[id]=false;delete a.state.pendingSignals[id];if(id==='maintenance')a.state['maintenance-started']=false;
    const control=L.foldedControls.find(c=>c.id===id);
    const changes=Object.fromEntries((control?.effects||[id]).map(key=>[key,true]));
    for(const key of Object.keys(changes))a.state[key]=false;
    if(control?.requires)a.state[control.requires]=true;
    const player={...a.p,...control?.pressure,magnet:true};
    const started=0;
    const accepted=control?a.progression.activate(id,control.weapons?.[0]||(control.kind==='shot'?'cannon':control.kind),player,started):a.progression.complete(id,started,{delayed:true});
    check(accepted,`${id} refused signal`);
    const duration=a.progression.signals.duration(id);a.progression.advance(duration*.5,started+duration*.5);a.world.update(.01,started+duration*.5,a.p,a.camera);
    check(id==='maintenance'?!a.state['maintenance-started']:!a.state[id],`${id} activated before arrival`);
    const f=connections.filter(f=>f.id===id).sort((a,b)=>b.duration-a.duration)[0];check(f.lamps.some(l=>l.color.getHexString()==='85db58')&&f.lamps.some(l=>l.color.getHexString()==='f3d250'),`${id} did not show a traveling front`);
    a.progression.advance(duration*.5+.05,started+duration+.05);a.world.update(.01,started+duration+.05,a.p,a.camera);
    check(Object.entries(changes).every(([k,v])=>a.state[k]===v),`${id} failed to activate`);
    if(id==='maintenance')check(a.world.controls.find(c=>c.id===id).lamp.material.color.getHexString()==='85db58','Maintenance control reverted to yellow after its drive started');
    for(const feed of connections.filter(f=>f.id===id))check(feed.lamps.every(l=>l.color.getHexString()==='85db58'),`${id} retained yellow lamps after arrival: ${JSON.stringify({duration,feedDuration:feed.duration,resting:feed.resting,colors:feed.lamps.map(l=>[l.progress,l.color.getHexString()]),pending:a.progression.signals.pending(id)})}`);
    timings.push({id,duration});
  }
  a.state['coolant-return']=false;a.progression.complete('coolant-return',a.time);
  check(a.progression.signals.pending('coolant-return'),'Broken barrier did not send lift power');
  const lift=a.world.lifts.find(l=>l.id==='coolant-maintenance-bridge');lift.y=lift.stops[1];const before=lift.y;stepLifts([lift],a.state,far,1);check(lift.y===before,'Lift moved before its power arrived');
  a.progression.advance(a.progression.signals.duration('coolant-return'),a.time+10);stepLifts([lift],a.state,far,1);check(lift.y<before,'Lift did not move after power arrived');
  const local=a.state.bodies.solids.find(s=>s.localControl==='magnet');a.state.magnet=false;delete a.state.pendingSignals.magnet;
  a.progression.activate('magnet','magnet',{...a.p,magnet:true},a.time);check(L.activeSolid(local,a.state),'Local door opened before its short cable');a.progression.advance(.19,a.time);check(!L.activeSolid(local,a.state),'Local door still closed after its short cable');
  return {actualCannon:true,repeatedRail:true,sideCables:6,remoteSources:timings.length,remoteBranches:connections.length,lifts:a.world.lifts.length,localFeeds:a.world.controls.filter(c=>c.localLamps.length).length,automaticLiftTiming:true,localDoorTiming:true,timings,method:'Actual Cannon rail input; isolated signal-pipeline and render checks for every remote source; lift timing through stepLifts'};
 });
}

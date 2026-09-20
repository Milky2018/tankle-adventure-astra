async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5174/?chapter=folded&test&manual');await page.waitForFunction(()=>window.__game?.debug);
 const results=await page.evaluate(()=>{
  const g=__game,q=g.debug,w=q.world,check=(ok,msg)=>{if(!ok)throw Error(msg);};g.manual(true);q.setCameraView('overhead');
  const natives=w.enemies.filter(e=>['hunter','dredger'].includes(e.type));
  const original=new Map(natives.map(e=>[e.id,{...e.spawn}]));
  function reset(ids,x,y,z){
   q.clearShots();g.setInput([]);for(const e of w.enemies){e.hp=0;e.model.root.visible=false;}
   g.scenario({player:{x,y,z,hp:25,invincible:0,hurtUntil:0,knockX:0,knockZ:0,weapon:'cannon',heat:0,lastHeat:-100,lastShot:-100,overheated:false,flotation:true,deployed:true,afloat:true,magnet:false,mortar:false,laser:false}});
   for(const e of natives)if(ids.includes(e.id)){Object.assign(e,original.get(e.id),{hp:e.max,phase:'idle',timer:1,awake:true,alertUntil:0,lastSeen:null,shieldRemoved:false,shieldPull:0,stunnedUntil:0,swimWaypoint:0,travelHeading:null});e.model.root.visible=true;}
  }
  function moveKeys(x,z){const dx=x-q.p.x,dz=z-q.p.z;return Math.hypot(dx,dz)<.45?[]:Math.abs(dx)>Math.abs(dz)?dx>0?['KeyS','KeyD']:['KeyW','KeyA']:dz>0?['KeyS','KeyA']:['KeyW','KeyD'];}
  reset(natives.map(e=>e.id),-164,-8,64);
  for(let i=0;i<300&&q.p.x<-146.5;i++){g.setInput(moveKeys(-146,64));g.step(1/60,false);}
  check(q.p.x>-147&&q.p.hp===25,'First crossing became unsafe');
  check(!q.shots.some(s=>s.torpedo),'Water enemies fire into first crossing');
  const calm={x:q.p.x,hp:q.p.hp};
  // Real encounter positions; normal weapons, heat and health, with no Boost or invulnerability.
  const fights=[];
  for(const c of [
   {ids:['reservoir-patrol-hunter'],start:[-124,-8,40],orbit:[[-124,36],[-108,36],[-108,54],[-124,54]]},
   {ids:['reservoir-pump-dredger'],start:[-140,-8,78],orbit:[[-145,78],[-124,78],[-124,99],[-145,99]]},
   {ids:['condensate-hunter','condensate-dredger'],start:[436,-24,96],orbit:[[436,96],[460,96],[460,72],[436,72]]},
  ]){
   reset(c.ids,...c.start);let corner=0;const phases=new Set();const start=q.time;
   for(let i=0;i<45*30&&q.p.hp>0&&c.ids.some(id=>w.enemies.find(e=>e.id===id).hp>0);i++){
    if(Math.hypot(q.p.x-c.orbit[corner][0],q.p.z-c.orbit[corner][1])<.7)corner=(corner+1)%c.orbit.length;
    const keys=moveKeys(...c.orbit[corner]);
    const alive=natives.filter(e=>c.ids.includes(e.id)&&e.hp>0).sort((a,b)=>Math.hypot(a.x-q.p.x,a.z-q.p.z)-Math.hypot(b.x-q.p.x,b.z-q.p.z));
    for(const e of alive)phases.add(e.type+':'+e.phase);
    const e=alive[0];if(e){g.aimAt(e.x,e.z,e.y+1.5);keys.push('Mouse0');}
    g.setInput(keys);g.step(1/30,false);
   }
   g.setInput([]);const won=c.ids.every(id=>w.enemies.find(e=>e.id===id).hp<=0);
   const result={ids:c.ids,won,hp:q.p.hp,seconds:q.time-start,phases:[...phases],enemies:natives.filter(e=>c.ids.includes(e.id)).map(e=>({id:e.id,hp:e.hp,x:e.x,z:e.z}))};
   check(won&&q.p.hp>0,'Water encounter failed '+JSON.stringify(result));fights.push(result);
  }
  // The amphibious hunter actually follows onto a low bank; the pump cannot.
  reset(['condensate-hunter'],440,-24,44);const hunter=w.enemies.find(e=>e.id==='condensate-hunter');
  Object.assign(hunter,{x:440,y:-24,z:53,phase:'idle',timer:1,alertUntil:q.time+8,lastSeen:{x:440,y:-24,z:44}});hunter.spawn={x:440,y:-24,z:53};
  g.step(3,false);check(!hunter.afloat&&hunter.z<48,'Hunter did not follow onto dry bank');
  g.step(4,false);check(q.shots.some(s=>s.owner===hunter.id&&!s.torpedo)||hunter.phase==='vent','Hunter never switched to land gunfire');
  return {calm,fights,shore:{x:hunter.x,z:hunter.z,afloat:hunter.afloat}};
 });
 if(errors.length)throw Error(errors.join('\n'));return {...results,errors};
}

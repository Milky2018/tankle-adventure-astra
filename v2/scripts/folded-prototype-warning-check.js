async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error'||m.type()==='warning'&&m.text().includes('BufferGeometry'))errors.push(m.text());});
 await page.goto('http://127.0.0.1:5174/?chapter=folded&test&manual');await page.waitForFunction(()=>window.__game?.debug);
 const results=[];
 for(const view of ['overhead','third']){
  results.push(await page.evaluate(view=>{
   const g=__game,q=g.debug,w=q.world,T=q.T,check=(ok,msg)=>{if(!ok)throw Error(msg);};
   g.manual(true);q.setCameraView(view);g.look(Math.PI,.267);
   g.scenario({state:{prototype:false,combatArena:'prototype'},enemies:Object.fromEntries(w.enemies.map(e=>[e.id,e.id==='prototype'?9:0])),player:{x:-30,y:-16,z:138,hp:25,invincible:1e9}});
   const e=w.enemies.find(e=>e.id==='prototype'),geometry=__game.debug.world.views.enemy(e).warning.geometry,position=geometry.getAttribute('position');
   Object.assign(e,{x:-30,y:-16,z:126,awake:true,phase:'warn',attack:'cannon',timer:1,lock:new T.Vector3(-30,-14.8,138)});
   function cannon(){
    e.phase='warn';e.attack='cannon';e.timer=1;g.step(1/60);
    check(__game.debug.world.views.enemy(e).warning.visible&&geometry.drawRange.count===9,'Cannon fan must be visible');
    check(position.count>=geometry.drawRange.count,`Warning overflow: ${geometry.drawRange.count} vertices in a ${position.count}-vertex buffer`);
    const angles=[];
    for(let i=0;i<3;i++){
     const a=new T.Vector3().fromBufferAttribute(position,i*3),b=new T.Vector3().fromBufferAttribute(position,i*3+1),c=new T.Vector3().fromBufferAttribute(position,i*3+2);
     check(a.distanceTo(c)<.001&&a.distanceTo(b)>1,'Each warning ray must extend and return to its origin');
     const direction=b.sub(a).normalize(),expected=e.lock.clone().sub(a).normalize().applyAxisAngle(new T.Vector3(0,1,0),(i-1)*.18);
     check(direction.distanceTo(expected)<.001,'Warning ray differs from the cannon spread');angles.push(Math.atan2(direction.x,direction.z));
    }
    check(geometry===__game.debug.world.views.enemy(e).warning.geometry&&position===geometry.getAttribute('position'),'Warning should reuse its buffer');return angles;
   }
   const angles=cannon();g.step(1.01);
   check(e.phase==='vent'&&q.shots.filter(s=>s.hostile&&s.owner===e.id).length===3,'Cannon volley changed');
   q.clearShots();e.phase='warn';e.attack='charge';e.timer=1;g.step(1/60);
   check(geometry.drawRange.count===2&&__game.debug.world.views.enemy(e).charge.root.visible,'Charge warning retained stale fan vertices');
   for(let i=0;i<3;i++)cannon();
   return {view,vertices:position.count,drawCount:geometry.drawRange.count,angles};
  },view));
  await page.screenshot({path:`output/playwright/prototype-warning-${view}.png`});
 }
 if(errors.length)throw Error(errors.join('\n'));return {results,errors};
}

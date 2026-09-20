async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));const results=[];
 for(const [name,y,orbit]of [
  ['crash-range',16,[[240,-220],[252,-220],[260,-220],[260,-238],[248,-238],[248,-220]]],
  ['mirror-workshop',24,[[414,-92],[414,-118],[412,-118],[414,-118]]],
  ['condensate',-24,[[414,104],[414,92],[412,92],[414,92]]],
 ]){
  await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');await page.waitForFunction(()=>window.__game?.debug);
  results.push(await page.evaluate(({name,y,orbit})=>{
   const g=__game,a=g.debug;g.manual(true);const squad=a.world.enemies.filter(e=>e.encounter===name);
   g.scenario({enemies:Object.fromEntries(a.world.enemies.map(e=>[e.id,squad.includes(e)?e.max:0])),player:{x:orbit[0][0],y,z:orbit[0][1],hp:25,invincible:0,mortar:true,magnet:true,overdrive:true,heat:0,speed:1,deployed:false}});
   let corner=1;const start=a.time,active=new Set(),damage=[];
   for(let i=0;i<5400&&a.p.hp>0&&squad.some(e=>e.hp>0);i++){
    const p=a.p,alive=squad.filter(e=>e.hp>0).sort((a,b)=>(a.type==='repairer'?-1:b.type==='repairer'?1:0)||Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z)),target=alive[0];
    if(Math.hypot(p.x-orbit[corner][0],p.z-orbit[corner][1])<.5)corner=(corner+1)%orbit.length;
    const dx=orbit[corner][0]-p.x,dz=orbit[corner][1]-p.z,keys=Math.abs(dx)>Math.abs(dz)?dx>0?['KeyS','KeyD']:['KeyW','KeyA']:dz>0?['KeyS','KeyA']:['KeyW','KeyD'];
    p.weapon=['reflector','turret'].includes(target.type)||Math.hypot(target.x-p.x,target.z-p.z)>23?'mortar':'cannon';g.aimAt(target.x,target.z,target.y+1.5);keys.push('Mouse0');const hp=p.hp;g.setInput(keys);g.step(1/60,false);if(hp>p.hp)damage.push(hp-p.hp);
    for(const e of squad)if(['warn','burst','flame','rail','charge'].includes(e.phase))active.add(e.id);
   }
   g.setInput([]);g.step(.02);return {name,won:squad.every(e=>e.hp<=0),hp:a.p.hp,seconds:a.time-start,active:[...active],damage,squad:squad.map(e=>({id:e.id,hp:e.hp}))};
  },{name,y,orbit}));
 }
 const mine=await page.evaluate(()=>{
  const g=__game,a=g.debug;g.scenario({enemies:Object.fromEntries(a.world.enemies.map(e=>[e.id,0])),player:{x:252,y:16,z:-232,hp:25,invincible:0}});g.setInput([]);a.layMine({id:'damage-check',x:252,y:16,z:-232});g.step(2.1);if(a.p.hp!==20)throw Error('Mine should remove one segment: '+a.p.hp);return {damage:25-a.p.hp};
 });
 if(errors.length||results.some(r=>!r.won||!r.active.length||r.damage.some(d=>d!==5&&d!==10)))throw Error(JSON.stringify({results,errors}));
 return {results,mine,errors,scope:'25 starting HP, earned Cannon/Mortar/Magnet, no upgrades or invulnerability; other districts disabled.'};
}

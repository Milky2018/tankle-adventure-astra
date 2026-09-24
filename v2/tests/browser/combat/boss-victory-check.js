async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));

  await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');await page.waitForFunction(()=>window.__game?.debug);
  // Guardian reflection and committed-attack dodges are exercised by laser-readability.
  const runs=[];
  for(const [id,orbit,weapon]of [
   ['prototype',[[-39,136],[-23,136],[-23,123],[-39,123]],'cannon'],
   ['foundry',[[-10,54],[13,54]],'cannon'],
   ['sorter',[[118,-108],[141,-108],[141,-120],[118,-120]],'cannon'],
   ['keeper',[[-8,40],[-8,28],[8,28],[8,40]],'laser']
  ]){
   runs.push(await page.evaluate(async({id,orbit,weapon})=>{
    const {keeperDodge}=await import('/tests/fixtures/keeper-dodge.js');
    const a=__game.debug,g=__game;for(const k of ['prototype','foundry','sorter','keeper','guardian'])a.state[k]=false;
    g.respawn();g.manual(true);const boss=a.world.enemies.find(e=>e.id===id);
    g.scenario({enemies:Object.fromEntries(a.world.enemies.map(e=>[e.id,e===boss?e.max:0])),state:{relays:true},player:{x:orbit[0][0],y:boss.y,z:orbit[0][1],hp:25,heat:0,deployed:false,afloat:false,phoenix:false,circulation:false,overheated:false,lastHeat:-100,invincible:0,weapon,laser:weapon==='laser',mortar:id!=='prototype'&&id!=='foundry',magnet:id!=='prototype'&&id!=='foundry',overdrive:id!=='prototype',speed:1,endingTime:0}});
    let corner=1,start=a.time,cooling=false;const phases=new Set(),hits=[];
    for(let i=0;i<90*30;i++){
     const p=a.p;if(p.hp<=0||boss.hp<=0)break;const health=p.hp;
     if(Math.hypot(p.x-orbit[corner][0],p.z-orbit[corner][1])<.65)corner=(corner+1)%orbit.length;
     const dx=orbit[corner][0]-p.x,dz=orbit[corner][1]-p.z,keys=Math.abs(dx)>Math.abs(dz)?dx>0?['KeyS','KeyD']:['KeyW','KeyA']:dz>0?['KeyS','KeyA']:['KeyW','KeyD'];
     const t=boss.parts.find(t=>t.hp>0)||{x:boss.x,y:boss.y+1.5,z:boss.z};
     g.aimAt(t.x,t.z,t.y);
     if(p.heat>88)cooling=true;if(p.heat<15)cooling=false;
     if(!cooling&&(!['foundry','sorter'].includes(id)||boss.phase==='vent'))keys.push('Mouse0');
     g.setInput(id==='keeper'?(keeperDodge(p,boss)||keys):keys);g.step(1/30,false);phases.add(boss.attack||boss.phase);if(p.hp<health)hits.push({hp:p.hp,t:a.time-start,x:p.x,z:p.z,ex:boss.x,ez:boss.z,phase:boss.phase});
    }
    g.setInput([]);g.step(.001);return {id,won:boss.hp<=0,hp:a.p.hp,bossHp:boss.hp,seconds:a.time-start,phases:[...phases],hits,position:{x:a.p.x,y:a.p.y,z:a.p.z}};
   },{id,orbit,weapon}));
  }
  if(errors.length||runs.some(r=>!r.won))throw Error(JSON.stringify({runs,errors}));
  return {runs,errors};
}

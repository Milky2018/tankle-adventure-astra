async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');await page.waitForFunction(()=>window.__game?.debug);
 const results=await page.evaluate(async()=>{
  const g=__game,a=g.debug;g.manual(true);g.setInput([]);
  g.scenario({player:{x:340,y:-24,z:177,magnet:true,hp:25,heat:0,overheated:false,invincible:0},state:{'relay-west':true},enemies:Object.fromEntries(a.world.enemies.map(e=>[e.id,0]))});
  const body=a.state.bodies.solids.find(b=>b.id==='coolant-transfer'),control=a.world.controls.find(c=>c.id===body.id);
  const ends=[];
  function walk(z){for(let i=0;i<900&&Math.abs(a.p.z-z)>.2;i++){g.setInput(a.p.z<z?['KeyS','KeyA']:['KeyW','KeyD']);g.step(1/60,false);}g.setInput([]);if(Math.abs(a.p.z-z)>.3)throw Error('Screen-side walk blocked');}
  for(const [sign,end]of [[-1,166],[1,180]]){
   walk(body.z+6+sign*9);
   for(let i=0;i<1800&&Math.abs(body.z-end)>.05;i++){
    const target=body.z+6+sign*9,keys=[];
    if(Math.abs(a.p.z-target)>.2)keys.push(...(a.p.z<target?['KeyS','KeyA']:['KeyW','KeyD']));
    if(a.p.heat<80)keys.push('Mouse2');
    g.aimAt(control.x,control.z,control.y);g.setInput(keys);g.step(1/60,false);
   }
   g.setInput([]);g.step(2,false);ends.push(body.z);if(Math.abs(body.z-end)>.1)throw Error('Magnetic screen stopped '+body.z+' -> '+end);
  }
  // Lowered weapon modules and completed optional encounters are fixtures here.
  // The whole reward approach and return still use the live movement system.
  const routes=await(await fetch('/test-fixtures/exploration-routes.json')).json();
  const rewardChecks=[];
  for(const id of ['armor-foundry','armor-reservoir','laser-focus','cannon-scope']){
   const r=routes[id],q=a.world.pickups.find(p=>p.id===id);
   g.scenario({player:{x:r.start[0],y:r.start[1],z:r.start[2],deployed:!!r.deployed,flotation:true,hp:25,heat:0,speed:1},state:{[id]:false,...(q.requires?{[q.requires]:true}:{}),gangway:true,guardian:true}});
   function move(x,z){for(let i=0;i<1800;i++){const dx=x-a.p.x,dz=z-a.p.z;if(Math.hypot(dx,dz)<.15){g.setInput([]);return;}g.setInput(Math.abs(dx)>Math.abs(dz)?dx>0?['KeyS','KeyD']:['KeyW','KeyA']:dz>0?['KeyS','KeyA']:['KeyW','KeyD']);g.step(1/60,false);}throw Error('Reward route '+id+' blocked '+JSON.stringify([a.p.x,a.p.y,a.p.z,x,z]));}
   for(const [x,z]of r.points)move(x,z);g.step(.1,false);if(!a.state[id])throw Error('No pickup '+id);
   for(const [x,z]of r.returns||r.points.slice(0,-1).reverse())move(x,z);move(r.start[0],r.start[2]);rewardChecks.push(id);
  }
  g.setInput([]);g.step(.1);a.draw();return {screenEnds:ends,rewardChecks};
 });
 if(errors.length)throw Error(errors.join('\n'));return {...results,errors,fixture:'Unrelated combat disabled and optional reward locks completed; real Magnet input, hull movement and pickups are used.'};
}

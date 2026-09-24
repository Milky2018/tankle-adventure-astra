async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');await page.waitForFunction(()=>window.__game?.debug);
 const results=await page.evaluate(async()=>{
  const g=__game,a=g.debug;g.manual(true);g.setInput([]);
  // Lowered weapon modules and completed optional encounters are fixtures here.
  // The whole reward approach and return still use the live movement system.
  const routes=await(await fetch('/tests/fixtures/exploration-routes.json')).json();
  const rewardChecks=[];
  for(const id of ['armor-foundry','armor-reservoir','laser-focus','cannon-scope']){
   const r=routes[id],q=a.world.pickups.find(p=>p.id===id);
   g.scenario({player:{x:r.start[0],y:r.start[1],z:r.start[2],deployed:!!r.deployed,flotation:true,hp:25,heat:0,speed:1},state:{[id]:false,...(q.requires?{[q.requires]:true}:{}),gangway:true,guardian:true}});
   function move(x,z){for(let i=0;i<1800;i++){const dx=x-a.p.x,dz=z-a.p.z;if(Math.hypot(dx,dz)<.15){g.setInput([]);return;}g.setInput(Math.abs(dx)>Math.abs(dz)?dx>0?['KeyS','KeyD']:['KeyW','KeyA']:dz>0?['KeyS','KeyA']:['KeyW','KeyD']);g.step(1/60,false);}throw Error('Reward route '+id+' blocked '+JSON.stringify([a.p.x,a.p.y,a.p.z,x,z]));}
   for(const [x,z]of r.points)move(x,z);g.step(.1,false);if(!a.state[id])throw Error('No pickup '+id);
   for(const [x,z]of r.returns||r.points.slice(0,-1).reverse())move(x,z);move(r.start[0],r.start[2]);rewardChecks.push(id);
  }
  g.setInput([]);g.step(.1);a.draw();return {rewardChecks};
 });
 if(errors.length)throw Error(errors.join('\n'));return {...results,errors,fixture:'Unrelated combat disabled and optional reward locks completed; real hull movement and pickups are used.'};
}

// Isolated traversal and actual projectile checks; combat is disabled in this fixture.
async page=>{
 const errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1280,height:900});
 await page.goto('http://127.0.0.1:5174/?chapter=folded&test&manual');await page.waitForFunction(()=>window.__game?.debug);
 for(const view of ['overhead','third']){
  const result=await page.evaluate(view=>{
   const g=__game,q=g.debug,c=q.world.controls.find(c=>c.id==='transit-return');g.manual(true);g.setInput([]);q.setCameraView(view);
   delete q.state.pendingSignals[c.id];g.scenario({state:{'transit-return':false},enemies:Object.fromEntries(q.world.enemies.map(e=>[e.id,0])),player:{x:0,y:-8,z:84,hp:25,heat:0,overheated:false,overdrive:false,weapon:'cannon',lastShot:-100,lastHeat:-100}});g.step(2,false);
   const keys=(x,z)=>view==='overhead'?(x?x>0?['KeyS','KeyD']:['KeyW','KeyA']:z>0?['KeyS','KeyA']:['KeyW','KeyD']):(x?x>0?['KeyA']:['KeyD']:z>0?['KeyW']:['KeyS']);
   function drive(x,z,seconds){if(view==='third')g.look(0,0);g.setInput(keys(x,z));g.step(seconds,false);g.setInput([]);}
   function move(x,z){for(let i=0;i<1500;i++){const dx=x-q.p.x,dz=z-q.p.z;if(Math.hypot(dx,dz)<.3)return;drive(Math.abs(dx)>Math.abs(dz)?Math.sign(dx):0,Math.abs(dx)<=Math.abs(dz)?Math.sign(dz):0,1/60);}throw Error(`${view} blocked at ${q.p.x},${q.p.y},${q.p.z} toward ${x},${z}`);}
   function fire(){
    const x=c.x+c.facing.x*.5,z=c.z+c.facing.z*.5,y=c.y;
    if(view==='third'){let yaw=Math.atan2(x-q.p.x,z-q.p.z),pitch=0;for(let i=0;i<35;i++){g.look(yaw,pitch);const point=g.project(x,z,y);yaw-=(point.x/innerWidth*2-1)*Math.tan(Math.PI/6)*(innerWidth/innerHeight)*.8;pitch+=(point.y/innerHeight*2-1)*Math.tan(Math.PI/6)*.8;}}
    for(let i=0;i<100;i++){g.aimAt(x,z,y);g.setInput(['Mouse0']);g.step(1/60,false);}g.setInput([]);g.step(2,false);
   }
   move(24,84);fire();if(q.state[c.id])throw Error(view+' latch opened from starting-room side');
   drive(1,0,2);if(q.p.x>=30)throw Error(view+' initial door can be bypassed');
   // Enter from the established far-bank care room, then drive the entire new connector.
   g.scenario({player:{x:46,y:-8,z:24,heat:0,overheated:false,lastShot:-100,lastHeat:-100}});
   move(46,46);move(46,84);move(38,84);fire();if(!q.state[c.id])throw Error(view+' garden-side Cannon could not release the door');
   move(0,84);move(0,86);move(0,84);move(46,84);move(46,24);g.step(.2);g.save();
   return {view,backsideBlocked:true,released:true,roundTrip:true,y:q.p.y};
  },view);results.push(result);
  await page.evaluate(view=>{const g=__game;g.scenario({player:{x:38,y:-8,z:84}});if(view==='third')g.look(-Math.PI/2,.267);g.step(.2);},view);
  await page.screenshot({path:`output/playwright/regression/garden-foundry-return-${view}.png`});
 }
 await page.reload();await page.waitForFunction(()=>window.__game?.debug);
 const restored=await page.evaluate(()=>__game.snapshot().state['transit-return']);if(!restored)throw Error('Door release lost after reload');
 if(errors.length)throw Error(errors.join('\n'));return {fixture:true,results,restored,errors};
}

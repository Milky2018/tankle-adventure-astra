async page => {
 await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');
 await page.waitForFunction(()=>window.__game?.debug);
 const report=await page.evaluate(()=>{
  const g=__game,a=g.debug;g.manual(true);a.setCameraView('overhead');
  const dead=Object.fromEntries(a.world.enemies.map(e=>[e.id,0]));
  function scene(player,state={}){g.setInput([]);g.scenario({player:{hp:25,heat:0,overheated:false,shotCooldown:0,weapon:'cannon',...player},state,enemies:dead});}
  function check(ok,message){if(!ok)throw Error(message);}
  function walk(x,z){for(let i=0;i<1800;i++){const dx=x-a.p.x,dz=z-a.p.z;if(Math.hypot(dx,dz)<.2){g.setInput([]);return;}g.setInput(Math.abs(dx)>Math.abs(dz)?dx>0?['KeyS','KeyD']:['KeyW','KeyA']:dz>0?['KeyS','KeyA']:['KeyW','KeyD']);g.step(1/60,false);}throw Error('Blocked '+JSON.stringify([a.p.x,a.p.y,a.p.z,x,z]));}
  scene({x:78,y:8,z:-84},{load:true});
  const lift=a.world.lifts.find(l=>l.id==='carrier');Object.assign(lift,{y:8,destination:8,wait:0});
  g.step(4.7,false);check(Math.abs(a.p.y-16)<.01,'Carrier did not deliver rider');
  check(!a.world.surfaces.some(d=>d.y===16&&d.x<78&&d.x+d.w>78&&d.z< -84&&d.z+d.d> -84),'Upper floor still seals the shaft');
  walk(78,-100);check(a.p.y===16,'Cannot leave upper landing');
  scene({x:96,y:16,z:-82},{load:true,phoenix:true});walk(96,-74);walk(62,-74);
  scene({x:198,y:40,z:152},{signal:false});
  check(!g.interact(),'E still operates satellite switch');
  const signal=a.world.controls.find(c=>c.id==='signal');g.aimAt(signal.x,signal.z,signal.y);g.setInput(['Mouse0']);g.step(.65,false);g.setInput([]);g.step(5,false);check(a.state.signal,'Cannon did not trigger satellite');
  const connection=a.world.controlFeeds.find(f=>f.id==='reservoir-inlet');check(connection?.lamps.length>3,'Reservoir cable absent');
  const cooling=a.world.controlFeeds.find(f=>f.id==='coolant-bypass');check(cooling?.lamps.length>2,'Cooling cable absent');
  scene({x:154,y:-8,z:68},{'inner-transit':false});g.step(.5,false);check(a.p.heat>5,'Hot floor does not heat Tank');
  const hot=a.scene.getObjectByName('thermal-floor:vestibule-heat');check(hot,'Thermal visual absent');check(hot.children.at(-1).visible,'Hot embers absent');
  scene({x:154,y:-8,z:68},{'inner-transit':true});g.step(.2,false);check(!hot.children.at(-1).visible,'Cooled floor still shows embers');
  const rail=a.world.sidePuzzles.rail;
  scene({x:-166,y:8,z:-80});const before=JSON.stringify(rail.state.switches);g.step(.2,false);check(JSON.stringify(rail.state.switches)===before,'Hull still presses switch');
  scene({x:-166,y:8,z:-87,heat:0,shotCooldown:0});
  const paddle=a.world.sidePuzzles.targets.find(t=>t.id==='rail-a'),setting=rail.state.switches[0];g.aimAt(paddle.x,paddle.z,paddle.y);g.setInput(['Mouse0']);g.step(.3,false);g.setInput([]);g.step(1,false);check(rail.state.switches[0]!==setting,'Cannon did not turn rail after its cable');
  return {railCannon:true,liftExit:true,phoenixBypass:true,satelliteCannon:true,noHullSwitches:true,thermalStates:true,remoteCables:true,fixture:'Granted incoming equipment and disabled enemies; real movement and Cannon input'};
 });
 await page.evaluate(()=>{const g=__game;g.scenario({player:{x:340,y:-24,z:160,magnet:true},state:{slidePositions:{'coolant-transfer':166}}});g.step(.1,false);g.debug.draw();});
 await page.screenshot({path:'output/playwright/machinery-slide.png'});
 return report;
}

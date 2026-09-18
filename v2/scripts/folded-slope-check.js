async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});

 await page.setViewportSize({width:1440,height:900});await page.goto('http://127.0.0.1:5174/?chapter=folded&view=third&test&manual');await page.waitForFunction(()=>window.__game?.debug);
 const samples=[];
 for(const view of ['third','overhead'])for(const [name,z,heading,yaw]of [['up',110,0,0],['down',110,Math.PI,Math.PI],['across',110,Math.PI/2,Math.PI/2],['crest',137.8,0,0],['foot',90.2,0,0]]){
  const result=await page.evaluate(async ({view,name,z,heading,yaw})=>{
   const {Vector3}=__game.debug.T,{deckHeight}=await import('/src/folded-layout.js');
   const a=__game.debug,g=__game;g.scenario({state:{guardian:true},player:{x:186,y:16+(z-90)*.5,z,heading,hp:50,weapon:'cannon',heat:0,overheated:false,endingTime:0}});a.setCameraView(view);g.look(yaw,.4);g.step(.5);
   a.model.root.updateWorldMatrix(true,true);
   const patches=a.groundPatches(a.p,a.world.lifts);let min=Infinity;
   for(const wheel of a.model.tracks){const center=wheel.getWorldPosition(new Vector3()),d=patches.find(d=>center.x>=d.x&&center.x<=d.x+d.w&&center.z>=d.z&&center.z<=d.z+d.d);if(d)min=Math.min(min,(center.y-deckHeight(d,center.z))/Math.hypot(1,(d.rise||0)/d.d)-.3);}
   // Use a real Cannon shot and the model's barrel transform, not just matching aim math.
   a.updateAim();const direction=new Vector3(0,0,1).transformDirection(a.model.barrel.matrixWorld);g.fire();const shot=a.shots.filter(s=>!s.hostile).at(-1);
   const agreement=shot?direction.dot(shot.dir):null;g.step(.01);
   return {view,name,minClearance:min,agreement,orientation:a.model.root.quaternion.toArray(),patches:patches.map(d=>d.id)};
  },{view,name,z,heading,yaw});samples.push(result);
  await page.screenshot({path:`v2/output/playwright/slope/${view}-${name}.png`});
 }
 if(samples.some(s=>s.minClearance<-.015||s.agreement!==null&&s.agreement<.999))throw Error('Slope contact or barrel mismatch '+JSON.stringify(samples));
 const travel=await page.evaluate(async ()=>{
  const {Vector3}=__game.debug.T,{foldedDecks,deckHeight}=await import('/src/folded-layout.js'),{groundHeight}=await import('/src/folded-ground.js');
  const g=__game,a=__game.debug;a.setCameraView('overhead');const results=[];
  for(const [start,end,keys,boost]of [[88,143,['KeyS','KeyA'],false],[143,88,['KeyW','KeyD'],false],[88,143,['KeyS','KeyA'],true],[143,88,['KeyW','KeyD'],true]]){
   const y=start<90?16:start>138?40:16+(start-90)*.5;g.scenario({player:{x:186,y,z:start,heading:start<90?0:Math.PI,hp:50,heat:0,speed:boost?3.2:1,overdrive:boost,phoenix:boost,circulation:boost,overheated:false}});
   if(boost)keys.push(g.snapshot().bindings.overdrive);
   let min=Infinity,maxRise=0,maxTurn=0,previous=a.model.root.quaternion.clone();
   for(let i=0;i<900&&(end-a.p.z)*Math.sign(end-start)>.15;i++){
    g.setInput(keys);g.step(1/60,false);a.model.root.updateWorldMatrix(true,true);
    maxTurn=Math.max(maxTurn,previous.angleTo(a.model.root.quaternion));previous.copy(a.model.root.quaternion);
    const patches=a.groundPatches(a.p,a.world.lifts);maxRise=Math.max(maxRise,a.model.root.position.y-a.p.y);
    for(const wheel of a.model.tracks){const c=wheel.getWorldPosition(new Vector3()),d=patches.find(d=>c.x>=d.x&&c.x<=d.x+d.w&&c.z>=d.z&&c.z<=d.z+d.d);if(d)min=Math.min(min,(c.y-deckHeight(d,c.z))/Math.hypot(1,(d.rise||0)/d.d)-.3);}
   }
   g.setInput([]);results.push({start,end,boost,arrived:a.p.z,minClearance:min,maxRise,maxTurn});
  }return results;
 });
 if(travel.some(t=>Math.abs(t.arrived-t.end)>.6||t.minClearance<-.02||t.maxTurn>.1))throw Error('Ramp transition failed '+JSON.stringify(travel));
 const occlusion=await page.evaluate(async()=>{
  const a=__game.debug,g=__game,{Vector3}=__game.debug.T;g.scenario({player:{x:186,y:26,z:110,heading:Math.PI}});a.setCameraView('third');g.look(Math.PI,.4);g.step(.1);
  const origin=new Vector3(186,32,114),dir=new Vector3(0,-1,0),hit=a.world.cast(origin,dir,20,{aiming:true,terrainOnly:true});
  return {hit:hit?.point.toArray(),floor:hit?.object.name};
 });
 if(!occlusion.hit||Math.abs(occlusion.hit[1]-28)>.1)throw Error('Aim pierced the supporting ramp '+JSON.stringify(occlusion));
 if(errors.length)throw Error(JSON.stringify(errors));return {samples,travel,occlusion,errors};
}

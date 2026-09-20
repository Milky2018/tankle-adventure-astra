async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');await page.waitForFunction(()=>window.__game?.debug);
 const result=await page.evaluate(async()=>{
  const g=__game,a=g.debug,T=a.T;g.manual(true);g.scenario({enemies:Object.fromEntries(a.world.enemies.map(e=>[e.id,0])),player:{x:0,y:-8,z:86}});
  const tests=[['freight-lobber',55,0,-36,59,-36],['coolant-separator-artillery-1',348,-24,185,357,185],['stores-reserve-lobber',-187,8,-52,-180,-62]];
  const results=[];
  for(const [id,x,y,z,tx,tz]of tests){
   const e=a.world.enemies.find(e=>e.id===id);a.clearShots();a.shootEnemy(e,0,null,new T.Vector3(tx,y+.05,tz),0,true);const shot=a.shots.at(-1);let peak=shot.position.y;
   for(let i=0;i<300&&a.shots.includes(shot);i++){a.updateShots(1/120);peak=Math.max(peak,shot.position.y);}
   const blast=a.waves.at(-1)?.mesh.position.clone();if(!blast)throw Error('No blast '+id);blast.y-=.08;
   const error=blast.distanceTo(shot.target);if(error>.15)throw Error('Indoor lob intercepted '+JSON.stringify({id,error,blast:blast.toArray(),target:shot.target.toArray()}));
   if(peak-y>=12)throw Error('Lob too high '+id);
   results.push({id,peakAboveFloor:peak-y,seconds:shot.age,error});
  }
  return results;
 });
 if(errors.length)throw Error(JSON.stringify(errors));return {result,errors};
}

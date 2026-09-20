async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5174/?chapter=folded&test&manual');await page.waitForFunction(()=>window.__game?.debug);
 const report=await page.evaluate(()=>{
  const g=__game,q=g.debug,T=q.T,controls=q.world.controls;
  g.scenario({enemies:Object.fromEntries(q.world.enemies.map(e=>[e.id,0])),player:{invincible:1e9}});
  const results=[];
  for(const c of controls.filter(c=>c.housing.length)){
   for(const other of controls)q.state[other.id]=true;
   if(c.requires)q.state[c.requires]=true;q.state[c.id]=false;
   g.step(.6,false);
   const n=c.surface==='top'?new T.Vector3(0,1,0):c.opticalNormal||c.facing;
   const target=new T.Vector3(c.x,c.y,c.z);if(c.facing)target.addScaledVector(n,.5);
   const cast=origin=>{const dir=target.clone().sub(origin);return q.world.cast(origin,dir.normalize(),origin.distanceTo(target)+.1,{targets:true});};
   const front=cast(target.clone().addScaledVector(n,2.2));
   if(front?.target?.id!==c.id)throw Error('Front blocked '+JSON.stringify({id:c.id,hit:front?.target?.id,cover:front?.blockedTarget?.id,object:front?.object?.userData}));
   const back=cast(target.clone().addScaledVector(n,-2.2));
   if(back?.target?.id===c.id)throw Error('Back exposed '+c.id);
   if(c.requires){q.state[c.requires]=false;g.step(.6,false);if(cast(target.clone().addScaledVector(n,2.2))?.target?.id===c.id)throw Error('Closed cover passed '+c.id);q.state[c.requires]=true;}
   results.push({id:c.id,front:true,backBlocked:true,covered:!!c.cover});q.state[c.id]=true;
  }
  const premature=[['prototype-inspection',-30,-8,86],['overseer-service',-10,-8,86],['last-cage',22,-8,-8],['pump',-26,-8,-8],['gangway',56,-8,20],['emitter-cage',52,-8,-86],['cage',10,0,16]];
  for(const [id,x,y,z]of premature){const c=controls.find(c=>c.id===id);q.state[id]=false;if(c.requires)q.state[c.requires]=true;g.step(.6,false);
   const origin=new T.Vector3(x,y+1.6,z),target=new T.Vector3(c.x,c.y,c.z),dir=target.clone().sub(origin);
   const hit=q.world.cast(origin,dir.normalize(),origin.distanceTo(target)+1,{targets:true});
   if(hit?.target?.id===id)throw Error('Premature route opened by ray '+id);q.state[id]=true;
  }
  const shots=[];
  for(const view of ['overhead','third']){
   q.setCameraView(view);
   g.scenario({state:{foundry:false,'press-return':false},player:{x:-75,y:-16,z:50,hp:25,weapon:'cannon',heat:0,lastHeat:-100,lastShot:-100,overheated:false}});
   g.step(.6,false);
   const fire=()=>{if(view==='third'){let yaw=Math.PI/2,pitch=0;for(let j=0;j<24;j++){g.look(yaw,pitch);const point=g.project(-70.5,50,-14.6);yaw-=(point.x/innerWidth*2-1)*Math.tan(Math.PI/6)*(innerWidth/innerHeight)*.8;pitch+=(point.y/innerHeight*2-1)*Math.tan(Math.PI/6)*.8;}g.look(yaw,pitch);}
    for(let i=0;i<90;i++){g.aimAt(-70,50,-14.6);g.setInput(['Mouse0']);g.step(1/60,false);}g.setInput([]);g.step(.5,false);};
   fire();if(q.state['press-return'])throw Error('Cannon passed a closed cover '+view);
   q.state.foundry=true;g.step(.6,false);fire();
   if(!q.state['press-return'])throw Error('Cannon could not operate an uncovered paddle '+view);
   shots.push({view,closedRejected:true,openActivated:true});
  }
  return {results,premature:premature.length,shots};
 });
 for(const view of ['overhead','third'])for(const ready of [false,true]){
  await page.evaluate(({view,ready})=>{const g=__game;g.setInput([]);g.scenario({state:{foundry:ready,'press-return':false},player:{x:-75,y:-16,z:50,heat:0,overheated:false}});g.debug.setCameraView(view);g.look(Math.PI/2,.2);g.step(.8);},{view,ready});
  await page.screenshot({path:`v2/output/playwright/regression/control-cover-${view}-${ready?'open':'closed'}.png`});
 }
 if(errors.length)throw Error(errors.join('\n'));return {...report,errors};
}

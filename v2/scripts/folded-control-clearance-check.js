async page=>{
 await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');await page.waitForFunction(()=>window.__game?.debug);
 const result=await page.evaluate(async()=>{
 const a=__game.debug,g=__game,T=a.T;g.manual(true);g.setInput([]);
 const {foldedDecks,foldedSolids,foldedBlocked,deckHeight}=await import('/src/folded-layout.js');
 const open=Object.fromEntries(foldedSolids.filter(s=>!s.permanent).map(s=>[s.id,true]));
 g.scenario({state:open,enemies:Object.fromEntries(a.world.enemies.map(e=>[e.id,0])),player:{invincible:1e9}});
 const results=[];
 for(const c of [...a.world.controls,...a.world.sidePuzzles.targets]){
  if(c.surface==='top'||['rail-carrier','mortar-cache'].includes(c.id)||c.opticalNormal||['laser','dock','use'].includes(c.kind))continue;
  if(c.requires)a.state[c.requires]=true;
  a.state[c.id]=false;
  const body=a.state.bodies.solids.find(b=>b.id===c.mount);if(body?.rail){body[body.rail.axis]=body.rail.min;a.state.slidePositions[body.id]=body.rail.min;}
  g.step(.6,false);
  let found=null;
  for(const radius of [3,5,8,12,18]){
   for(let i=0;i<32&&!found;i++){
    const x=c.x+Math.sin(i*Math.PI/16)*radius,z=c.z+Math.cos(i*Math.PI/16)*radius;
    for(const d of foldedDecks.filter(d=>!d.water&&x>d.x+1&&x<d.x+d.w-1&&z>d.z+1&&z<d.z+d.d-1)){
     const y=deckHeight(d,z);if(y>c.y+1||y<c.y-8||foldedBlocked(x,y,z,a.state))continue;
     const origin=new T.Vector3(x,y+1.6,z),target=new T.Vector3(c.x,c.y,c.z);if(c.facing)target.addScaledVector(c.facing,.5);const dir=target.sub(origin),distance=dir.length();
     const hit=a.world.cast(origin,dir.normalize(),distance+1,{targets:true});
     if(hit?.target?.id===c.id){found={x,y,z};break;}
    }
   }
   if(found)break;
  }
  results.push({id:c.id,kind:c.kind,position:[c.x,c.y,c.z],approach:found});a.state[c.id]=true;
 }
 const unreachable=results.filter(r=>!r.approach);if(unreachable.length)throw Error(JSON.stringify(unreachable));return {count:results.length,unreachable,results,scope:'Supported approach and direct firing line for ordinary controls; lob trays, high inspection window and optical receivers covered by their gameplay suites.'};
 });
 for(const view of ['overhead','third']){
  await page.evaluate(view=>{const g=__game;g.scenario({player:{x:-162,y:8,z:-70,hp:50}});g.debug.setCameraView(view);g.look(Math.PI,.25);g.step(.2);},view);
  await page.screenshot({path:`output/playwright/regression/rail-clearance-${view}.png`});
 }
 return result;
}

async page=>{
 const errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:5174/?chapter=folded&test&manual');await page.waitForFunction(()=>window.__game?.debug);
 await page.evaluate(()=>{__game.manual(true);__game.scenario({enemies:Object.fromEntries(__game.snapshot().enemies.map(e=>[e.id,0]))});});
 for(const view of ['overhead','third']){
  for(const area of ['freight','optics','coolant']){
   results.push(await page.evaluate(({view,area})=>{
    const g=__game,q=g.debug,w=q.world,T=q.T,check=(ok,msg)=>{if(!ok)throw Error(`${view}/${area}: ${msg}`);};
    q.setCameraView(view);g.setInput([]);q.clearShots();
    const start={freight:[59,0,-34],optics:[271,24,-62],coolant:[292,-24,143]}[area];
    g.scenario({player:{x:start[0],y:start[1],z:start[2],hp:25,invincible:0,hurtUntil:0,heat:0,knockX:0,knockZ:0},state:{freight:true,'freight-return':false,'coolant-transfer':true}});
    if(view==='third')g.look(0,0);
    function walk(points){for(const [x,z]of points){for(let i=0;i<800&&Math.hypot(q.p.x-x,q.p.z-z)>.35;i++){
     const dx=x-q.p.x,dz=z-q.p.z;
     const keys=view==='overhead'?(Math.abs(dx)>Math.abs(dz)?dx>0?['KeyS','KeyD']:['KeyW','KeyA']:dz>0?['KeyS','KeyA']:['KeyW','KeyD']):(Math.abs(dx)>Math.abs(dz)?dx>0?['KeyA']:['KeyD']:dz>0?['KeyW']:['KeyS']);
     g.setInput(keys);g.step(1/60,false);
    }check(Math.hypot(q.p.x-x,q.p.z-z)<.5,`movement blocked at ${q.p.x},${q.p.y},${q.p.z} toward ${x},${z}`);}g.setInput([]);}
    const paths={freight:[[59,-63],[67,-63],[67,-34],[67,-63],[59,-63],[59,-92]],optics:[[290,-62],[290,-88],[271,-88],[271,-62]],coolant:[[312,143],[312,164],[340,164],[340,186],[340,164],[325,164],[325,186],[292,186],[292,143]]};
    walk(paths[area]);
    function blocked(a,b){const from=new T.Vector3(...a),to=new T.Vector3(...b).sub(from);return !!w.cast(from,to.clone().normalize(),to.length()-.1,{targets:false});}
    if(area==='optics'){
     check(!blocked([272,25.5,-74],[271,25.2,-62]),'Front lane lost its firing line');
     check(blocked([272,25.5,-74],[290,25.2,-72]),'Side screen provides no shelter');
     check(!blocked([272,25.5,-74],[290,25.2,-88]),'Side route has no firing opening');
    }
    if(area==='coolant'){
     check(!blocked([348,-22.5,185],[292,-22.8,155]),'Outer lane no longer exposed');
     check(blocked([348,-22.5,185],[312,-22.8,155]),'Maintenance lane has no shelter');
     check(!blocked([312,-22.5,159],[312,-22.8,150]),'Welder cannot contest maintenance lane');
    }
    g.scenario({player:{x:start[0],y:start[1],z:start[2]}});
    for(const e of w.enemies){const show=area==='optics'?e.id==='lens-collimator-reflector-0':area==='coolant'?e.encounter==='coolant-separator':false;e.hp=show?e.max:0;e.model.root.visible=show;e.stunnedUntil=q.time+1000;}
    if(view==='third')g.look(area==='coolant'?.4:area==='optics'?2.7:Math.PI,.1);
    g.step(.1);q.draw();
    return {view,area,traversed:true,sightlines:true};
   },{view,area}));
   await page.screenshot({path:`v2/output/playwright/regression/route-choices-${area}-${view}.png`});
   await page.evaluate(()=>{for(const e of __game.debug.world.enemies){e.hp=0;e.model.root.visible=false;}});
  }
 }
 if(errors.length)throw Error(errors.join('\n'));return {results,errors};
}

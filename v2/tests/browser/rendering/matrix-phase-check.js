async page=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5174/?chapter=folded&test&manual');
  await page.waitForFunction(()=>window.__game?.debug);
  const result=await page.evaluate(()=>{
    const g=__game,q=g.debug,T=q.T;g.manual(true);let casts=0;
    const results=[];
    for(const [x,y,z]of [[0,-8,86],[-17,0,-35],[202,16,45],[278,-24,117]]){
      g.scenario({player:{x,y,z,invincible:1e9}});
      for(const unlocked of [false,true]){
        for(const c of q.world.controls){q.state[c.id]=unlocked;if(c.requires)q.state[c.requires]=unlocked;}
        for(let tick=0;tick<4;tick++){
          const time=g.snapshot().time;g.step(.1,false);
          if(g.snapshot().time<=time)throw Error('Matrix scenario did not advance');
          const rays=[];
          for(const c of q.world.controls){
            const n=c.surface==='top'?new T.Vector3(0,1,0):c.opticalNormal||c.facing||new T.Vector3(0,0,1);
            const target=new T.Vector3(c.x,c.y,c.z);
            for(const sign of [-1,1]){const origin=target.clone().addScaledVector(n,sign*2.2);rays.push([origin,target.clone().sub(origin).normalize(),4]);}
          }
          for(const lift of q.world.lifts)rays.push([new T.Vector3(lift.x+lift.w/2,lift.y+4,lift.z+lift.d/2),new T.Vector3(0,-1,0),8]);
          const cast=ray=>{
            const hit=q.world.cast(...ray,{targets:true});
            return hit?{id:hit.target?.id,blocked:hit.blockedTarget?.id,point:hit.point?.toArray().map(v=>Math.round(v*1e5)/1e5)}:null;
          };
          const local=rays.map(cast);q.scene.updateMatrixWorld(true);const global=rays.map(cast);
          if(JSON.stringify(local)!==JSON.stringify(global))throw Error(`Stale raycast transforms at ${x}/${y}/${z}: `+JSON.stringify(local.map((v,i)=>({local:v,global:global[i]})).filter(v=>JSON.stringify(v.local)!==JSON.stringify(v.global))));
          casts+=rays.length;
        }
      }
      results.push({x,y,z});
    }
    // Render-time updates must include model motion after the world presentation phase.
    const mesh=q.model.root;mesh.position.x+=3;q.draw();
    const actual=new T.Vector3().setFromMatrixPosition(mesh.matrixWorld);
    if(Math.abs(actual.x-mesh.position.x)>1e-8)throw Error('Renderer missed late model movement');
    return {casts,locations:results,lateModelMovement:true};
  });
  if(errors.length)throw Error(errors.join('\n'));return {result,errors};
}

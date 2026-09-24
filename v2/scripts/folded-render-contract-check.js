async page => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('http://127.0.0.1:5174/?chapter=folded&test&manual');
  await page.waitForFunction(() => window.__game?.debug);
  const result = await page.evaluate(async () => {
    const g = __game, q = g.debug;
    const {serializeFoldedState} = await import('/src/folded-state.js');
    const {RENDER_ROLES} = await import('/src/folded-render-policy.js');
    g.manual(true);
    const results=[];
    // Keep a mirror deliberately between indexed orientations. Repeated draws
    // must not advance its collision normal, even when the game is paused.
    const mirror=q.world.mirrors.find(m=>m.turnable);
    q.state.mirrorTurns[mirror.id]=(q.state.mirrorTurns[mirror.id]||0)+1;
    for(const collection of ['lifts','pickups','mirrors']) {
      if(q.world[collection]!==q.state.machinery[collection])throw Error('Scene replaced runtime '+collection);
      for(const body of q.world[collection])
        if(body.root||body.mesh||body.material)throw Error('Runtime body contains scene handles');
    }
    const capture = () => JSON.stringify({save:serializeFoldedState(q.state),bodies:q.state.bodies,machinery:q.state.machinery});
    for (const [region,x,y,z] of [
      ['foundry',0,-8,86],['transit',0,0,27],['garden',48,-8,20],
      ['testworks',218,16,-170],['optics',218,24,-20],
      ['circulation',231,-24,125],['furnace',0,-56,53],
    ]) {
      g.scenario({player:{x,y,z,hp:25},enemies:Object.fromEntries(q.world.enemies.map(e=>[e.id,0]))});
      q.state.mirrorTurns[mirror.id]++;
      for (const view of ['third','overhead','third']) {
        q.setCameraView(view);
        const before=capture();
        for(let i=0;i<4;i++){q.world.syncMovingSolids();q.world.update(.1,q.time,q.p,q.camera);q.draw();}
        if(capture()!==before)throw Error(`Rendering advanced gameplay in ${region}/${view}`);
        let registered=0;
        q.scene.traverse(object=>{
          if(!object.material)return;
          for(const material of [].concat(object.material)) {
            const role=material.userData.renderRole;
            if(!role)continue;
            registered++;
            if(!RENDER_ROLES[role])throw Error(`Unknown material role ${role}`);
            if(!material.colorWrite&&(!material.depthWrite||material.transparent))throw Error(`Invalid depth pass ${role}`);
          }
        });
        if(registered<100)throw Error('Scene bypassed render policy');
        results.push({region,view,registered});
      }
    }
    g.scenario({player:{x:0,y:-8,z:86}});q.setCameraView('third');q.draw();
    return results;
  });
  await page.screenshot({path:'output/playwright/refactor-opening.png'});
  if(errors.length)throw Error(errors.join('\n'));
  return {poses:result.length,results:result,errors};
}

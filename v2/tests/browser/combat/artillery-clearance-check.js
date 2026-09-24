async page => {
  await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');
  await page.waitForFunction(()=>window.__game?.debug);
  return await page.evaluate(async()=>{
    const {foldedSupport,foldedDecks,deckHeight}=await import('/src/world/terrain.js');
    const g=__game,a=g.debug,T=a.T;g.manual(true);
    g.scenario({enemies:Object.fromEntries(a.world.enemies.map(e=>[e.id,0])),player:{x:0,y:-8,z:86}});
    const results=[],blocked=[],cover=[];
    for(const e of a.world.enemies.filter(e=>e.type==='artillery')){
      let checked=0;
      for(let i=0;i<8;i++){
        const x=e.x+Math.sin(i*Math.PI/4)*14,z=e.z+Math.cos(i*Math.PI/4)*14;
        const floor=foldedSupport(x,z,e.y);if(!floor||Math.abs(floor.height-e.y)>.1)continue;
        const origin=new T.Vector3(e.x,e.y+1.5,e.z),end=new T.Vector3(x,e.y+1.5,z),delta=end.clone().sub(origin);
        if(a.world.cast(origin,delta.clone().normalize(),delta.length(),{targets:false}))continue;
        a.clearShots();a.shootEnemy(e,0,null,new T.Vector3(x,e.y+.05,z),0,true);
        const shot=a.shots.at(-1);const before=a.waves.at(-1);
        for(let n=0;n<250&&a.shots.includes(shot);n++)a.updateShots(1/120);
        const blast=a.waves.at(-1);
        if(blast===before)throw Error('No impact '+e.id);
        const p=blast.mesh.position.clone();p.y-=.08;
        if(p.distanceTo(shot.target)>.2){
          const deck=foldedDecks.find(d=>!d.water&&p.x>=d.x-.1&&p.x<=d.x+d.w+.1&&p.z>=d.z-.1&&p.z<=d.z+d.d+.1&&Math.abs(p.y-deckHeight(d,p.z))<.6);
          if(deck)cover.push({id:e.id,deck:deck.id});
          else blocked.push({id:e.id,from:[e.x,e.y,e.z],target:shot.target.toArray(),impact:p.toArray()});
        }
        checked++;
      }
      results.push({id:e.id,checked});
    }
    if(blocked.length)throw Error(JSON.stringify({results,blocked}));
    return {results,cover,scope:'Same-floor clear firing lanes in eight directions at every artillery spawn; walkable upper decks remain physical cover and are reported separately.'};
  });
}

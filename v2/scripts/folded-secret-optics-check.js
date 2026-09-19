async page => {
  await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');
  await page.waitForFunction(()=>window.__game?.debug);
  return page.evaluate(async()=>{
    const g=__game,a=g.debug;g.manual(true);a.setCameraView('overhead');
    const enemies=Object.fromEntries(a.world.enemies.map(e=>[e.id,0]));
    function place(x,z){g.setInput([]);a.clearShots();g.scenario({enemies,state:{'laser-cache':false},player:{x,y:-24,z,laser:true,weapon:'laser',heat:0,overheated:false,hp:50,invincible:1e9}});g.step(.05);}
    place(340,186);g.aimAt(354,193,-22);g.setInput(['Mouse0']);g.step(.15);g.setInput([]);
    if(a.state['laser-cache'])throw Error('Collector opens from its opaque back along the main lane');
    place(360,186);g.aimAt(354,193,-22);g.setInput(['Mouse0']);g.step(.15);g.setInput([]);
    if(a.state['laser-cache'])throw Error('Collector opens directly from the main corner without a reflection');
    const {foldedSupport,foldedBlocked}=await import('/src/folded-layout.js');
    const offsets=[],T=a.T;let directProbes=0;
    for(let x=336;x<=372;x+=2)for(let z=174;z<=202;z+=2){
      if(!foldedSupport(x,z,-24)||foldedBlocked(x,-24,z,a.state)||x>351&&z>189)continue;
      for(const dz of [-1.7,0,1.7])for(const dy of [-1,0,1]){
        const origin=new T.Vector3(x,-22,z),target=new T.Vector3(354,-22+dy,193+dz),delta=target.sub(origin);
        const hit=a.world.cast(origin,delta.clone().normalize(),delta.length()+2);
        if(hit?.target?.id==='laser-cache')throw Error('Unreflected rim bypass '+JSON.stringify({x,z,dy,dz}));
        directProbes++;
      }
    }
    for(const offset of [-.5,0,.5]){
      place(364,178);g.aimAt(364+offset,193-offset,-22);g.setInput(['Mouse0']);g.step(.15);g.setInput([]);
      if(!a.state['laser-cache'])throw Error('Reflected service collector rejects mirror offset '+JSON.stringify({offset,aim:a.aim,segments:g.snapshot().laserSegments}));
      offsets.push(offset);
    }
    return {backRejected:true,frontRejected:true,reflectedOffsets:offsets,directProbes};
  });
}

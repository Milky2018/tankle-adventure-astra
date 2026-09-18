async page => {
  await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');
  await page.waitForFunction(()=>window.__game?.debug);
  return page.evaluate(()=>{
    const g=__game,a=g.debug;g.manual(true);a.setCameraView('overhead');
    const enemies=Object.fromEntries(a.world.enemies.map(e=>[e.id,0]));
    function place(x,z){g.setInput([]);a.clearShots();g.scenario({enemies,state:{'laser-cache':false},player:{x,y:-24,z,laser:true,weapon:'laser',heat:0,overheated:false,hp:50,invincible:1e9}});g.step(.05);}
    place(340,186);g.aimAt(354,186,-22);g.setInput(['Mouse0']);g.step(.15);g.setInput([]);
    if(a.state['laser-cache'])throw Error('Collector opens from its opaque back along the main lane');
    const offsets=[];
    for(const offset of [-.5,0,.5]){
      place(363,178);g.aimAt(363+offset,186-offset,-22);g.setInput(['Mouse0']);g.step(.15);g.setInput([]);
      if(!a.state['laser-cache'])throw Error('Reflected service collector rejects mirror offset '+offset);
      offsets.push(offset);
    }
    return {backRejected:true,reflectedOffsets:offsets};
  });
}

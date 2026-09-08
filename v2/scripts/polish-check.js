async (page) => {
  return await page.evaluate(() => {
    const g=window.__game,results=[];
    const check=(name,condition,detail)=>results.push({name,passed:!!condition,detail});
    const setup=(x,z)=>{g.setInput([]);g.scenario({player:{x,z,hp:50,heat:0,overheated:false,speed:1,lastShot:-10,lastHeat:-10,invincible:0,underpass:false}});};
    // Same trajectory, with the player just inside and then entirely outside its painted body sweep.
    for(const [offset,expected] of [[1.6,45],[2.4,50]]){
      setup(20,offset);g.scenario({enemies:{scout:{x:24,z:0,hp:1,state:'charge',timer:.75,heading:-Math.PI/2,chargeX:-1,chargeZ:0}}});g.step(.3);
      check('Scout sweep at lateral offset '+offset,g.snapshot().player.hp===expected,g.snapshot().player.hp);
    }
    for(const [offset,expected] of [[2.2,38],[2.8,50]]){
      setup(52+offset,70);g.scenario({relays:[0,0],enemies:{elite:{x:52,z:65,hp:9,state:'charge',timer:1.2,heading:0,chargeX:0,chargeZ:1}}});g.step(.3);
      check('Elite sweep at lateral offset '+offset,g.snapshot().player.hp===expected,g.snapshot().player.hp);
    }
    setup(57,70);g.scenario({enemies:{elite:{x:52,z:65,hp:9,state:'warn',timer:1.7,heading:0,chargeX:0,chargeZ:1}}});g.step(.4);
    check('Elite charge heading stays committed during warning',g.snapshot().enemies[6].heading===0,g.snapshot().enemies[6].heading);
    // Shielded hits retain their established partial damage after the silhouette redesign.
    setup(78,37);g.scenario({enemies:{guard:{x:78,z:42,hp:3,state:'idle',timer:50,heading:Math.PI}}});g.aimAt(78,42);g.fire();g.step(.6);
    check('Guard front armour still reduces damage by 60 percent',Math.abs(g.snapshot().enemies[4].hp-2.6)<1e-8,g.snapshot().enemies[4].hp);
    setup(53,38);g.repair();g.step(.15);
    check('Repair tools preserve checkpoint recovery',g.snapshot().anchor===1&&g.snapshot().player.hp===50);
    if(results.some(r=>!r.passed))throw new Error(JSON.stringify(results));return results;
  });
}

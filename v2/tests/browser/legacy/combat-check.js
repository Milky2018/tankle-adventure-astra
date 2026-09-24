async (page) => {
  return await page.evaluate(() => {
    const g=window.__game,results=[];
    const check=(name,condition,detail)=>results.push({name,passed:!!condition,detail});
    const setup=(x,z)=>{g.setInput([]);g.scenario({player:{x,z,hp:50,heat:0,overheated:false,speed:1,lastShot:-10,lastHeat:-10,invincible:0,underpass:false}});g.step(.02);};
    setup(52,59);g.scenario({enemies:{elite:{x:52,z:65,hp:9,state:'idle',timer:50,heading:Math.PI}}});g.aimAt(52,65);g.fire();g.step(.6);check('Elite armour rejects cannon outside vent',g.snapshot().enemies[6].hp===9);
    setup(52,59);g.scenario({enemies:{elite:{state:'vent',timer:4.3,heading:Math.PI}}});g.aimAt(52,65);g.fire();g.step(.6);check('Elite front armour still rejects cannon during vent',g.snapshot().enemies[6].hp===9);
    for(let cycle=0;cycle<2;cycle++){
      setup(52,71);g.scenario({enemies:{elite:{x:52,z:65,state:'vent',timer:4.3,heading:Math.PI}}});
      for(let i=0;i<(cycle===0?5:4);i++){g.aimAt(52,65);g.fire();g.step(.6);}
      check('Elite accepts more than three hits in vent cycle '+(cycle+1),g.snapshot().enemies[6].hp===(cycle===0?4:0),g.snapshot().enemies[6].hp);
    }
    check('Defeated Elite grants persistent Overdrive',g.snapshot().eliteDead&&g.snapshot().player.overdrive);
    // Verify each physical weak point, then the newly exposed central core.
    setup(-12,-49.2);g.scenario({enemies:{boss:{x:0,z:-51,hp:14,assemblies:[4,4],core:6,state:'idle',timer:50,heading:0}}});g.aimAt(-7.5,-49.2);g.fire();g.step(.6);check('Closed Boss cooling assembly rejects damage',g.snapshot().enemies[7].hp===14,g.snapshot().enemies[7].hp);
    for(let side=0;side<2;side++){
      setup(side?12:-12,-49.2);g.scenario({enemies:{boss:{state:'vent',timer:3.6,openSide:side,heading:0}}});g.step(.02);
      for(let hit=0;hit<4;hit++){g.aimAt(side?7.5:-7.5,-49.2);g.fire();g.step(.6);}
      check('Cooling assembly '+side+' accepts four hits in one window',g.snapshot().enemies[7].assemblies[side]===0,g.snapshot().enemies[7].assemblies);
    }
    setup(0,-41);g.scenario({enemies:{boss:{state:'vent',timer:3.2,heading:0}}});
    for(let i=0;i<5;i++){g.aimAt(0,-51);g.fire();g.step(.6);}
    check('Core accepts five shots in one vent; Heat supplies the limit',g.snapshot().enemies[7].core===1&&g.snapshot().player.overheated,g.snapshot().enemies[7]);
    setup(0,-41);g.scenario({enemies:{boss:{state:'vent',timer:3.2,heading:0}}});g.aimAt(0,-51);g.fire();g.step(.6);
    check('Core hits defeat Overseer',g.snapshot().bossDead,g.snapshot().enemies[7]);
    setup(0,-60);g.setInput(['KeyW','KeyD']);g.step(1.2);g.setInput([]);check('Boss defeat opens physical exit gate',g.snapshot().player.z<-65,g.snapshot().player.z);
    setup(0,-70);g.repair();g.step(3.3);check('Third Hive saves completion and continues into the next region',g.snapshot().finished&&g.snapshot().anchor===2&&!g.snapshot().paused&&document.getElementById('completion')===null);
    const failed=results.filter(r=>!r.passed);if(failed.length)throw new Error(JSON.stringify(results));return results;
  });
}

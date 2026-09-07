async (page) => {
  await page.goto('http://127.0.0.1:5174/?test');
  await page.waitForFunction(() => window.__game);
  await page.evaluate(()=>localStorage.removeItem('furnace-born-v2-save'));
  await page.reload();
  await page.waitForFunction(()=>window.__game);
  return await page.evaluate(() => {
    const g=window.__game, results=[];
    const check=(name,condition,detail)=>{results.push({name,passed:!!condition,detail});};
    const setup=(x,z)=>{g.setInput([]);g.scenario({player:{x,z,hp:50,heat:0,overheated:false,speed:1,lastShot:-10,lastHeat:-10,invincible:0,underpass:false}});g.step(.02);};
    // Actual movement and collision, with fixed simulation time for reproducibility.
    setup(0,-16);g.scenario({player:{overdrive:false}});g.setInput(['KeyW','KeyD']);g.step(4);check('ordinary movement loses to gate',g.snapshot().player.z>-19,g.snapshot().player.z);
    setup(0,-16);g.scenario({player:{overdrive:true}});g.setInput(['KeyW','KeyD','ShiftLeft']);g.step(2.5);check('Overdrive crosses longer gate with heat to spare',g.snapshot().player.z<-22&&g.snapshot().player.heat<40,{z:g.snapshot().player.z,heat:g.snapshot().player.heat});
    setup(45,18);g.scenario({player:{overdrive:false}});g.setInput(['KeyW','KeyD']);g.step(2);check('B-C return blocked before acquisition',g.snapshot().player.z>15,g.snapshot().player.z);
    setup(45,18);g.scenario({player:{overdrive:true}});g.setInput(['KeyW','KeyD','ShiftLeft']);g.step(2);check('Longer B-C return opens with heat to spare',g.snapshot().player.z<14&&g.snapshot().player.heat<35,{z:g.snapshot().player.z,heat:g.snapshot().player.heat});
    setup(23,0);g.aimAt(27,0);g.fire();g.step(.3);check('Scouts die to one cannon hit',g.snapshot().enemies[0].hp===0,g.snapshot().enemies[0].hp);
    setup(83,21);g.aimAt(83,25);g.fire();g.step(.6);g.aimAt(83,25);g.fire();g.step(.3);check('Turret dies to two cannon hits',g.snapshot().enemies[5].hp===0,g.snapshot().enemies[5].hp);
    setup(16,25);g.aimAt(16,29);g.fire();g.step(.6);g.aimAt(16,29);g.fire();g.step(.4);check('West relay breaks',g.snapshot().relays[0].hp===0,g.snapshot().relays[0].hp);
    setup(82,29);g.aimAt(82,33);g.fire();g.step(.6);g.aimAt(82,33);g.fire();g.step(.4);check('Elevated east relay breaks',g.snapshot().relays[1].hp===0,g.snapshot().relays[1].hp);
    setup(52,47);g.setInput(['KeyS','KeyA']);g.step(1.2);check('Both relays open Elite barrier',g.snapshot().player.z>52,g.snapshot().player.z);
    setup(53,38);g.hitPlayer(20,55,38);g.repair();check('Repair restores HP and updates anchor',g.snapshot().anchor===1&&g.snapshot().player.hp===50);check('Repair resets ordinary enemies',g.snapshot().enemies[0].hp===1);
    setup(-15,-42);g.step(1.1);const hurt=g.snapshot().player;check('Furnace damage accumulates without safety teleport',hurt.hp<=40&&Math.abs(hurt.x+15)<.01,{hp:hurt.hp,x:hurt.x,z:hurt.z});
    setup(67,34);g.setInput(['KeyD','KeyS']);g.step(1.8);g.setInput([]);check('Ground route passes under elevated gallery',g.snapshot().player.x>77&&g.snapshot().player.underpass,g.snapshot().player);
    setup(53,38);g.hitPlayer(50,55,38);g.step(3.2);check('Death rebuilds at activated Hive',g.snapshot().player.hp===50&&g.snapshot().anchor===1&&g.snapshot().deathTime===-1,g.snapshot().player);
    const failed=results.filter(r=>!r.passed);if(failed.length)throw new Error(JSON.stringify(results));return results;
  });
}

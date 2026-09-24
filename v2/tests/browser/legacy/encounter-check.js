async(page)=>{
  await page.goto('http://127.0.0.1:5174/?chapter=2&test');await page.waitForFunction(()=>window.__game);
  return await page.evaluate(()=>{
    const g=window.__game,checks=[],initial=g.snapshot(),id=(type)=>initial.enemies.findIndex(e=>e.encounter&&e.type===type),scout=id('scout'),guard=id('guard'),turret=id('turret'),mortar=id('mortar');
    const quiet=Object.fromEntries(initial.enemies.map((_,i)=>[i,{hp:0}]));
    const check=(name,passed,detail)=>checks.push({name,passed:!!passed,detail});
    const reset=(x,z)=>{
      g.setInput([]);g.scenario({player:{x:-10,z:-117,hp:50,heat:0,overheated:false,weapon:'cannon',invincible:0,underpass:false}});g.step(1.1);g.repair();g.scenario({enemiesByIndex:quiet,player:{x,z,hp:50,heat:0,overheated:false,speed:1,lastShot:-10,lastHeat:-10,invincible:0,magnet:true,overdrive:true}});
    };
    const foe=(i,values)=>g.scenario({enemiesByIndex:{[i]:values}});
    reset(-50,-133);g.aimAt(-54,-133);g.fire();g.step(.6);check('Point-blank cannon damages breakable cargo',g.snapshot().props[0].hp===1);g.fire();g.step(.3);check('Destroying cargo opens its physical passage',!g.snapshot().props[0].active&&!g.collides(-54,-133));
    reset(-48,-133);g.setInput(['KeyW','KeyA','ShiftLeft']);g.step(1);g.setInput([]);check('Overdrive can ram through cargo without firing',!g.snapshot().props[0].active&&g.snapshot().player.x<-54,g.snapshot().player.x);
    reset(-49,-133);foe(scout,{x:-60,z:-133,hp:2,state:'charge',timer:.75,alertUntil:1e6,heading:Math.PI/2,chargeX:1,chargeZ:0});g.step(.5);
    check('Baited charge breaks cargo and leaves the attacker staggered',!g.snapshot().props[0].active&&g.snapshot().enemies[scout].state==='stunned',g.snapshot().enemies[scout]);
    reset(-70,-134);foe(scout,{x:-66,z:-136,hp:2,state:'stunned',timer:20});g.aimAt(-66,-132);g.fire();g.step(.2);
    check('Pressure vessel lights a visible fuse before detonating',g.snapshot().props[1].active&&g.snapshot().props[1].fuse>0);
    g.scenario({player:{x:-73,z:-139}});g.step(.9);check('An environmental explosion kills the nearby attacker while an escaping player survives',g.snapshot().enemies[scout].hp===0&&g.snapshot().player.hp===50);
    reset(-74,-146);g.aimAt(-80,-146);g.fire();g.step(1);check('Explosion starts a delayed chain reaction',g.snapshot().props[4].fuse>0&&g.snapshot().props[4].active);g.step(1);check('Chain reaction consumes the second vessel',!g.snapshot().props[4].active);check('Explosive machinery also damages the player',g.snapshot().player.hp===42,g.snapshot().player.hp);
    reset(10,-121);foe(turret,{x:10,z:-137,hp:2,state:'idle',timer:0});g.step(.65);const locked=g.snapshot().enemies[turret].aim;g.scenario({player:{x:17,z:-121}});g.step(.3);
    check('Turret commits its late warning aim instead of tracking evasive movement',Math.abs(g.snapshot().enemies[turret].aim-locked)<.001);g.step(.85);
    check('Three-shot volley ends in an exposed cooling window',g.snapshot().enemies[turret].state==='vent');g.aimAt(10,-137);g.fire();g.step(.6);check('A timed cannon counterattack exploits the open turret',g.snapshot().enemies[turret].hp===0);
    reset(10,-119);foe(scout,{x:10,z:-129,hp:2,state:'stunned',timer:20});foe(turret,{x:10,z:-137,hp:2,state:'burst',shotsLeft:3,cooldown:0,aim:0});g.step(1.2);check('Enemy direct fire can hit an intervening ally',g.snapshot().enemies[scout].hp===0);
    reset(10,-122);foe(mortar,{x:10,z:-138,hp:2,state:'idle',timer:0});g.step(.1);g.scenario({player:{x:17,z:-122}});foe(guard,{x:10,z:-122,hp:3,state:'idle',timer:20});g.step(2.3);
    check('A baited mortar strike destroys an ally at the original landing point',g.snapshot().enemies[guard].hp===0&&g.snapshot().player.hp===50);
    reset(-84,-186);foe(turret,{x:-63,z:-186,hp:2,state:'burst',shotsLeft:3,cooldown:0,aim:-Math.PI/2});g.step(1.8);check('Rail-mounted armour blocks a volley',g.snapshot().player.hp===50);
    foe(turret,{hp:0});g.scenario({player:{x:-74,z:-174,heat:0,overheated:false}});g.aimAt(-74,-186);g.setInput(['Mouse2']);g.step(2.5);g.setInput([]);g.step(.05);
    check('Magnetic pulling repositions the same reusable cover',g.snapshot().transit.rails['crane-cover']>-181,g.snapshot().transit.rails['crane-cover']);
    g.scenario({player:{x:-84,z:-186,invincible:0}});foe(turret,{x:-63,z:-186,hp:2,state:'burst',shotsLeft:3,cooldown:0,aim:-Math.PI/2});g.step(1.8);check('Moving cover really opens the firing lane',g.snapshot().player.hp<50,g.snapshot().player.hp);
    reset(-16,-117);foe(turret,{x:13,z:-117,hp:2,state:'vent',timer:20});g.aimAt(13,-117);g.fire();g.step(1);check('Cannon no longer snipes beyond its effective range',g.snapshot().enemies[turret].hp===2);

    reset(92,-169);const opticalGuard=initial.enemies.findIndex(e=>e.encounter==='optical'&&e.type==='guard'),opticalMortar=initial.enemies.findIndex(e=>e.encounter==='optical'&&e.type==='mortar');
    foe(opticalGuard,{x:92,z:-164,hp:3,state:'idle',timer:20});foe(opticalMortar,{x:89,z:-196,hp:2,state:'idle',timer:0});g.step(.1);
    check('A visible spotter enables its mortar partner to fire over cover',!g.lineClear(89,-196,92,-169)&&g.snapshot().enemies[opticalMortar].state==='warn');
    foe(opticalGuard,{hp:0});g.step(4.6);check('Removing the spotter ends blind fire after the last sighting expires',!g.snapshot().enemies[opticalMortar].active);
    reset(-10,-117);check('Rest rebuilds ordinary combat props',g.snapshot().props.every(p=>p.active&&p.fuse===-1));
    if(checks.some(c=>!c.passed))throw new Error(JSON.stringify(checks));return checks;
  });
}

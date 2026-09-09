async(page)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5174/?chapter=4&test');await page.evaluate(()=>localStorage.removeItem('furnace-born-v2-midgame-preview'));await page.reload();await page.waitForFunction(()=>window.__game);
  const checks=await page.evaluate(()=>{
    const g=window.__game,checks=[],check=(name,passed,detail)=>checks.push({name,passed:!!passed,detail});
    const initial=g.snapshot(),quiet=Object.fromEntries(initial.enemies.map((_,i)=>[i,{hp:0}]));
    const setup=(x,z,extra={})=>{g.setInput([]);g.scenario({enemiesByIndex:quiet,player:{x,z,hp:50,heat:0,overheated:false,speed:1,lastHeat:-10,lastShot:-10,shotCooldown:.5,weapon:'cannon',overdrive:true,phoenix:false,laser:false,circulation:false,flotation:false,deployed:false,afloat:false,underpass:false,invincible:0,...extra}});g.step(.02);};
    check('Middle preview begins with Mortar and no later module',initial.player.mortar&&!initial.player.phoenix&&!initial.player.laser&&!initial.player.circulation);
    setup(-15,-412);g.interact();check('Phoenix is recovered from the shared rig',g.snapshot().player.phoenix);
    setup(12,-406,{phoenix:true});g.setInput(['KeyS','KeyD','ShiftLeft']);g.step(.5);check('Phoenix keeps ordinary acceleration',Math.abs(g.snapshot().player.speed-1.6)<.03,g.snapshot().player.speed);g.step(2.2);g.setInput([]);
    check('Full momentum breaks launch gate and continues forward',g.snapshot().midgame.opened.includes('launch')&&g.snapshot().player.x>53,g.snapshot().player.x);
    setup(140,-256,{phoenix:true});g.setInput(['KeyS','KeyD','ShiftLeft']);g.step(2.3);g.setInput([]);check('Phoenix opens the west calibration entrance',g.snapshot().midgame.opened.includes('calibration-west'));
    setup(190,-124,{phoenix:true});g.interact();check('Laser is acquired before the guardian',g.snapshot().player.laser&&g.snapshot().player.weapon==='laser'&&!g.snapshot().midgame.guardianDead);
    setup(190,-134,{phoenix:true,laser:true,weapon:'laser'});g.aimAt(202,-134);g.setInput(['Mouse0']);g.step(.2);g.setInput([]);
    check('Calibration mirror reflects into the receiver',g.snapshot().midgame.opened.includes('mirror-gallery'),g.snapshot().laser);
    check('Laser uses continuous shared Heat',g.snapshot().player.heat>4&&g.snapshot().player.heat<6,g.snapshot().player.heat);
    setup(166,-110,{phoenix:true,laser:true});g.interact();check('Loading shortcut opens before guardian',g.snapshot().midgame.opened.includes('loading-lift'));
    setup(182,-286,{phoenix:true,laser:true,weapon:'laser'});g.aimAt(182,-278);g.setInput(['Mouse0']);g.step(.2);g.setInput([]);check('Optical garden bridges open before guardian',g.snapshot().midgame.opened.includes('garden-west'));
    setup(202,-238,{phoenix:true,laser:true,weapon:'laser'});g.aimAt(202,-230);g.setInput(['Mouse0']);g.step(.2);g.setInput([]);check('Optical service bridge opens before guardian',g.snapshot().midgame.opened.includes('circulation-bridge'));
    setup(98,-394,{phoenix:true});g.setInput(['KeyS','KeyD','ShiftLeft']);g.step(2.5);g.setInput([]);check('Circulation entrance needs no Laser',g.snapshot().midgame.opened.includes('circulation-entry'));
    setup(158,-432,{phoenix:true});g.aimAt(158,-442);g.fire();g.step(.5);check('Cannon powers the pressure feed without Laser',g.snapshot().midgame.opened.includes('rig-feed'));
    setup(228,-438,{phoenix:true});g.interact();check('Water circulation can be acquired without Laser',g.snapshot().player.circulation&&!g.snapshot().player.laser);
    setup(228,-428,{phoenix:true,circulation:true});g.setInput(['KeyS','KeyA','ShiftLeft']);g.step(20);g.setInput([]);check('Hot engine physically crosses the full opposing lane',g.snapshot().player.z>-350&&g.snapshot().player.overheated,g.snapshot().player);
    setup(228,-340,{phoenix:true,circulation:true});g.interact();check('Pressure bypass and garden return open at the far landing',g.snapshot().midgame.opened.includes('pressure-bypass')&&g.snapshot().midgame.opened.includes('garden-service-return'));
    setup(228,-428,{phoenix:true});g.setInput(['KeyS','KeyA','ShiftLeft']);g.step(20);g.setInput([]);check('Cold Phoenix cannot cross the same lane',g.snapshot().player.z<-350,g.snapshot().player.z);
    const guard=initial.enemies.findIndex(e=>e.encounter==='r5-launch'&&e.type==='guard'),guardian=initial.enemies.findIndex(e=>e.type==='guardian'),mirror=initial.enemies.findIndex(e=>e.type==='mirror');
    setup(30,-406,{phoenix:true,speed:3.2});g.scenario({enemiesByIndex:{[guard]:{x:35,z:-406,hp:3,heading:-Math.PI/2,state:'idle',timer:20}}});g.setInput(['KeyS','KeyD','ShiftLeft']);g.step(.3);g.setInput([]);check('Maximum Phoenix destroys an ordinary armoured guard',g.snapshot().enemies[guard].hp===0);
    setup(232,-224,{laser:true,weapon:'laser'});g.scenario({enemiesByIndex:{[guardian]:{hp:18,x:232,z:-235,heading:0,state:'idle',timer:20}}});g.aimAt(232,-235);g.setInput(['Mouse0']);g.step(.3);g.setInput([]);check('Guardian rejects a frontal Laser',g.snapshot().enemies[guardian].hp===18);
    setup(232,-224,{weapon:'mortar'});g.scenario({enemiesByIndex:{[guardian]:{hp:18,x:232,z:-235,heading:0,state:'idle',timer:20}}});g.aimAt(232,-235);g.fire();g.step(1.3);check('Guardian roof rejects overhead Mortar',g.snapshot().enemies[guardian].hp===18);
    setup(232,-226,{laser:true,weapon:'laser'});g.scenario({enemiesByIndex:{[guardian]:{hp:18,x:232,z:-235,heading:0,state:'idle',timer:20}}});g.aimAt(211,-256);g.setInput(['Mouse0']);g.step(.3);g.setInput([]);check('Reflected final segment can strike guardian rear',g.snapshot().enemies[guardian].hp<18,{hp:g.snapshot().enemies[guardian].hp,segments:g.snapshot().laser});
    setup(232,-231.2,{circulation:true,heat:100,overheated:true,lastHeat:g.snapshot().time});g.scenario({enemiesByIndex:{[guardian]:{hp:18,x:232,z:-235,heading:0,state:'idle',timer:20,ramAt:-10}}});g.step(.1);check('Red contact damages an armoured guardian even at low speed',g.snapshot().enemies[guardian].hp===16,g.snapshot().enemies[guardian].hp);
    setup(227,-140,{laser:true,weapon:'laser'});g.scenario({enemiesByIndex:{[mirror]:{hp:3,x:227,z:-150,heading:0,state:'idle',timer:20}}});g.aimAt(227,-150);g.setInput(['Mouse0']);g.step(.2);g.setInput([]);check('Inspector mirror reflects before its body',g.snapshot().laser[0]?.kind==='mirror'&&g.snapshot().enemies[mirror].hp===3,g.snapshot().laser);
    setup(232,-231.2,{circulation:true,heat:100,overheated:true,lastHeat:g.snapshot().time});g.scenario({enemiesByIndex:{[guardian]:{hp:2,x:232,z:-235,heading:0,state:'idle',timer:20,ramAt:-10}}});g.step(.1);check('Guardian defeat persists as regional progression',g.snapshot().midgame.guardianDead);
    setup(244,-258);g.interact();check('Outward signal remains optional and follows guardian defeat',g.snapshot().midgame.signal);
    for(const type of ['scout','turret','mortar','guard','mirror','elite','boss']){
      const index=initial.enemies.findIndex(e=>e.type===type),e=initial.enemies[index],radius=type==='boss'?4.8:type==='elite'?1.9:['turret','mortar'].includes(type)?1:1.5;
      setup(e.x,e.z+radius+.8,{circulation:true,heat:100,overheated:true,lastHeat:g.snapshot().time});
      g.scenario({enemiesByIndex:{[index]:{hp:type==='boss'?14:6,state:'idle',timer:20,heading:0,ramAt:-10,assemblies:[4,4],core:6}}});g.step(.1);
      check(`Red contact damages ${type}`,g.snapshot().enemies[index].hp===(type==='boss'?12:4),g.snapshot().enemies[index].hp);
    }
    setup(-14,-49.2,{laser:true,weapon:'laser'});g.scenario({enemies:{boss:{hp:14,x:0,z:-51,heading:0,state:'vent',timer:20,openSide:0,assemblies:[4,4],core:6}}});g.step(.05);g.aimAt(-7.5,-49.2);g.setInput(['Mouse0']);g.step(.3);g.setInput([]);
    check('Laser can hit an exposed original Boss assembly',g.snapshot().enemies.find(e=>e.type==='boss').assemblies[0]<4,g.snapshot().enemies.find(e=>e.type==='boss').assemblies);
    setup(235,-444,{phoenix:true,laser:true,circulation:true});g.repair();check('Rest preserves every opened connector and the defeated guardian',g.snapshot().midgame.signal&&g.snapshot().enemies[guardian].hp===0&&g.snapshot().midgame.opened.includes('pressure-bypass'));
    g.hitPlayer(50,235,-444);g.step(3.2);check('Death preserves installed modules and permanent shortcuts',g.snapshot().player.hp===50&&g.snapshot().player.laser&&g.snapshot().midgame.opened.includes('pressure-bypass'));
    return checks;
  });
  await page.reload();await page.waitForFunction(()=>window.__game);const saved=await page.evaluate(()=>window.__game.snapshot());checks.push({name:'Reload preserves modules, return network and signal',passed:saved.player.phoenix&&saved.player.laser&&saved.player.circulation&&saved.midgame.signal&&saved.midgame.opened.includes('pressure-bypass')});
  if(errors.length||checks.some(c=>!c.passed))throw Error(JSON.stringify({errors,failed:checks.filter(c=>!c.passed)}));return checks;
}

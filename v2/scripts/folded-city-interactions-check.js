async page=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5174/?chapter=folded&test');await page.waitForFunction(()=>!!window.__game);
  await page.evaluate(()=>localStorage.removeItem('furnace-born-v2-city'));await page.reload();await page.waitForFunction(()=>!!window.__game);
  await page.evaluate(()=>window.__game.manual(true));
  const result={};
  async function scenario(player,state={}){await page.evaluate(({player,state})=>{const g=window.__game;g.setInput([]);g.scenario({player:{hp:50,heat:0,overheated:false,lastShot:-100,lastHeat:-100,weapon:'cannon',endingTime:0,...player},state});g.step(.3);},{player,state});}
  async function fireAt(x,z,y,seconds=1.2){const q=await page.evaluate(([x,z,y])=>window.__game.project(x,z,y),[x,z,y]);await page.mouse.move(q.x,q.y);await page.mouse.down();await page.evaluate(t=>window.__game.step(t),seconds);await page.mouse.up();}
  async function snap(){return page.evaluate(()=>window.__game.snapshot());}
  await scenario({x:20,y:0,z:-46},{freight:false});await fireAt(32,-34,1.3);
  if((await snap()).state.freight)throw Error('C02 return bypassed the Mortar enclosure');
  await scenario({x:18,y:0,z:-34,mortar:true,weapon:'mortar'},{freight:false});await fireAt(32,-34,1.3,1.4);
  if(!(await snap()).state.freight)throw Error('Mortar failed to enter the open-topped enclosure');result.freightEnclosure=true;
  await scenario({x:216,y:24,z:-20,laser:true,weapon:'laser'},{gallery:false});
  await fireAt(216,-4,26,1);
  let s=await snap();if(!s.state.gallery)throw Error('Reflected calibration receiver failed '+JSON.stringify({aim:s.aim,beam:s.laserSegments}));
  result.mirrorReceiver=true;await page.screenshot({path:'v2/output/playwright/city-mirror.png'});
  await scenario({x:228,y:24,z:5,laser:true,weapon:'laser'},{gallery:false});await fireAt(228,-3.73,28.54,1);
  if((await snap()).state.gallery)throw Error('Receiver allowed a direct shot from the gallery');result.receiverScreen=true;
  await scenario({x:196,y:16,z:50,laser:true,weapon:'laser'},{guardian:false,gallery:true});
  await fireAt(202,64,18,1);const front=(await snap()).enemies.find(e=>e.id==='guardian').hp;
  await scenario({x:196,y:16,z:50,laser:true,weapon:'laser'});await fireAt(222,50,18,1);
  s=await snap();const rear=s.enemies.find(e=>e.id==='guardian').hp;
  if(front!==36||rear>=front-1)throw Error('Guardian rear reflection failed '+JSON.stringify({front,rear,aim:s.aim,beam:s.laserSegments}));
  result.guardian={front,rear};await page.screenshot({path:'v2/output/playwright/city-guardian.png'});
  for(const [id,y,z,hp]of [['guardian',16,64,36],['keeper',-56,32,48]]){
    await scenario({x:id==='guardian'?194:-8,y,z,overdrive:true,phoenix:true,circulation:true,overheated:true,heat:100,speed:3.2},{[id]:false});
    await page.evaluate(({id,hp})=>__game.scenario({player:{speed:3.2,heat:100,overheated:true},enemies:{[id]:hp}}),{id,hp});
    const hits=await page.evaluate(({id})=>{const g=window.__game,health=[];for(const keys of [['KeyS','KeyD','ShiftLeft'],['KeyW','KeyA','ShiftLeft']]){g.setInput(keys);g.step(.8,false);health.push(g.snapshot().enemies.find(e=>e.id===id).hp);}g.setInput([]);return health;},{id});
    if(hits[0]!==hp-24||hits[1]!==0)throw Error('Red contact lost damage '+id+' '+JSON.stringify(hits));result[id+'Red']=hits;
  }
  await scenario({x:64,y:-8,z:-28},{pump:false});await page.evaluate(()=>window.__game.step(1));await fireAt(72,-28,-4.5);
  if(!(await snap()).state.pump)throw Error('Hull pressure and cannon pump failed');result.pump=true;
  await scenario({x:218,y:-16,z:13},{'pressure-return':false});await fireAt(218,18,-14.6);
  if(!(await snap()).state['pressure-return'])throw Error('Far-side pressure return failed');result.pressureReturn=true;
  await scenario({x:198,y:40,z:146},{signal:false});await page.keyboard.press('e');if(!(await snap()).state.signal)throw Error('Signal restoration failed');
  await scenario({x:0,y:-56,z:0},{keeper:true});await page.keyboard.down('e');await page.evaluate(()=>window.__game.step(.9));await page.keyboard.up('e');await page.evaluate(()=>window.__game.step(.1));
  if((await snap()).player.endingTime)throw Error('Ending failed to cancel');result.dockCancel=true;
  await page.keyboard.down('e');await page.evaluate(()=>window.__game.step(2.2));await page.keyboard.up('e');await page.evaluate(()=>window.__game.step(8));
  s=await snap();if(!s.state.endingSeen||s.player.endingTime<7)throw Error('Voluntary ending failed');result.voluntaryEnding=true;
  await page.screenshot({path:'v2/output/playwright/city-ending.png'});
  await page.reload();await page.waitForFunction(()=>!!window.__game);await page.evaluate(()=>window.__game.manual(true));
  s=await snap();if(s.player.endingTime||!s.state.endingSeen||!s.state.keeper)throw Error('Continue did not preserve pre-ending world');result.continue=true;
  if(errors.length)throw Error(JSON.stringify(errors));return {...result,errors};
}

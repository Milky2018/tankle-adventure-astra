// Real mouse firing from isolated, reproducible viewpoints. World access only
// inspects physical target directionality; aiming never uses project/aimAt.
async page=>{
 const errors=[],runs=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1440,height:900});
 for(const [id,x,z,yaw,mx,my]of [['bridge-crane',0,-6,Math.PI,696,277],['freight',18,-34,Math.PI/2,686,273]])for(const weapon of ['cannon','mortar']){
  await page.goto('http://127.0.0.1:5174/?chapter=folded&view=third&test');await page.waitForFunction(()=>window.__game?.debug);
  await page.evaluate(()=>localStorage.clear());await page.reload();await page.waitForFunction(()=>window.__game?.debug);
  await page.evaluate(({id,x,z,yaw,weapon})=>{__game.manual(true);__game.scenario({player:{x,y:0,z,hp:50,mortar:true,weapon},state:{[id]:false},enemies:Object.fromEntries(__game.snapshot().enemies.map(e=>[e.id,0]))});__game.look(yaw,.32);__game.step(.1);},{id,x,z,yaw,weapon});
  const physical=await page.evaluate(id=>{const {world,T}=__game.debug,c=world.controls.find(c=>c.id===id),cast=(y,dy)=>world.cast(new T.Vector3(c.x,c.y+y,c.z),new T.Vector3(0,dy,0),4);const below=cast(-2,1),above=cast(2,-1);return {blocked:below?.blockedTarget?.id,below:below?.target?.id,above:above?.target?.id};},id);
  if(physical.blocked!==id||physical.below===id||physical.above!==id)throw Error('Pressure tray lacks directional contact '+id);
  await page.mouse.click(720,450);await page.waitForFunction(()=>!!document.pointerLockElement);await page.mouse.move(mx,my,{steps:15});
  await page.evaluate(()=>__game.manual(false));await page.waitForTimeout(200);await page.screenshot({path:`v2/output/playwright/transit/input-${id}-${weapon}-aim.png`});
  await page.mouse.down();await page.waitForTimeout(1600);await page.mouse.up();await page.evaluate(()=>__game.manual(true));
  const result=await page.evaluate(id=>({id,open:__game.snapshot().state[id],aim:__game.snapshot().aim}),id);
  await page.screenshot({path:`v2/output/playwright/transit/input-${id}-${weapon}-result.png`});
  if(result.open!==(weapon==='mortar'))throw Error(JSON.stringify({weapon,...result}));runs.push({weapon,...result,physical});
 }
 if(errors.length)throw Error(JSON.stringify(errors));return {runs,errors,scope:'Isolated ordinary mouse input, not a blind navigation study'};
}

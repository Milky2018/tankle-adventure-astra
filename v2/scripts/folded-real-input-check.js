// Fixtures establish the start only. Aiming and firing use browser mouse events,
// with the ordinary animation clock; no aimAt, project, fire, hit or input hooks.
async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1280,height:720});
 async function fixture(weapon){
  await page.goto('http://127.0.0.1:5174/?chapter=folded&view=third&test');await page.waitForFunction(()=>window.__game);
  await page.evaluate(weapon=>{
   __game.manual(true);const enemies=Object.fromEntries(__game.snapshot().enemies.map(e=>[e.id,0]));
   __game.scenario({player:{x:90,y:0,z:-18,hp:50,heat:0,overheated:false,lastHeat:-100,lastShot:-100,mortar:true,weapon},state:{load:false},enemies});
   __game.look(Math.PI,.2);__game.step(.016);
  },weapon);
  await page.mouse.click(640,360);await page.waitForFunction(()=>!!document.pointerLockElement);
  await page.mouse.move(627,196,{steps:25});
  await page.evaluate(()=>__game.manual(false));await page.waitForTimeout(300);
 }
 const runs=[];
 for(const weapon of ['cannon','mortar']){
  await fixture(weapon);await page.mouse.down();await page.waitForTimeout(1500);await page.mouse.up();await page.evaluate(()=>__game.manual(true));
  const run=await page.evaluate(()=>({weapon:__game.snapshot().player.weapon,opened:__game.snapshot().state.load,cameraY:__game.snapshot().camera.position[1],reticles:document.querySelectorAll('#reticle').length}));
  if(run.opened!==(weapon==='mortar')||run.cameraY<3||run.reticles!==1)throw Error(JSON.stringify(run));runs.push(run);
  await page.screenshot({path:`output/playwright/craft/real-${weapon}-screen.png`});
 }
 await page.goto('http://127.0.0.1:5174/?chapter=folded&view=third&test');await page.waitForFunction(()=>window.__game);
 await page.evaluate(()=>{
  __game.manual(true);__game.scenario({player:{x:216,y:24,z:-20,hp:50,heat:0,overheated:false,laser:true,weapon:'laser'},state:{gallery:false,'garden-optical':false,'mirror-index':false},enemies:Object.fromEntries(__game.snapshot().enemies.map(e=>[e.id,0]))});
  __game.look(0,.1);__game.step(.016);
 });
 await page.mouse.click(640,360);await page.waitForFunction(()=>!!document.pointerLockElement);await page.mouse.move(610,354,{steps:15});
 await page.evaluate(()=>__game.manual(false));await page.mouse.down();await page.waitForTimeout(700);await page.screenshot({path:'output/playwright/craft/real-laser.png'});await page.mouse.up();await page.evaluate(()=>__game.manual(true));
 const laser=await page.evaluate(()=>({opened:__game.snapshot().state.gallery,segments:__game.snapshot().laserSegments.length/6}));
 if(!laser.opened||laser.segments<2)throw Error('Real mouse reflection failed '+JSON.stringify(laser));
 if(errors.length)throw Error(JSON.stringify(errors));return {runs,laser,errors,scope:'Isolated real mouse aiming and firing; not a novice navigation study'};
}

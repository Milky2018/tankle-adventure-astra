async page=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.unroute('**/src/folded.js*');
  await page.route('**/src/folded.js*',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:await r.text()+'\nwindow.__mapCheck={reveal(){for(const d of foldedDecks)discovered.add(d.id);setMap(true);},get links(){return mapLinks;},get layer(){return chosenLayer;}};'});});
  await page.setViewportSize({width:1280,height:720});
  await page.goto('http://127.0.0.1:5174/?chapter=folded&test');await page.waitForFunction(()=>window.__mapCheck);
  await page.evaluate(()=>{__game.manual(true);__game.scenario({player:{x:0,y:0,z:27}});__mapCheck.reveal();});
  const before=await page.evaluate(()=>({layer:__mapCheck.layer,links:__mapCheck.links,player:__game.snapshot().player}));
  const link=before.links.find(l=>l.x>20&&l.x<1260&&l.y>20&&l.y<700);
  if(!link)throw Error('No visible connection to another known landing');
  await page.mouse.move(link.x,link.y);if(await page.locator('#region-map').evaluate(c=>c.style.cursor)!=='pointer')throw Error('Connection has no pointer feedback');
  await page.mouse.click(link.x,link.y);
  const after=await page.evaluate(()=>({layer:__mapCheck.layer,player:__game.snapshot().player,selected:document.querySelector('.layer-bar.selected').getAttribute('aria-label')}));
  if(after.layer!==link.destination||after.player.x!==before.player.x||after.player.y!==before.player.y||after.player.z!==before.player.z)throw Error('Map connection failed '+JSON.stringify({before,after}));
  await page.screenshot({path:'output/playwright/craft/map-connection.png'});
  if(errors.length)throw Error(JSON.stringify(errors));return {from:before.layer,to:after.layer,selected:after.selected,errors};
}

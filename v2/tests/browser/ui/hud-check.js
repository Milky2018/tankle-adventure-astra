async page=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test');await page.waitForFunction(()=>!!window.__game);
  // Clear only this isolated browser's city save and input preferences.
  await page.evaluate(()=>{localStorage.removeItem('furnace-born-v2-city');localStorage.removeItem('furnace-born-v2-settings');});
  await page.reload();await page.waitForFunction(()=>!!window.__game);await page.evaluate(()=>window.__game.manual(true));
  async function hud(){return page.evaluate(()=>({
    cards:[...document.querySelectorAll('.ability-card')].filter(c=>!c.hidden).map(c=>({id:c.dataset.ability,selected:c.classList.contains('selected'),active:c.classList.contains('active'),fresh:c.classList.contains('new-ability'),key:c.querySelector('kbd').dataset.button,icon:c.querySelector('path').getAttribute('d')})),
    acquired:document.getElementById('acquired').dataset.ability,shown:getComputedStyle(document.getElementById('acquired')).display!=='none',
    demo:document.querySelector('#acquired>svg')?.innerHTML,keys:[...document.querySelectorAll('#acquired kbd')].map(k=>k.dataset.button)
  }));}
  let s=await hud();if(s.cards.length!==1||s.cards[0].id!=='cannon'||!s.cards[0].selected)throw Error('Fresh save exposed unowned abilities');
  const pickups=[['overdrive',-30,-16,128],['magnet',-50,8,33],['mortar',0,0,12],['flotation',-46,-8,-7],['phoenix',77,16,-87],['laser',228,24,-20],['circulation',222,-24,117]];
  const demonstrations=[];
  for(const [id,x,y,z]of pickups){
    await page.evaluate(({x,y,z})=>{window.__game.scenario({player:{x,y,z,hp:50},state:{prototype:true},enemies:{prototype:0}});window.__game.step(0);},{x,y,z});
    await page.keyboard.press('e');await page.evaluate(()=>window.__game.step(1/60));
    s=await hud();const card=s.cards.find(c=>c.id===id);
    if(!card||!card.fresh||!s.shown||s.acquired!==id||!s.demo)throw Error('Pickup did not install its HUD and demonstration: '+id);
    if(id==='mortar'||id==='laser'){if(s.keys.join(',')!=='KeyQ,Mouse0')throw Error('Weapon demonstration omitted select/fire inputs');}
    if(id==='phoenix'||id==='circulation'){if(card.key!=='ShiftLeft')throw Error('Engine upgrade lost its acceleration binding');}
    demonstrations.push(s.demo);
    if(id==='mortar'){await page.screenshot({path:'output/playwright/hud-mortar.png'});}
  }
  if(s.cards.length!==8||new Set(s.cards.map(c=>c.icon)).size!==8||new Set(demonstrations).size!==7)throw Error('Abilities share an icon or demonstration');
  await page.keyboard.press('q');await page.evaluate(()=>window.__game.step(0));s=await hud();
  if(!s.cards.find(c=>c.id==='mortar'&&c.selected&&c.key==='Mouse0')||s.cards.find(c=>c.id==='cannon').key!=='KeyQ')throw Error('Selected weapon or input hints did not switch');
  await page.keyboard.press('q');await page.evaluate(()=>window.__game.step(0));s=await hud();if(!s.cards.find(c=>c.id==='laser'&&c.selected))throw Error('Laser is not independently visible');
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'KeyQ',exact:true}).click();await page.keyboard.press('x');await page.keyboard.press('Escape');
  await page.evaluate(()=>window.__game.step(0));s=await hud();if(s.cards.find(c=>c.id==='mortar').key!=='KeyX')throw Error('HUD ignored remapped weapon binding');
  await page.keyboard.press('x');await page.evaluate(()=>window.__game.step(0));s=await hud();if(!s.cards.find(c=>c.id==='cannon'&&c.selected))throw Error('Remapped weapon selection failed');
  await page.keyboard.press('f');await page.evaluate(()=>window.__game.step(1/60));s=await hud();
  if(!s.cards.find(c=>c.id==='flotation').active)throw Error('Deploying pontoons did not update the HUD');
  await page.keyboard.press('f');
  await page.evaluate(()=>{const g=window.__game;g.scenario({player:{x:100,y:16,z:-86,overheated:true,heat:100,speed:1,lastHeat:g.snapshot().time}});});
  await page.keyboard.down('s');await page.keyboard.down('d');await page.keyboard.down('Shift');await page.evaluate(()=>window.__game.step(1.9));
  s=await hud();for(const id of ['overdrive','phoenix','circulation'])if(!s.cards.find(c=>c.id===id).active)throw Error('Overheated acceleration state is missing: '+id);
  await page.keyboard.up('s');await page.keyboard.up('d');await page.keyboard.up('Shift');
  await page.screenshot({path:'output/playwright/hud-all-abilities.png'});
  await page.setViewportSize({width:375,height:720});await page.evaluate(()=>window.__game.step(0));
  const fits=await page.evaluate(()=>[...document.querySelectorAll('.ability-card'),document.getElementById('acquired')].every(e=>{const r=e.getBoundingClientRect();return r.x>=0&&r.right<=innerWidth&&r.y>=0&&r.bottom<=innerHeight;}));
  if(!fits)throw Error('Ability HUD leaves the narrow viewport');await page.screenshot({path:'output/playwright/hud-narrow.png'});
  await page.setViewportSize({width:1280,height:720});
  await page.reload();await page.waitForFunction(()=>!!window.__game);await page.evaluate(()=>{window.__game.manual(true);window.__game.step(0);});
  s=await hud();if(s.cards.length!==8||s.shown||s.cards.some(c=>c.fresh)||s.cards.find(c=>c.id==='mortar').key!=='KeyX')throw Error('Reload lost abilities or replayed acquisition');
  if(errors.length)throw Error(JSON.stringify(errors));return {pickups:7,uniqueIcons:8,uniqueDemonstrations:7,weaponSelection:true,remapping:true,abilityStates:true,narrowViewport:true,reload:true,errors};
}

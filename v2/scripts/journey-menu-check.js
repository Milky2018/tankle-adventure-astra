async page=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{const url=new URL(location.href);if(url.searchParams.has('chapter')){url.searchParams.set('test','');history.replaceState(null,'',url);}});
  await page.goto('http://127.0.0.1:5174/');
  await page.evaluate(()=>{localStorage.removeItem('furnace-born-v2-city');localStorage.removeItem('furnace-born-v2-folded-foundry');});
  await page.reload();await page.getByRole('heading',{name:'旅程与选关'}).waitFor();
  if(await page.getByRole('button',{name:'Continue',exact:true}).isVisible())throw Error('Empty save offers Continue');
  if(await page.evaluate(()=>!!window.__game))throw Error('Main menu started the world');
  async function game(){await page.waitForFunction(()=>!!window.__game);return page.evaluate(()=>{window.__game.manual?.(true);return window.__game.snapshot();});}
  function first(s){if(s.player.x!==0||s.player.y!==-8||s.player.z!==86||['overdrive','magnet','mortar','flotation','phoenix','laser','circulation'].some(k=>s.player[k]))throw Error('First level did not start at awakening with Cannon only');}
  async function openMenu(){await page.getByRole('button',{name:'Open settings'}).click();await page.getByRole('button',{name:'Journey menu'}).click();await page.getByRole('heading',{name:'旅程与选关'}).waitFor();}
  await page.getByRole('button',{name:'New campaign',exact:true}).click();first(await game());
  await page.evaluate(()=>localStorage.setItem('furnace-born-v2-city',JSON.stringify({anchor:'roof',overdrive:true,phoenix:true,magnetModule:true,mortarModule:true,flotation:true,laser:true,circulation:true,discovered:['roof-walk']})));
  await page.goto('http://127.0.0.1:5174/');await page.getByRole('button',{name:'Continue',exact:true}).waitFor();
  await page.screenshot({path:'output/playwright/journey-main-menu.png'});
  const cityBefore=await page.evaluate(()=>localStorage.getItem('furnace-born-v2-city'));
  await page.getByRole('button',{name:/Chapter 1 · Foundry/}).click();first(await game());
  if((await page.evaluate(()=>localStorage.getItem('furnace-born-v2-city')))!==cityBefore)throw Error('First-level preview overwrote campaign');
  await openMenu();await page.keyboard.press('Escape');
  if(await page.getByRole('heading',{name:'旅程与选关'}).isVisible()||!(await page.evaluate(()=>window.__game.snapshot())).paused)throw Error('Escape resumed play behind the menu');
  await page.getByRole('button',{name:'Journey menu'}).click();
  await page.getByRole('button',{name:/Garden entrance/}).click();let s=await game();
  if(!s.player.overdrive||!s.player.magnet||s.player.mortar||s.player.y!==0)throw Error('Garden preview loadout changed');
  await openMenu();await page.getByRole('button',{name:/Freight entrance/}).click();s=await game();
  if(!s.player.overdrive||!s.player.mortar||s.player.magnet||s.player.y!==0)throw Error('Freight preview loadout changed');
  await openMenu();await page.getByRole('button',{name:'Continue',exact:true}).click();s=await game();
  if(s.player.x!==32||s.player.y!==24||s.player.z!==6||!s.player.circulation)throw Error('Continue did not restore the campaign checkpoint');
  const protectedSaves=await page.evaluate(()=>Object.fromEntries(['foundry','garden','freight'].map(id=>{const key=`furnace-born-v2-folded-${id}`;return [key,localStorage.getItem(key)];})));
  await openMenu();const beforeReset=await page.evaluate(()=>localStorage.getItem('furnace-born-v2-city'));
  await page.getByRole('button',{name:'New campaign',exact:true}).click();
  if((await page.evaluate(()=>localStorage.getItem('furnace-born-v2-city')))!==beforeReset||!await page.getByRole('button',{name:'Confirm new campaign',exact:true}).isVisible())throw Error('Restart skipped confirmation');
  await page.getByRole('button',{name:'Confirm new campaign',exact:true}).click();first(await game());
  if(!await page.evaluate(expected=>Object.entries(expected).every(([k,v])=>localStorage.getItem(k)===v),protectedSaves))throw Error('Restart touched another save');
  // Every historical entry uses the same explicit route back to the current first level.
  for(const name of ['Archived Foundry','Archived Freight','Archived Garden','Archived midgame','Archived Hoist']){
    await openMenu();await page.getByText('Archived maps',{exact:true}).click();await page.getByRole('link',{name,exact:true}).click();await game();
  }
  await openMenu();await page.getByRole('button',{name:/Chapter 1 · Foundry/}).click();first(await game());
  await page.goto('http://127.0.0.1:5174/');await page.setViewportSize({width:390,height:760});
  await page.getByRole('heading',{name:'旅程与选关'}).waitFor();
  if(await page.evaluate(()=>document.querySelector('.journey-panel').getBoundingClientRect().right>innerWidth))throw Error('Menu overflows narrow viewport');
  await page.screenshot({path:'output/playwright/journey-menu-narrow.png',fullPage:true});await page.setViewportSize({width:1280,height:720});
  if(errors.length)throw Error(JSON.stringify(errors));return {firstLevel:true,independentPreviews:3,continueCheckpoint:true,confirmedRestart:true,historicalEntries:5,escapeStaysPaused:true,narrowLayout:true,errors};
}

async page => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  // Exercise the real entries with development observation, including menu navigation.
  await page.addInitScript(() => {
    const url = new URL(location.href);
    if (url.searchParams.has('chapter')) {
      url.searchParams.set('test', '');
      url.searchParams.set('manual', '');
      history.replaceState(null, '', url);
    }
  });
  const waitForGame = async () => {
    try { await page.waitForFunction(() => !!window.__game); }
    catch (error) { throw Error(page.url() + ': ' + errors.join('; ') + ': ' + error.message); }
  };
  const origin = 'http://127.0.0.1:5174/';
  await page.goto(origin);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator('#journey-title').waitFor();
  if (await page.locator('#journey-continue').isVisible())
    throw Error('Empty save offers Continue');
  if (await page.evaluate(() => !!window.__game)) throw Error('Menu constructed a game session');
  await page.locator('#journey-start').click();
  await waitForGame();
  const fresh = await page.evaluate(() => __game.snapshot());
  if (fresh.player.x !== 0 || fresh.player.y !== -8 || fresh.player.z !== 86 || fresh.player.overdrive)
    throw Error('New game did not load the opening');
  const save = await page.evaluate(() => { __game.save(); return localStorage.getItem('furnace-born-v2-city'); });
  const routes = [];
  for (const route of ['foundry', 'garden', 'freight']) {
    await page.goto(origin + '?chapter=folded&route=' + route);
    await waitForGame();
    const snapshot = await page.evaluate(() => __game.snapshot());
    if (!Number.isFinite(snapshot.player.hp)) throw Error('Preview failed to initialize: ' + route);
    if (await page.evaluate(() => localStorage.getItem('furnace-born-v2-city')) !== save)
      throw Error('Preview replaced the campaign save');
    routes.push(route);
  }
  await page.goto(origin);
  await page.locator('#journey-title').waitFor();
  await page.locator('#journey-continue').click();
  await waitForGame();
  if (await page.evaluate(() => localStorage.getItem('furnace-born-v2-city')) !== save)
    throw Error('Continue replaced campaign data');
  await page.goto(origin);
  await page.setViewportSize({width:390, height:760});
  await page.locator('#journey-title').waitFor();
  if (await page.evaluate(() => document.querySelector('.journey-panel').getBoundingClientRect().right > innerWidth))
    throw Error('Menu overflows narrow viewport');
  await page.screenshot({path:'output/playwright/regression/journey-menu.png'});
  if (errors.length) throw Error(errors.join('\n'));
  return {freshGame:true, routes, preservedCampaign:true, errors};
}

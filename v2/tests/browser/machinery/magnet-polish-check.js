async (page) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');
  await page.waitForFunction(() => !!window.__game);
  const results = await page.evaluate(() => {
    const g = __game,
      a = g.debug;
    g.manual(true);
    for (const e of a.world.enemies) {
      e.hp = 0;
      __game.debug.world.views.enemy(e).model.root.visible = false;
    }
    const results = [];
    a.setCameraView('overhead');
    const b = a.state.bodies.obstacles.find((b) => b.id === 'sorter-cover');
    b.x = 28;
    g.scenario({ player: { x: 43, y: -8, z: -140, heat: 0, overheated: false, magnet: true } });
    g.aimAt(32, -143, -6.5);
    g.setInput(['Mouse2']);
    g.step(0.5);
    if (b.x <= 28) throw Error('shield not draggable');
    const moved = b.x;
    g.step(2);
    const stopped = b.x,
      heat = a.p.heat;
    g.step(1);
    if (b.x !== stopped || a.p.heat > heat || a.magneticActive())
      throw Error('shield keeps heating when stopped');
    g.setInput([]);
    g.step(0.1);
    results.push({ shield: moved, stopped });
    return results;
  });
  await page.screenshot({ path: 'output/playwright/magnet-polish/shield.png' });
  const impact = await page.evaluate(() => {
    const g = __game,
      a = g.debug;
    const b = a.state.bodies.obstacles.find((b) => b.id === 'sorter-cover');
    b.x = 41.5;
    g.scenario({ player: { x: 44, y: -8, z: -139, hp: 50 }, state: { sorter: false } });
    const e = a.world.enemies.find((e) => e.id === 'sorter');
    Object.assign(e, {
      hp: 20,
      x: 44,
      y: -8,
      z: -152,
      phase: 'sweep',
      attack: 'sweep',
      timer: 1.8,
      aim: 0.9,
    });
    a.world.sidePuzzles.update(0, a.p, []);
    a.updateSorter(e, 0, true);
    a.world.sidePuzzles.update(0.01, a.p, []);
    if (e.phase !== 'vent' || e.timer !== 1.5)
      throw Error('Shield failed to interrupt the actual sweep ray');
    const plate = a.world.sidePuzzles.targets.find((t) => t.id === 'sorting-cover').root;
    if (!plate.children.some((m) => m.material?.emissiveIntensity > 1))
      throw Error('Missing shield impact flash');
    e.hp = 0;
    return { phase: e.phase, recovery: e.timer };
  });

  await page.evaluate(() => __game.debug.setPause(true));
  if (await page.locator('#settings .subtitle,#settings .binding-note,#settings .eyebrow').count())
    throw Error('Pause contains descriptive text');
  await page.screenshot({ path: 'output/playwright/magnet-polish/pause.png' });
  await page.getByRole('button', { name: 'Adjust camera', exact: true }).click();
  if (await page.locator('#camera-tuning p').count()) throw Error('Camera has footnote');
  await page.getByRole('button', { name: 'Back to settings', exact: true }).click();
  await page.getByRole('button', { name: 'Main menu', exact: true }).click();
  if (await page.locator('.journey-menu p,.journey-menu small').count())
    throw Error('Main menu has descriptive text');
  await page.screenshot({ path: 'output/playwright/magnet-polish/menu.png' });
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.evaluate(() => {
    const g = __game;
    g.debug.setPause(false);
    g.scenario({ player: { x: 0, y: -56, z: 0, hp: 50, endingTime: 0 }, state: { keeper: true } });
    g.setInput(['KeyE']);
    g.step(2.2);
    g.setInput([]);
    g.step(27);
  });
  if (!(await page.locator('#ending').isVisible())) throw Error('Ending not reached');
  const text = await page.locator('#ending').innerText();
  if (text.trim().replace(/\s+/g, ' ') !== 'Mission Accomplished Continue Main menu')
    throw Error('Unexpected ending text ' + text);
  await page.waitForTimeout(1600);
  await page.screenshot({ path: 'output/playwright/magnet-polish/ending.png' });
  await page.locator('#ending-continue').click();
  if (await page.locator('#ending').isVisible()) throw Error('Continue failed');
  if (errors.length) throw Error(errors.join('\n'));
  return { results, impact, ending: text, errors };
}

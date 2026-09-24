async page => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const check = (value, message) => { if (!value) throw Error(message); };
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('http://127.0.0.1:5174/?chapter=folded&route=foundry&test&manual&view=overhead');
  await page.waitForFunction(() => window.__game);
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: 'Controls', exact: true }).click();
  await page.getByRole('button', { name: 'Switch camera：KeyC', exact: true }).click();
  await page.keyboard.press('w');
  let bindings = await page.evaluate(() => __game.snapshot().bindings);
  check(bindings.camera === 'KeyW' && bindings.up === 'KeyC', 'Occupied keyboard binding did not swap');
  check(await page.locator('#camera-toggle kbd').textContent() === 'W', 'HUD camera binding is stale');
  await page.getByRole('button', { name: 'Fire：Mouse0', exact: true }).click();
  // The settings pointerdown handler must consume this click as a binding.
  await page.locator('#bindings .binding-listening').click({ button: 'right' });
  bindings = await page.evaluate(() => __game.snapshot().bindings);
  check(bindings.fire === 'Mouse2' && bindings.magnet === 'Mouse0', 'Occupied mouse binding did not swap');
  await page.keyboard.press('Escape');
  await page.mouse.click(660, 350, { button: 'right' });
  check(await page.evaluate(() => __game.debug.shots.some(shot => !shot.hostile)), 'Remapped right mouse did not fire');
  await page.keyboard.press('w');
  check(await page.evaluate(() => __game.snapshot().camera.view) === 'third', 'Remapped camera action did not reach gameplay');
  await page.keyboard.press('Escape');
  await page.locator('#reset-bindings').click();
  bindings = await page.evaluate(() => __game.snapshot().bindings);
  check(bindings.camera === 'KeyC' && bindings.up === 'KeyW' && bindings.fire === 'Mouse0', 'Reset left stale live bindings');
  await page.keyboard.press('Escape');
  await page.keyboard.press('c');
  check(await page.evaluate(() => __game.snapshot().camera.view) === 'overhead', 'Default camera action was not restored');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Switch camera：KeyC', exact: true }).click();
  // External pause transitions must discard the unfinished rebind.
  await page.evaluate(() => { __game.debug.setPause(false); __game.debug.setPause(true); });
  check(await page.locator('.binding-listening').count() === 0, 'Pause transition retained rebind capture');
  await page.getByRole('tab', { name: 'Display & camera', exact: true }).click();
  await page.locator('#quality').selectOption('low');
  const low = await page.evaluate(() => ({ ratio: __game.debug.renderer.getPixelRatio(), shadows: __game.debug.renderer.shadowMap.enabled }));
  check(low.ratio === 1 && !low.shadows, 'Quality preference did not reach the renderer');
  await page.getByRole('tab', { name: 'Audio', exact: true }).click();
  await page.locator('#volume').fill('0');
  await page.locator('#volume').dispatchEvent('change');
  await page.locator('#music').uncheck();
  await page.locator('#sfx').uncheck();
  await page.reload();
  await page.waitForFunction(() => window.__game);
  const restored = await page.evaluate(() => ({
    volume: __game.debug.audio.volume, music: __game.debug.audio.music, sfx: __game.debug.audio.sfx,
    ratio: __game.debug.renderer.getPixelRatio(), shadows: __game.debug.renderer.shadowMap.enabled,
    bindings: __game.snapshot().bindings,
  }));
  check(restored.volume === 0 && !restored.music && !restored.sfx, 'Reload lost muted audio preferences');
  check(restored.ratio === 1 && !restored.shadows && restored.bindings.camera === 'KeyC', 'Reload lost quality or default controls');
  check(!errors.length, errors.join('\n'));
  return { occupiedBindings: true, mouseFire: true, reset: true, cancellation: true, restored, errors };
}

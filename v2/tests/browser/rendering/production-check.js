async (page) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('http://127.0.0.1:5176/?chapter=folded&view=third&test&manual');
  await page.waitForFunction(() => document.body.classList.contains('third-person'));
  if (await page.evaluate(() => '__game' in window))
    throw Error('Production exposes development state');
  const debugResources = await page.evaluate(() =>
    performance.getEntriesByType('resource').filter((entry) => /\/profiler[-.]/.test(entry.name)),
  );
  if (debugResources.length) throw Error('Production loaded the development profiler');
  await page.keyboard.press('c');
  await page.waitForFunction(() => !document.body.classList.contains('third-person'));
  await page.locator('#game').click({ position: { x: 550, y: 300 } });
  await page.waitForFunction(() => Number(document.getElementById('heat').style.strokeDashoffset) < 100);
  await page.keyboard.press('Escape');
  await page.locator('#settings').waitFor({ state: 'visible' });
  await page.locator('#resume').click();
  await page.locator('#settings').waitFor({ state: 'hidden' });
  await page.screenshot({ path: 'output/playwright/regression/production.png' });
  if (errors.length) throw Error(errors.join('\n'));
  return { developmentHooksAbsent: true, cameraSwitch: true, firing: true, pauseResume: true, errors };
}

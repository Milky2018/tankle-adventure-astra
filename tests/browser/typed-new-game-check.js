// Run with a fresh test profile on the title screen.
async page => {
  const menu = page.locator('#journey');
  const start = page.locator('#journey-start');
  const resume = page.locator('#journey-continue');
  const saveKey = 'tankle-moonbit-v1';
  await start.waitFor();
  if (await page.evaluate(key => localStorage.getItem(key), saveKey)) throw Error('Use a fresh profile');
  if (await resume.isVisible()) throw Error('Continue offered without a save');
  await start.click();
  await menu.waitFor({ state: 'hidden', timeout: 4000 });
  await page.waitForFunction(key => localStorage.getItem(key), saveKey);

  // Use the actual autosave schema, with a distinguishable piece of progress.
  await page.evaluate(key => {
    const saved = JSON.parse(localStorage.getItem(key));
    saved.flags['relay-west'] = true;
    localStorage.setItem(key, JSON.stringify(saved));
    location.reload();
  }, saveKey);
  await resume.waitFor();
  if (!await start.isVisible()) throw Error('New Game missing with a save');
  await resume.click();
  if (!await page.evaluate(() => __typedRead().flags['relay-west'])) throw Error('Continue lost progress');

  await page.keyboard.press('Escape');
  await page.locator('#journey-button').click();
  await Promise.all([page.waitForEvent('load'), start.click()]);
  await page.waitForFunction(() => window.__typedRead && !document.body.classList.contains('starting'));
  if (await menu.isVisible() || await page.evaluate(() => __typedRead().flags['relay-west'])) throw Error('Restart did not enter a fresh journey');
  const fresh = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), saveKey);
  if (!fresh || fresh.flags['relay-west']) throw Error('New Game did not replace the stored progress');
  await page.reload();
  await resume.waitFor();
  await resume.click();
  if (await page.evaluate(() => __typedRead().flags['relay-west'])) throw Error('Old progress returned on reload');
}

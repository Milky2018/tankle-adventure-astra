async page => {
  await page.goto('http://127.0.0.1:5174/output/audio/warning-comparison/render.html');
  await page.waitForFunction(() => window.ready);
  const report = await page.evaluate(() => window.renderComparison());
  const pending = page.waitForEvent('download');
  await page.evaluate(report => window.downloadAll(report), report);
  const download = await pending;
  await download.saveAs('v2/output/audio/warning-comparison/raw-sfx.tar');
  return report;
}

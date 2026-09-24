async page => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:5174/?chapter=folded&test&manual');
  await page.waitForFunction(() => window.__game);
  const dsp = await page.evaluate(async () => {
    const { SoundEffects } = await import('/src/audio/sound-effects.js');
    const ctx = new OfflineAudioContext(2, 44100 * 2, 44100);
    const output = ctx.createGain(); output.gain.value = .22; output.connect(ctx.destination);
    const synth = new SoundEffects(ctx, output);
    for (let i = 0; i < 60; i++) synth.play(i % 2 ? 'explode' : 'foundry-shot');
    const budget = synth.voices.size;
    if (budget > 32) throw Error('Sound voice budget exceeded');
    const buffer = await ctx.startRendering();
    let peak = 0;
    for (let ch = 0; ch < 2; ch++) for (const x of buffer.getChannelData(ch)) {
      if (!Number.isFinite(x)) throw Error('Invalid rendered audio');
      peak = Math.max(peak, Math.abs(x));
    }
    if (peak >= .98 || synth.voices.size) throw Error('Overload clips or retains sources');
    const silent = new OfflineAudioContext(2, 44100 * 2, 44100);
    const muted = new SoundEffects(silent, silent.destination);
    muted.play('unlock', { when: .3 });
    for(let i=0;i<60;i++)muted.tone(220, 1, 'sine', .2, 0, 0);
    if(muted.voices.size>32)throw Error('Ambient voices exceed the shared budget');
    muted.setEnabled(false);
    muted.play('death');
    const mutedBuffer = await silent.startRendering();
    const mutedPeak = Math.max(...mutedBuffer.getChannelData(0).map(Math.abs));
    if (mutedPeak > .0001 || muted.voices.size) throw Error('Mute left delayed notes audible');
    return { budget, peak, remaining: synth.voices.size, mutedPeak };
  });
  await page.locator('#game').click();
  await page.evaluate(() => { const q=__game.debug; q.audio.start(); q.setPause(false); q.audio.event('unlock'); q.audio.effects.setEnabled(false); });
  if (await page.evaluate(() => __game.debug.audio.effects.voices.size)) throw Error('Live mute kept event voices');
  await page.evaluate(() => { const q=__game.debug; q.audio.effects.setEnabled(true); q.audio.event('shot'); });
  if (!await page.evaluate(() => __game.debug.audio.effects.voices.size)) throw Error('Live sound failed to resume');
  await page.waitForTimeout(1100);
  if (await page.evaluate(() => __game.debug.audio.effects.voices.size)) throw Error('Live sources did not release');
  if (errors.length) throw Error(errors.join('\n'));
  return { dsp, liveLifecycle: true, errors };
}

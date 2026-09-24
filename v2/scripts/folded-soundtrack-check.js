async page => {
  const errors = [], failedMusic = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', response => { if (response.url().includes('/music/') && !response.ok()) failedMusic.push(response.url()); });
  await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');
  await page.waitForFunction(() => window.__game?.debug);
  await page.locator('#game').click();
  await page.evaluate(() => {
    const g = __game, a = g.debug; g.manual(true); a.audio.start(); a.setPause(false);
    g.scenario({ enemies: Object.fromEntries(a.world.enemies.map(e => [e.id, 0])), player: { overdrive:false, phoenix:false, circulation:false }, state: { overdrive:false, phoenix:false, circulation:false } });
    g.step(.05);
  });
  const tracks = [];
  async function expectTrack(id) {
    try { await page.waitForFunction(id => __game.snapshot().music?.track === id && !__game.snapshot().music.loading, id); }
    catch { throw Error(JSON.stringify({ expected: id, prior: tracks.map(t => t.track), current: await page.evaluate(() => ({ music: __game.snapshot().music, player: __game.snapshot().player, paused: __game.snapshot().paused })) })); }
    tracks.push(await page.evaluate(() => __game.snapshot().music));
    await page.evaluate(()=>{const voice=__game.debug.audio.score.current;if(Math.abs(voice.gains.mix.gain.value-voice.track.gain)>1e-7)throw Error('Playback normalization gain missing');});
  }
  await expectTrack('mz-castle3');
  const pickups=[];
  for(const [ability,track]of [['overdrive','mz-scene5'],['phoenix','mz-scene7'],['circulation','mz-dungeon1']]){
    pickups.push(await page.evaluate(ability=>{
      const g=__game,a=g.debug,q=a.world.pickups.find(q=>q.id===ability);
      g.scenario({player:{x:q.x,y:q.y,z:q.z},state:{...(q.requires?{[q.requires]:true}:{})}});
      g.interact();g.step(.05);
      if(!a.p[ability]||!a.state[ability])throw Error('Acquisition failed: '+ability);
      return q.id;
    },ability));
    await expectTrack(track);
    await page.evaluate(()=>{
      const g=__game,a=g.debug,voice=a.audio.score.current;
      g.scenario({player:{x:0,y:0,z:27}});g.step(.05);
      if(a.audio.score.current!==voice)throw Error('Backtracking restarted music');
      g.save();
    });
    await page.reload();await page.waitForFunction(()=>window.__game?.debug);
    await page.locator('#game').click();
    await page.evaluate(()=>{const g=__game,a=g.debug;g.manual(true);a.audio.start();a.setPause(false);g.scenario({enemies:Object.fromEntries(a.world.enemies.map(e=>[e.id,0]))});g.step(.05);});
    await expectTrack(track);
  }
  const battles = [];
  for (const boss of ['prototype', 'foundry', 'guardian', 'sorter', 'keeper']) {
    battles.push(await page.evaluate(async boss => {
      const g = __game, a = g.debug, { BOSS_ARENAS } = await import('/src/folded-boss-arenas.js');
      const arena = BOSS_ARENAS.find(b => b.id === boss);
      g.scenario({ player: { x: arena.x + arena.w / 2, y: arena.y, z: arena.z + arena.d / 2 }, enemies: Object.fromEntries(a.world.enemies.map(e => [e.id, e.id === boss ? e.max : 0])), state: { [boss]: false } });
      g.step(.05);
      if (a.state.combatArena !== boss) throw Error('Arena did not commit: ' + boss);
      return boss;
    }, boss));
    await expectTrack(({prototype:'mz-battle1',foundry:'mz-battle3',guardian:'mz-battle6',sorter:'mz-battle4',keeper:'mz-battle8'})[boss]);
    await page.evaluate(boss => {
      const g = __game, a = g.debug;
      g.scenario({ enemies: { [boss]: 0 }, player: { x: 0, y: 0, z: 27 } }); g.step(.05);
    }, boss);
    await expectTrack('mz-dungeon1');
  }
  await page.waitForFunction(() => { const score = __game.debug.audio.score; return score.ctx.state === 'running' && score.position(score.current) > .2; });
  const pause = await page.evaluate(() => {
    const a = __game.debug;
    a.setPause(true); const before = a.audio.score.saved.offset;
    if (a.audio.score.current) throw Error('Pause left a live music voice');
    a.setPause(false); __game.step(.05);
    if (Math.abs(a.audio.score.current.offset - before) > .01) throw Error('Pause lost position');
    __game.scenario({ player: { x: 202, y: 16, z: 54, hp: 1, invincible: 0 } });
    a.hurt(100); __game.step(.2);
    if (a.audio.score.current || a.audio.score.saved) throw Error('Death retained music');
    __game.step(3.5);
    return { savedOffset: before, circulationAfterRespawn: a.p.circulation };
  });
  await expectTrack('mz-dungeon1');
  await page.evaluate(() => __game.save());
  await page.reload(); await page.waitForFunction(() => window.__game?.debug);
  await page.locator('#game').click();
  await page.evaluate(() => { const a = __game.debug; __game.manual(true); a.audio.start(); a.setPause(false); __game.step(.05); });
  await expectTrack('mz-dungeon1');
  const loops = await page.evaluate(async () => {
    const a = __game.debug, score = a.audio.score;
    const manifest = await fetch('/music/manifest.json').then(r => r.json());
    const loops = [];
    for (const track of manifest.tracks) {
      const { buffers } = await score.load(track.id), buffer = buffers.mix;
      if (buffer.length < track.frames || buffer.length > track.frames + 128 || buffer.sampleRate !== track.sampleRate) throw Error('Decoded frame mismatch: ' + track.id);
      const offline = new OfflineAudioContext(2, 4096, buffer.sampleRate), source = offline.createBufferSource();
      source.buffer = buffer; source.loop = true; source.loopStart = track.loopStart; source.loopEnd = track.loopEnd;
      source.connect(offline.destination); source.start(0, (track.loopEndFrameExclusive - 1024) / track.sampleRate);
      const rendered = await offline.startRendering();
      let error = 0;
      for (let c = 0; c < 2; c++) {
        const input = buffer.getChannelData(c), output = rendered.getChannelData(c);
        for (let i = 1024; i < 3072; i++) error = Math.max(error, Math.abs(output[i] - input[track.loopStartFrame + i - 1024]));
      }
      if (error > .001) throw Error('Incorrect loop wrap: ' + JSON.stringify({ id: track.id, error }));
      loops.push({ id: track.id, frames: buffer.length, loopStart: source.loopStart, loopEnd: source.loopEnd, wrapError: error });
    }
    return loops;
  });
  await page.goto('http://127.0.0.1:5174/music/index.html');
  await page.locator('[data-track]').first().waitFor();
  if (await page.locator('[data-track]').count() !== 9) throw Error('Audition page must contain nine tracks');
  await page.locator('[data-track="mz-dungeon1"]').click();
  await page.waitForFunction(() => document.getElementById('status').textContent.includes('Playing'));
  await page.locator('#seam').click();
  await page.waitForFunction(() => document.getElementById('status').textContent.includes('four seconds'));
  await page.screenshot({ path: 'output/playwright/regression/mz-soundtrack.png' });
  await page.locator('#stop').click();
  if (errors.length || failedMusic.length) throw Error(JSON.stringify({ errors, failedMusic }));
  return { pickups, battles, tracks, pause, loops, errors, failedMusic };
}

async page => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 1280, height: 720 });
  const index = await page.evaluate(() => Number(localStorage.getItem('distance-benchmark-index') || 0));
  const presets = [
    { fogNear: 25, fogFar: 60, renderDistance: 80 },
    { fogNear: 40, fogFar: 100, renderDistance: 130 },
    { fogNear: 70, fogFar: 160, renderDistance: 200 },
    { fogNear: 100, fogFar: 220, renderDistance: 260 },
  ];
  const pass = Math.floor(index / 8), sceneIndex = Math.floor(index / 4) % 2;
  const presetIndex = pass ? 3 - index % 4 : index % 4;
  const preset = presets[presetIndex];
  await page.evaluate(({ preset, index }) => {
    localStorage.setItem('furnace-born-v2-settings', JSON.stringify({
      cameraView: 'third', viewDistance: preset, quality: 'high', music: false, sfx: false,
    }));
    localStorage.removeItem('furnace-born-v2-city');
    localStorage.setItem('distance-benchmark-index', index + 1);
  }, { preset, index });
  await page.goto('http://127.0.0.1:5174/?chapter=folded&test&manual');
  await page.waitForFunction(() => window.__game?.debug);
  await page.bringToFront();
  const result = await page.evaluate(async ({ sceneIndex }) => {
    const g = __game, q = g.debug;
    g.scenario({ player: { ...(sceneIndex ? { x: -17, y: 0, z: -35 } : {}), invincible: 1e9 } });
    g.manual(false);
    const gl = q.renderer.getContext(), debug = gl.getExtension('WEBGL_debug_renderer_info');
    const environment = { browser: navigator.userAgent, gpu: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), pixelRatio: q.renderer.getPixelRatio(), drawingBuffer: [gl.drawingBufferWidth, gl.drawingBufferHeight], gpuTimer: !!gl.getExtension('EXT_disjoint_timer_query_webgl2') };
    const intervals = [], calls = [], triangles = [];
    let start, last, frameStart, measureStart;
    await new Promise(resolve => {
      const tick = now => {
        start ??= now;
        const elapsed = now - start;
        q.follow.yaw = elapsed < 3000 ? elapsed / 3000 * Math.PI * 2 : (elapsed - 3000) / 10000 * Math.PI * 2;
        if (elapsed >= 3000) {
          if (measureStart === undefined) {
            measureStart = now; last = now; frameStart = q.frames(); q.profile.start();
          } else {
            intervals.push(now - last); last = now;
            calls.push(q.renderer.info.render.calls); triangles.push(q.renderer.info.render.triangles);
          }
        }
        if (elapsed >= 13000) { q.profile.stop(); resolve(); return; }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    g.manual(true);
    const mean = a => a.reduce((sum, n) => sum + n, 0) / a.length;
    const sorted = [...intervals].sort((a,b) => a-b);
    const stats = Object.fromEntries(Object.entries(q.profile.stats).map(([name,s]) => [name, { mean: s.total/s.count, max: s.max, count: s.count }]));
    return { environment, elapsedMs: last-measureStart, frames: q.frames()-frameStart, fps: (q.frames()-frameStart)*1000/(last-measureStart), meanFrameMs: mean(intervals), p95FrameMs: sorted[Math.floor(sorted.length*.95)], over33msPercent: intervals.filter(n=>n>33.5).length/intervals.length*100, drawCalls: mean(calls), triangles: mean(triangles), cpu: stats, gpuMs: q.profile.gpu.length ? mean(q.profile.gpu) : null, samples: intervals.length, player: {x:q.p.x,y:q.p.y,z:q.p.z}, camera: { fogNear:q.scene.fog.near, fogFar:q.scene.fog.far, renderDistance:q.camera.far } };
  }, { sceneIndex });
  if (errors.length) throw Error(errors.join('\n'));
  return { index, pass, scene: sceneIndex ? 'Freight Exchange' : 'Opening', preset, ...result, errors };
}

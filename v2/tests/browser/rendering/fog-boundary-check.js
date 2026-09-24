async (page) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (event) => {
    if (event.type() === 'error') errors.push(event.text());
  });
  await page.goto('http://127.0.0.1:5174/?chapter=folded&test&manual');
  await page.waitForFunction(() => window.__game?.debug);
  const results = await page.evaluate(() => {
    const q = __game.debug,
      T = q.T,
      renderer = q.renderer,
      scene = q.scene;
    __game.manual(true);
    q.setPause(false);
    const size = renderer.getSize(new T.Vector2()),
      pixelRatio = renderer.getPixelRatio();
    const previousTarget = renderer.getRenderTarget(),
      before = scene.onBeforeRender,
      after = scene.onAfterRender;
    const target = new T.WebGLRenderTarget(640, 360);
    target.texture.colorSpace = T.SRGBColorSpace;
    renderer.setPixelRatio(1);
    renderer.setSize(640, 360);
    renderer.setRenderTarget(target);
    const read = () => {
      renderer.render(scene, q.camera);
      const pixels = new Uint8Array(640 * 360 * 4);
      renderer.readRenderTargetPixels(target, 0, 0, 640, 360, pixels);
      return pixels;
    };
    const results = [];
    try {
      for (const view of ['third', 'overhead']) {
        q.setCameraView(view);
        for (const origin of [
          { x: 0, y: -8, z: 86 },
          { x: -17, y: 0, z: -35 },
          { x: 202, y: 16, z: 45 },
        ]) {
          for (const step of [0, 0.5, 1])
            for (const yaw of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
              const player = { ...origin, x: origin.x + step };
              __game.scenario({ player });
              __game.look(yaw, 0.267);
              if (q.camera.isPerspectiveCamera) q.camera.aspect = 640 / 360;
              q.camera.updateProjectionMatrix();
              const normal = read();
              // Keep projection, fog, time and shadows identical. Only retain geometry
              // beyond the radial boundary: fully white fragments must be indistinguishable.
              scene.onBeforeRender = function (...args) {
                before.apply(this, args);
                after.apply(this, args);
                scene.traverse((object) => {
                  if (!object.material) return;
                  const uniforms = renderer.properties.get(object.material).uniforms;
                  if (uniforms?.playerRenderDistance) uniforms.playerRenderDistance.value = 1000;
                });
              };
              const unlimited = read();
              scene.onBeforeRender = before;
              let changed = 0,
                maxDelta = 0;
              const examples = [];
              for (let i = 0; i < normal.length; i += 4) {
                const delta = Math.max(
                  ...[0, 1, 2].map((k) => Math.abs(normal[i + k] - unlimited[i + k])),
                );
                if (delta > 2) {
                  changed++;
                  if (examples.length < 3)
                    examples.push({
                      x: (i / 4) % 640,
                      y: 359 - Math.floor(i / 4 / 640),
                      normal: [...normal.slice(i, i + 3)],
                      unlimited: [...unlimited.slice(i, i + 3)],
                    });
                }
                maxDelta = Math.max(maxDelta, delta);
              }
              results.push({ view, player, yaw, changed, maxDelta, examples });
            }
        }
      }
      const failures = results.filter((result) => result.changed);
      if (failures.length) throw Error(JSON.stringify(failures));
      return {
        poses: results.length,
        maxDelta: Math.max(...results.map((result) => result.maxDelta)),
      };
    } finally {
      scene.onBeforeRender = before;
      renderer.setRenderTarget(previousTarget);
      target.dispose();
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(size.x, size.y);
      q.draw();
    }
  });
  if (errors.length) throw Error(errors.join('\n'));
  return { results, errors };
}

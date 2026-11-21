// Read the rendered camera pitch from the vertical and horizontal vanishing
// points. This also works when the collision response changes the field of view.
async page => {
  await page.setViewportSize({width: 960, height: 540});
  await page.goto('http://127.0.0.1:5175/?chapter=circulation&test&view=third');
  await page.waitForFunction(() => window.__typedRead && __typedRead().time > 0);
  await page.keyboard.down('KeyS');
  try {
    await page.waitForFunction(() => __typedRead().x >= 300, null, {timeout: 12000});
  } finally {
    await page.keyboard.up('KeyS');
  }
  const samples = await page.evaluate(async () => {
    const canvas = document.querySelector('#game');
    canvas.dispatchEvent(new MouseEvent('mousedown', {button: 1}));
    const results = [];
    let yaw = -Math.PI / 2;
    let pitch = 15.3 * Math.PI / 180;
    const turn = (dx, dy) => {
      canvas.dispatchEvent(new MouseEvent('mousemove', {
        movementX: dx, movementY: dy, clientX: 480, clientY: 270,
      }));
      yaw -= dx * 0.0075;
      pitch += dy * 0.006;
    };
    try {
      for (let heading = 0; heading < 4; heading++) {
        for (const drag of [-36, -36, -36, 36, 36, 36]) {
          turn(0, drag);
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          const p = __typedRead();
          const center = innerHeight / 2;
          const horizon = __typedProject(p.x + 1e6 * Math.sin(yaw), p.y, p.z + 1e6 * Math.cos(yaw))[1];
          const vertical = __typedProject(p.x, p.y + 1e6, p.z)[1];
          const focal = Math.sqrt(Math.abs((horizon - center) * (vertical - center)));
          results.push([pitch, Math.atan2(center - horizon, focal)]);
        }
        turn(209, 0);
      }
    } finally {
      window.dispatchEvent(new MouseEvent('mouseup', {button: 1}));
    }
    return results;
  });
  for (const [requested, rendered] of samples) {
    if (!(Math.abs(requested - rendered) < 0.005))
      throw Error(`Requested pitch ${requested} but rendered ${rendered}`);
  }
}

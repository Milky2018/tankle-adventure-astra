// Identical mouse drags should produce the same pitch in the lane and at the wall.
async page => {
  await page.setViewportSize({width: 960, height: 540});
  async function enterLane() {
    await page.goto('http://127.0.0.1:5175/?chapter=circulation&test&view=third');
    await page.waitForFunction(() => window.__typedRead && __typedRead().time > 0);
  }
  function sample() {
    return page.evaluate(async () => {
      const canvas = document.querySelector('#game');
      const samples = [];
      canvas.dispatchEvent(new MouseEvent('mousedown', {button: 1}));
      try {
        for (let heading = 0; heading < 4; heading++) {
          for (const dy of [0, -36, -36, -36, 36, 36, 36]) {
            canvas.dispatchEvent(new MouseEvent('mousemove', {movementY: dy}));
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            const {x, y, z} = __typedRead();
            // Use the horizontal vanishing point closest to the centre of the screen.
            const axes = [__typedProject(x + 1e6, y, z), __typedProject(x, y, z + 1e6)];
            const [horizon] = axes.sort((a,b) => Math.abs(a[0]-innerWidth/2) - Math.abs(b[0]-innerWidth/2));
            const center = innerHeight/2;
            const vertical = __typedProject(x, y + 1e6, z)[1];
            const focal = Math.sqrt(Math.abs((horizon[1] - center) * (vertical - center)));
            samples.push(Math.atan2(center - horizon[1], focal));
          }
          canvas.dispatchEvent(new MouseEvent('mousemove', {movementX: 209}));
        }
      } finally {
        window.dispatchEvent(new MouseEvent('mouseup', {button: 1}));
      }
      return samples;
    });
  }
  await enterLane();
  const lane = await sample();
  if (!(lane[1] < lane[0] && lane[6] > lane[3])) throw Error('Mouse drag did not tilt the camera in both directions');
  await enterLane();
  await page.keyboard.down('KeyS');
  try {
    await page.waitForFunction(() => __typedRead().x >= 300, null, {timeout: 12000});
  } finally {
    await page.keyboard.up('KeyS');
  }
  const wall = await sample();
  for (const [i, pitch] of lane.entries()) {
    if (!(Math.abs(pitch - wall[i]) < 0.005)) throw Error(`Pitch changed at the wall: ${pitch} -> ${wall[i]}`);
  }
}

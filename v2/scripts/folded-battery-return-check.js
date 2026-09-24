async (page) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');
  await page.evaluate(() => localStorage.removeItem('furnace-born-v2-city'));
  await page.reload();
  await page.waitForFunction(() => window.__game?.debug);
  const result = await page.evaluate(() => {
    const g = __game,
      a = g.debug;
    g.manual(true);
    g.setInput([]);
    g.scenario({
      player: {
        x: -12,
        y: 0,
        z: -40,
        hp: 25,
        heat: 0,
        overheated: false,
        invincible: 0,
        overdrive: true,
        mortar: false,
        weapon: 'cannon',
      },
      state: { overdrive: true, sorter: true, 'cargo-battery': false },
      enemies: Object.fromEntries(a.world.enemies.map((e) => [e.id, e.emplacement ? e.max : 0])),
    });
    const checkpoints = [];
    function walk(x, z, boost = false, enemy = null) {
      for (let i = 0; i < 1800; i++) {
        let dx = x - a.p.x,
          dz = z - a.p.z;
        if (Math.hypot(dx, dz) < 0.3) {
          g.setInput([]);
          return;
        }
        let keys =
          Math.abs(dx) > Math.abs(dz)
            ? dx > 0
              ? ['KeyS', 'KeyD']
              : ['KeyW', 'KeyA']
            : dz > 0
              ? ['KeyS', 'KeyA']
              : ['KeyW', 'KeyD'];
        if (boost) keys.push('ShiftLeft');
        if (enemy?.hp > 0 && a.p.heat < 60) {
          g.aimAt(enemy.x, enemy.z, enemy.y);
          keys.push('Mouse0');
        }
        g.setInput(keys);
        g.step(1 / 60, false);
        if (a.p.hp <= 0) throw Error('Died ' + JSON.stringify(checkpoints));
      }
      throw Error('Stuck ' + JSON.stringify([a.p.x, a.p.y, a.p.z, x, z]));
    }
    function fight(side, points) {
      for (const e of a.world.enemies.filter((e) => e.emplacement && e.id.includes(side))) {
        for (let n = 0; n < 12 && e.hp > 0; n++) for (const [x, z] of points) walk(x, z, false, e);
        if (e.hp > 0) throw Error('Cannot kill ' + e.id + ' ' + e.hp);
        checkpoints.push({ id: e.id, hp: a.p.hp, time: a.time });
      }
    }
    walk(-12, -72);
    walk(6, -72, true);
    g.setInput([]);
    g.step(3, false);
    walk(34, -72, true);
    g.step(0.05, false);
    for (const [x,z] of [[34,-98],[54,-98],[54,-132],[56,-146],[32,-146],[32,-178]]) walk(x,z);
    if (!a.p.mortar) throw Error('Mortar not acquired');
    for (const [x,z] of [[32,-146],[59,-146],[59,-124],[54,-124],[54,-98],[34,-98],[34,-72]]) walk(x,z);
    const firstPassHp = a.p.hp;
    a.p.weapon = 'mortar';
    fight('east', [
      [36, -70],
      [30, -70],
      [30, -76],
      [36, -76],
    ]);
    walk(26, -72);
    walk(-12, -72, true);
    walk(-22, -74);
    fight('west', [
      [-24, -69],
      [-20, -69],
      [-20, -78],
      [-24, -78],
    ]);
    const pending = !!a.state.pendingSignals['cargo-battery'];
    if (!pending || a.state['cargo-battery'])
      throw Error('Battery store opened before its cable arrived');
    walk(-12, -72);
    walk(6, -72, true);
    g.setInput([]);
    g.step(3, false);
    walk(34, -72, true);
    g.setInput([]);
    g.step(3, false);
    g.aimAt(32, -58, -2);
    g.setInput(['Mouse0']);
    g.step(0.1, false);
    g.setInput([]);
    g.step(2, false);
    if (!a.state.pendingSignals['loading-return'] || a.state['bridge-crane'])
      throw Error('Return load ignored the travelling cable');
    g.step(12, false);
    if (!a.state['bridge-crane'] || !a.state['loading-return'])
      throw Error('Merged return signal failed');
    walk(28, -58);
    walk(28, -46);
    const lift = a.world.lifts.find((l) => l.id === 'loading-return');
    for (let i = 0; i < 900 && (lift.y !== -8 || lift.wait < 1.5); i++) g.step(1 / 60, false);
    walk(18, -46);
    for (let i = 0; i < 900 && a.p.y < 0; i++) g.step(1 / 60, false);
    if (a.p.y !== 0) throw Error('Return lift failed');
    for (const [x, z] of [
      [18, -34],
      [0, -34],
      [43, -34],
      [43, -32],
      [53, -32],
      [53, -34],
      [59, -34],
      [59, -62],
      [59, -66],
      [59, -90],
      [62, -106],
      [80, -106],
      [96, -106],
      [96, -132],
    ])
      walk(x, z);
    if (!a.state['cannon-coil']) throw Error('Remote reward unreachable');
    g.setInput([]);
    g.step(0.1);
    a.draw();
    return {
      firstPassHp,
      checkpoints,
      pending,
      cleared: a.state['cargo-battery'],
      hp: a.p.hp,
      reward: a.state['cannon-coil'],
    };
  });
  await page.screenshot({ path: 'output/playwright/battery-reward.png' });
  await page.reload();
  await page.waitForFunction(() => window.__game?.debug);
  const restored = await page.evaluate(
    () =>
      __game.debug.world.enemies.filter((e) => e.emplacement).every((e) => e.hp === 0) &&
      __game.debug.state['cannon-coil'],
  );
  if (!restored || errors.length)
    throw Error('Persistence/errors ' + JSON.stringify({ restored, errors }));
  return {
    ...result,
    restored,
    errors,
    fixture:
      'Starts at the cargo descent with earned Boost and Sorter victory supplied; unrelated enemies disabled. Battery attacks, HP, acquisition, movement, shots, machinery and reward use live rules without invulnerability.',
  };
}

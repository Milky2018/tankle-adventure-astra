async page => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const results = [];
  for (const dodge of [false, true]) {
    await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');
    await page.waitForFunction(() => window.__game?.debug);
    results.push(await page.evaluate(dodge => {
      const g = __game, a = g.debug;
      g.manual(true);
      const enemy = a.world.enemies.find(e => e.id === 'condensate-welder');
      g.scenario({ enemies: Object.fromEntries(a.world.enemies.map(e => [e.id, e === enemy ? e.max : 0])), player: { x: 414, y: -24, z: 104, hp: 25, invincible: 0 } });
      const start = { x: enemy.x, z: enemy.z };
      const phases = new Set(), damage = [];
      let committed = false, maxWarning = 0, firstHit = null, previousHp = a.p.hp;
      for (let i = 0; i < 300; i++) {
        if (enemy.phase === 'warn' && enemy.timer <= .35) committed = true;
        // Move east after the bearing locks, using the normal overhead controls.
        g.setInput(dodge && committed && a.p.x < 423 ? ['KeyS', 'KeyD'] : []);
        g.step(1 / 60, false);
        phases.add(enemy.phase);
        if (enemy.phase === 'warn' && enemy.warning.visible) {
          const points = enemy.warning.geometry.attributes.position.array;
          for (let j = 3; j < points.length; j += 3)
            maxWarning = Math.max(maxWarning, Math.hypot(points[j] - enemy.x, points[j + 2] - enemy.z));
        }
        if (a.p.hp < previousHp) { damage.push(previousHp - a.p.hp); firstHit ??= i / 60; }
        previousHp = a.p.hp;
        if (phases.has('flame') && enemy.phase === 'vent') break;
      }
      g.setInput([]);
      g.step(.001);
      return { dodge, phases: [...phases], damage, firstHit, maxWarning, advance: Math.hypot(enemy.x - start.x, enemy.z - start.z), player: { x: a.p.x, z: a.p.z, hp: a.p.hp } };
    }, dodge));
  }
  const [stationary, moving] = results;
  if (errors.length || !stationary.damage.length || stationary.damage.some(d => d !== 5) || moving.damage.length || results.some(r => r.advance < 4 || !r.phases.includes('flame') || Math.abs(r.maxWarning - 18) > .01))
    throw Error(JSON.stringify({ results, errors }));
  return { results, errors, scope: 'Real pump-room geometry, one isolated Welder, normal player movement, 25 HP, no invulnerability; one attack cycle.' };
}

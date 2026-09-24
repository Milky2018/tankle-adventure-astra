async page => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');
  await page.waitForFunction(() => window.__game?.debug);
  const results = await page.evaluate(async () => {
    const g = __game, a = g.debug, T = a.T;
    const { predictMortar } = await import('/src/combat/ballistics.js');
    g.manual(true);
    g.scenario({ enemies: Object.fromEntries(a.world.enemies.map(e => [e.id, 0])), player: { x: 240, y: 16, z: -176, hp: 25, invincible: 0, mortar: true, weapon: 'mortar', heat: 0, overheated: false, lastShot: -100 } });
    const results = [];
    for (const kind of ['player', 'artillery', 'boss']) {
      a.clearShots();
      let shot;
      if (kind === 'player') {
        g.aimAt(240, -200, 16);
        if (!g.fire()) throw Error('Player launch failed');
        shot = a.shots.at(-1);
      } else {
        g.scenario({ player: { x: 260, y: 16, z: -170 } });
        const owner = a.world.enemies.find(e => kind === 'boss' ? e.id === 'keeper' : e.type === kind);
        a.shootEnemy(owner, 0, new T.Vector3(240, 18, -176), new T.Vector3(240, 17.2, -200), 0, true, kind === 'boss' ? { duration: 1.35 } : {});
        shot = a.shots.at(-1);
        if (Math.abs(shot.target.y - 16) > .01) throw Error('Hostile target must resolve onto the floor');
      }
      // A previously supported point is now in the air, as when a lift departs.
      shot.target.y = 24;
      const duration = shot.duration || 1.15;
      let afterPlannedTime = false;
      while (a.shots.includes(shot) && shot.age < 4.1) {
        a.updateShots(1 / 120);
        if (shot.age > duration + .04 && a.shots.includes(shot)) afterPlannedTime = true;
      }
      const blast = a.waves.at(-1)?.mesh.position.clone();
      if (!blast || !afterPlannedTime) throw Error('Timed airburst: ' + kind);
      blast.y -= .08;
      if (Math.abs(blast.y - 16) > .01 || blast.z >= shot.target.z) throw Error('Wrong physical landing: ' + JSON.stringify({ kind, blast: blast.toArray() }));
      if (kind === 'player') {
        const predicted = predictMortar(shot.origin, shot.target, (start, dir, range) => a.castWeapon(start, dir, range));
        if (!predicted.hit || predicted.point.distanceTo(blast) > .05) throw Error('Extended forecast disagrees with collision');
      }
      results.push({ kind, plannedTime: duration, impactTime: shot.age, blast: blast.toArray(), afterPlannedTime });
    }
    a.clearShots();
    const owner = a.world.enemies.find(e => e.type === 'artillery');
    a.shootEnemy(owner, 0, new T.Vector3(240, 200, -176), new T.Vector3(240, 200, -200));
    const lost = a.shots.at(-1);
    // Keep this fixture entirely above the city to test silent cleanup.
    lost.target.set(240, 200, -200);
    for (let i = 0; i < 500; i++) a.updateShots(1 / 120);
    if (a.shots.length || a.waves.length) throw Error('Empty space must not produce a blast');
    return { cases: results, silentExpiry: true };
  });
  if (errors.length) throw Error(errors.join('\n'));
  return { ...results, errors, scope: 'Real launch/update/collision/rendered floor; controlled empty target models a departed support. No altered damage or invulnerability.' };
}

async page => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:5174/?chapter=folded&test&manual');
  await page.waitForFunction(() => window.__game?.debug);
  const samples = await page.evaluate(() => {
    const g = __game, { T, p, world, model, aim, updateAim } = g.debug;
    const cast = world.cast, samples = [];
    let rear = false, tray = false, front = true;
    let normal, rearPlane, frontPlane, rearPoint;
    // Analytic surfaces isolate rear occlusion from level layout. All weapon
    // selection, range, ground targeting and barrel constraints remain live.
    const fixtureCast = (origin, direction, distance, options = {}) => {
      if (!options.aiming) return cast(origin, direction, distance, options);
      const ray = new T.Ray(origin, direction), hits = [];
      for (const [enabled, plane, behind] of [[rear, rearPlane, true], [front, frontPlane, false]]) {
        if (!enabled) continue;
        const point = ray.intersectPlane(plane, new T.Vector3());
        if (!point || point.distanceTo(origin) > distance) continue;
        hits.push({ point, distance: point.distanceTo(origin),
          ...(behind && tray ? { target: { surface: 'top', y: rearPoint.y } } : {}) });
      }
      return hits.sort((a, b) => a.distance - b.distance)[0] || null;
    };
    try {
      g.debug.setCameraView('third');
      for (const yaw of [0, Math.PI / 2, Math.PI]) {
        for (const pitch of [-.5, .6]) {
          // Prepare the camera before installing surfaces for this pose.
          world.cast = cast;
          g.scenario({ player: { x: 0, y: 0, z: 18, weapon: 'cannon', hp: 5 } });
          g.look(yaw, pitch);
          const origin = new T.Vector3(0, 2, 0).applyQuaternion(model.root.quaternion).add(model.root.position);
          normal = new T.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
          rearPlane = new T.Plane().setFromNormalAndCoplanarPoint(normal, origin.clone().addScaledVector(normal, -2));
          frontPlane = new T.Plane().setFromNormalAndCoplanarPoint(normal, origin.clone().addScaledVector(normal, 18));
          const ray = new T.Raycaster(); ray.setFromCamera(new T.Vector2(), g.debug.camera);
          rearPoint = ray.ray.intersectPlane(rearPlane, new T.Vector3());
          if (!rearPoint) throw Error('Rear fixture misses camera ray');
          world.cast = fixtureCast;
          for (const weapon of ['cannon', 'laser', 'mortar']) {
            p.weapon = weapon;
            for (front of [true, false]) {
              rear = false; updateAim(); const expected = aim.clone();
              for (tray of [false, true]) {
                rear = true; updateAim();
                if (aim.distanceTo(expected) > 1e-5 || aim.clone().sub(origin).dot(normal) <= 0)
                  throw Error(JSON.stringify({ weapon, yaw, pitch, front, tray, expected, actual: aim.clone() }));
                samples.push({ weapon, yaw, pitch, front, tray });
              }
            }
          }
        }
      }
      return samples;
    } finally { world.cast = cast; }
  });
  if (errors.length) throw Error(errors.join('\n'));
  return { samples: samples.length, errors };
}

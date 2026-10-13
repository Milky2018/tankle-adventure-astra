// Run through playwright-cli run-code against v2's development-only manual scene.
// This exports authored meshes/materials, never executable gameplay.
async page => {
  await page.waitForFunction(() => window.__game?.debug?.world);
  const downloadPromise = page.waitForEvent('download');
  const stats = await page.evaluate(() => {
    const {scene, model, world, T} = window.__game.debug;
    const named = new Set();
    const geometries = new Map();
    const identify = (value, path, seen = new Set()) => {
      if (!value || typeof value !== 'object' || seen.has(value)) return;
      seen.add(value);
      if (value.isObject3D) {
        if (!named.has(value)) { value.name = path; named.add(value); }
        return;
      }
      if (value.isMaterial || value.isTexture || value.isBufferGeometry || value.isVector3 || value instanceof Map || value instanceof Set) return;
      for (const [key, child] of Object.entries(value)) identify(child, `${path}/${key}`, seen);
    };
    identify(model, 'player');
    const floats=model.body.children.find(o=>o.isGroup&&!o.visible&&!o.name&&o.children.length===2);
    if(!floats)throw new Error('Flotation art root missing');
    identify(floats,'player/floats');
    floats.children.forEach((arm,i)=>identify(arm,`player/float-arms/${i}`));
    identify(world.presentation.finale,'finale');
    const tender=scene.children.find(o=>o.isGroup&&o.position.x===110&&o.position.y===-24&&o.position.z===30);
    if(!tender)throw new Error('Maintenance carrier art root missing');
    identify(tender,'obstacles/maintenance-cart/root');
    world.enemies.forEach((enemy, i) => {
      identify(world.views.enemy(enemy), `enemies/${i}`);
      enemy.parts.forEach((part, j) => identify(world.views.enemy(part), `enemies/${i}/parts/${j}`));
    });
    const obstacleRoots = new Set();
    for (const [object,body] of world.sidePuzzles.owners) {
      if (!obstacleRoots.has(body.id)) {
        let root = object;
        while (root.parent && root.parent !== scene && world.sidePuzzles.owners.get(root.parent) === body) root = root.parent;
        identify(root, `obstacles/${body.id}/root`);
        obstacleRoots.add(body.id);
      }
    }
    identify(world, 'world');
    for (const feed of world.controlFeeds) feed.mesh.userData.artFeed = {id:feed.id, duration:feed.duration, progress:feed.lamps.map(l => l.progress)};

    // Runtime references and shader closures do not belong in an art asset.
    scene.traverse(object => {
      const role = object.userData?.renderRole;
      object.userData = { ...(role ? {renderRole: role} : {}), ...(object.userData.artFeed ? {artFeed:object.userData.artFeed} : {}) };
      for (const material of [object.material].flat().filter(Boolean)) {
        const role = material.userData?.renderRole;
        material.userData = role ? {renderRole: role} : {};
      }
      if (object.isMesh && !object.geometry.isInstancedBufferGeometry && object.geometry.type !== 'BufferGeometry') {
        // Preserve generated vertices, including rounded boxes unsupported by ObjectLoader.
        const original = object.geometry;
        if (!geometries.has(original)) geometries.set(original, new T.BufferGeometry().copy(original));
        object.geometry = geometries.get(original);
      }
      if (object.matrixAutoUpdate) object.updateMatrix();
    });
    scene.updateMatrixWorld(true);
    const asset = scene.toJSON();
    asset.artBeltSegments = world.belts.map(belt => belt.segments.map(segment => [segment.travel, segment.heaters.length]));
    const json = JSON.stringify(asset);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([json], {type: 'application/json'}));
    a.download = 'folded-scene.json';
    a.click();
    return {bytes: json.length, named: named.size};
  });
  const download = await downloadPromise;
  await download.saveAs('output/art/folded-scene.json');
  console.log(stats);
}

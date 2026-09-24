async page => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
  await page.addInitScript(() => localStorage.clear());
  await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');
  await page.waitForFunction(() => window.__game?.debug);
  const acquisition = await page.evaluate(() => {
    const g=__game,q=g.debug;g.manual(true);q.traceCombat();
    g.scenario({player:{x:-17,y:0,z:-35,hp:25,mortar:true,overdrive:true},state:{prototype:true,overdrive:true},enemies:Object.fromEntries(q.world.enemies.filter(e=>e.battle!=='cargo-battery').map(e=>[e.id,0]))});
    g.step(3.3,false);
    const battery=q.world.enemies.filter(e=>e.battle==='cargo-battery');
    if(battery.some(e=>!e.awake))throw Error('Visible battery stayed dormant outside its old trigger');
    if(!q.enemyShots.some(s=>s.id.startsWith('battery-')))throw Error('Acquired battery never fired');
    const result={awake:battery.length,shots:q.enemyShots.length};
    q.clearShots();return result;
  });
  const battery = await page.evaluate(() => {
    const g = __game, q = g.debug;
    g.manual(true);
    g.scenario({player:{x:-17,y:0,z:-35,hp:25,mortar:true,overdrive:true},state:{prototype:true,overdrive:true}});
    const display = q.world.battleDisplays.find(d => d.id === 'cargo-battery');
    const machines = q.world.enemies.filter(e => e.battle === 'cargo-battery');
    const counts = [];
    for (let i = 0; i <= machines.length; i++) {
      if (i) q.hitEnemy(machines[i-1], 100, new q.T.Vector3(machines[i-1].x,0,machines[i-1].z), 'mortar');
      q.world.update(0,q.time,q.p,q.camera);
      counts.push(display.icons.filter(icon => icon.root.visible).length);
    }
    if (counts.join() !== '4,3,2,1,0') throw Error(`Incorrect battery icons: ${counts}`);
    q.updateEnemies(0.01);
    const pending = q.progression.signals.pending('cargo-battery');
    if (!pending || q.state['cargo-battery']) throw Error('Reward must wait for its cable');
    g.step(pending.remaining + .1, false);
    if (!q.state['cargo-battery']) throw Error('Battery reward stayed locked');
    const saved = JSON.parse(JSON.stringify(q.state));
    q.resetEnemies();q.world.update(0,q.time,q.p,q.camera);
    if (display.icons.some(icon => icon.root.visible)) throw Error('Completed battery reappeared');
    return {counts, reward:saved['cargo-battery']};
  });
  const haze = await page.evaluate(async () => {
    const {setViewDistance} = await import('/src/folded-haze.js');
    const q=__game.debug,T=q.T,renderer=q.renderer;
    const scene=new T.Scene();
    scene.fog=new T.Fog(0x1b3032,40,100);
    const plane=new T.Mesh(new T.PlaneGeometry(2000,2000),new T.MeshBasicMaterial({color:0xff00ff,side:T.DoubleSide}));
    scene.add(plane);
    const target=new T.WebGLRenderTarget(64,64);target.texture.colorSpace=T.SRGBColorSpace;
    const original=renderer.getRenderTarget(),results=[];
    const read=()=>{const a=new Uint8Array(64*64*4);renderer.render(scene,camera);renderer.readRenderTargetPixels(target,0,0,64,64,a);return a;};
    let camera;
    renderer.setRenderTarget(target);
    try {
      for (const view of ['third','overhead','ending']) {
        camera=view==='overhead'?new T.OrthographicCamera(-25,25,25,-25,.1,170):new T.PerspectiveCamera(60,1,.15,130);
        setViewDistance(scene,camera);
        for (const [yaw,pitch,intensity] of [[0,0,.48],[1.3,.35,.85],[3,-.5,.93]]) {
          scene.backgroundIntensity=intensity;
          camera.rotation.set(pitch,yaw,0);camera.updateMatrixWorld();
          const direction=camera.getWorldDirection(new T.Vector3());
          plane.quaternion.copy(camera.quaternion);
          plane.visible=false;const background=read();
          if(background[0]<250||background[1]<250||background[2]<250) throw Error('Far background is not dense white fog');
          for (const distance of [scene.fog.far+1,camera.far-1,camera.far+1]) {
            plane.position.copy(direction).multiplyScalar(distance);plane.visible=true;
            const actual=read();let max=0,total=0;
            for(let i=0;i<actual.length;i++)if(i%4!==3){const d=Math.abs(actual[i]-background[i]);max=Math.max(max,d);total+=d;}
            const mean=total/(64*64*3);
            if (mean>0.1||max>2) throw Error(`Fog edge ${view}/${yaw}/${distance}: mean=${mean} max=${max}`);
            results.push({view,yaw,distance,mean,max});
          }
        }
      }
    } finally {
      renderer.setRenderTarget(original);target.dispose();scene.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});q.draw();
    }
    return results;
  });
  if (errors.length) throw Error(errors.join('\n'));
  return {acquisition,battery,haze,errors};
}

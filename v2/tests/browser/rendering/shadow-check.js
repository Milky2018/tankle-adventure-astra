async page => {
  await page.waitForFunction(() => window.__game?.debug);
  const result = await page.evaluate(() => {
    const g=__game,q=g.debug,T=q.T;
    g.manual(true); q.setCameraView('third');
    const casters=new Map(q.world.occluders.flatMap(o=>o.meshes.map(({mesh})=>[mesh,mesh.castShadow])));
    const sun=q.scene.children.find(o=>o.isDirectionalLight&&o.castShadow);
    const pixels=[];
    for(const x of [0,.01,.1,1]) {
      g.scenario({player:{x,y:-8,z:86}});
      q.scene.updateMatrixWorld(true);sun.shadow.camera.updateProjectionMatrix();sun.shadow.updateMatrices(sun);
      const uv=new T.Vector3(5,0,80).applyMatrix4(sun.shadow.matrix);
      pixels.push([uv.x*sun.shadow.mapSize.x,uv.y*sun.shadow.mapSize.y]);
    }
    const drift=Math.max(...pixels.flatMap(uv=>uv.map((v,i)=>Math.abs(v-pixels[0][i]-Math.round(v-pixels[0][i])))));
    q.setCameraView('overhead');
    const lost=[];
    let faded=0;
    for(const [x,y,z] of [[0,-8,86],[-17,0,-35],[0,0,27],[142,24,-42]]) {
      g.scenario({player:{x,y,z}});
      q.world.update(1,q.time,q.p,q.camera);
      for(const [mesh,casts] of casters) if(casts&&!mesh.castShadow)lost.push(mesh.uuid);
      faded+=q.world.occluders.filter(o=>o.opacity<.99&&o.meshes.some(p=>casters.get(p.mesh))).length;
    }
    q.setCameraView('third');
    return {texelDrift:drift,lostCasters:new Set(lost).size,fadedOccluders:faded,pixels};
  });
  if (result.texelDrift > 1e-7) throw Error(`Unstable shadow grid: ${result.texelDrift}`);
  if (result.lostCasters) throw Error(`Cutaways disabled ${result.lostCasters} shadow casters`);
  if (!result.fadedOccluders) throw Error('No shadow-casting occluder faded during the test');
  const rendered = await page.evaluate(async () => {
    const {makeFoldedLighting} = await import('/src/rendering/lighting.js');
    const q=__game.debug,T=q.T,renderer=q.renderer;
    const scene=new T.Scene();scene.background=new T.Color(0xcccccc);
    const lighting=makeFoldedLighting(scene,[]);
    const plane=new T.Mesh(new T.PlaneGeometry(80,80),new T.MeshStandardMaterial({color:0xdddddd}));
    plane.rotation.x=-Math.PI/2;plane.receiveShadow=true;scene.add(plane);
    const blocker=new T.Mesh(new T.BoxGeometry(7,8,5),new T.MeshStandardMaterial({color:0x224444,transparent:true}));
    blocker.position.set(0,4,0);blocker.castShadow=true;scene.add(blocker);
    // Isolate the projected shadow; the blocker itself does not alter image pixels.
    blocker.material.colorWrite=false;blocker.material.depthWrite=false;
    const camera=new T.OrthographicCamera(-20,20,20,-20,.1,100);
    camera.position.set(16,25,22);camera.lookAt(0,0,0);
    const target=new T.WebGLRenderTarget(256,256),original=renderer.getRenderTarget();
    const render=()=>{renderer.render(scene,camera);const a=new Uint8Array(256*256*4);renderer.readRenderTargetPixels(target,0,0,256,256,a);return a;};
    const diff=(a,b)=>{let max=0,total=0;for(let i=0;i<a.length;i+=4)for(let c=0;c<3;c++){const d=Math.abs(a[i+c]-b[i+c]);max=Math.max(max,d);total+=d;}return {max,mean:total/(256*256*3)};};
    renderer.setRenderTarget(target);
    try {
      lighting.trackShadows(new T.Vector3());const baseline=render();
      const movements=[];
      for(const focus of [new T.Vector3(.01,0,0),new T.Vector3(.1,.04,-.08),new T.Vector3(1,.3,-1)]) {
        lighting.trackShadows(focus);movements.push(diff(baseline,render()));
      }
      lighting.trackShadows(new T.Vector3());blocker.material.opacity=.14;
      const faded=diff(baseline,render());
      blocker.castShadow=false;const removed=diff(baseline,render());
      if(removed.mean<.1)throw Error('Fixture did not render a shadow');
      if(faded.max>1||movements.some(d=>d.max>2))throw Error(JSON.stringify({movements,faded,removed}));
      return {movements,faded,removed};
    } finally {
      renderer.setRenderTarget(original);target.dispose();lighting.sun.shadow.map?.dispose();
      plane.geometry.dispose();plane.material.dispose();blocker.geometry.dispose();blocker.material.dispose();q.draw();
    }
  });
  return { ...result, rendered };
}

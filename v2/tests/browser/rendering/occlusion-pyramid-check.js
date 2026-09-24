async page=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
  await page.goto('http://127.0.0.1:5174/?chapter=folded&test&manual');
  await page.waitForFunction(()=>window.__game?.debug);
  const result=await page.evaluate(async()=>{
    const {cameraApertureOpacity,viewportPyramidMatrix}=await import('/src/rendering/visibility.js');
    const {createRenderPolicy}=await import('/src/rendering/render-policy.js');
    const q=__game.debug,T=q.T,renderer=q.renderer;
    const scene=new T.Scene();scene.background=new T.Color(0xffffff);
    const aperture=createRenderPolicy(),material=new T.MeshBasicMaterial({color:0x660000,side:T.DoubleSide});aperture.material(material,'scenery');
    const plane=new T.Mesh(new T.PlaneGeometry(.002,.002),material);scene.add(plane);
    // Observe each world sample separately without changing the tested game camera.
    const probe=new T.PerspectiveCamera(30,1,.0001,1),target=new T.WebGLRenderTarget(65,65);
    target.texture.colorSpace=T.SRGBColorSpace;
    const previous=renderer.getRenderTarget(),results=[];renderer.setRenderTarget(target);
    const read=()=>{renderer.render(scene,probe);const pixel=new Uint8Array(4);renderer.readRenderTargetPixels(target,32,32,1,1,pixel);return [...pixel].slice(0,3);};
    function test(name,player,camera,point,blocked,patches=[]){
      probe.position.copy(point).add(new T.Vector3(0,0,.01));probe.lookAt(point);probe.updateMatrixWorld();
      plane.position.copy(point);plane.quaternion.copy(probe.quaternion);
      aperture.update(player);aperture.setView(true);aperture.setCamera(player,camera);aperture.support(patches);
      aperture.enable(false);const solid=read();aperture.enable(true);const cut=read();
      const delta=Math.max(...solid.map((v,i)=>Math.abs(v-cut[i])));
      const opacity=cameraApertureOpacity(point,viewportPyramidMatrix(player,camera),patches);
      if(blocked?delta<100||opacity>.3:delta>1||opacity!==1)throw Error(JSON.stringify({name,solid,cut,delta,opacity,blocked}));
      results.push({name,delta,opacity});
    }
    try{
      const p=new T.Vector3(186,26,110),apex=p.clone().add(new T.Vector3(0,1.6,0));
      for(const aspect of [16/9,9/16]){
        const camera=new T.PerspectiveCamera(60,aspect,.15,230);
        camera.position.set(194,34,98);camera.lookAt(188,29,110);camera.updateMatrixWorld();
        const sample=(x,y,t)=>{
          const depth=apex.clone().project(camera).z;
          const offset=new T.Vector3(x,y,depth).unproject(camera).sub(new T.Vector3(0,0,depth).unproject(camera));
          return apex.clone().lerp(new T.Vector3(0,0,-1).unproject(camera).add(offset),t);
        };
        for(const t of [.15,.5,.98]){
          for(const [x,y]of [[0,0],[.8,.8],[-.8,-.8]])test(`${aspect} inside ${x}/${y}/${t}`,p,camera,sample(x,y,t),true);
          for(const [x,y]of [[1.1,0],[0,-1.1]])test(`${aspect} outside ${x}/${y}/${t}`,p,camera,sample(x,y,t),false);
        }
        for(const t of [-.1,1.01])test(`${aspect} beyond ${t}`,p,camera,sample(0,0,t),false);
      }
      // The sloping surface under the hull must remain opaque in the same mask.
      const camera=new T.PerspectiveCamera(60,16/9,.15,230);
      camera.position.copy(apex).add(new T.Vector3(0,6,12));camera.lookAt(apex);camera.updateMatrixWorld();
      const point=apex.clone().lerp(camera.position,.5),patches=[{x:point.x-1,z:point.z-1,y:point.y-.5,w:2,d:2,rise:1}];
      const floorMaterial=new T.MeshBasicMaterial({color:0x660000,side:T.DoubleSide});aperture.material(floorMaterial,'floor');plane.material=floorMaterial;
      test('support',p,camera,point,false,patches);floorMaterial.dispose();plane.material=material;
      return results;
    }finally{renderer.setRenderTarget(previous);target.dispose();plane.geometry.dispose();material.dispose();q.draw();}
  });
  for(const view of ['third','overhead']){
    await page.evaluate(view=>{
      const g=__game;g.debug.setCameraView(view);
      g.scenario({player:{x:-28,y:-16,z:88,invincible:1e9},state:{prototype:true,'overdrive-return':true}});
      if(view==='third')g.look(Math.PI,.15);g.step(.1);g.debug.draw();
    },view);
    await page.screenshot({path:`output/playwright/regression/viewport-pyramid-${view}.png`});
  }
  await page.setViewportSize({width:600,height:900});
  await page.waitForFunction(()=>__game.debug.renderer.getSize(new __game.debug.T.Vector2()).x===600);
  await page.evaluate(()=>{__game.debug.setCameraView('third');__game.look(Math.PI,.15);__game.step(.1);__game.debug.draw();});
  await page.screenshot({path:'output/playwright/regression/viewport-pyramid-portrait.png'});
  if(errors.length)throw Error(errors.join('\n'));return {result,errors};
}

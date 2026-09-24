async page => {
  const errors=[];
  page.on('console',event=>{if(event.type()==='error')errors.push(event.text());});
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:5174/?chapter=folded&test&manual');
  await page.waitForFunction(()=>window.__game?.debug);
  const result=await page.evaluate(async()=>{
    const {makePlayerHaze,setViewDistance}=await import('/src/folded-haze.js');
    const {batchStatic}=await import('/src/static-batching.js');
    const q=__game.debug,T=q.T,renderer=q.renderer;
    __game.manual(true);
    const scene=new T.Scene(),player=new T.Vector3(7,16,-40),settings={fogNear:10,fogFar:30,renderDistance:40};
    scene.fog=new T.Fog(0xffffff,10,30);makePlayerHaze(scene,player,settings);
    const target=new T.WebGLRenderTarget(65,65);target.texture.colorSpace=T.SRGBColorSpace;
    const previous=renderer.getRenderTarget(),results=[];
    renderer.setRenderTarget(target);
    const read=camera=>{
      setViewDistance(scene,camera,settings,player);renderer.render(scene,camera);
      const pixel=new Uint8Array(4);renderer.readRenderTargetPixels(target,32,32,1,1,pixel);return [...pixel].slice(0,3);
    };
    try{
      for(const kind of ['mesh','instanced','batched']){
        const material=new T.MeshBasicMaterial({color:0x662222,side:T.DoubleSide}),geometry=new T.PlaneGeometry(4,4);
        const object=kind==='instanced'?new T.InstancedMesh(geometry,material,1):kind==='batched'?new T.BatchedMesh(1,4,6,material):new T.Mesh(geometry,material);
        if(kind==='batched')object.addInstance(object.addGeometry(geometry));
        scene.add(object);
        const colors=[];
        for(const overhead of [false,true])for(const angle of [0,.8,1.6,2.4,3.2]){
          const camera=overhead?new T.OrthographicCamera(-20,20,20,-20,.1,100):new T.PerspectiveCamera(60,1,.1,100);
          camera.position.copy(player).add(new T.Vector3(Math.cos(angle)*22,overhead?35:8,Math.sin(angle)*22));
          const point=player.clone().add(new T.Vector3(20,0,0));camera.lookAt(point);
          const matrix=new T.Matrix4().compose(point,camera.quaternion,new T.Vector3(1,1,1));
          if(kind==='mesh'){object.matrixAutoUpdate=false;object.matrix.copy(matrix);}else{object.setMatrixAt(0,matrix);if(object.instanceMatrix)object.instanceMatrix.needsUpdate=true;object.computeBoundingSphere();}
          const color=read(camera);colors.push(color);
        }
        const drift=Math.max(...colors.flatMap(color=>color.map((v,i)=>Math.abs(v-colors[0][i]))));
        if(drift>1)throw Error(`${kind}: orbit changed fog color by ${drift}`);
        if(colors[0].some(v=>v<120||v>245))throw Error(`${kind}: expected partial fog, got ${colors[0]}`);
        results.push({kind,drift,color:colors[0]});scene.remove(object);object.dispose?.();geometry.dispose();material.dispose();
      }
      const root=new T.Group(),material=new T.MeshBasicMaterial({color:0xff00ff});
      for(const x of [20,80])for(let i=0;i<4;i++){
        const mesh=new T.Mesh(new T.BoxGeometry(.2,.2,.2),material);mesh.position.copy(player).add(new T.Vector3(x,0,i*.1));root.add(mesh);
      }
      batchStatic(root);scene.add(root);
      let farDraws=0,nearDraws=0;
      root.children.forEach(mesh=>{
        const previous=mesh.onBeforeRender;mesh.onBeforeRender=function(...args){
          if(mesh.geometry.boundingSphere.center.x>50)farDraws++;else nearDraws++;
          previous.apply(this,args);
        };
      });
      const camera=new T.PerspectiveCamera(100,1,.1,200);camera.position.copy(player).add(new T.Vector3(-20,1,0));camera.lookAt(player.clone().add(new T.Vector3(20,0,0)));
      read(camera);
      if(farDraws||!nearDraws)throw Error(`Radial batches: near=${nearDraws}, far=${farDraws}`);
      if(root.children.some(mesh=>!mesh.visible))throw Error('Distance culling leaked gameplay visibility state');
      const sun=new T.DirectionalLight(0xffffff,1);sun.castShadow=true;
      sun.position.copy(player).add(new T.Vector3(0,50,0));sun.target.position.copy(player);
      Object.assign(sun.shadow.camera,{left:-100,right:100,top:100,bottom:-100,near:.1,far:150});sun.shadow.mapSize.set(128,128);sun.shadow.camera.updateProjectionMatrix();
      scene.add(sun,sun.target);
      const far=root.children.find(mesh=>mesh.geometry.boundingSphere.center.x>50);far.castShadow=true;
      let shadowDraws=0;far.onBeforeShadow=()=>{shadowDraws++;};read(camera);
      if(!shadowDraws)throw Error('Radial color culling removed an offscreen shadow caster');
      scene.remove(sun,sun.target);sun.shadow.dispose();
      scene.remove(root);root.traverse(o=>o.geometry?.dispose());material.dispose();
      const plane=new T.Mesh(new T.PlaneGeometry(100,100),new T.MeshBasicMaterial({color:0xff00ff,side:T.DoubleSide}));scene.add(plane);
      for(const distance of [31,39,41]){
        plane.position.copy(player).add(new T.Vector3(distance,0,0));camera.lookAt(plane.position);plane.quaternion.copy(camera.quaternion);
        const color=read(camera);if(color.some(v=>v<254))throw Error(`Exposed render boundary at ${distance}: ${color}`);
      }
      plane.geometry.dispose();plane.material.dispose();
      return {orbits:results,nearDraws,farDraws,shadowDraws};
    }finally{renderer.setRenderTarget(previous);target.dispose();q.draw();}
  });
  if(errors.length)throw Error(errors.join('\n'));
  return {result,errors};
}

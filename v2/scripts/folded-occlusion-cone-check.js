async page=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
  await page.goto('http://127.0.0.1:5174/?chapter=folded&test&manual');
  await page.waitForFunction(()=>window.__game?.debug);
  const result=await page.evaluate(async()=>{
    const {cameraApertureOpacity}=await import('/src/folded-visibility.js');
    const {createRenderPolicy}=await import('/src/folded-render-policy.js');
    const q=__game.debug,T=q.T,renderer=q.renderer;__game.manual(true);
    const scene=new T.Scene();scene.background=new T.Color(0xffffff);
    const aperture=createRenderPolicy(),material=new T.MeshBasicMaterial({color:0x660000,side:T.DoubleSide});aperture.material(material,'scenery');
    const plane=new T.Mesh(new T.PlaneGeometry(.2,.2),material);scene.add(plane);
    const camera=new T.PerspectiveCamera(60,1,.01,1000),target=new T.WebGLRenderTarget(65,65);
    target.texture.colorSpace=T.SRGBColorSpace;
    const previous=renderer.getRenderTarget(),results=[];renderer.setRenderTarget(target);
    const read=()=>{renderer.render(scene,camera);const pixel=new Uint8Array(4);renderer.readRenderTargetPixels(target,32,32,1,1,pixel);return [...pixel].slice(0,3);};
    const test=(name,player,eye,point,blocked)=>{
      camera.position.copy(eye);camera.lookAt(point.x,point.y,point.z);plane.position.copy(point);plane.quaternion.copy(camera.quaternion);
      aperture.update(player);aperture.setView(true);aperture.setCamera(player,eye);
      aperture.enable(false);const solid=read();aperture.enable(true);const cut=read();
      const delta=Math.max(...solid.map((v,i)=>Math.abs(v-cut[i]))),opacity=cameraApertureOpacity(point,player,eye);
      if(blocked?delta<100||opacity>.3:delta!==0||opacity!==1)throw Error(JSON.stringify({name,solid,cut,delta,opacity,blocked}));
      results.push({name,delta,opacity});
    };
    try{
      const p=new T.Vector3(-17,0,-35),eye=new T.Vector3(-17,8.169000801966748,-48.80890396753294);
      for(const z of [-44,-43,-42,-41,-40])test(`freight ramp ${z}`,p,eye,new T.Vector3(-17,16-(z+68)*.25-.325,z),false);
      const origin=new T.Vector3(),c=new T.Vector3(0,5,-12);
      for(const t of [.25,.5,.75,.95]){
        const point=new T.Vector3(0,1.6+(c.y-1.6)*t,c.z*t);
        test(`blocker ${t}`,origin,c,point,true);
        test(`beside ${t}`,origin,c,point.clone().add(new T.Vector3(2.3,0,0)),false);
      }
      test('behind tank',origin,c,new T.Vector3(0,2.6,.4),false);
      test('behind eye',origin,c,new T.Vector3(0,5.1,-12.4),false);
      return results;
    }finally{renderer.setRenderTarget(previous);target.dispose();plane.geometry.dispose();material.dispose();q.draw();}
  });
  await page.evaluate(()=>{
    const g=__game;g.manual(true);g.scenario({player:{x:-17,y:0,z:-35,invincible:1e9}});g.debug.setCameraView('third');g.look(0,.267);g.step(.1);
  });
  await page.screenshot({path:'output/playwright/occlusion-after.png'});
  if(errors.length)throw Error(errors.join('\n'));return {result,errors};
}

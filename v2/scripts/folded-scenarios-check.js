async page=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.route('**/src/folded.js*',async route=>{
    const response=await route.fetch();await route.fulfill({response,body:await response.text()+`
window.__foldedProbe={
  visual(){
    const gl=renderer.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight;
    const read=()=>{renderer.render(scene,camera);const pixels=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,pixels);return pixels;};
    const start=camera.position.x,base=read(),counts=[],cells={};
    for(const dx of [.0001,-.0001,.0002,-.0002]){camera.position.x=start+dx;camera.updateMatrixWorld();const pixels=read();let changed=0;for(let i=0;i<base.length;i+=4)if(Math.max(Math.abs(base[i]-pixels[i]),Math.abs(base[i+1]-pixels[i+1]),Math.abs(base[i+2]-pixels[i+2]))>25){changed++;const pixel=i/4,key=Math.floor((pixel%w)/64)+","+Math.floor((h-1-Math.floor(pixel/w))/64);cells[key]=(cells[key]||0)+1;}counts.push(changed);}
    camera.position.x=start;camera.updateMatrixWorld();read();return {max:Math.max(...counts),pixels:w*h,cells:Object.entries(cells).sort((a,b)=>b[1]-a[1]).slice(0,12)};
  },
  materials:()=>world.surfaces.filter(s=>s.opacity<.4).map(s=>({id:s.id,opacity:s.opacity,alpha:s.mesh.material.opacity,transparent:s.mesh.material.transparent,depthWrite:s.mesh.material.depthWrite,visible:s.mesh.visible,aperture:s.mesh.material.userData.aperture})),
  aim:()=>({pitch:model.barrel.rotation.x,point:aim.clone(),player:{...p}}),
  carrier(y,destination){const l=world.lifts.find(l=>l.id==='carrier');l.y=y;l.destination=destination;l.used=true;l.wait=0;},
  collision:(from,to)=>{const a=new T.Vector3(...from),b=new T.Vector3(...to).sub(a);const hit=world.cast(a,b.clone().normalize(),b.length(),{targets:false});return !!hit;},
  resetHealth:()=>{p.hp=50;p.invincible=time+20;},
  worldBytes:()=>{const seen=new Set();let bytes=0;scene.traverse(o=>{if(o.geometry&&!seen.has(o.geometry)){seen.add(o.geometry);for(const a of Object.values(o.geometry.attributes))bytes+=a.array.byteLength;bytes+=o.geometry.index?.array.byteLength||0;}});return bytes;}
};`});
  });
  await page.goto('http://127.0.0.1:5174/?chapter=folded&route=garden&test');await page.waitForFunction(()=>!!window.__foldedProbe);await page.unroute('**/src/folded.js*');
  await page.evaluate(()=>window.__game.manual(true));
  const samples=[];
  for(const [name,x,z,y]of [['turntable',0,27,0],['canal',0,-4,-16],['load',90,-34,2],['carrier',78,-71,16],['roof',24,8,24],['foundry',-30,128,-16],['emitter',216,-20,24],['rig',222,117,-24],['pressure',211,24,-16],['predecessors',44,-10,-40],['furnace',0,0,-56]]){
    await page.evaluate(([x,z,y])=>{__game.scenario({player:{x,z,y,hp:50,deployed:y===-16}});__foldedProbe.resetHealth();__game.step(.5);},[x,z,y]);
    const visual=await page.evaluate(()=>__foldedProbe.visual());if(visual.max>visual.pixels*.001)throw Error(`Unstable ${name}: ${JSON.stringify(visual)}`);
    const materials=await page.evaluate(()=>__foldedProbe.materials());if(materials.some(m=>!m.visible||!m.transparent||m.depthWrite||m.alpha!==1||!m.aperture))throw Error('Cutaway material mismatch');
    await page.screenshot({path:`v2/output/playwright/folded-city/verified-${name}.png`});
    const start=await page.evaluate(()=>{__game.manual(false);return {frames:__game.snapshot().frames,now:performance.now()};});await page.waitForTimeout(1300);
    const end=await page.evaluate(()=>{__game.manual(true);return {frames:__game.snapshot().frames,now:performance.now(),calls:__game.snapshot().drawCalls,bytes:__foldedProbe.worldBytes()};});
    const fps=(end.frames-start.frames)/((end.now-start.now)/1000);if(fps<35)throw Error(`Low FPS ${name}: ${fps}`);
    samples.push({name,...visual,transparentPatches:materials.length,fps,drawCalls:end.calls,geometryMiB:end.bytes/1024/1024});
  }
  // Use the real single reticle and barrel, including upper and lower visible machinery.
  const aimChecks=[];
  for(const [name,x,z,y,tx,tz,ty]of [['level',0,27,0,0,18,2],['upper-latch',90,-18,0,90,-34,3.3],['lower-panel',-26,10,-4,-39.7,-8,-6.6]]){
    await page.evaluate(([x,z,y])=>{__game.scenario({player:{x,z,y,deployed:false,weapon:'cannon'},state:{load:false,magnet:false}});__game.step(.2);},[x,z,y]);
    const point=await page.evaluate(([x,z,y])=>__game.project(x,z,y),[tx,tz,ty]);await page.mouse.move(point.x,point.y);await page.evaluate(()=>__game.step(.1));
    const result=await page.evaluate(q=>{const a=__foldedProbe.aim(),r=document.getElementById('reticle').getBoundingClientRect();return {pitch:a.pitch,error:Math.hypot(r.x+r.width/2-q.x,r.y+r.height/2-q.y),count:document.querySelectorAll('#reticle').length};},point);
    if(Math.abs(result.pitch)>Math.PI*40/180+.001||result.error>1||result.count!==1)throw Error('Reticle/pitch mismatch '+JSON.stringify(result));if(name==='upper-latch'&&result.pitch>-.1||name==='lower-panel'&&result.pitch<.05)throw Error('Vertical target was flattened '+JSON.stringify(result));aimChecks.push({name,...result});
  }
  const floors=await page.evaluate(()=>({bridge:__foldedProbe.collision([0,-14,-4],[0,4,-4]),openCanal:__foldedProbe.collision([-5,-14,-4],[5,-14,-4])}));
  if(!floors.bridge||floors.openCanal)throw Error('Vertical shell occlusion failed');
  await page.evaluate(()=>{__game.scenario({player:{x:78,z:-66.6,y:8},state:{brake:true}});__foldedProbe.carrier(8,16);__game.step(1);});
  let s=await page.evaluate(()=>__game.snapshot());if(s.lifts.find(l=>l.id==='carrier').y!==8||s.player.y!==8)throw Error('Lift moved through half-boarded hull');
  await page.evaluate(()=>{__game.scenario({player:{x:78,z:-71,y:8}});__game.step(2);});
  s=await page.evaluate(()=>__game.snapshot());if(s.player.y!==16)throw Error('Lift failed to carry a fully boarded hull');
  await page.evaluate(()=>{__game.scenario({player:{x:32,y:24,z:22,phoenix:true},state:{cage:true,phoenix:true}});__game.interact();});
  await page.reload();await page.waitForFunction(()=>!!window.__game);s=await page.evaluate(()=>__game.snapshot());
  if(s.player.y!==24||!s.state.cage||!s.player.phoenix)throw Error('Upper refuge persistence failed');
  await page.keyboard.press('Escape');if(errors.length)throw Error(JSON.stringify(errors));
  return {samples,aimChecks,floors,halfBoarding:true,liftCarries:true,upperRefugeReload:true,errors};
}

async page=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/src/main.js*',async route=>{
    const response=await route.fetch();await route.fulfill({response,body:await response.text()+`
window.__hoistVisual=()=>{
  paused=true;renderer.shadowMap.enabled=true;
  const gl=renderer.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight;
  const read=()=>{renderer.render(scene,camera);const pixels=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,pixels);return pixels;};
  const start=camera.position.x,base=read(),counts=[];
  for(const offset of [.0001,-.0001,.0002,-.0002,.0003,-.0003]){
    camera.position.x=start+offset;camera.updateMatrixWorld();const pixels=read();let changed=0;
    for(let i=0;i<base.length;i+=4)if(Math.max(Math.abs(base[i]-pixels[i]),Math.abs(base[i+1]-pixels[i+1]),Math.abs(base[i+2]-pixels[i+2]))>25)changed++;
    counts.push(changed);
  }
  camera.position.x=start;camera.updateMatrixWorld();read();paused=false;
  return {counts,max:Math.max(...counts),pixels:w*h};
};`});
  });
  await page.goto('http://127.0.0.1:5174/?chapter=hoist&test');await page.waitForFunction(()=>window.__hoistVisual);await page.unroute('**/src/main.js*');
  const samples=[];
  for(const [name,x,z,y]of [['entry',300,-84,0],['gallery',296,-126,8],['upper',305,-171,16],['crown',318,-106,24],['sump',300,-106,-8]]){
    await page.evaluate(([x,z,y])=>{__game.scenario({player:{x,z,hoistY:y,hp:50}});__game.step(.5);},[x,z,y]);
    const stats=await page.evaluate(()=>__hoistVisual());samples.push({name,...stats});
    await page.screenshot({path:`v2/output/playwright/visual-fix/verified-${name}.png`});
    if(stats.max>stats.pixels*.001)throw Error('Subpixel camera motion changed broad surfaces: '+JSON.stringify(samples));
  }
  await page.keyboard.press('Escape');if(errors.length)throw Error(JSON.stringify(errors));return {samples,errors};
}

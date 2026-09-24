async page => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1280,height:720});
  const cases=[['opening','baseline'],['freight','baseline'],['optics','baseline'],['freight','frozen-shadows'],['freight','no-shadows'],['freight','single-matrix-pass'],['freight','no-world-visual-update'],['freight','pixel-ratio-1'],['freight','baseline'],['freight','batch-sort-off'],['freight','baseline']];
  const index=await page.evaluate(()=>Number(localStorage.getItem('frame-breakdown-index')||0));
  const [location,variant]=cases[index];
  await page.evaluate(index=>{localStorage.setItem('frame-breakdown-index',index+1);localStorage.removeItem('furnace-born-v2-city');localStorage.setItem('furnace-born-v2-settings',JSON.stringify({cameraView:'third',quality:'high',music:false,sfx:false,viewDistance:JSON.parse(localStorage.getItem('frame-breakdown-distance')||'null')||{fogNear:200,fogFar:220,renderDistance:230}}));},index);
  await page.goto('http://127.0.0.1:5174/?chapter=folded&test&manual');
  await page.waitForFunction(()=>window.__game?.debug);await page.bringToFront();
  const result=await page.evaluate(async({location,variant})=>{
    const g=__game,q=g.debug,renderer=q.renderer,profile=q.profile;
    const positions={opening:[0,-8,86],freight:[-17,0,-35],optics:[202,16,45]};
    const [x,y,z]=positions[location];g.scenario({player:{x,y,z,invincible:1e9}});
    renderer.setPixelRatio(variant==='pixel-ratio-1'?1:1.75);
    if(variant==='frozen-shadows'){renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;}
    if(variant==='no-shadows')renderer.shadowMap.enabled=false;
    if(variant==='single-matrix-pass')q.scene.matrixWorldAutoUpdate=false;
    if(variant==='no-world-visual-update')q.world.update=()=>{};
    if(variant==='batch-sort-off')q.scene.traverse(o=>{if(o.isBatchedMesh)o.sortObjects=false;});
    let phase='logic',collecting=false,shadowCalls=0,shadowTriangles=0;
    const extra={calls:[],shadowCalls:[],triangles:[],shadowTriangles:[]};
    renderer.info.autoReset=false;
    const render=renderer.render;
    renderer.render=function(...args){phase='render';renderer.info.reset();shadowCalls=shadowTriangles=0;try{return render.apply(this,args);}finally{phase='logic';if(collecting){extra.calls.push(renderer.info.render.calls);extra.shadowCalls.push(shadowCalls);extra.triangles.push(renderer.info.render.triangles);extra.shadowTriangles.push(shadowTriangles);}}};
    const shadow=renderer.shadowMap.render;
    renderer.shadowMap.render=profile.wrap('shadowPass',function(...args){const result=shadow.apply(this,args);shadowCalls=renderer.info.render.calls;shadowTriangles=renderer.info.render.triangles;return result;});
    const matrix=q.scene.updateMatrixWorld;
    const matrixLogic=profile.wrap('matrixLogic',matrix),matrixRender=profile.wrap('matrixRender',matrix);
    q.scene.updateMatrixWorld=function(...args){return (phase==='render'?matrixRender:matrixLogic).apply(this,args);};
    for(const [obj,key,name] of [[q.world.presentation,'update','presentation'],[q.world,'transport','transport'],[q.progression,'advance','signals'],[q.world,'cast','worldRaycast'],[q.world.presentation.finale,'update','finalMachinery']])obj[key]=profile.wrap(name,obj[key]);
    const census={nodes:0,meshes:0,casters:0,transparentMeshes:0,matrixAuto:0,materials:new Set(),geometries:new Set()};
    q.scene.traverse(o=>{census.nodes++;if(o.matrixAutoUpdate)census.matrixAuto++;if(o.isMesh){census.meshes++;if(o.castShadow)census.casters++;census.geometries.add(o.geometry.uuid);const mats=Array.isArray(o.material)?o.material:[o.material];if(mats.some(m=>m.transparent))census.transparentMeshes++;for(const m of mats)census.materials.add(m.uuid);}});
    census.materials=census.materials.size;census.geometries=census.geometries.size;
    const gl=renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');
    const environment={gpu:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),browser:navigator.userAgent,pixelRatio:renderer.getPixelRatio(),buffer:[gl.drawingBufferWidth,gl.drawingBufferHeight]};
    g.manual(false);const intervals=[];let start,last,measureStart,frameStart;
    await new Promise(resolve=>{const tick=now=>{start??=now;const t=now-start;q.follow.yaw=(t<3000?t/3000:(t-3000)/8000)*Math.PI*2;if(t>=3000){if(measureStart===undefined){measureStart=last=now;frameStart=q.frames();profile.start();collecting=true;}else{intervals.push(now-last);last=now;}}if(t>=11000){profile.stop();collecting=false;resolve();return;}requestAnimationFrame(tick);};requestAnimationFrame(tick);});
    g.manual(true);const frames=q.frames()-frameStart,elapsed=last-measureStart,mean=a=>a.reduce((a,b)=>a+b,0)/a.length,sorted=[...intervals].sort((a,b)=>a-b);
    return {environment,census,frames,elapsed,fps:frames*1000/elapsed,meanFrame:mean(intervals),p95Frame:sorted[Math.floor(sorted.length*.95)],cpu:Object.fromEntries(Object.entries(profile.stats).map(([k,s])=>[k,{ms:s.total/frames,calls:s.count/frames,max:s.max}])),gpu:profile.gpu.length?{ms:mean(profile.gpu),samples:profile.gpu.length}:null,draws:Object.fromEntries(Object.entries(extra).map(([k,a])=>[k,mean(a)])),position:[q.p.x,q.p.y,q.p.z]};
  },{location,variant});
  if(errors.length)throw Error(errors.join('\n'));
  return {index,location,variant,...result,errors};
}

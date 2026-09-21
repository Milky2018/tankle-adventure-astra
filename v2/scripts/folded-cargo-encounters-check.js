// Authored early encounters, isolated from unrelated floors and campaign progress.
async page=>{
 const results=[];
 for(const scene of [
  {name:'dispatch',ids:['dispatch-turret','dispatch-flanker'],x:-9,y:0,z:8,weapon:'cannon',orbit:[[-9,-16],[-9,-27],[-14,-27],[-9,-16]]},
  {name:'freight',ids:['freight-lobber','freight-flanker'],x:43,y:0,z:-31,weapon:'mortar',orbit:[[44,-31],[45,-33],[44,-31],[43,-33]]}
 ]){
  await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test&manual');await page.waitForFunction(()=>window.__game?.debug);
  const result=await page.evaluate(scene=>{
   const g=__game;g.manual(true);g.scenario({player:{x:scene.x,y:scene.y,z:scene.z,hp:25,overdrive:true,mortar:scene.weapon==='mortar',weapon:scene.weapon},state:{'bridge-crane':true,freight:true},enemies:Object.fromEntries(g.snapshot().enemies.map(e=>[e.id,scene.ids.includes(e.id)?e.hp:0]))});
   let corner=0;
   for(let i=0;i<3600;i++){
    const p=g.snapshot().player,foes=g.snapshot().enemies.filter(e=>scene.ids.includes(e.id)&&e.hp>0);
    if(!foes.length){g.setInput([]);g.step(.1);return {name:scene.name,hp:p.hp,seconds:i/60};}if(p.hp<=0)throw Error(`${scene.name} encounter killed the fixture`);
    if(Math.hypot(p.x-scene.orbit[corner][0],p.z-scene.orbit[corner][1])<.5)corner=(corner+1)%scene.orbit.length;
    const [x,z]=scene.orbit[corner],dx=x-p.x,dz=z-p.z,keys=Math.abs(dx)>Math.abs(dz)?dx>0?['KeyS','KeyD']:['KeyW','KeyA']:dz>0?['KeyS','KeyA']:['KeyW','KeyD'];
    const e=foes.sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];g.aimAt(e.x,e.z,e.y+1.5);keys.push('Mouse0');g.setInput(keys);g.step(1/60,false);
   }throw Error(`${scene.name} encounter timed out`);
  },scene);results.push(result);
  await page.evaluate(()=>__game.debug.draw());await page.screenshot({path:`v2/output/playwright/regression/cargo-${scene.name}-combat.png`});
 }
 return {fixture:true,results};
}

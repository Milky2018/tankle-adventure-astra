async page=>{
 await page.goto('http://127.0.0.1:5174/?chapter=folded&view=overhead&test');await page.waitForFunction(()=>window.__game);await page.evaluate(()=>__game.manual(true));
 const result=[];
 for(const [id,position,target,weapon] of [
 ['bridge-crane',[0,0,-6],[0,-24,1.3],'cannon'],['bridge-crane',[0,0,-6],[0,-24,1.3],'mortar'],
 ...[85.2,90,94.8].flatMap(x=>[-18,-23,-26].map(z=>['load',[x,0,z],[90,-34,3.3],'cannon'])),
 ['load',[90,0,-18],[90,-34,3.3],'cannon'],['load',[90,0,-18],[90,-34,3.3],'mortar'],
 ['inner-optics',[254,-24,132],[254,124,-22],'cannon'],['inner-optics',[254,-24,132],[254,124,-22],'laser']]){
  await page.evaluate(({id,position,weapon})=>{const g=__game;g.setInput([]);g.scenario({player:{x:position[0],y:position[1],z:position[2],weapon,mortar:true,laser:true,hp:50,heat:0,overheated:false,lastShot:-100,invincible:1e9},state:{[id]:false}});g.step(.5);},{id,position,weapon});
  const point=await page.evaluate(t=>__game.aimAt(...t),target);await page.mouse.move(point.x,point.y);await page.mouse.down();await page.evaluate(()=>__game.step(1.4));await page.mouse.up();
  const check=await page.evaluate(({id,weapon})=>({id,weapon,open:__game.snapshot().state[id],aim:__game.snapshot().aim}),{id,weapon});
  const expected=weapon==='mortar'&&id!=='inner-optics'||weapon==='laser';
  if(check.open!==expected)throw Error(JSON.stringify({position,target,expected,...check}));result.push(check);
  await page.screenshot({path:`v2/output/playwright/progression/${id}-${weapon}.png`});
 }
 return {checks:result,isolated:true};
}

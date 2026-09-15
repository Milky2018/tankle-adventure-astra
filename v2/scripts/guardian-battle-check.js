async(page)=>{
  const runs=[];
  for(const red of [false,true]){
    await page.goto('http://127.0.0.1:5174/?chapter=4&test');
    await page.evaluate(()=>localStorage.removeItem('furnace-born-v2-midgame-preview'));
    await page.reload();await page.waitForFunction(()=>window.__game);
    const run=await page.evaluate(red=>{
      const g=window.__game;
      g.scenario({player:{x:red?230:236,z:red?-198:-226,laser:!red,weapon:red?'cannon':'laser',phoenix:true,circulation:red,heat:red?100:0,overheated:red,lastHeat:g.snapshot().time,speed:1}});
      const guardian=()=>g.snapshot().enemies.find(e=>e.type==='guardian');
      const initial=guardian().hp,start=g.snapshot().time;
      if(red){
        g.setInput(['KeyW','KeyD','ShiftLeft']);
        for(let i=0;i<240&&guardian().hp===initial;i++)g.step(1/60);
        const first=guardian().hp;
        if(first!==initial-24||first<=0)throw Error(`First red impact: ${initial} -> ${first}`);
        g.setInput(['KeyS','KeyA','ShiftLeft']);g.step(2.1);
        g.setInput(['KeyW','KeyD','ShiftLeft']);
        for(let i=0;i<240&&guardian().hp>0&&g.snapshot().deathTime<0;i++)g.step(1/60);
      }else{
        let targetX=236,wasWarning=false;
        for(let i=0;i<700&&guardian().hp>0&&g.snapshot().deathTime<0;i++){
          const e=guardian(),p=g.snapshot().player;
          if(e.state==='warn'&&!wasWarning)targetX=p.x<237?240:234;
          wasWarning=e.state==='warn';
          const dx=targetX-p.x,codes=Math.abs(dx)>.3?(dx>0?['KeyS','KeyD']:['KeyW','KeyA']):[];
          g.aimAt(211,-256);g.setInput([...codes,'Mouse0']);g.step(.1);
        }
      }
      g.setInput([]);const s=g.snapshot();
      if(guardian().hp>0||s.deathTime>=0)throw Error(JSON.stringify({red,player:s.player,guardian:guardian()}));
      return {red,hp:s.player.hp,seconds:s.time-start,guardianHP:guardian().hp};
    },red);
    runs.push(run);
  }
  await page.evaluate(()=>document.querySelector('#settings-button').click());return runs;
}

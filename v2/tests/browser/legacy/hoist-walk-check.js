async page=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5174/?chapter=hoist&test');
  await page.evaluate(()=>localStorage.removeItem('furnace-born-v2-hoist-preview'));await page.reload();await page.waitForFunction(()=>window.__game);
  const result=await page.evaluate(()=>{
    const g=window.__game,legs=[];let damage=0,shots=0;
    function step(t){const before=g.snapshot().player.hp;g.step(t);const s=g.snapshot();damage+=Math.max(0,before-s.player.hp);if(s.deathTime>=0)throw Error('Died '+JSON.stringify(s.player));return s;}
    g.setInput([]);step(2);
    function walk(x,z,fight=false){
      for(let i=0;i<1400;i++){
        const s=g.snapshot(),p=s.player,dx=x-p.x,dz=z-p.z;if(Math.hypot(dx,dz)<.18){g.setInput([]);legs.push({x,z,y:p.height,hp:p.hp});return;}
        const alongX=Math.abs(dx)>Math.abs(dz),d=alongX?dx:dz;
        const codes=alongX?(d>0?['KeyS','KeyD']:['KeyW','KeyA']):(d>0?['KeyS','KeyA']:['KeyW','KeyD']);
        if(fight&&!p.overheated){const e=s.hoist.enemies.find(e=>e.hp>0&&Math.hypot(e.x-p.x,e.z-p.z)<22&&Math.abs(e.y-p.height)<10);if(e){g.aimAt(e.x,e.z,e.y);if(s.time-p.lastShot>.55){g.fire();shots++;}}}
        g.setInput(codes);step(Math.max(1/60,Math.min(.06,Math.abs(d)/7)));
        if(i===1399)throw Error('Stalled '+JSON.stringify({target:[x,z],player:g.snapshot().player,hoist:g.snapshot().hoist,legs}));
      }
    }
    walk(290,-88);walk(282,-88);
    g.aimAt(282,-99,1);g.setInput(['Mouse2']);step(2.2);g.setInput([]);
    if(g.snapshot().hoist.state.ballast<5.8)throw Error('Ballast '+JSON.stringify(g.snapshot().hoist));
    walk(287,-88);walk(287,-103);walk(284,-109);
    g.interact();step(2.2);
    if(g.snapshot().player.height<7.9)throw Error('Balance lift '+JSON.stringify(g.snapshot().hoist));
    walk(284,-120);g.interact();
    walk(283,-127);walk(296,-126);g.aimAt(310,-126,13.1);g.fire();step(1);
    if(!g.snapshot().hoist.state.bridge)throw Error('Latch '+JSON.stringify({p:g.snapshot().player,h:g.snapshot().hoist}));
    walk(319,-126,true);walk(330,-126,true);walk(330,-151,true);walk(330,-163,true);
    g.aimAt(330,-173,17.1);
    for(let i=0;i<100&&!g.snapshot().hoist.state.carrier;i++){const s=g.snapshot();if(s.hoist.lifts.find(l=>l.id==='carrier').y>15.6&&!s.player.overheated){g.aimAt(330,-173,17.1);g.fire();}step(.1);}
    if(!g.snapshot().hoist.state.carrier)throw Error('Brake '+JSON.stringify(g.snapshot().hoist));
    g.setInput([]);walk(330,-175,true);walk(320,-173,true);walk(283,-173,true);walk(283,-167);walk(283,-151);walk(283,-132);
    walk(297,-128,true);walk(321,-128,true);walk(323,-109,true);g.interact();
    if(!g.snapshot().hoist.state.main)throw Error('Main lift '+JSON.stringify(g.snapshot().hoist));
    g.setInput([]);return {legs,damage,shots,player:g.snapshot().player,hoist:g.snapshot().hoist,time:g.snapshot().time};
  });
  await page.screenshot({path:'output/playwright/hoist/crown.png'});
  await page.keyboard.press('Escape');return {result,errors};
}

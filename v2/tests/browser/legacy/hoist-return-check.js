async page=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5174/?chapter=hoist&test');await page.waitForFunction(()=>window.__game);
  const result=await page.evaluate(()=>{
    const g=__game,checks=[],legs=[];const ok=(name,value)=>{checks.push({name,passed:!!value});if(!value)throw Error(name+' '+JSON.stringify({p:g.snapshot().player,h:g.snapshot().hoist,legs}));};
    function tick(t){g.step(t);ok('alive',g.snapshot().deathTime<0);}
    function walk(x,z,boost=false){for(let i=0;i<1800;i++){const s=g.snapshot(),p=s.player,dx=x-p.x,dz=z-p.z;if(Math.hypot(dx,dz)<.22){g.setInput([]);legs.push({x,z,y:p.height});return;}const alongX=Math.abs(dx)>Math.abs(dz),d=alongX?dx:dz,codes=alongX?(d>0?['KeyS','KeyD']:['KeyW','KeyA']):(d>0?['KeyS','KeyA']:['KeyW','KeyD']);if(boost)codes.push('ShiftLeft');else if(!p.overheated){const e=[...s.hoist.enemies.filter(e=>!['sorter','bridge-guard'].includes(e.id)),...s.enemies.filter(e=>e.hp>0).map(e=>({...e,y:1.2}))].find(e=>e.hp>0&&Math.hypot(e.x-p.x,e.z-p.z)<21&&Math.abs(e.y-p.height)<3);if(e){g.aimAt(e.x,e.z,e.y);if(s.time-p.lastShot>.55)g.fire();}}g.setInput(codes);g.step(Math.max(1/60,Math.min(.05,Math.abs(d)/(7*p.speed*(p.deployed?.75:1)))));if(g.snapshot().deathTime>=0)throw Error('Death '+JSON.stringify({p:g.snapshot().player,legs,target:[x,z]}));if(i===1799)throw Error('Stall '+JSON.stringify({p:g.snapshot().player,target:[x,z],h:g.snapshot().hoist,legs}));}}
    g.setInput([]);tick(2);ok('main restored on reload',g.snapshot().hoist.state.main);
    const start=g.snapshot().time;
    walk(306,-80);walk(306,-94);g.interact();tick(2.2);g.interact();tick(3.7);walk(306,-104);walk(323,-108);
    const shortcut=g.snapshot().time-start;ok('main shortcut includes wait and takes under 25 seconds',shortcut<25);ok('crown reached without repeating a puzzle',g.snapshot().player.height===24);
    walk(314,-102);g.interact();tick(.5);walk(306,-96);g.interact();tick(5.4);walk(306,-80);
    ok('direct descent reaches loading floor',g.snapshot().player.height===0);
    // Capability setup occurs at a checkpoint; all subsequent travel uses normal movement.
    g.scenario({player:{flotation:true,phoenix:true,laser:true,circulation:false}});
    walk(320,-66);walk(346,-66);walk(346,-84);walk(346,-102);walk(333,-102);
    ok('sump ramp descends to minus eight',Math.abs(g.snapshot().player.height+8)<.1);
    g.toggleFlotation();walk(300,-106);walk(285,-106);g.interact();ok('sump cart restored',g.snapshot().hoist.state.cart);
    walk(300,-106);walk(335,-106);g.toggleFlotation();walk(346,-103);walk(346,-66);walk(306,-66);walk(290,-78);g.repair();walk(306,-78);walk(306,-94);
    g.interact();tick(2.2);g.interact();tick(3.7);walk(306,-105);walk(338,-105);walk(370,-103);walk(370,-78);
    g.setInput([]);tick(8);g.setInput(['KeyW','KeyD','ShiftLeft']);tick(24);g.setInput([]);
    ok('cold Phoenix cannot complete sustained lane',g.snapshot().player.z>-177);
    walk(370,-78);g.setInput([]);tick(8);g.scenario({player:{circulation:true}});walk(370,-183,true);walk(384,-184);g.interact();ok('hot lane opens persistent bypass',g.snapshot().hoist.state.hot);
    walk(384,-111);walk(370,-111);walk(354,-111);g.setInput([]);tick(8);walk(354,-158,true);ok('Phoenix opens express shutter with real run-up',g.snapshot().hoist.state.express0);
    walk(354,-206,true);walk(130,-206,true);walk(130,-221);g.interact();tick(5.5);walk(130,-230);g.interact();tick(5.5);walk(130,-221);walk(140,-221);
    ok('optical exit arrives in existing outer ring at ground height',g.snapshot().player.height===0);
    walk(130,-221);g.interact();tick(.5);walk(130,-230);g.interact();tick(5.5);walk(130,-206);walk(354,-206,true);walk(354,-396,true);walk(170,-396,true);walk(170,-380);g.interact();tick(5.5);walk(168,-372);g.interact();tick(5.5);walk(170,-383);walk(158,-389);
    ok('works exit arrives in the existing service yard at ground height',g.snapshot().player.height===0);
    g.setInput([]);return {checks:checks.filter(c=>c.name!=='alive'),shortcut,legs,player:g.snapshot().player,hoist:g.snapshot().hoist};
  });
  await page.keyboard.press('Escape');return {result,errors};
}

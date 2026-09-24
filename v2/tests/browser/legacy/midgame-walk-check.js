async(page)=>{
  const runs=[];
  for(const waterFirst of [false,true]){
    await page.goto('http://127.0.0.1:5174/?chapter=4&test');
    await page.evaluate(water=>localStorage.setItem('furnace-born-v2-midgame-preview',JSON.stringify({anchor:water?10:15,eliteDead:true,bossDead:true,finished:true,hives:[0,water?10:15],modules:water?{magnet:true,flotation:true}:{mortar:true},transit:{opened:water?['garden','garden-service']:['optical','observatory-return']}})),waterFirst);
    await page.reload();await page.waitForFunction(()=>window.__game);
    const run=await page.evaluate(water=>{
      const g=window.__game,legs=[];g.scenario({enemiesByIndex:Object.fromEntries(g.snapshot().enemies.map((_,i)=>[i,{hp:0}]))});
      const check=(value,message)=>{if(!value)throw Error(message);};
      function pathTo(tx,tz){
        g.setInput([]);g.step(5);const p=g.snapshot().player,wet=p.deployed,key=(x,z)=>`${x},${z}`;
        const start=[Math.round(p.x),Math.round(p.z)],queue=[start],parent=new Map([[key(...start),null]]);let end;
        for(let i=0;i<queue.length;i++){const [x,z]=queue[i],k=key(x,z);if(x===tx&&z===tz){end=k;break;}
          for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,nk=key(nx,nz);if(nx<-185||nx>258||nz<-472||nz>-65||parent.has(nk)||nx>=224&&nx<=232&&nz>=-414&&nz<=-350||g.collides(nx,nz,.98,null,wet))continue;parent.set(nk,k);queue.push([nx,nz]);}}
        if(!end)throw Error(`No route ${p.x},${p.z} -> ${tx},${tz} wet=${wet}`);
        const path=[];for(let k=end;k!==null;k=parent.get(k))path.push(k.split(',').map(Number));path.reverse();
        const corners=path.filter((p,i)=>i===path.length-1||i===0||(path[i-1][0]===p[0])!==(p[0]===path[i+1][0]));
        for(const [x,z]of corners)for(let step=0;step<600;step++){
          const p=g.snapshot().player,dx=x-p.x,dz=z-p.z;if(Math.hypot(dx,dz)<.18)break;
          let alongX=Math.abs(dx)>Math.abs(dz);const trial=alongX?dx:dz;if(g.collides(p.x+(alongX?Math.sign(trial)*Math.min(.12,Math.abs(trial)):0),p.z+(alongX?0:Math.sign(trial)*Math.min(.12,Math.abs(trial))),.88,null,wet))alongX=!alongX;const d=alongX?dx:dz;g.setInput(alongX?(d>0?['KeyS','KeyD']:['KeyW','KeyA']):(d>0?['KeyS','KeyA']:['KeyW','KeyD']));g.step(Math.min(.1,Math.abs(d)/(p.deployed?5.25:7)));
          if(step===599)throw Error(`Stuck ${p.x},${p.z} -> ${x},${z}`);
        }
        g.setInput([]);legs.push({to:[tx,tz],distance:path.length-1});
      }
      const boost=(codes,t)=>{g.setInput([...codes,'ShiftLeft']);g.step(t);g.setInput([]);g.step(5);};
      const beam=(x,z)=>{for(let i=0;i<3;i++){g.aimAt(x,z);g.setInput(['Mouse0']);g.step(.1);}g.setInput([]);g.step(3);};
      if(water){pathTo(-163,-335);g.toggleFlotation();pathTo(-90,-362);g.toggleFlotation();check(!g.snapshot().player.mortar,'Water route must have no Mortar');}
      pathTo(-15,-412);g.interact();check(g.snapshot().player.phoenix&&!g.snapshot().player.laser,'Phoenix acquisition order');
      pathTo(-86,-374);g.interact();check(g.snapshot().midgame.opened.includes('rear-gangway'),'Inside gangway control');
      pathTo(-163,-335);pathTo(12,-406);boost(['KeyS','KeyD'],4.1);check(g.snapshot().midgame.opened.includes('launch'),'Phoenix launch');
      const optics=()=>{
        pathTo(184,-326);boost(['KeyS','KeyA'],2.4);check(g.snapshot().midgame.opened.includes('calibration-north'),'Northern Phoenix boundary');
        pathTo(190,-124);g.interact();check(g.snapshot().player.laser,'Laser acquisition');
        pathTo(166,-110);g.interact();pathTo(108,-84);pathTo(190,-134);beam(202,-134);check(g.snapshot().midgame.opened.includes('mirror-gallery'),'Reflection route');
        pathTo(234,-164);pathTo(202,-238);beam(202,-230);pathTo(182,-286);beam(182,-278);check(g.snapshot().midgame.opened.includes('garden-west')&&g.snapshot().midgame.opened.includes('circulation-bridge'),'Pre-guardian connections');
        pathTo(-119,-318);pathTo(146,-389);
      };
      const circulation=()=>{
        pathTo(98,-394);boost(['KeyS','KeyD'],2.5);check(g.snapshot().midgame.opened.includes('circulation-entry'),'Independent Phoenix service entry');
        pathTo(158,-432);if(g.snapshot().player.weapon!=='cannon')g.scenario({player:{weapon:'cannon'}});g.aimAt(158,-442);g.fire();g.step(.5);check(g.snapshot().midgame.opened.includes('rig-feed'),'Cannon feed');
        pathTo(228,-438);g.interact();check(g.snapshot().player.circulation,'Water circulation acquisition');
        pathTo(228,-428);boost(['KeyS','KeyA'],20);check(g.snapshot().player.z>-350,'Actual sustained lane crossing');
        pathTo(228,-340);g.interact();check(g.snapshot().midgame.opened.includes('pressure-bypass'),'Pressure bypass');
        pathTo(228,-438);pathTo(-90,-330);pathTo(108,-298);
      };
      if(water){circulation();check(!g.snapshot().player.laser&&!g.snapshot().player.mortar,'Circulation-first equipment');optics();}
      else{optics();check(!g.snapshot().player.magnet&&!g.snapshot().player.flotation,'Optics-first equipment');circulation();}
      pathTo(236,-324);g.repair();const state=g.snapshot();return {waterFirst:water,legs,modules:state.player,opened:state.midgame.opened};
    },waterFirst);
    await page.reload();await page.waitForFunction(()=>window.__game);const state=await page.evaluate(()=>window.__game.snapshot());
    if(!state.player.phoenix||!state.player.laser||!state.player.circulation||state.anchor!==20||!state.midgame.opened.includes('pressure-bypass'))throw Error('Walk progression did not survive reload');runs.push(run);
  }
  return runs;
}

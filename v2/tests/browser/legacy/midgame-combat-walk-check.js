async(page)=>{
  const runs=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const water of [false,true]){
    await page.goto('http://127.0.0.1:5174/?chapter=4&test');
    await page.evaluate(water=>localStorage.setItem('furnace-born-v2-midgame-preview',JSON.stringify({anchor:water?10:15,eliteDead:true,bossDead:true,finished:true,hives:[0,water?10:15],modules:water?{magnet:true,flotation:true}:{mortar:true},transit:{opened:water?['garden','garden-service']:['optical','observatory-return']}})),water);
    await page.reload();await page.waitForFunction(()=>window.__game);
    const run=await page.evaluate(water=>{

    const g=window.__game;
    const stats={legs:[],damage:0,deaths:0,hotSeconds:0,shots:0,kills:0,stalls:[],start:g.snapshot().time};
    const tick=dt=>{const before=g.snapshot();g.step(dt);const after=g.snapshot();stats.damage+=Math.max(0,before.player.hp-after.player.hp);if(before.player.hp>0&&after.player.hp===0)stats.deaths++;stats.kills+=before.enemies.filter((e,i)=>e.hp>0&&after.enemies[i].hp<=0).length;if(after.player.overheated)stats.hotSeconds+=dt;if(after.deathTime>=0)throw Error('Death at '+after.player.x+','+after.player.z);return after;};
    function drive(codes,dt,fight=false){
      const s=g.snapshot(),p=s.player;
      if(fight&&!p.overheated){const targets=s.enemies.filter(e=>e.hp>0&&Math.hypot(e.x-p.x,e.z-p.z)<21&&g.lineClear(p.x,p.z,e.x,e.z)).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z));
        if(targets[0]){g.aimAt(targets[0].x,targets[0].z);if(p.weapon==='laser')codes=[...codes,'Mouse0'];else if(s.time-p.lastShot>.5){g.fire();stats.shots++;}}
      }
      g.setInput(codes);return tick(dt);
    }
    function pathTo(tx,tz,{fight=true,boost=false}={}){
      const begin=g.snapshot(),p=begin.player,wet=p.deployed,key=(x,z)=>`${x},${z}`;
      const candidates=[];for(let x=Math.floor(p.x)-1;x<=Math.ceil(p.x)+1;x++)for(let z=Math.floor(p.z)-1;z<=Math.ceil(p.z)+1;z++)if(!g.collides(x,z,.98,null,wet))candidates.push([x,z]);
      candidates.sort((a,b)=>Math.hypot(a[0]-p.x,a[1]-p.z)-Math.hypot(b[0]-p.x,b[1]-p.z));if(!candidates.length)throw Error('No supported start');
      const start=candidates[0],queue=[start],parent=new Map([[key(...start),null]]);let end;
      for(let i=0;i<queue.length;i++){const [x,z]=queue[i],k=key(x,z);if(x===tx&&z===tz){end=k;break;}for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,nk=key(nx,nz);if(nx<-185||nx>258||nz<-472||nz>-65||parent.has(nk)||nx>=224&&nx<=232&&nz>=-414&&nz<=-350||g.collides(nx,nz,.98,null,wet))continue;parent.set(nk,k);queue.push([nx,nz]);}}
      if(!end)throw Error(`No path ${p.x},${p.z}->${tx},${tz}`);
      const path=[];for(let k=end;k!==null;k=parent.get(k))path.push(k.split(',').map(Number));path.reverse();
      const corners=path.filter((p,i)=>i===path.length-1||i===0||(path[i-1][0]===p[0])!==(p[0]===path[i+1][0]));
      for(const [x,z]of corners){let stalled=0;for(let step=0;step<900;step++){
        const before=g.snapshot().player,dx=x-before.x,dz=z-before.z;if(Math.hypot(dx,dz)<.22)break;
        let alongX=Math.abs(dx)>Math.abs(dz);const trial=alongX?dx:dz;if(g.collides(before.x+(alongX?Math.sign(trial)*Math.min(.12,Math.abs(trial)):0),before.z+(alongX?0:Math.sign(trial)*Math.min(.12,Math.abs(trial))),.88,null,wet))alongX=!alongX;
        const d=alongX?dx:dz,codes=alongX?(d>0?['KeyS','KeyD']:['KeyW','KeyA']):(d>0?['KeyS','KeyA']:['KeyW','KeyD']);
        if(boost&&Math.abs(d)>6&&(before.circulation||before.heat<72)&&!wet)codes.push('ShiftLeft');
        const after=drive(codes,Math.max(1/60,Math.min(.1,Math.abs(d)/(7*before.speed*(wet?.75:1)))),fight).player;
        if(Math.hypot(after.x-before.x,after.z-before.z)<.02)stalled++;else stalled=0;
        if(stalled>180||step===899){stats.stalls.push({x:after.x,z:after.z,target:[x,z]});throw Error(`Stalled at ${after.x},${after.z}`);}
      }}
      g.setInput([]);const after=g.snapshot();stats.legs.push({to:[tx,tz],distance:path.length-1,seconds:+(after.time-begin.time).toFixed(2),hp:after.player.hp,heat:+after.player.heat.toFixed(1),kills:stats.kills,shots:stats.shots});return stats.legs.at(-1);
    }
    function cool(){g.setInput([]);for(let i=0;i<100&&g.snapshot().player.heat>0;i++)drive([],.1,false);}
    function run(codes,seconds,fight=false){for(let i=0;i<seconds*10;i++)drive(codes,.1,fight);g.setInput([]);}

      const check=(value,message)=>{if(!value)throw Error(message);};
      const rest=(x,z)=>{pathTo(x,z);g.repair();check(g.snapshot().player.hp===50,'Repair failed');};
      const boost=(codes,seconds)=>{cool();run([...codes,'ShiftLeft'],seconds);};
      const weapon=name=>{for(let i=0;i<3&&g.snapshot().player.weapon!==name;i++){const code=g.snapshot().bindings.weapon;window.dispatchEvent(new KeyboardEvent('keydown',{code}));window.dispatchEvent(new KeyboardEvent('keyup',{code}));}check(g.snapshot().player.weapon===name,'Weapon selection');};
      const beam=(x,z)=>{weapon('laser');cool();for(let i=0;i<3;i++){g.aimAt(x,z);g.setInput(['Mouse0']);tick(.1);}g.setInput([]);};
      tick(2);
      if(water){pathTo(-163,-335);g.toggleFlotation();pathTo(-90,-362);g.toggleFlotation();}
      pathTo(-15,-412);g.interact();check(g.snapshot().player.phoenix&&!g.snapshot().player.laser&&!g.snapshot().player.circulation,'Phoenix acquisition');
      pathTo(-86,-374);g.interact();rest(-30,-410);
      pathTo(12,-406);boost(['KeyS','KeyD'],4.1);check(g.snapshot().midgame.opened.includes('launch'),'Natural launch encounter');
      const optics=()=>{
        pathTo(184,-326);boost(['KeyS','KeyA'],2.4);check(g.snapshot().midgame.opened.includes('calibration-north'),'Optics momentum entrance');
        pathTo(190,-124);g.interact();check(g.snapshot().player.laser,'Laser acquisition');rest(173,-116);
        pathTo(166,-110);g.interact();pathTo(108,-84);pathTo(190,-134);beam(202,-134);check(g.snapshot().midgame.opened.includes('mirror-gallery'),'Reflected receiver');rest(234,-162);
        pathTo(202,-238);beam(202,-230);pathTo(182,-286);beam(182,-278);
        check(g.snapshot().midgame.opened.includes('circulation-bridge-south')&&g.snapshot().midgame.opened.includes('garden-west'),'Optical shortcuts');
      };
      const circulation=()=>{
        pathTo(98,-394);boost(['KeyS','KeyD'],2.5);check(g.snapshot().midgame.opened.includes('circulation-entry'),'Circulation momentum entrance');rest(146,-387);
        pathTo(158,-432);weapon('cannon');cool();g.aimAt(158,-442);g.fire();tick(.5);check(g.snapshot().midgame.opened.includes('rig-feed'),'Cannon feed');
        pathTo(228,-438);g.interact();check(g.snapshot().player.circulation,'Water Circulation acquisition');rest(235,-444);
        pathTo(228,-428);boost(['KeyS','KeyA'],20);check(g.snapshot().player.z>-350,'Hot conveyor crossing');
        pathTo(228,-340);g.interact();rest(236,-324);
        pathTo(228,-438);pathTo(-90,-330);pathTo(108,-298);
      };
      if(water){circulation();check(!g.snapshot().player.laser&&!g.snapshot().player.mortar,'Circulation-first equipment');optics();}
      else{optics();check(!g.snapshot().player.circulation&&!g.snapshot().player.magnet&&!g.snapshot().player.flotation,'Optics-first equipment');circulation();}
      rest(236,-324);check(stats.deaths===0,'Unexpected death');
      return {waterFirst:water,...stats,modules:g.snapshot().player,opened:g.snapshot().midgame.opened};
    },water);
    await page.reload();await page.waitForFunction(()=>window.__game);
    const saved=await page.evaluate(()=>window.__game.snapshot());
    if(!saved.player.phoenix||!saved.player.laser||!saved.player.circulation||saved.anchor!==20)throw Error('Route progress did not survive reload');
    runs.push(run);
  }
  await page.evaluate(()=>document.querySelector('#settings-button').click());
  if(errors.length)throw Error(JSON.stringify(errors));return runs;
}
